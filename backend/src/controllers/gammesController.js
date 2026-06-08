// src/controllers/gammesController.js
//
// MULTI-ENTREPRISES : les gammes (familles d'articles) sont des données propres
// à chaque société cliente — au même titre que ses articles, clients, etc.
// La colonne "entreprise_id" existe sur la table "gammes" (ajoutée par la
// migration dans db.js) et DOIT être utilisée pour cloisonner toutes les
// requêtes ci-dessous : sans cela, une entreprise verrait/modifierait/
// supprimerait les gammes d'une autre société cliente de la plateforme.
// (Contrôleur non encore branché à une route — corrigé préventivement avant
// activation, conformément à l'audit multi-tenant demandé.)
const db = require("../config/db");

async function getAll(req, res) {
  try {
    const result = await db.query(
      `SELECT * FROM gammes WHERE actif = TRUE AND entreprise_id = $1 ORDER BY nom`,
      [req.user.entreprise_id]
    );
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
    const entId  = req.user.entreprise_id;

    // Unicité du code DANS l'entreprise courante uniquement (contrairement aux
    // codes d'articles/factures/logins, les codes de gammes ne sont pas
    // documentés comme globalement uniques — chaque société gère ses propres
    // familles de produits indépendamment des autres).
    const existing = await db.query(
      `SELECT actif FROM gammes WHERE code = $1 AND entreprise_id = $2`,
      [codeUp, entId]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].actif)
        return res.status(409).json({ message: `La gamme "${codeUp}" existe déjà.` });
      // Réactivation : vérifier que le nom n'est pas déjà pris par une gamme
      // active de la MÊME entreprise
      const nomConflict = await db.query(
        `SELECT code FROM gammes WHERE nom = $1 AND actif = TRUE AND code <> $2 AND entreprise_id = $3`,
        [nomUp, codeUp, entId]
      );
      if (nomConflict.rows.length > 0)
        return res.status(409).json({ message: `Une gamme active nommée "${nomUp}" existe déjà.` });
      const result = await db.query(
        `UPDATE gammes SET nom = $1, actif = TRUE WHERE code = $2 AND entreprise_id = $3 RETURNING *`,
        [nomUp, codeUp, entId]
      );
      return res.status(201).json(result.rows[0]);
    }

    const result = await db.query(
      `INSERT INTO gammes (code, nom, entreprise_id) VALUES ($1, $2, $3) RETURNING *`,
      [codeUp, nomUp, entId]
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
      `UPDATE gammes SET nom = $1 WHERE code = $2 AND actif = TRUE AND entreprise_id = $3 RETURNING *`,
      [nom.toUpperCase(), req.params.code, req.user.entreprise_id]
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
    const entId = req.user.entreprise_id;
    const inUse = await db.query(
      `SELECT COUNT(*) FROM articles WHERE gamme_code = $1 AND actif = TRUE AND entreprise_id = $2`,
      [req.params.code, entId]
    );
    if (parseInt(inUse.rows[0].count) > 0)
      return res.status(409).json({ message: "Cette gamme est utilisée par des articles actifs." });
    await db.query(
      `UPDATE gammes SET actif = FALSE WHERE code = $1 AND entreprise_id = $2`,
      [req.params.code, entId]
    );
    res.json({ message: "Gamme supprimée." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, create, rename, remove };
