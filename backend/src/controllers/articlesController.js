// src/controllers/articlesController.js
const db = require("../config/db");

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// GET /api/articles
async function getAll(req, res) {
  try {
    const { search } = req.query;
    // Ne jamais lister les articles désactivés (soft-delete) : ils ne doivent
    // apparaître ni dans "Articles & Stock", ni dans les catalogues de vente/
    // approvisionnement, ni dans les alertes — sinon ils restent "fantômes"
    // sélectionnables alors qu'ils sont censés avoir disparu.
    // Cloisonnement multi-entreprises : chaque entreprise ne voit que ses
    // propres articles (entreprise_id désormais exposé par vue_stock).
    let query = `SELECT * FROM vue_stock WHERE actif = TRUE AND entreprise_id = $1`;
    const params = [req.user.entreprise_id];
    if (search) {
      query += ` AND (libelle ILIKE $2 OR code ILIKE $2)`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY libelle`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des articles." });
  }
}

// GET /api/articles/:code
async function getOne(req, res) {
  try {
    const result = await db.query(
      `SELECT * FROM vue_stock WHERE code = $1 AND entreprise_id = $2`,
      [req.params.code, req.user.entreprise_id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Article introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// POST /api/articles
async function create(req, res) {
  const client = await db.connect();
  try {
    const { code, libelle, prix_achat, prix_vente, stock_min, stock_initial, image_url } = req.body;
    if (!code || !libelle)
      return res.status(400).json({ message: "Code et libellé obligatoires." });

    // Unicité du code article PAR entreprise (PK composite depuis migration).
    const exists = await db.query(
      `SELECT code FROM articles WHERE code = $1 AND entreprise_id = $2`,
      [code, req.user.entreprise_id]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ message: `Le code article "${code}" existe déjà.` });

    const qteInitiale = parseInt(stock_initial) || 0;
    if (qteInitiale < 0)
      return res.status(400).json({ message: "Le stock de départ ne peut pas être négatif." });

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO articles (code, libelle, prix_achat, prix_vente, stock_min, image_url, entreprise_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code.toUpperCase(), libelle.toUpperCase(), prix_achat || 0, prix_vente || 0, stock_min || 5, image_url || null, req.user.entreprise_id]
    );
    const article = result.rows[0];

    // Stock de départ : enregistré comme une entrée d'approvisionnement initiale
    // afin d'alimenter naturellement "entree" / "stock_restant" dans vue_stock.
    if (qteInitiale > 0) {
      const date  = new Date().toISOString().split("T")[0];
      const mois  = MOIS[new Date(date).getMonth()];
      const annee = new Date(date).getFullYear();
      const prixUnitaire = parseInt(prix_achat) || 0;
      const montantTotal = prixUnitaire * qteInitiale;

      await client.query(
        `INSERT INTO achats (article_code, libelle, fournisseur_nom, prix_achat, quantite, date_achat, mois, user_id, montant_paye, entreprise_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [article.code, article.libelle, "Stock initial (solde d'ouverture)", prixUnitaire, qteInitiale, date, mois, req.user?.id || null, montantTotal, req.user.entreprise_id]
      );
    }

    await client.query("COMMIT");

    const stockMaj = await db.query(
      `SELECT * FROM vue_stock WHERE code = $1 AND entreprise_id = $2`,
      [article.code, req.user.entreprise_id]
    );
    res.status(201).json(stockMaj.rows[0] || article);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création de l'article." });
  } finally {
    client.release();
  }
}

// PUT /api/articles/:code
async function update(req, res) {
  try {
    const { libelle, prix_achat, prix_vente, stock_min, image_url } = req.body;
    const hasImage = Object.prototype.hasOwnProperty.call(req.body, "image_url");
    // image_url : mise à jour uniquement si la clé est présente dans le body
    // (évite d'écraser l'image existante lors d'appels qui ne l'envoient pas).
    // Si présente et vide → NULL (suppression de l'image).
    // AND entreprise_id : empêche toute modification d'un article d'une autre entreprise.
    const setClauses = [
      "libelle    = COALESCE($1, libelle)",
      "prix_achat = COALESCE($2, prix_achat)",
      "prix_vente = COALESCE($3, prix_vente)",
      "stock_min  = COALESCE($4, stock_min)",
      ...(hasImage ? ["image_url = $5"] : []),
      "updated_at = NOW()",
    ];
    const codeIdx    = hasImage ? 6 : 5;
    const entreIdx   = hasImage ? 7 : 6;
    const params     = [libelle, prix_achat, prix_vente, stock_min,
      ...(hasImage ? [image_url || null] : []),
      req.params.code, req.user.entreprise_id];
    const result = await db.query(
      `UPDATE articles SET ${setClauses.join(", ")}
       WHERE code = $${codeIdx} AND entreprise_id = $${entreIdx}
       RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Article introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la modification." });
  }
}

// DELETE /api/articles/:code — soft delete
// Désactive l'article (actif = FALSE) sans toucher à son historique
// (achats/ventes déjà enregistrés restent intacts et continuent d'apparaître
// dans les rapports). L'article disparaît simplement des listes actives
// (catalogue, vue_stock, suggestions de saisie).
// On ne bloque plus sur la présence d'achats/ventes : un article ayant déjà
// du mouvement de stock doit pouvoir être désactivé tout aussi bien qu'un
// article neuf — bloquer ici rendait la suppression impossible dans la
// quasi-totalité des cas réels.
async function remove(req, res) {
  try {
    const entId = req.user.entreprise_id;
    // AND entreprise_id = $2 : empêche la suppression d'un article appartenant
    // à une autre entreprise.
    const upd = await db.query(
      `UPDATE articles SET actif = FALSE, updated_at = NOW() WHERE code = $1 AND entreprise_id = $2 RETURNING code`,
      [req.params.code, entId]
    );
    if (!upd.rows[0]) return res.status(404).json({ message: "Article introuvable." });
    res.json({ message: "Article désactivé avec succès." });
  } catch (err) {
    console.error("Erreur suppression article :", err.code, err.message);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
}

// GET /api/articles/generate-code?libelle=xxx
async function generateCode(req, res) {
  try {
    const { libelle = "" } = req.query;
    const letters = libelle.replace(/[^a-zA-ZÀ-ÿ]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
    const result  = await db.query(
      `SELECT code FROM articles WHERE code ~ $1 AND entreprise_id = $2 ORDER BY code DESC LIMIT 1`,
      [`^${letters}[0-9]{3}$`, req.user.entreprise_id]
    );
    let nextNum = 1;
    if (result.rows.length > 0) nextNum = parseInt(result.rows[0].code.slice(3)) + 1;
    res.json({ code: letters + String(nextNum).padStart(3, "0") });
  } catch (err) {
    res.status(500).json({ message: "Erreur génération code." });
  }
}

// GET /api/articles/alertes/ruptures
async function alertes(req, res) {
  try {
    const result = await db.query(
      `SELECT * FROM vue_stock WHERE actif = TRUE AND entreprise_id = $1 AND stock_restant <= stock_min ORDER BY stock_restant ASC`,
      [req.user.entreprise_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, getOne, create, update, remove, generateCode, alertes };
