// src/middleware/auth.js — Vérification JWT + Permissions
const jwt = require("jsonwebtoken");
const db  = require("../config/db");

// Routes accessibles même si l'utilisateur doit changer son mot de passe
// (must_change_password = TRUE) : consulter son profil et le modifier.
const ROUTES_AUTORISEES_CHANGEMENT_MDP = new Set(["/auth/me", "/auth/password"]);

// Vérifie que le token JWT est valide ET que l'utilisateur existe toujours en base
async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Accès refusé. Token manquant." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifie que le compte existe encore (supprimé par un admin → 401 immédiat)
    // et relit categorie/permissions/must_change_password à jour depuis la base
    // — ces valeurs ne doivent PAS rester figées telles qu'au moment du login,
    // sinon un retrait de permission ou une rétrogradation par un Admin ne
    // prendrait effet qu'à l'expiration du token (jusqu'à 8h).
    const check = await db.query(
      `SELECT id, entreprise_id, categorie,
              perm_vente, perm_appro, perm_articles, perm_facturation, perm_clients,
              must_change_password
       FROM utilisateurs WHERE id = $1 AND actif = TRUE`,
      [decoded.id]
    );
    if (check.rows.length === 0) {
      return res.status(401).json({ message: "Compte supprimé ou désactivé. Reconnectez-vous." });
    }

    const row = check.rows[0];

    // Multi-entreprises : si le compte est rattaché à une entreprise (tout le
    // monde sauf le SuperAdmin, dont entreprise_id = NULL), on vérifie que
    // cette entreprise est toujours active. Une entreprise suspendue par le
    // SuperAdmin coupe immédiatement l'accès de tous ses utilisateurs.
    const entrepriseId = row.entreprise_id;
    if (entrepriseId !== null && entrepriseId !== undefined) {
      const ent = await db.query("SELECT actif FROM entreprises WHERE id = $1", [entrepriseId]);
      if (ent.rows.length === 0 || ent.rows[0].actif === false) {
        return res.status(403).json({ message: "Votre espace entreprise est suspendu. Contactez l'administrateur de la plateforme." });
      }
    }

    // Fusionne le payload du token (id, login...) avec les valeurs à jour
    // lues en base (categorie, permissions, must_change_password).
    req.user = {
      ...decoded,
      entreprise_id:    row.entreprise_id,
      categorie:        row.categorie,
      perm_vente:       row.perm_vente,
      perm_appro:       row.perm_appro,
      perm_articles:    row.perm_articles,
      perm_facturation: row.perm_facturation,
      perm_clients:     row.perm_clients,
      must_change_password: row.must_change_password,
    };

    // Si l'utilisateur doit changer son mot de passe, on bloque tout sauf la
    // consultation/modification de son profil — l'application du côté
    // frontend (ForcePasswordChange) ne suffit pas, l'API doit aussi protéger
    // l'accès (ex. appel direct via un client externe avec un token valide).
    if (row.must_change_password && !ROUTES_AUTORISEES_CHANGEMENT_MDP.has(req.path)) {
      return res.status(403).json({
        message: "Vous devez changer votre mot de passe avant de continuer.",
        must_change_password: true,
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré. Reconnectez-vous." });
  }
}

// Vérifie les permissions par module
function authorize(module) {
  return (req, res, next) => {
    const permKey = `perm_${module}`;
    if (req.user.categorie === "Admin" || req.user[permKey]) {
      return next();
    }
    return res.status(403).json({
      message: `Accès interdit. Vous n'avez pas la permission sur le module "${module}".`
    });
  };
}

// Réservé au SuperAdmin de plateforme (entreprise_id = NULL, categorie = "SuperAdmin")
// — gère l'ensemble des entreprises clientes depuis la page Super-admin.
function superAdminOnly(req, res, next) {
  if (req.user?.categorie === "SuperAdmin") return next();
  return res.status(403).json({ message: "Accès réservé au super-administrateur de la plateforme." });
}

// Réservé aux administrateurs de l'entreprise (categorie === "Admin").
// Utilisé pour la gestion des utilisateurs et la réinitialisation des données.
function adminOnly(req, res, next) {
  if (req.user?.categorie === "Admin") return next();
  return res.status(403).json({ message: "Réservé aux administrateurs." });
}

module.exports = { authenticate, authorize, superAdminOnly, adminOnly };
