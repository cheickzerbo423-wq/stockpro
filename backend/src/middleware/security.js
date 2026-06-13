// src/middleware/security.js — En-têtes de sécurité HTTP + limitation de débit
//
// Implémentation "maison" sans dépendance externe (helmet / express-rate-limit) :
// le projet est déployé sur Railway via NIXPACKS + `npm ci`, qui exige que
// package-lock.json soit strictement synchronisé avec package.json. Ajouter
// une dépendance sans pouvoir exécuter `npm install` localement casserait le
// build. Ces deux middlewares reproduisent les protections essentielles avec
// du code Express natif.

// ── En-têtes de sécurité (équivalent allégé de Helmet) ──────────────────────
// - X-Content-Type-Options : empêche le navigateur de "deviner" un type MIME
//   différent de celui déclaré (protection contre certaines attaques XSS).
// - X-Frame-Options : empêche d'afficher l'API dans une <iframe> (clickjacking).
// - Referrer-Policy : limite les informations envoyées dans l'en-tête Referer.
// - Strict-Transport-Security : force HTTPS pour les futures requêtes (utile
//   même si Railway termine déjà le TLS, au cas où un proxy intermédiaire
//   redirige en HTTP).
// - X-Powered-By retiré : ne pas révéler "Express" inutilement.
function securityHeaders(req, res, next) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

// ── Limitation de débit sur /auth/login ──────────────────────────────────────
// Protège contre le bruteforce de mots de passe : au-delà de MAX_ATTEMPTS
// tentatives échouées ou non depuis une même IP sur une fenêtre de
// WINDOW_MS, renvoie 429 "Trop de tentatives" jusqu'à expiration de la fenêtre.
//
// Stockage en mémoire (Map) : suffisant pour une instance unique Railway.
// Si le service est mis à l'échelle horizontalement plus tard, remplacer par
// un store partagé (Redis) — la fonction reste isolée pour faciliter ce
// remplacement.
const WINDOW_MS    = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

const attempts = new Map(); // ip -> { count, resetAt }

function loginRateLimiter(req, res, next) {
  const now = Date.now();
  // Avec `trust proxy = 1` (server.js), Express dérive req.ip de
  // X-Forwarded-For de façon fiable (1 seul hop de proxy, celui de Railway).
  // Ne JAMAIS retomber sur req.headers["x-forwarded-for"] directement : cet
  // en-tête est entièrement contrôlé par le client et permettrait à un
  // attaquant de changer de "clé" à chaque tentative pour contourner la
  // limite (en-tête falsifié, valeur différente à chaque requête).
  const ip = req.ip || req.socket?.remoteAddress || "unknown";

  // Nettoyage opportuniste des entrées expirées pour éviter une fuite mémoire
  // sur un serveur de longue durée (pas de tâche planifiée nécessaire).
  if (attempts.size > 5000) {
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(key);
    }
  }

  let entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
    });
  }

  next();
}

module.exports = { securityHeaders, loginRateLimiter };
