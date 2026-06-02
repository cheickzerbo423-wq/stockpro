// src/controllers/devisController.js
const db = require("../config/db");

// GET /api/devis
async function getAll(req, res) {
  try {
    const result = await db.query(
      `SELECT * FROM devis ORDER BY date_emission DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// POST /api/devis
async function create(req, res) {
  try {
    const { client_nom, montant, date_emission, commentaire, num_commande } = req.body;
    if (!client_nom || !montant) {
      return res.status(400).json({ message: "Client et montant sont requis." });
    }

    // Génère un numéro de devis unique : DEV-YYYYMMDD-XXXX
    const dateStr = (date_emission || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const numero = `DEV-${dateStr}-${rand}`;

    const result = await db.query(
      `INSERT INTO devis (numero, client_nom, montant, date_emission, commentaire, num_commande, statut)
       VALUES ($1, $2, $3, $4, $5, $6, 'En attente')
       RETURNING *`,
      [numero, client_nom, parseFloat(montant), date_emission || new Date(), commentaire || null, num_commande || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// PUT /api/devis/:id/statut
async function updateStatut(req, res) {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const STATUTS_VALIDES = ["En attente", "Valide", "Refuse", "Facture"];
    if (!STATUTS_VALIDES.includes(statut)) {
      return res.status(400).json({ message: "Statut invalide." });
    }

    const result = await db.query(
      `UPDATE devis SET statut = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [statut, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Devis introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, create, updateStatut };
