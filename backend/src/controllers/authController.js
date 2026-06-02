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

    // Chercher l'utilisateur
    const result = await db.query(
      `SELECT id, login, mdp_hash, categorie,
              perm_vente, perm_appro, perm_articles,
              perm_facturation, perm_clients, actif
       FROM utilisateurs WHERE login = $1`,
      [login]
    );

    const user = result.rows[0];
    if (!user)
      return res.status(401).json({ message: "Identifiants incorrects." });

    if (!user.actif)
      return res.status(401).json({ message: "Compte désactivé. Contactez l'administrateur." });

    const mdpOk = await bcrypt.compare(mdp, user.mdp_hash);
    if (!mdpOk)
      return res.status(401).json({ message: "Identifiants incorrects." });

    // Générer le JWT (expire en 8h par défaut)
    const payload = {
      id:               user.id,
      login:            user.login,
      categorie:        user.categorie,
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
      `INSERT INTO audit_log (user_id, user_login, action, table_cible, ip_address)
       VALUES ($1, $2, 'CONNEXION', 'utilisateurs', $3)`,
      [user.id, user.login, req.ip]
    );

    res.json({
      message: "Connexion réussie.",
      token,
      user: {
        id:       user.id,
        login:    user.login,
        categorie: user.categorie,
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
      `SELECT id, login, categorie,
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

module.exports = { login, me };
