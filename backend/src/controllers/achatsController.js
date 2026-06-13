// src/controllers/achatsController.js
// Équivalent Excel : feuille Donnees_Achat
const db = require("../config/db");

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// GET /api/achats
async function getAll(req, res) {
  try {
    const { fournisseur, article, mois, annee } = req.query;
    // montant_total est recalculé dynamiquement (prix_achat * quantite) pour ne pas
    // dépendre de la colonne stockée qui peut être 0 sur d'anciens enregistrements.
    let q = `
      SELECT id, article_code, libelle, fournisseur_id, fournisseur_nom,
             prix_achat, quantite, date_achat, user_id, mois, annee, montant_paye,
             (prix_achat * quantite)                 AS montant_total,
             (prix_achat * quantite - montant_paye)  AS reste,
             (montant_paye >= prix_achat * quantite) AS statut
      FROM achats WHERE entreprise_id = $1`;
    const params = [req.user.entreprise_id];
    let idx = 2;
    if (fournisseur) { q += ` AND fournisseur_nom ILIKE $${idx++}`; params.push(`%${fournisseur}%`); }
    if (article)     { q += ` AND article_code = $${idx++}`;        params.push(article); }
    if (mois)        { q += ` AND mois = $${idx++}`;                params.push(mois); }
    if (annee)       { q += ` AND annee = $${idx++}`;               params.push(annee); }
    q += ` ORDER BY date_achat ASC, id ASC`;
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des achats." });
  }
}

// POST /api/achats — Enregistrer un approvisionnement
async function create(req, res) {
  try {
    const { article_code, fournisseur_id, fournisseur_nom, prix_achat, quantite, date_achat } = req.body;
    const entId = req.user.entreprise_id;

    if (!article_code || !quantite || !prix_achat)
      return res.status(400).json({ message: "Article, quantité et prix d'achat sont obligatoires." });

    // Vérifier que l'article existe (dans l'entreprise courante)
    const art = await db.query(`SELECT libelle FROM articles WHERE code = $1 AND actif = TRUE AND entreprise_id = $2`, [article_code, entId]);
    if (!art.rows[0])
      return res.status(404).json({ message: "Article introuvable." });

    const date  = date_achat || new Date().toISOString().split("T")[0];
    const mois  = MOIS[new Date(date).getMonth()];
    const annee = new Date(date).getFullYear();

    // prix_achat est un NUMERIC en base (peut comporter des décimales) :
    // utiliser parseFloat, pas parseInt, sous peine de tronquer (ex: 1499.99 → 1499).
    const prixNum = parseFloat(prix_achat);
    const qteNum  = parseInt(quantite, 10);
    if (!Number.isFinite(prixNum) || !Number.isFinite(qteNum) || prixNum <= 0 || qteNum <= 0)
      return res.status(400).json({ message: "Quantité ou prix d'achat invalide. Saisissez des nombres positifs." });

    const montantTotal = prixNum * qteNum;
    // La colonne montant_total est un NUMERIC(15,2) : valeur maximale acceptée
    // par Postgres = 9 999 999 999 999,99. On bloque juste avant cette limite
    // avec un message clair plutôt que de laisser planter l'insertion (code 22003).
    if (montantTotal > 9_999_999_999_999)
      return res.status(400).json({ message: "Le montant total (quantité × prix) est trop élevé pour être enregistré. Vérifiez la quantité et le prix saisis pour cet article." });

    let montantPaye = montantTotal;
    if (req.body.montant_paye !== undefined && req.body.montant_paye !== null && req.body.montant_paye !== "") {
      const paye = parseFloat(req.body.montant_paye);
      if (isNaN(paye) || paye < 0)
        return res.status(400).json({ message: "Montant payé invalide." });
      montantPaye = Math.min(paye, montantTotal);
    }

    const result = await db.query(
      `INSERT INTO achats (article_code, libelle, fournisseur_id, fournisseur_nom, prix_achat, quantite, date_achat, mois, user_id, montant_paye, montant_total, entreprise_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, article_code, libelle, fournisseur_id, fournisseur_nom,
                 prix_achat, quantite, date_achat, user_id, mois, annee, montant_paye,
                 (prix_achat * quantite)                 AS montant_total,
                 (prix_achat * quantite - montant_paye)  AS reste,
                 (montant_paye >= prix_achat * quantite) AS statut`,
      [article_code, art.rows[0].libelle, fournisseur_id || null, fournisseur_nom || "", prixNum, qteNum, date, mois, req.user?.id || null, montantPaye, montantTotal, entId]
    );

    // Retourner aussi le stock mis à jour
    const stockMaj = await db.query(`SELECT stock_restant, statut FROM vue_stock WHERE code = $1 AND entreprise_id = $2`, [article_code, entId]);

    res.status(201).json({
      message: "Approvisionnement enregistré. Stock mis à jour.",
      achat: result.rows[0],
      nouveau_stock: stockMaj.rows[0]?.stock_restant,
      statut_stock:  stockMaj.rows[0]?.statut,
    });
  } catch (err) {
    // On journalise le détail Postgres (code + message + detail) pour pouvoir
    // diagnostiquer précisément côté logs Railway, et on traduit les causes les
    // plus courantes en message clair pour l'utilisateur (au lieu d'un message
    // générique qui ne dit pas quoi corriger).
    console.error("Erreur enregistrement achat :", err.code, err.message, err.detail || "");
    const messagesParCode = {
      "22003": "La quantité ou le prix saisi est trop élevé (le total dépasse la limite acceptée). Vérifiez ces deux valeurs pour cet article.",
      "22001": "Le nom de l'article ou du fournisseur est trop long pour être enregistré tel quel. Raccourcissez-le.",
      "22P02": "La quantité, le prix ou la date saisi est dans un format invalide.",
      "23502": "Une information obligatoire est manquante (fournisseur, date, quantité ou prix).",
      "23503": "Le fournisseur sélectionné est introuvable en base. Resélectionnez-le dans la liste ou recréez-le.",
      "23505": "Cet approvisionnement semble déjà enregistré (doublon détecté).",
      "23514": "Une valeur saisie ne respecte pas une règle de validation de la base (quantité, prix ou montant). Vérifiez ces valeurs.",
    };
    // Si le code Postgres n'est pas dans notre liste, on l'affiche quand même
    // (entre parenthèses) : ça permet de voir immédiatement la cause exacte
    // sans devoir consulter les logs serveur, et de l'ajouter ensuite à la liste.
    const message = messagesParCode[err.code]
      || `Erreur lors de l'enregistrement de l'achat${err.code ? ` (code base de données : ${err.code} — ${err.message || ""})` : ""}.`;
    res.status(500).json({ message });
  }
}

// DELETE /api/achats/:id
async function remove(req, res) {
  try {
    const result = await db.query(
      `DELETE FROM achats WHERE id = $1 AND entreprise_id = $2 RETURNING id`,
      [req.params.id, req.user.entreprise_id]
    );
    if (!result.rows[0])
      return res.status(404).json({ message: "Achat introuvable." });
    res.json({ message: "Achat supprimé." });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
}

// PUT /api/achats/:id/paiement
async function updatePaiement(req, res) {
  try {
    const { id } = req.params;
    const { montant_paye } = req.body;
    const entId = req.user.entreprise_id;
    if (montant_paye === undefined || isNaN(parseFloat(montant_paye)))
      return res.status(400).json({ message: "Montant payé invalide." });

    const achat = await db.query(
      `SELECT prix_achat * quantite AS montant_total, montant_paye FROM achats WHERE id = $1 AND entreprise_id = $2`, [id, entId]
    );
    if (!achat.rows[0]) return res.status(404).json({ message: "Achat introuvable." });
    if (parseFloat(montant_paye) > parseFloat(achat.rows[0].montant_total))
      return res.status(400).json({ message: "Le montant payé dépasse le montant total." });
    if (parseFloat(montant_paye) < parseFloat(achat.rows[0].montant_paye))
      return res.status(400).json({ message: "Le montant payé ne peut pas diminuer." });

    const result = await db.query(
      `UPDATE achats SET montant_paye = $1 WHERE id = $2 AND entreprise_id = $3
       RETURNING id, article_code, libelle, fournisseur_id, fournisseur_nom,
                 prix_achat, quantite, date_achat, user_id, mois, annee, montant_paye,
                 (prix_achat * quantite)                 AS montant_total,
                 (prix_achat * quantite - montant_paye)  AS reste,
                 (montant_paye >= prix_achat * quantite) AS statut`,
      [parseFloat(montant_paye), id, entId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Achat introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour du paiement." });
  }
}

module.exports = { getAll, create, remove, updatePaiement };
