// src/controllers/superadminController.js
//
// Pilotage de la plateforme multi-entreprises par le SuperAdmin : créer,
// renommer, suspendre/réactiver, gérer les abonnements et supprimer des
// espaces "entreprise" (= les sociétés clientes de WariGest), avec une
// vue d'ensemble de l'activité de chacune. Toutes les routes de ce
// contrôleur sont protégées par le middleware `superAdminOnly`
// (categorie = 'SuperAdmin').
const bcrypt = require("bcryptjs");
const db     = require("../config/db");
const { isPasswordValid, PASSWORD_MESSAGE } = require("../utils/passwordPolicy");

const SLUG_RE = /[^a-z0-9]+/g;
function slugify(nom) {
  return (nom || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // accents
    .replace(SLUG_RE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "entreprise";
}

const TYPES_VALIDES = ["essai", "mensuel", "annuel", "illimite"];

// GET /api/superadmin/entreprises — liste de toutes les entreprises + stats
async function getAll(req, res) {
  try {
    const result = await db.query(`
      SELECT
        e.id, e.nom, e.slug, e.actif,
        e.abonnement_type, e.abonnement_debut, e.abonnement_fin,
        e.created_at, e.updated_at,
        COALESCE((SELECT COUNT(*) FROM utilisateurs          WHERE entreprise_id = e.id AND actif = TRUE), 0)::int  AS nb_utilisateurs,
        COALESCE((SELECT COUNT(*) FROM articles              WHERE entreprise_id = e.id AND actif = TRUE), 0)::int  AS nb_articles,
        COALESCE((SELECT COUNT(*) FROM clients_fournisseurs  WHERE entreprise_id = e.id AND actif = TRUE), 0)::int  AS nb_contacts,
        COALESCE((SELECT COUNT(*) FROM factures              WHERE entreprise_id = e.id), 0)::int                   AS nb_factures,
        COALESCE((SELECT SUM(montant) FROM factures          WHERE entreprise_id = e.id), 0)::bigint                AS ca_total,
        COALESCE((SELECT SUM(reste)   FROM factures          WHERE entreprise_id = e.id AND statut = FALSE), 0)::bigint AS creances,
        (SELECT MAX(created_at) FROM audit_log WHERE entreprise_id = e.id AND action = 'CONNEXION') AS derniere_connexion
      FROM entreprises e
      ORDER BY e.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("superadmin getAll error:", err);
    res.status(500).json({ message: "Erreur lors du chargement des entreprises." });
  }
}

// POST /api/superadmin/entreprises — créer une entreprise + son premier compte Admin
async function create(req, res) {
  const client = await db.connect();
  try {
    const { nom, admin_login, admin_mdp, abonnement_type, abonnement_debut, abonnement_fin } = req.body;
    if (!nom || !nom.trim())
      return res.status(400).json({ message: "Le nom de l'entreprise est obligatoire." });
    if (!admin_login || !admin_mdp)
      return res.status(400).json({ message: "Login et mot de passe du premier administrateur sont obligatoires." });
    if (!isPasswordValid(admin_mdp))
      return res.status(400).json({ message: PASSWORD_MESSAGE });

    const typeAbo = TYPES_VALIDES.includes(abonnement_type) ? abonnement_type : "mensuel";

    // Le login reste GLOBALEMENT unique sur la plateforme.
    const exists = await db.query(`SELECT id FROM utilisateurs WHERE login = $1`, [admin_login]);
    if (exists.rows.length > 0)
      return res.status(409).json({ message: `Le login "${admin_login}" est déjà utilisé.` });

    await client.query("BEGIN");

    const nomTrim = nom.trim();
    let slug = slugify(nomTrim);
    const slugCheck = await client.query(`SELECT id FROM entreprises WHERE slug = $1`, [slug]);
    if (slugCheck.rows.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

    const ent = await client.query(
      `INSERT INTO entreprises (nom, slug, actif, abonnement_type, abonnement_debut, abonnement_fin)
       VALUES ($1, $2, TRUE, $3, $4, $5) RETURNING *`,
      [nomTrim, slug, typeAbo, abonnement_debut || null, abonnement_fin || null]
    );
    const entreprise = ent.rows[0];

    const hash = await bcrypt.hash(admin_mdp, 10);
    const user = await client.query(
      `INSERT INTO utilisateurs (login, mdp_hash, categorie, entreprise_id,
         perm_vente, perm_appro, perm_articles, perm_facturation, perm_clients)
       VALUES ($1, $2, 'Admin', $3, TRUE, TRUE, TRUE, TRUE, TRUE)
       RETURNING id, login, categorie`,
      [admin_login, hash, entreprise.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ entreprise, admin: user.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("superadmin create error:", err);
    res.status(500).json({ message: "Erreur lors de la création de l'entreprise." });
  } finally {
    client.release();
  }
}

// PUT /api/superadmin/entreprises/:id — renommer une entreprise
async function update(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ message: "Identifiant d'entreprise invalide." });

    const { nom } = req.body;
    if (!nom || !nom.trim())
      return res.status(400).json({ message: "Le nom de l'entreprise est obligatoire." });

    const result = await db.query(
      `UPDATE entreprises SET nom = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [nom.trim(), id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Entreprise introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("superadmin update error:", err);
    res.status(500).json({ message: "Erreur lors de la modification." });
  }
}

// PUT /api/superadmin/entreprises/:id/abonnement — gérer l'abonnement
async function updateAbonnement(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ message: "Identifiant d'entreprise invalide." });

    const { abonnement_type, abonnement_debut, abonnement_fin } = req.body;

    if (abonnement_type && !TYPES_VALIDES.includes(abonnement_type))
      return res.status(400).json({ message: `Type d'abonnement invalide. Valeurs acceptées : ${TYPES_VALIDES.join(", ")}.` });

    const result = await db.query(
      `UPDATE entreprises
       SET abonnement_type  = COALESCE($1, abonnement_type),
           abonnement_debut = $2,
           abonnement_fin   = $3,
           updated_at       = NOW()
       WHERE id = $4 RETURNING *`,
      [
        abonnement_type || null,
        abonnement_debut || null,
        abonnement_fin   || null,
        id
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Entreprise introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("superadmin updateAbonnement error:", err);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'abonnement." });
  }
}

// PUT /api/superadmin/entreprises/:id/statut — activer ou suspendre une entreprise
async function toggleStatut(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ message: "Identifiant d'entreprise invalide." });

    const { actif } = req.body;
    if (typeof actif !== "boolean")
      return res.status(400).json({ message: "Le champ 'actif' (booléen) est requis." });
    if (id === 1 && actif === false)
      return res.status(400).json({ message: "L'entreprise par défaut ne peut pas être suspendue." });

    const result = await db.query(
      `UPDATE entreprises SET actif = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [actif, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Entreprise introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("superadmin toggleStatut error:", err);
    res.status(500).json({ message: "Erreur lors du changement de statut." });
  }
}

// DELETE /api/superadmin/entreprises/:id — suppression complète et définitive
async function remove(req, res) {
  const client = await db.connect();
  try {
    const id = parseInt(req.params.id);
    if (id === 1)
      return res.status(400).json({ message: "L'entreprise par défaut ne peut pas être supprimée." });

    const check = await db.query(`SELECT id, nom FROM entreprises WHERE id = $1`, [id]);
    if (check.rows.length === 0)
      return res.status(404).json({ message: "Entreprise introuvable." });

    await client.query("BEGIN");

    // 1) Désamorcer les références croisées (FK nullable)
    await client.query(`UPDATE factures  SET client_id = NULL      WHERE entreprise_id = $1`, [id]);
    await client.query(`UPDATE achats    SET fournisseur_id = NULL WHERE entreprise_id = $1`, [id]);
    await client.query(`UPDATE audit_log SET user_id = NULL        WHERE entreprise_id = $1`, [id]);

    // 2) Supprimer les données métier (ordre : enfants avant parents)
    await client.query(`DELETE FROM lignes_vente         WHERE entreprise_id = $1`, [id]);
    await client.query(`DELETE FROM factures             WHERE entreprise_id = $1`, [id]);
    await client.query(`DELETE FROM achats               WHERE entreprise_id = $1`, [id]);
    await client.query(`DELETE FROM clients_fournisseurs WHERE entreprise_id = $1`, [id]);
    await client.query(`DELETE FROM articles             WHERE entreprise_id = $1`, [id]);
    await client.query(`DELETE FROM audit_log            WHERE entreprise_id = $1`, [id]);
    await client.query(`DELETE FROM entreprise_config    WHERE entreprise_id = $1`, [id]);

    // 3) Supprimer les comptes utilisateurs de cette entreprise
    await client.query(`DELETE FROM utilisateurs WHERE entreprise_id = $1`, [id]);

    // 4) Supprimer l'entreprise elle-même
    await client.query(`DELETE FROM entreprises WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.json({ message: `Entreprise "${check.rows[0].nom}" et toutes ses données ont été supprimées définitivement.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("superadmin remove error:", err);
    res.status(500).json({ message: "Erreur lors de la suppression de l'entreprise." });
  } finally {
    client.release();
  }
}

module.exports = { getAll, create, update, updateAbonnement, toggleStatut, remove };
