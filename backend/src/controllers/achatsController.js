// src/controllers/achatsController.js
// Équivalent Excel : feuille Donnees_Achat
const db = require("../config/db");

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// GET /api/achats
async function getAll(req, res) {
  try {
    const { fournisseur, article, mois, annee } = req.query;
    let q = `
      SELECT *,
        (montant_total - montant_paye)          AS reste,
        (montant_paye >= montant_total)          AS statut
      FROM achats WHERE 1=1`;
    const params = [];
    let idx = 1;
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

    if (!article_code || !quantite || !prix_achat)
      return res.status(400).json({ message: "Article, quantité et prix d'achat sont obligatoires." });

    // Vérifier que l'article existe
    const art = await db.query(`SELECT libelle FROM articles WHERE code = $1 AND actif = TRUE`, [article_code]);
    if (!art.rows[0])
      return res.status(404).json({ message: "Article introuvable." });

    const date  = date_achat || new Date().toISOString().split("T")[0];
    const mois  = MOIS[new Date(date).getMonth()];
    const annee = new Date(date).getFullYear();

    const montantTotal = parseInt(prix_achat) * parseInt(quantite);
    const montantPaye  = req.body.montant_paye !== undefined
      ? Math.min(parseFloat(req.body.montant_paye), montantTotal)
      : montantTotal;

    const result = await db.query(
      `INSERT INTO achats (article_code, libelle, fournisseur_id, fournisseur_nom, prix_achat, prix_unitaire, quantite, montant_total, date_achat, mois, annee, user_id, montant_paye)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [article_code, art.rows[0].libelle, fournisseur_id || null, fournisseur_nom || "", parseInt(prix_achat), parseInt(quantite), montantTotal, date, mois, annee, req.user?.id || null, montantPaye]
    );

    // Retourner aussi le stock mis à jour
    const stockMaj = await db.query(`SELECT stock_restant, statut FROM vue_stock WHERE code = $1`, [article_code]);

    res.status(201).json({
      message: "Approvisionnement enregistré. Stock mis à jour.",
      achat: result.rows[0],
      nouveau_stock: stockMaj.rows[0]?.stock_restant,
      statut_stock:  stockMaj.rows[0]?.statut,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de l'achat." });
  }
}

// DELETE /api/achats/:id
async function remove(req, res) {
  try {
    const result = await db.query(
      `DELETE FROM achats WHERE id = $1 RETURNING id`,
      [req.params.id]
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
    if (montant_paye === undefined || isNaN(parseFloat(montant_paye)))
      return res.status(400).json({ message: "Montant payé invalide." });

    const achat = await db.query(`SELECT montant_total, montant_paye FROM achats WHERE id = $1`, [id]);
    if (!achat.rows[0]) return res.status(404).json({ message: "Achat introuvable." });
    if (parseFloat(montant_paye) > parseFloat(achat.rows[0].montant_total))
      return res.status(400).json({ message: "Le montant payé dépasse le montant total." });
    if (parseFloat(montant_paye) < parseFloat(achat.rows[0].montant_paye))
      return res.status(400).json({ message: "Le montant payé ne peut pas diminuer." });

    const result = await db.query(
      `UPDATE achats SET montant_paye = $1 WHERE id = $2
       RETURNING *, (montant_total - montant_paye) AS reste, (montant_paye >= montant_total) AS statut`,
      [parseFloat(montant_paye), id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Achat introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour du paiement." });
  }
}

module.exports = { getAll, create, remove, updatePaiement };
