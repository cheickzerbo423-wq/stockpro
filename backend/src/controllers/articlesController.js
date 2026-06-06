// src/controllers/articlesController.js
const db = require("../config/db");

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// GET /api/articles
async function getAll(req, res) {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM vue_stock`;
    const params = [];
    if (search) {
      query += ` WHERE libelle ILIKE $1 OR code ILIKE $1`;
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
    const result = await db.query(`SELECT * FROM vue_stock WHERE code = $1`, [req.params.code]);
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
    const { code, libelle, prix_achat, prix_vente, stock_min, stock_initial } = req.body;
    if (!code || !libelle)
      return res.status(400).json({ message: "Code et libellé obligatoires." });

    const exists = await db.query(`SELECT code FROM articles WHERE code = $1`, [code]);
    if (exists.rows.length > 0)
      return res.status(409).json({ message: `Le code article "${code}" existe déjà.` });

    const qteInitiale = parseInt(stock_initial) || 0;
    if (qteInitiale < 0)
      return res.status(400).json({ message: "Le stock de départ ne peut pas être négatif." });

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO articles (code, libelle, prix_achat, prix_vente, stock_min)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code.toUpperCase(), libelle.toUpperCase(), prix_achat || 0, prix_vente || 0, stock_min || 5]
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
        `INSERT INTO achats (article_code, libelle, fournisseur_nom, prix_achat, quantite, date_achat, mois, annee, user_id, montant_paye)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [article.code, article.libelle, "Stock initial (solde d'ouverture)", prixUnitaire, qteInitiale, date, mois, annee, req.user?.id || null, montantTotal]
      );
    }

    await client.query("COMMIT");

    const stockMaj = await db.query(`SELECT * FROM vue_stock WHERE code = $1`, [article.code]);
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
    const { libelle, prix_achat, prix_vente, stock_min } = req.body;
    const result = await db.query(
      `UPDATE articles
       SET libelle    = COALESCE($1, libelle),
           prix_achat = COALESCE($2, prix_achat),
           prix_vente = COALESCE($3, prix_vente),
           stock_min  = COALESCE($4, stock_min),
           updated_at = NOW()
       WHERE code = $5
       RETURNING *`,
      [libelle, prix_achat, prix_vente, stock_min, req.params.code]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Article introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la modification." });
  }
}

// DELETE /api/articles/:code — soft delete
async function remove(req, res) {
  try {
    const [ventes, achats] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM lignes_vente WHERE article_code = $1`, [req.params.code]),
      db.query(`SELECT COUNT(*) FROM achats WHERE article_code = $1`, [req.params.code]),
    ]);
    if (parseInt(ventes.rows[0].count) > 0)
      return res.status(409).json({ message: "Impossible de supprimer : cet article a des ventes associées." });
    if (parseInt(achats.rows[0].count) > 0)
      return res.status(409).json({ message: "Impossible de supprimer : cet article a des achats associés." });

    await db.query(`UPDATE articles SET actif = FALSE, updated_at = NOW() WHERE code = $1`, [req.params.code]);
    res.json({ message: "Article désactivé avec succès." });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
}

// GET /api/articles/generate-code?libelle=xxx
async function generateCode(req, res) {
  try {
    const { libelle = "" } = req.query;
    const letters = libelle.replace(/[^a-zA-ZÀ-ÿ]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
    const result  = await db.query(
      `SELECT code FROM articles WHERE code ~ $1 ORDER BY code DESC LIMIT 1`,
      [`^${letters}[0-9]{3}$`]
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
      `SELECT * FROM vue_stock WHERE stock_restant <= stock_min ORDER BY stock_restant ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, getOne, create, update, remove, generateCode, alertes };
