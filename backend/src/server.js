// src/server.js — Point d'entrée principal de WariGest API
require("dotenv").config();
const express = require("express");
const cors    = require("cors");

// ============================================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================================
const REQUIRED_VARS = ["JWT_SECRET"];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error("❌ Variables d'environnement manquantes :", missing.join(", "));
  console.error("   Définissez-les dans Railway > Variables.");
  process.exit(1);
}

const routes = require("./routes/index");
const { securityHeaders } = require("./middleware/security");

const app  = express();
const PORT = process.env.PORT || 3000;

// Active "trust proxy" : Railway place l'app derrière un reverse-proxy, donc
// req.ip refléterait l'IP du proxy sans ce réglage — important pour que le
// rate-limiting sur /auth/login s'applique par IP client réelle et non par
// l'IP unique du proxy (qui bloquerait tous les utilisateurs ensemble).
app.set("trust proxy", 1);

// En-têtes de sécurité HTTP sur toutes les réponses (cf. middleware/security.js)
app.use(securityHeaders);

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================

// CORS — autorise le frontend Vercel + localhost dev
const allowedOrigins = [
  "https://stockpro-omega.vercel.app",
  "https://warigest.vercel.app",
  /\.vercel\.app$/,        // tous les sous-domaines Vercel
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, Railway healthcheck, proxy Vercel)
    if (!origin) return callback(null, true);
    const ok = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    if (ok) return callback(null, true);
    // En développement on autorise tout
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

// Limite à 2 Mo : suffisant pour le logo d'entreprise (envoyé en base64,
// redimensionné à 320px côté client avant envoi).
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Log de toutes les requêtes (utile pour déboguer Railway)
app.use((req, _res, next) => {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// ROUTES API
// ============================================================
app.use("/api", routes);

// Route de santé — pour vérifier que le serveur tourne
app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    app:    "WariGest API",
    version: "1.0.0",
    time:   new Date().toISOString(),
    env:    process.env.NODE_ENV || "development",
    db:     process.env.DATABASE_URL ? "Railway (URL)" : "Variables individuelles",
  });
});

// Route racine
app.get("/", (_req, res) => {
  res.json({
    message: "Bienvenue sur l'API WariGest",
    version: "1.0.0",
    health:  "/health",
    login:   "POST /api/auth/login",
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
  if (err.message?.includes("CORS")) {
    return res.status(403).json({ message: "Accès CORS refusé." });
  }
  res.status(500).json({ message: "Erreur interne du serveur." });
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n╔════════════════════════════════════════╗");
  console.log(`║  WariGest API  — v1.0.0                ║`);
  console.log(`║  Port    : ${PORT}                          ║`);
  console.log(`║  Env     : ${(process.env.NODE_ENV || "development").padEnd(27)}║`);
  console.log(`║  DB      : ${(process.env.DATABASE_URL ? "Railway URL" : "Localhost").padEnd(27)}║`);
  console.log("╚════════════════════════════════════════╝\n");
});
