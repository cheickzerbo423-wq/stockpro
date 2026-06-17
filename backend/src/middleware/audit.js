// src/middleware/audit.js — Journal automatique des actions
const db = require("../config/db");

// Champs sensibles à ne jamais écrire en clair dans le journal d'audit.
const SENSITIVE_FIELDS = ["mdp", "mdp_hash", "password", "ancien_mdp", "nouveau_mdp", "admin_mdp"];

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_FIELDS.includes(key.toLowerCase()) ? "***" : sanitize(val);
    }
    return out;
  }
  return value;
}

function audit(action, table) {
  return async (req, res, next) => {
    // On laisse passer la requête, puis on log après la réponse
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode < 400 && req.user) {
        try {
          await db.query(
            `INSERT INTO audit_log (user_id, user_login, action, table_cible, detail, ip_address, entreprise_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user.id,
              req.user.login,
              action,
              table,
              JSON.stringify({ body: sanitize(req.body), params: req.params }).slice(0, 500),
              req.ip || req.connection?.remoteAddress,
              req.user.entreprise_id ?? null,
            ]
          );
        } catch (e) {
          // Ne jamais bloquer la réponse pour un problème de log
          console.error("Audit log error:", e.message);
        }
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = audit;
