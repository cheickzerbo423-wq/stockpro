// reset_superadmin.js — Réinitialise le mot de passe du compte SuperAdmin
// ---------------------------------------------------------------------------
// Le mot de passe du SuperAdmin n'est posé qu'à sa toute première création
// (db.js, ON CONFLICT DO NOTHING). Changer SUPERADMIN_INITIAL_PASSWORD après
// coup n'a donc aucun effet : il faut réécrire directement la ligne en base.
// Ce script le fait, en se connectant comme l'application.
//
// IMPORTANT : il agit sur la base pointée par DATABASE_URL. Pour cibler la
// base de PRODUCTION, lance-le de préférence depuis Railway :
//     railway run node reset_superadmin.js
// (ou en local avec un .env dont DATABASE_URL pointe sur la base de prod).
//
// Mot de passe appliqué : variable NEW_SUPERADMIN_PASSWORD si définie,
// sinon la valeur par défaut ci-dessous (conforme à la politique : 8+ car.,
// majuscule, minuscule, chiffre, caractère spécial).
// ---------------------------------------------------------------------------
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const NEW_PASSWORD = process.env.NEW_SUPERADMIN_PASSWORD || "Super@Admin2026";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL n'est pas défini.");
  console.error("   Lance via Railway (railway run node reset_superadmin.js)");
  console.error("   ou avec un .env dont DATABASE_URL pointe sur la base de prod.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

(async () => {
  try {
    const hash = await bcrypt.hash(NEW_PASSWORD, 10);
    const r = await pool.query(
      `UPDATE utilisateurs
          SET mdp_hash = $1, actif = TRUE, must_change_password = FALSE
        WHERE login = 'superadmin' AND categorie = 'SuperAdmin'
        RETURNING id, login`,
      [hash]
    );

    if (r.rowCount === 0) {
      console.log("⚠️  Aucun compte 'superadmin' trouvé dans CETTE base.");
      console.log("   → DATABASE_URL ne pointe probablement pas sur la base de production.");
      console.log("   → Lance le script depuis Railway : railway run node reset_superadmin.js");
    } else {
      console.log("════════════════════════════════════════");
      console.log("✅ Mot de passe SuperAdmin réinitialisé");
      console.log("   login : superadmin");
      console.log("   mdp   : " + NEW_PASSWORD);
      console.log("   (connexion directe, sans changement forcé)");
      console.log("════════════════════════════════════════");
    }
    await pool.end();
  } catch (e) {
    console.error("❌ Erreur :", e.message);
    process.exit(1);
  }
})();
