// src/controllers/gammesController.js
const db = require("../config/db");

async function getAll(req, res) {
  try {
    const result = await db.query(`SELECT * FROM gammes WHERE actif = TRUE ORDER BY nom`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function create(req, res) {
  try {
    const { code, nom } = req.body;
    if (!code || !nom)
      return res.status(400).json({ message: "Code et nom sont requis." });

    const codeUp = code.toUpperCase();
    const nomUp  = nom.toUpperCase();

    // Si la gamme existe mais est désactivée → la réactiver
    const existing = await db.query(`SELECT actif FROM gammes WHERE code = $1`, [codeUp]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].actif)
        return res.status(409).json({ message: `La gamme "${codeUp}" existe déjà.` });
      // Réactivation : vérifier que le nom n'est pas déjà pris par une gamme active
      const nomConflict = await db.query(
        `SELECT code FROM gammes WHERE nom = $1 AND actif = TRUE AND code <> $2`, [nomUp, codeUp]
      );
      if (nomConflict.rows.length > 0)
        return res.status(409).json({ message: `Une gamme active nommée "${nomUp}" existe déjà.` });
      const result = await db.query(
        `UPDATE gammes SET nom = $1, actif = TRUE WHERE code = $2 RETURNING *`,
        [nomUp, codeUp]
      );
      return res.status(201).json(result.rows[0]);
    }

    const result = await db.query(
      `INSERT INTO gammes (code, nom) VALUES ($1, $2) RETURNING *`,
      [codeUp, nomUp]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création." });
  }
}

async function rename(req, res) {
  try {
    const { nom } = req.body;
    if (!nom) return res.status(400).json({ message: "Nom requis." });
    const result = await db.query(
      `UPDATE gammes SET nom = $1 WHERE code = $2 AND actif = TRUE RETURNING *`,
      [nom.toUpperCase(), req.params.code]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Gamme introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors du renommage." });
  }
}

async function remove(req, res) {
  try {
    const inUse = await db.query(
      `SELECT COUNT(*) FROM articles WHERE gamme_code = $1 AND actif = TRUE`,
      [req.params.code]
    );
    if (parseInt(inUse.rows[0].count) > 0)
      return res.status(409).json({ message: "Cette gamme est utilisée par des articles actifs." });
    await db.query(`UPDATE gammes SET actif = FALSE WHERE code = $1`, [req.params.code]);
    res.json({ message: "Gamme supprimée." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, create, rename, remove };
