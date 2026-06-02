// src/server.js — Point d'entrée principal de StockPro API
require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const routes = require("./routes/index");

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL || "*"
    : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Log des requêtes en développement
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================
// ROUTES API
// ============================================================
app.use("/api", routes);

// Route de santé — pour vérifier que le serveur tourne
app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    app:    "StockPro API",
    version: "1.0.0",
    time:   new Date().toISOString(),
    env:    process.env.NODE_ENV || "development",
  });
});

// Route racine
app.get("/", (_req, res) => {
  res.json({
    message: "Bienvenue sur l'API StockPro",
    version: "1.0.0",
    docs:    "/api/...",
    health:  "/health",
  });
});

// ============================================================
// GESTION DES ERREURS 404
// ============================================================
app.use((_req, res) => {
  res.status(404).json({ message: "Route introuvable." });
});

// ============================================================
// GESTION DES ERREURS GLOBALES
// ============================================================
app.use((err, _req, res, _next) => {
  console.error("Erreur non gérée :", err.stack || err.message);
  res.status(500).json({ message: "Erreur interne du serveur." });
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════════╗");
  console.log(`║  StockPro API  — v1.0.0                ║`);
  console.log(`║  Port    : ${PORT}                          ║`);
  console.log(`║  Env     : ${(process.env.NODE_ENV || "development").padEnd(27)}║`);
  console.log("╚════════════════════════════════════════╝\n");
  console.log("  GET  /health           → Santé du serveur");
  console.log("  POST /api/auth/login   → Connexion");
  console.log("  GET  /api/dashboard    → Tableau de bord");
  console.log("  GET  /api/articles     → Articles & Stock");
  console.log("  POST /api/ventes       → Nouvelle vente");
  console.log("  GET  /api/factures/:code/pdf → PDF facture\n");
});
