// src/config/db.js — Connexion PostgreSQL
require("dotenv").config();
const { Pool } = require("pg");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME     || "stockpro_db",
      user:     process.env.DB_USER     || "stockpro_user",
      password: process.env.DB_PASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Erreur inattendue sur le pool PostgreSQL :", err);
});

// Test de connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Impossible de se connecter à PostgreSQL :", err.message);
    return;
  }
  release();
  console.log("✅ Connecté à PostgreSQL — Base :", process.env.DB_NAME);
});

module.exports = pool;
