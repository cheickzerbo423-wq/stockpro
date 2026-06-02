// src/controllers/utilisateursController.js
const bcrypt = require("bcryptjs");
const db     = require("../config/db");

async function getAll(req, res) {
  try {
    const result = await db.query(
      `SELECT id, login, categorie, perm_vente, perm_appro, perm_articles,
              perm_facturation, perm_clients, actif, created_at
       FROM utilisateurs ORDER BY categorie, login`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function create(req, res) {
  try {
    const { login, mdp, categorie, perm_vente, perm_appro, perm_articles,
            perm_facturation, perm_clients } = req.body;

    if (!login || !mdp)
      return res.status(400).json({ message: "Login et mot de passe obligatoires." });
    if (mdp.length < 4)
      return res.status(400).json({ message: "Mot de passe trop court (4 caractères minimum)." });

    const exists = await db.query(`SELECT id FROM utilisateurs WHERE login = $1`, [login]);
    if (exists.rows.length > 0)
      return res.status(409).json({ message: `Le login "${login}" est déjà utilisé.` });

    const hash = await bcrypt.hash(mdp, 10);
    const result = await db.query(
      `INSERT INTO utilisateurs (login, mdp_hash, categorie, perm_vente, perm_appro,
         perm_articles, perm_facturation, perm_clients)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, login, categorie, perm_vente, perm_appro, perm_articles,
                 perm_facturation, perm_clients, actif`,
      [login, hash, categorie || "Vendeur",
       perm_vente ?? true, perm_appro ?? false, perm_articles ?? false,
       perm_facturation ?? true, perm_clients ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création." });
  }
}

async function update(req, res) {
  try {
    // Seul un Admin peut modifier les utilisateurs
    if (req.user.categorie !== "Admin")
      return res.status(403).json({ message: "Réservé aux administrateurs." });

    const { mdp, categorie, perm_vente, perm_appro, perm_articles,
            perm_facturation, perm_clients, actif } = req.body;

    let mdpHash = null;
    if (mdp) {
      if (mdp.length < 4)
        return res.status(400).json({ message: "Mot de passe trop court." });
      mdpHash = await bcrypt.hash(mdp, 10);
    }

    const result = await db.query(
      `UPDATE utilisateurs SET
         mdp_hash         = COALESCE($1, mdp_hash),
         categorie        = COALESCE($2, categorie),
         perm_vente       = COALESCE($3, perm_vente),
         perm_appro       = COALESCE($4, perm_appro),
         perm_articles    = COALESCE($5, perm_articles),
         perm_facturation = COALESCE($6, perm_facturation),
         perm_clients     = COALESCE($7, perm_clients),
         actif            = COALESCE($8, actif),
         updated_at       = NOW()
       WHERE id = $9
       RETURNING id, login, categorie, perm_vente, perm_appro, perm_articles,
                 perm_facturation, perm_clients, actif`,
      [mdpHash, categorie, perm_vente, perm_appro, perm_articles,
       perm_facturation, perm_clients, actif, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Utilisateur introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function remove(req, res) {
  try {
    if (req.user.categorie !== "Admin")
      return res.status(403).json({ message: "Réservé aux administrateurs." });
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id)
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
    // Vérifier que l'utilisateur existe
    const check = await db.query(`SELECT id, login FROM utilisateurs WHERE id = $1`, [targetId]);
    if (check.rows.length === 0)
      return res.status(404).json({ message: "Utilisateur introuvable." });
    // Détacher les références avant suppression
    await db.query(`UPDATE achats        SET user_id = NULL WHERE user_id = $1`, [targetId]);
    await db.query(`UPDATE lignes_vente  SET user_id = NULL WHERE user_id = $1`, [targetId]);
    await db.query(`UPDATE factures      SET user_id = NULL WHERE user_id = $1`, [targetId]);
    await db.query(`UPDATE audit_log     SET user_id = NULL WHERE user_id = $1`, [targetId]);
    // Suppression définitive
    await db.query(`DELETE FROM utilisateurs WHERE id = $1`, [targetId]);
    res.json({ message: `Utilisateur "${check.rows[0].login}" supprimé définitivement.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// POST /api/admin/reset — Réinitialisation sélective des données (Admin uniquement)
async function resetData(req, res) {
  if (req.user.categorie !== "Admin")
    return res.status(403).json({ message: "Réservé aux administrateurs." });

  const { modules = [] } = req.body;
  if (!modules.length)
    return res.status(400).json({ message: "Aucun module sélectionné." });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Journal d'audit ───────────────────────────────────────
    if (modules.includes("audit"))
      await client.query("DELETE FROM audit_log");

    // ── 2. Lignes de vente ───────────────────────────────────────
    // Obligatoire si ventes OU factures OU articles (FK NOT NULL vers article)
    if (modules.includes("ventes") || modules.includes("factures") || modules.includes("articles"))
      await client.query("DELETE FROM lignes_vente");

    // ── 4. Factures ──────────────────────────────────────────────
    if (modules.includes("factures")) {
      if (!modules.includes("clients"))
        await client.query("UPDATE factures SET client_id = NULL");
      await client.query("DELETE FROM factures");
    }

    // ── 5. Achats ────────────────────────────────────────────────
    // Obligatoire aussi si articles (FK NOT NULL article_code)
    if (modules.includes("achats") || modules.includes("articles"))
      await client.query("DELETE FROM achats");

    // ── 6. Clients & Fournisseurs ────────────────────────────────
    if (modules.includes("clients")) {
      // Nullifier les FK qui pointent vers clients_fournisseurs si pas déjà supprimés
      if (!modules.includes("factures"))
        await client.query("UPDATE factures SET client_id = NULL");
      if (!modules.includes("achats"))
        await client.query("UPDATE achats SET fournisseur_id = NULL");
      await client.query("DELETE FROM clients_fournisseurs");
    }

    // ── 7. Articles ──────────────────────────────────────────────
    if (modules.includes("articles"))
      await client.query("DELETE FROM articles");

    // ── 8. Gammes ────────────────────────────────────────────────
    // FK : articles.gamme_code → gammes.code
    // Si articles pas supprimés, on nullifie d'abord le lien
    if (modules.includes("gammes")) {
      if (!modules.includes("articles"))
        await client.query("UPDATE articles SET gamme_code = NULL, unite_par_base = 1");
      await client.query("DELETE FROM gammes");
    }

    await client.query("COMMIT");
    res.json({ message: "Réinitialisation effectuée avec succès.", modules });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reset error:", err);
    res.status(500).json({ message: "Erreur lors de la réinitialisation : " + err.message });
  } finally {
    client.release();
  }
}

module.exports = { getAll, create, update, remove, resetData };
