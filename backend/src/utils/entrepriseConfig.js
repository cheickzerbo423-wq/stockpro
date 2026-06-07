// src/utils/entrepriseConfig.js
// Charge la configuration "entreprise" personnalisable (nom, logo, couleur, etc.)
// utilisée pour générer les factures, reçus et rapports PDF.
//
// MULTI-ENTREPRISES : la table "entreprise_config" contient désormais UNE LIGNE
// PAR ENTREPRISE cliente (colonne "entreprise_id", contrainte UNIQUE), et non
// plus une seule ligne globale (id = 1). Chaque entreprise renseigne ses propres
// informations depuis la page Paramètres (admin) — on garde les variables
// d'environnement COMPANY_* comme valeurs de repli pour les entreprises qui
// n'ont pas encore configuré leurs informations depuis l'interface.
const db = require("../config/db");

const DEFAULTS = {
  nom:          process.env.COMPANY_NAME    || "WariGest",
  adresse:      process.env.COMPANY_ADDRESS || "",
  telephone:    process.env.COMPANY_PHONE   || "",
  email:        process.env.COMPANY_EMAIL   || "",
  devise:       process.env.COMPANY_DEVISE  || "FCFA",
  couleur:      "#0023FF",
  logo:         null,
  pied_de_page: "",
};

// `entrepriseId` : identifiant de l'entreprise cliente (req.user.entreprise_id).
// Conserve un repli sur l'ancienne ligne singleton (id = 1) si jamais aucune
// ligne n'existe encore pour cette entreprise — ce qui ne devrait plus arriver
// après la migration (chaque entreprise existante a été rattachée à id = 1).
async function getEntrepriseConfig(entrepriseId) {
  try {
    const r = entrepriseId
      ? await db.query("SELECT * FROM entreprise_config WHERE entreprise_id = $1", [entrepriseId])
      : await db.query("SELECT * FROM entreprise_config WHERE id = 1");
    const c = r.rows[0];
    if (!c) return { ...DEFAULTS };
    return {
      nom:          c.nom          || DEFAULTS.nom,
      adresse:      c.adresse      ?? DEFAULTS.adresse,
      telephone:    c.telephone    ?? DEFAULTS.telephone,
      email:        c.email        ?? DEFAULTS.email,
      devise:       c.devise       || DEFAULTS.devise,
      couleur:      /^#[0-9A-Fa-f]{6}$/.test(c.couleur || "") ? c.couleur : DEFAULTS.couleur,
      logo:         c.logo         || null,
      pied_de_page: c.pied_de_page ?? DEFAULTS.pied_de_page,
    };
  } catch (e) {
    // Table pas encore créée (ancien déploiement) ou erreur réseau —
    // on retombe sur les variables d'environnement / valeurs par défaut.
    return { ...DEFAULTS };
  }
}

// Convertit un logo enregistré en data-URI base64 ("data:image/png;base64,...")
// en Buffer exploitable par PDFKit (doc.image). Retourne null si absent/invalide.
function logoBuffer(logo) {
  if (!logo || typeof logo !== "string") return null;
  try {
    const m = /^data:image\/(?:png|jpe?g|webp);base64,(.+)$/i.exec(logo.trim());
    const raw = m ? m[1] : logo;
    const buf = Buffer.from(raw, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

module.exports = { getEntrepriseConfig, logoBuffer };
