// src/controllers/entrepriseController.js
// Configuration "entreprise" personnalisable par chaque société qui utilise
// WariGest : nom, adresse, téléphone, email, devise, logo et couleur d'accent.
//
// MULTI-ENTREPRISES : la table contient désormais UNE LIGNE PAR ENTREPRISE
// cliente (colonne "entreprise_id", contrainte UNIQUE — voir migration dans
// db.js). On lit/écrit toujours la ligne de l'entreprise de l'utilisateur
// connecté (req.user.entreprise_id), jamais la ligne id = 1 globale. Lue par
// tous les utilisateurs connectés (pour afficher le branding dans l'appli) et
// modifiable par les admins de leur propre entreprise uniquement — ces
// réglages sont ensuite appliqués automatiquement aux factures, reçus et
// rapports PDF générés (voir utils/entrepriseConfig.js).
const db = require("../config/db");
const { VALID_STYLE_IDS, DEFAULT_STYLE, STYLE_CATALOG, LAYOUTS, PALETTES } = require("../utils/pdfStyles");

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
// ~2 Mo de base64 ≈ logo raisonnable pour un en-tête de PDF (déjà redimensionné côté client)
const MAX_LOGO_LEN = 2_800_000;

// GET /api/entreprise — accessible à tout utilisateur connecté
async function getConfig(req, res) {
  try {
    const r = await db.query("SELECT * FROM entreprise_config WHERE entreprise_id = $1", [req.user.entreprise_id]);
    res.json(r.rows[0] || {});
  } catch (err) {
    console.error("getConfig entreprise error:", err);
    res.status(500).json({ message: "Erreur lors du chargement de la configuration." });
  }
}

// PUT /api/entreprise — réservé aux administrateurs (de leur propre entreprise)
async function updateConfig(req, res) {
  try {
    if (req.user.categorie !== "Admin")
      return res.status(403).json({ message: "Réservé aux administrateurs." });

    const { nom, adresse, telephone, email, devise, couleur, logo, pied_de_page,
            facture_style, recu_style, rapport_style } = req.body;

    if (couleur && !HEX_RE.test(couleur))
      return res.status(400).json({ message: "Couleur invalide. Format attendu : #RRGGBB (ex: #0023FF)." });

    if (logo && typeof logo === "string" && logo.length > MAX_LOGO_LEN)
      return res.status(400).json({ message: "Logo trop volumineux (2 Mo maximum)." });

    if (logo && typeof logo === "string" && !/^data:image\/(png|jpe?g|webp);base64,/i.test(logo.trim()))
      return res.status(400).json({ message: "Format de logo invalide. Utilisez une image PNG, JPEG ou WebP." });

    // Styles de documents PDF : on ignore silencieusement toute valeur
    // inconnue et on retombe sur le style par défaut (catalogue pdfStyles.js).
    const fStyle = VALID_STYLE_IDS.has(facture_style) ? facture_style : DEFAULT_STYLE;
    const rStyle = VALID_STYLE_IDS.has(recu_style)    ? recu_style    : DEFAULT_STYLE;
    const pStyle = VALID_STYLE_IDS.has(rapport_style) ? rapport_style : DEFAULT_STYLE;

    // ON CONFLICT (entreprise_id) : une ligne de config par entreprise (contrainte
    // unique "entreprise_config_entreprise_unique" ajoutée par la migration).
    const result = await db.query(
      `INSERT INTO entreprise_config (entreprise_id, nom, adresse, telephone, email, devise, couleur, logo, pied_de_page, facture_style, recu_style, rapport_style, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (entreprise_id) DO UPDATE SET
         nom           = EXCLUDED.nom,
         adresse       = EXCLUDED.adresse,
         telephone     = EXCLUDED.telephone,
         email         = EXCLUDED.email,
         devise        = EXCLUDED.devise,
         couleur       = EXCLUDED.couleur,
         logo          = EXCLUDED.logo,
         pied_de_page  = EXCLUDED.pied_de_page,
         facture_style = EXCLUDED.facture_style,
         recu_style    = EXCLUDED.recu_style,
         rapport_style = EXCLUDED.rapport_style,
         updated_at    = NOW()
       RETURNING *`,
      [
        req.user.entreprise_id,
        (nom || "").trim() || null,
        (adresse || "").trim() || null,
        (telephone || "").trim() || null,
        (email || "").trim() || null,
        (devise || "FCFA").trim() || "FCFA",
        couleur || "#0023FF",
        logo || null,
        (pied_de_page || "").trim() || null,
        fStyle, rStyle, pStyle,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateConfig entreprise error:", err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la configuration." });
  }
}

// GET /api/entreprise/pdf-styles — catalogue des styles disponibles pour
// personnaliser factures, reçus et rapports (galerie dans Paramètres).
async function getPdfStyles(req, res) {
  res.json({ catalog: STYLE_CATALOG, layouts: LAYOUTS, palettes: PALETTES });
}

module.exports = { getConfig, updateConfig, getPdfStyles };
