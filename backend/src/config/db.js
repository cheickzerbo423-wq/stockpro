// src/config/db.js — Connexion PostgreSQL
require("dotenv").config();
const { Pool } = require("pg");

// Supporte DATABASE_URL (Railway/Heroku) ou variables individuelles
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME     || "warigest_db",
      user:     process.env.DB_USER     || "warigest_user",
      password: process.env.DB_PASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Erreur inattendue sur le pool PostgreSQL :", err);
});

// Filet de sécurité : si une connexion reste bloquée "idle in transaction"
// (BEGIN sans COMMIT/ROLLBACK, suite à un bug applicatif), PostgreSQL la
// termine automatiquement après 30s — ce qui libère la connexion et les
// verrous au lieu de bloquer en cascade tout le reste de l'application.
pool.on("connect", (client) => {
  client.query("SET idle_in_transaction_session_timeout = 30000").catch(() => {});
});

// Test de connexion au démarrage + nettoyage des connexions "zombies"
// (sessions restées "idle in transaction" suite à un ancien bug applicatif :
// elles bloquent des verrous et saturent le pool tant qu'elles ne sont pas
// fermées. On les termine une bonne fois au démarrage du serveur.)
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Impossible de se connecter à PostgreSQL :", err.message);
    return;
  }
  console.log("✅ Connecté à PostgreSQL — Base :", process.env.DB_NAME);

  client.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'idle in transaction'
       AND pid <> pg_backend_pid()
       AND datname = current_database()`
  )
    .then((r) => {
      if (r.rowCount > 0)
        console.log(`🧹 ${r.rowCount} connexion(s) "idle in transaction" nettoyée(s) au démarrage.`);
    })
    .catch((e) => console.error("Nettoyage connexions zombies — ignoré :", e.message))
    .finally(() => {
      // Migration légère : la table "achats" a été créée avant l'ajout du
      // suivi mensuel/annuel (filtres "mois"/"annee" dans achatsController).
      // IF NOT EXISTS rend l'opération idempotente — sûre à rejouer à chaque
      // démarrage, sans script de migration séparé à exécuter manuellement.
      client.query(
        `ALTER TABLE achats ADD COLUMN IF NOT EXISTS mois  VARCHAR(20);
         ALTER TABLE achats ADD COLUMN IF NOT EXISTS annee INTEGER;`
      )
        .then(() => console.log("✅ Schéma 'achats' vérifié (colonnes mois/annee OK)."))
        .catch((e) => console.error("⚠️  Migration achats (mois/annee) ignorée :", e.message))
        .finally(() => release());
    });
});

module.exports = pool;
