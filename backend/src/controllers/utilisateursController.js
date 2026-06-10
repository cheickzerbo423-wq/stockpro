// src/controllers/utilisateursController.js
const bcrypt = require("bcryptjs");
const db     = require("../config/db");
const { isPasswordValid, PASSWORD_MESSAGE } = require("../utils/passwordPolicy");

// NOTE MULTI-ENTREPRISES : ce contrôleur gère les utilisateurs d'UNE entreprise
// (ceux que peut gérer un Admin "normal"). Le compte SuperAdmin (categorie =
// 'SuperAdmin', entreprise_id IS NULL) est géré séparément via le contrôleur
// superadmin et n'apparaît jamais ici — ni dans la liste, ni comme cible
// d'update/remove — pour éviter qu'un Admin d'entreprise ne le modifie/supprime.

async function getAll(req, res) {
  try {
    const result = await db.query(
      `SELECT id, login, categorie, perm_vente, perm_appro, perm_articles,
              perm_facturation, perm_clients, actif, created_at
       FROM utilisateurs
       WHERE entreprise_id = $1 AND categorie != 'SuperAdmin'
       ORDER BY categorie, login`,
      [req.user.entreprise_id]
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
    if (!isPasswordValid(mdp))
      return res.status(400).json({ message: PASSWORD_MESSAGE });
    // Le rôle SuperAdmin ne peut pas être attribué via cette route — il est
    // réservé au compte plateforme unique géré par le contrôleur superadmin.
    if (categorie === "SuperAdmin")
      return res.status(403).json({ message: "Ce rôle ne peut pas être attribué ici." });

    // Le login reste GLOBALEMENT unique sur toute la plateforme (décision
    // documentée — voir genFactureCode/articles.code) : la table utilisateurs
    // n'a pas de contrainte composite (login, entreprise_id), donc on vérifie
    // toujours sur l'ensemble des entreprises.
    const exists = await db.query(`SELECT id FROM utilisateurs WHERE login = $1`, [login]);
    if (exists.rows.length > 0)
      return res.status(409).json({ message: `Le login "${login}" est déjà utilisé.` });

    const hash = await bcrypt.hash(mdp, 10);
    const result = await db.query(
      `INSERT INTO utilisateurs (login, mdp_hash, categorie, perm_vente, perm_appro,
         perm_articles, perm_facturation, perm_clients, entreprise_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, login, categorie, perm_vente, perm_appro, perm_articles,
                 perm_facturation, perm_clients, actif`,
      [login, hash, categorie || "Vendeur",
       perm_vente ?? true, perm_appro ?? false, perm_articles ?? false,
       perm_facturation ?? true, perm_clients ?? true, req.user.entreprise_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création." });
  }
}

async function update(req, res) {
  try {
    // Seul un Admin peut modifier les utilisateurs (de sa propre entreprise)
    if (req.user.categorie !== "Admin")
      return res.status(403).json({ message: "Réservé aux administrateurs." });

    const { mdp, categorie, perm_vente, perm_appro, perm_articles,
            perm_facturation, perm_clients, actif } = req.body;

    if (categorie === "SuperAdmin")
      return res.status(403).json({ message: "Ce rôle ne peut pas être attribué ici." });

    let mdpHash = null;
    if (mdp) {
      if (!isPasswordValid(mdp))
        return res.status(400).json({ message: PASSWORD_MESSAGE });
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
         must_change_password = CASE WHEN $1::text IS NOT NULL THEN FALSE ELSE must_change_password END,
         updated_at       = NOW()
       WHERE id = $9 AND entreprise_id = $10 AND categorie != 'SuperAdmin'
       RETURNING id, login, categorie, perm_vente, perm_appro, perm_articles,
                 perm_facturation, perm_clients, actif`,
      [mdpHash, categorie, perm_vente, perm_appro, perm_articles,
       perm_facturation, perm_clients, actif, req.params.id, req.user.entreprise_id]
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
    // Vérifier que l'utilisateur existe ET appartient à la même entreprise
    // (et n'est pas le SuperAdmin plateforme)
    const check = await db.query(
      `SELECT id, login FROM utilisateurs WHERE id = $1 AND entreprise_id = $2 AND categorie != 'SuperAdmin'`,
      [targetId, req.user.entreprise_id]
    );
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

  // IMPORTANT MULTI-ENTREPRISES : chaque suppression/mise à jour est filtrée par
  // "entreprise_id = $1" — un Admin ne réinitialise QUE les données de sa propre
  // entreprise, jamais celles des autres sociétés clientes de la plateforme.
  const entId = req.user.entreprise_id;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Journal d'audit ───────────────────────────────────────
    if (modules.includes("audit"))
      await client.query("DELETE FROM audit_log WHERE entreprise_id = $1", [entId]);

    // ── 2. Lignes de vente ───────────────────────────────────────
    // Obligatoire si ventes OU factures OU articles (FK NOT NULL vers article)
    if (modules.includes("ventes") || modules.includes("factures") || modules.includes("articles"))
      await client.query("DELETE FROM lignes_vente WHERE entreprise_id = $1", [entId]);

    // ── 4. Factures ──────────────────────────────────────────────
    if (modules.includes("factures")) {
      if (!modules.includes("clients"))
        await client.query("UPDATE factures SET client_id = NULL WHERE entreprise_id = $1", [entId]);
      await client.query("DELETE FROM factures WHERE entreprise_id = $1", [entId]);
    }

    // ── 5. Achats ────────────────────────────────────────────────
    // Obligatoire aussi si articles (FK NOT NULL article_code)
    if (modules.includes("achats") || modules.includes("articles"))
      await client.query("DELETE FROM achats WHERE entreprise_id = $1", [entId]);

    // ── 6. Clients & Fournisseurs ────────────────────────────────
    if (modules.includes("clients")) {
      // Nullifier les FK qui pointent vers clients_fournisseurs si pas déjà supprimés
      if (!modules.includes("factures"))
        await client.query("UPDATE factures SET client_id = NULL WHERE entreprise_id = $1", [entId]);
      if (!modules.includes("achats"))
        await client.query("UPDATE achats SET fournisseur_id = NULL WHERE entreprise_id = $1", [entId]);
      await client.query("DELETE FROM clients_fournisseurs WHERE entreprise_id = $1", [entId]);
    }

    // ── 7. Articles ──────────────────────────────────────────────
    if (modules.includes("articles"))
      await client.query("DELETE FROM articles WHERE entreprise_id = $1", [entId]);

    // ── 8. Gammes ────────────────────────────────────────────────
    // FK : articles.gamme_code → gammes.code
    // Si articles pas supprimés, on nullifie d'abord le lien
    if (modules.includes("gammes")) {
      if (!modules.includes("articles"))
        await client.query("UPDATE articles SET gamme_code = NULL, unite_par_base = 1 WHERE entreprise_id = $1", [entId]);
      await client.query("DELETE FROM gammes WHERE entreprise_id = $1", [entId]);
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
