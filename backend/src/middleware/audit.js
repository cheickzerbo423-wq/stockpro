// src/middleware/audit.js — Journal automatique des actions
const db = require("../config/db");

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
              JSON.stringify({ body: req.body, params: req.params }).slice(0, 500),
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
