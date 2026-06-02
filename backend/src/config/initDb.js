// src/config/initDb.js — Initialise la base de données
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

async function init() {
  console.log("⏳ Initialisation de la base de données StockPro...");
  const sql = fs.readFileSync(
    path.join(__dirname, "../../sql/schema.sql"),
    "utf8"
  );
  try {
    await pool.query(sql);
    console.log("✅ Base de données initialisée avec succès !");
    console.log("   - Tables créées : utilisateurs, articles, factures, lignes_vente, achats, clients_fournisseurs, devis, audit_log");
    console.log("   - Vue créée : vue_stock");
    console.log("   - Données de démo insérées");
    console.log("\n🔑 Connexion admin par défaut :");
    console.log("   Login    : admin");
    console.log("   Mot de passe : admin123  ← CHANGEZ-LE IMMÉDIATEMENT !");
  } catch (err) {
    console.error("❌ Erreur lors de l'initialisation :", err);
  } finally {
    await pool.end();
  }
}

init();
