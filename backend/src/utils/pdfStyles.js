// src/utils/pdfStyles.js
// Catalogue des styles de documents PDF (factures, reçus, rapports financiers).
//
// Un "style" = une mise en page (layout) + une palette de couleurs.
// 6 mises en page distinctes × 5 palettes = 30 combinaisons, chacune avec un
// identifiant stable ("layout-palette", ex: "moderne-emeraude") stocké dans
// entreprise_config.facture_style / recu_style / rapport_style.
//
// Les fonctions de génération PDF (facturesController, rapportsController)
// appellent getStyle(id) pour récupérer { layout, palette }, puis dispatchent
// vers le renderer correspondant au layout, en lui passant la palette.

// ─── Palettes de couleurs ──────────────────────────────────────────────────
// primary  : couleur d'accent principale (titres, montants, filets)
// dark     : couleur "encre" pour les textes forts / fonds sombres
// light    : teinte très claire pour fonds/bandeaux
// mid      : gris neutre pour les libellés secondaires (commun à toutes)
const PALETTES = {
  bleu: {
    id: "bleu", label: "Bleu Pro",
    primary: "#0023FF", dark: "#0B1530", light: "#EEF1FF", mid: "#6B7280",
  },
  emeraude: {
    id: "emeraude", label: "Émeraude",
    primary: "#059669", dark: "#052E22", light: "#ECFDF5", mid: "#6B7280",
  },
  ambre: {
    id: "ambre", label: "Ambre Doré",
    primary: "#D97706", dark: "#451A03", light: "#FFFBEB", mid: "#6B7280",
  },
  violet: {
    id: "violet", label: "Violet Royal",
    primary: "#7C3AED", dark: "#2E1065", light: "#F5F3FF", mid: "#6B7280",
  },
  graphite: {
    id: "graphite", label: "Graphite",
    primary: "#1F2937", dark: "#030712", light: "#F3F4F6", mid: "#6B7280",
  },
};

// ─── Mises en page ──────────────────────────────────────────────────────────
const LAYOUTS = {
  classic: {
    id: "classic", label: "Classique",
    desc: "Mise en page professionnelle traditionnelle, en-tête à deux colonnes et tableau structuré.",
  },
  moderne: {
    id: "moderne", label: "Moderne",
    desc: "Design épuré et minimaliste, beaucoup d'espace blanc, lignes fines.",
  },
  bloc: {
    id: "bloc", label: "Bloc Couleur",
    desc: "Bandeau d'en-tête plein de couleur pour un impact visuel fort.",
  },
  elegant: {
    id: "elegant", label: "Élégant",
    desc: "Typographie serif raffinée, doubles filets, présentation soignée.",
  },
  compact: {
    id: "compact", label: "Compact",
    desc: "Mise en page dense et économe, idéale pour imprimer beaucoup d'informations.",
  },
  sidebar: {
    id: "sidebar", label: "Latéral",
    desc: "Bandeau latéral coloré regroupant l'identité et les totaux, zone principale dédiée au détail. Disposition en deux colonnes, radicalement différente des autres.",
  },
};

const LAYOUT_ORDER = ["classic", "moderne", "bloc", "elegant", "compact", "sidebar"];
const PALETTE_ORDER = ["bleu", "emeraude", "ambre", "violet", "graphite"];

// ─── Catalogue complet (30 styles) ─────────────────────────────────────────
const STYLE_CATALOG = [];
LAYOUT_ORDER.forEach((layoutId) => {
  PALETTE_ORDER.forEach((paletteId) => {
    const layout  = LAYOUTS[layoutId];
    const palette = PALETTES[paletteId];
    STYLE_CATALOG.push({
      id:    `${layoutId}-${paletteId}`,
      label: `${layout.label} ${palette.label}`,
      layout: layoutId,
      palette: paletteId,
    });
  });
});

const DEFAULT_STYLE = "classic-bleu";
const VALID_STYLE_IDS = new Set(STYLE_CATALOG.map((s) => s.id));

// Renvoie { layoutId, layout, palette } pour un identifiant de style donné.
// Retombe sur le style par défaut si l'identifiant est inconnu/absent.
function getStyle(styleId) {
  const id = VALID_STYLE_IDS.has(styleId) ? styleId : DEFAULT_STYLE;
  const [layoutId, paletteId] = id.split("-");
  return {
    id,
    layoutId,
    layout: LAYOUTS[layoutId] || LAYOUTS.classic,
    palette: PALETTES[paletteId] || PALETTES.bleu,
  };
}

module.exports = {
  PALETTES,
  LAYOUTS,
  LAYOUT_ORDER,
  PALETTE_ORDER,
  STYLE_CATALOG,
  DEFAULT_STYLE,
  VALID_STYLE_IDS,
  getStyle,
};
