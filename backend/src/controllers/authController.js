// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const db     = require("../config/db");

// POST /api/auth/login
async function login(req, res) {
  try {
    const { login, mdp } = req.body;
    if (!login || !mdp)
      return res.status(400).json({ message: "Login et mot de passe requis." });

    // Chercher l'utilisateur (entreprise_id : NULL pour le SuperAdmin de
    // plateforme, sinon identifiant de l'entreprise cliente à laquelle il
    // appartient — détermine tout le cloisonnement des données).
    const result = await db.query(
      `SELECT u.id, u.login, u.mdp_hash, u.categorie, u.entreprise_id,
              u.perm_vente, u.perm_appro, u.perm_articles,
              u.perm_facturation, u.perm_clients, u.actif,
              e.nom AS entreprise_nom, e.actif AS entreprise_actif
       FROM utilisateurs u
       LEFT JOIN entreprises e ON e.id = u.entreprise_id
       WHERE u.login = $1`,
      [login]
    );

    const user = result.rows[0];
    if (!user)
      return res.status(401).json({ message: "Identifiants incorrects." });

    if (!user.actif)
      return res.status(401).json({ message: "Compte désactivé. Contactez l'administrateur." });

    // Si l'entreprise du compte a été suspendue par le SuperAdmin, on bloque
    // l'accès dès la connexion (le SuperAdmin lui-même n'a pas d'entreprise).
    if (user.entreprise_id !== null && user.entreprise_actif === false)
      return res.status(403).json({ message: "Votre espace entreprise est suspendu. Contactez l'administrateur de la plateforme." });

    const mdpOk = await bcrypt.compare(mdp, user.mdp_hash);
    if (!mdpOk)
      return res.status(401).json({ message: "Identifiants incorrects." });

    // Générer le JWT (expire en 8h par défaut)
    const payload = {
      id:               user.id,
      login:            user.login,
      categorie:        user.categorie,
      entreprise_id:    user.entreprise_id,
      perm_vente:       user.perm_vente,
      perm_appro:       user.perm_appro,
      perm_articles:    user.perm_articles,
      perm_facturation: user.perm_facturation,
      perm_clients:     user.perm_clients,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    // Log de connexion
    await db.query(
      `INSERT INTO audit_log (user_id, user_login, action, table_cible, ip_address, entreprise_id)
       VALUES ($1, $2, 'CONNEXION', 'utilisateurs', $3, $4)`,
      [user.id, user.login, req.ip, user.entreprise_id]
    );

    res.json({
      message: "Connexion réussie.",
      token,
      user: {
        id:            user.id,
        login:         user.login,
        categorie:     user.categorie,
        entreprise_id: user.entreprise_id,
        entreprise_nom: user.entreprise_nom || null,
        permissions: {
          vente:       user.perm_vente,
          appro:       user.perm_appro,
          articles:    user.perm_articles,
          facturation: user.perm_facturation,
          clients:     user.perm_clients,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// GET /api/auth/me — Infos de l'utilisateur connecté
async function me(req, res) {
  try {
    const result = await db.query(
      `SELECT id, login, categorie, entreprise_id,
              perm_vente, perm_appro, perm_articles,
              perm_facturation, perm_clients
       FROM utilisateurs WHERE id = $1 AND actif = TRUE`,
      [req.user.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ message: "Utilisateur introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// PUT /api/auth/password — Changer son propre mot de passe
// Disponible pour TOUT utilisateur connecté (y compris le SuperAdmin, qui
// n'a pas d'autre moyen de gérer son compte). Exige l'ancien mot de passe
// pour confirmer l'identité avant d'enregistrer le nouveau.
async function changePassword(req, res) {
  try {
    const { mdp_actuel, nouveau_mdp } = req.body;
    if (!mdp_actuel || !nouveau_mdp)
      return res.status(400).json({ message: "Mot de passe actuel et nouveau mot de passe requis." });
    if (nouveau_mdp.length < 4)
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 4 caractères." });

    const result = await db.query(`SELECT id, mdp_hash FROM utilisateurs WHERE id = $1`, [req.user.id]);
    const user = result.rows[0];
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const ok = await bcrypt.compare(mdp_actuel, user.mdp_hash);
    if (!ok)
      return res.status(401).json({ message: "Mot de passe actuel incorrect." });

    const hash = await bcrypt.hash(nouveau_mdp, 10);
    await db.query(`UPDATE utilisateurs SET mdp_hash = $1 WHERE id = $2`, [hash, user.id]);

    res.json({ message: "Mot de passe modifié avec succès." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { login, me, changePassword };
