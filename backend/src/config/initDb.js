// src/config/initDb.js — Initialise la base de données WariGest
// Usage : node src/config/initDb.js
require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Supporte DATABASE_URL (Railway) OU variables individuelles (local)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME     || "warigest_db",
      user:     process.env.DB_USER     || "warigest_user",
      password: process.env.DB_PASSWORD || "",
    });

async function init() {
  console.log("⏳ Initialisation de la base de données WariGest...");
  const sqlPath = path.join(__dirname, "../../sql/schema.sql");

  if (!fs.existsSync(sqlPath)) {
    console.error("❌ Fichier schema.sql introuvable :", sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await pool.query(sql);
    console.log("✅ Base de données initialisée avec succès !");
    console.log("   Tables : entreprises, entreprise_config, utilisateurs, articles, factures, lignes_vente, achats, clients_fournisseurs, audit_log");
    console.log("   Vue    : vue_stock");
    console.log("\n🔑 Aucun compte n'est créé par ce script.");
    console.log("   Démarrez le serveur (npm start) : le compte SUPERADMIN est créé");
    console.log("   automatiquement au premier démarrage (mot de passe affiché dans");
    console.log("   les logs, ou défini via SUPERADMIN_INITIAL_PASSWORD).");
  } catch (err) {
    console.error("❌ Erreur lors de l'initialisation :", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
