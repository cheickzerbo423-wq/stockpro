// src/middleware/auth.js — Vérification JWT + Permissions
const jwt = require("jsonwebtoken");
const db  = require("../config/db");

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
    const check = await db.query(
      "SELECT id FROM utilisateurs WHERE id = $1 AND actif = TRUE",
      [decoded.id]
    );
    if (check.rows.length === 0) {
      return res.status(401).json({ message: "Compte supprimé ou désactivé. Reconnectez-vous." });
    }

    req.user = decoded;
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

module.exports = { authenticate, authorize };
