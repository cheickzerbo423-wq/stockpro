// src/controllers/previewController.js
// Génère un PDF d'EXEMPLE (données fictives) pour prévisualiser un style du
// catalogue (5 mises en page x 5 palettes — voir utils/pdfStyles.js) avant
// que l'utilisateur ne l'enregistre dans Paramètres. Utilise les mêmes
// renderers que les vrais documents (facturesLayouts / recuLayouts /
// rapportLayouts), avec les coordonnées réelles de l'entreprise (logo, nom,
// devise...) mais un contenu (lignes, montants) fictif et représentatif.
const PDFDoc = require("pdfkit");
const { getEntrepriseConfig, logoBuffer } = require("../utils/entrepriseConfig");
const { getStyle, VALID_STYLE_IDS, DEFAULT_STYLE } = require("../utils/pdfStyles");
const factureLayouts = require("../pdf/facturesLayouts");
const recuLayouts    = require("../pdf/recuLayouts");
const rapportLayouts = require("../pdf/rapportLayouts");

const sep = (n) => String(Math.round(n) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Jeu de données fictif réutilisé pour la facture et le reçu
function sampleFacture() {
  const lignes = [
    { libelle: "Article Premium A",    quantite: 2, prix_vente: 15000, montant_total: 30000 },
    { libelle: "Service Installation", quantite: 1, prix_vente: 25000, montant_total: 25000 },
    { libelle: "Article Standard B",   quantite: 5, prix_vente: 4000,  montant_total: 20000 },
  ];
  const montant = lignes.reduce((s, l) => s + l.montant_total, 0);
  return {
    lignes,
    f: {
      code: "FAC-DEMO-0001",
      client_nom: "Client Demo SARL",
      date_facture: new Date(),
      statut: true,
      montant,
      montant_paye: montant,
      reste: 0,
    },
  };
}

// GET /api/entreprise/pdf-preview?type=facture|recu|rapport&style=<id>
// Accessible à tout utilisateur connecté (lecture seule, aucune écriture en
// base) — utilisé par la galerie de styles dans Paramètres pour afficher un
// aperçu du document avant enregistrement.
async function previewPdf(req, res) {
  try {
    const type      = (req.query.type || "facture").toLowerCase();
    const requested = req.query.style;
    const styleId   = VALID_STYLE_IDS.has(requested) ? requested : DEFAULT_STYLE;
    const entId     = req.user.entreprise_id;

    const cfg     = await getEntrepriseConfig(entId);
    const logoBuf = logoBuffer(cfg.logo);
    const money   = (n) => sep(n) + " " + (cfg.devise || "FCFA");
    const style   = getStyle(styleId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="apercu-${styleId}.pdf"`);

    if (type === "recu") {
      const { f, lignes } = sampleFacture();
      const dr = f.date_facture;
      const dateStr = `${dr.getDate().toString().padStart(2,"0")}/${(dr.getMonth()+1).toString().padStart(2,"0")}/${dr.getFullYear()}`;
      const W = 226, M = 12, INNER = W - M * 2;
      const renderer = recuLayouts[style.layoutId] || recuLayouts.classic;
      const ctx = { f, lignes, cfg, money, dateStr, logoBuf, pal: style.palette, W, M, INNER };
      const H = renderer.height(ctx);

      const doc = new PDFDoc({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      doc.pipe(res);
      renderer.draw(doc, ctx);
      doc.end();
      return;
    }

    if (type === "rapport") {
      const v = { ca_total: 1250000, nb_factures: 18, nb_lignes: 47, qte_totale: 132 };
      const a = { nb_achats: 9, total_achats: 620000, total_paye: 500000, total_dettes: 120000 };
      const f = { nb_total: 18, nb_reglees: 14, nb_impayees: 4, montant_total: 1250000, montant_encaisse: 980000, montant_creances: 270000 };
      // cogs = cout des marchandises vendues (fictif) ; benefice = CA - cogs,
      // coherent avec /rapports (JSON) et l'ecran Rapports.jsx.
      const cogs = 820000;
      const benefice = v.ca_total - cogs;
      const topArticles = [
        { code: "ART001", libelle: "Article Premium A",    ca: 320000, qte: 42 },
        { code: "ART002", libelle: "Service Installation", ca: 250000, qte: 10 },
        { code: "ART003", libelle: "Article Standard B",   ca: 180000, qte: 45 },
        { code: "ART004", libelle: "Pack Decouverte",      ca: 150000, qte: 20 },
        { code: "ART005", libelle: "Accessoire C",         ca: 90000,  qte: 15 },
      ];
      const today  = new Date();
      const debut  = new Date(today.getFullYear(), today.getMonth(), 1);
      const fmtDate = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      const renderer = rapportLayouts[style.layoutId] || rapportLayouts.classic;

      const doc = new PDFDoc({ margin: 0, size: "A4" });
      doc.pipe(res);
      renderer(doc, {
        v, a, f, benefice, cogs, topArticles, cfg, money,
        fmtN: sep,
        debutStr: fmtDate(debut), finStr: fmtDate(today), genStr: fmtDate(today),
        logoBuf, pal: style.palette,
        PW: 595, PH: 842, M: 52, INN: 595 - 52 * 2,
      });
      doc.end();
      return;
    }

    // type === "facture" (par defaut)
    const { f, lignes } = sampleFacture();
    const d = f.date_facture;
    const MOIS_FR = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
    const dateStr = `${d.getDate().toString().padStart(2,"0")} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
    const renderer = factureLayouts[style.layoutId] || factureLayouts.classic;

    const doc = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);
    renderer(doc, { f, lignes, cfg, money, dateStr, logoBuf, pal: style.palette, PW: 595, PH: 842, M: 52, INN: 595 - 52 * 2 });
    doc.end();
  } catch (err) {
    console.error("previewPdf error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la generation de l'apercu." });
  }
}

module.exports = { previewPdf };
