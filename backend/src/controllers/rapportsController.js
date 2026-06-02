// src/controllers/rapportsController.js — WariGest
const db     = require("../config/db");
const PDFDoc = require("pdfkit");

const BLUE   = "#0023FF";
const YELLOW = "#FFF900";
const DARK   = "#060d2e";

const sep = (n) => String(parseInt(n) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmt  = (n) => sep(n) + " FCFA";
const fmtN = (n) => sep(n);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "";

async function getRapport(req, res) {
  try {
    const now   = new Date();
    const debut = req.query.debut || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    const fin   = req.query.fin   || now.toISOString().split("T")[0];

    const [ventes, achats, factures, graphVentes, graphAchats, topArticles] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(montant_total), 0) AS ca_total, COUNT(DISTINCT facture_code) AS nb_factures, COUNT(*) AS nb_lignes, COALESCE(SUM(quantite), 0) AS qte_totale FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2`, [debut, fin]),
      db.query(`SELECT COUNT(*) AS nb_achats, COALESCE(SUM(montant_total), 0) AS total_achats, COALESCE(SUM(montant_paye), 0) AS total_paye, COALESCE(SUM(montant_total - montant_paye), 0) AS total_dettes FROM achats WHERE date_achat BETWEEN $1 AND $2`, [debut, fin]),
      db.query(`SELECT COUNT(*) AS nb_total, COUNT(*) FILTER (WHERE statut = TRUE) AS nb_reglees, COUNT(*) FILTER (WHERE statut = FALSE) AS nb_impayees, COALESCE(SUM(montant), 0) AS montant_total, COALESCE(SUM(montant_paye), 0) AS montant_encaisse, COALESCE(SUM(reste), 0) AS montant_creances FROM factures WHERE date_facture BETWEEN $1 AND $2`, [debut, fin]),
      db.query(`SELECT date_vente::text AS jour, SUM(montant_total)::bigint AS ca FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2 GROUP BY date_vente ORDER BY date_vente`, [debut, fin]),
      db.query(`SELECT date_achat::text AS jour, SUM(montant_total)::bigint AS total FROM achats WHERE date_achat BETWEEN $1 AND $2 GROUP BY date_achat ORDER BY date_achat`, [debut, fin]),
      db.query(`SELECT article_code AS code, libelle, SUM(montant_total)::bigint AS ca, SUM(quantite) AS qte FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2 GROUP BY article_code, libelle ORDER BY ca DESC LIMIT 5`, [debut, fin]),
    ]);

    const v = ventes.rows[0];
    const a = achats.rows[0];
    const f = factures.rows[0];

    res.json({
      periode:      { debut, fin },
      ventes:       { ca_total: parseInt(v.ca_total), nb_factures: parseInt(v.nb_factures), nb_lignes: parseInt(v.nb_lignes), qte_totale: parseInt(v.qte_totale) },
      achats:       { nb_achats: parseInt(a.nb_achats), total_achats: parseInt(a.total_achats), total_paye: parseInt(a.total_paye), total_dettes: parseInt(a.total_dettes) },
      benefice:     parseInt(v.ca_total) - parseInt(a.total_achats),
      factures:     { nb_total: parseInt(f.nb_total), nb_reglees: parseInt(f.nb_reglees), nb_impayees: parseInt(f.nb_impayees), montant_total: parseInt(f.montant_total), montant_encaisse: parseInt(f.montant_encaisse), montant_creances: parseInt(f.montant_creances) },
      graphique:    { ventes: graphVentes.rows, achats: graphAchats.rows },
      top_articles: topArticles.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur chargement rapport." });
  }
}

async function exportPDF(req, res) {
  try {
    const { debut, fin } = req.query;
    if (!debut || !fin)
      return res.status(400).json({ message: "Paramètres debut et fin requis." });

    const [ventes, achats, factures, topArticles] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(montant_total), 0) AS ca_total, COUNT(DISTINCT facture_code) AS nb_factures, COALESCE(SUM(quantite), 0) AS qte_totale FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2`, [debut, fin]),
      db.query(`SELECT COUNT(*) AS nb_achats, COALESCE(SUM(montant_total), 0) AS total_achats, COALESCE(SUM(montant_paye), 0) AS total_paye, COALESCE(SUM(montant_total - montant_paye), 0) AS total_dettes FROM achats WHERE date_achat BETWEEN $1 AND $2`, [debut, fin]),
      db.query(`SELECT COUNT(*) AS nb_total, COUNT(*) FILTER (WHERE statut = TRUE) AS nb_reglees, COUNT(*) FILTER (WHERE statut = FALSE) AS nb_impayees, COALESCE(SUM(montant), 0) AS montant_total, COALESCE(SUM(montant_paye), 0) AS montant_encaisse, COALESCE(SUM(reste), 0) AS montant_creances FROM factures WHERE date_facture BETWEEN $1 AND $2`, [debut, fin]),
      db.query(`SELECT libelle, SUM(montant_total)::bigint AS ca, SUM(quantite) AS qte FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2 GROUP BY libelle ORDER BY ca DESC LIMIT 5`, [debut, fin]),
    ]);

    const v        = ventes.rows[0];
    const a        = achats.rows[0];
    const f        = factures.rows[0];
    const benefice = parseInt(v.ca_total) - parseInt(a.total_achats);
    const company  = process.env.COMPANY_NAME    || "WariGest";
    const compAddr = process.env.COMPANY_ADDRESS || "";
    const compTel  = process.env.COMPANY_PHONE   || "";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Rapport_${debut}_${fin}.pdf"`);

    const doc = new PDFDoc({ margin: 50, size: "A4" });
    doc.pipe(res);

    const PW = 595;

    // ── Bande bleue en-tête ──
    doc.rect(0, 0, PW, 4).fill(BLUE);
    doc.rect(0, 4, PW, 86).fill(DARK);

    // Logo "Wi" + point jaune
    doc.roundedRect(50, 18, 36, 36, 8).fill(BLUE);
    doc.fillColor("white").fontSize(16).font("Helvetica-Bold").text("Wi", 57, 28);
    doc.circle(82, 22, 4).fill(YELLOW);

    // Nom entreprise
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold").text(company, 96, 22);
    doc.fillColor("rgba(255,255,255,0.4)").fontSize(8).font("Helvetica")
       .text("Gestion & Facturation" + (compAddr ? "  ·  " + compAddr : "") + (compTel ? "  ·  " + compTel : ""), 96, 44);

    // Titre rapport (droite)
    doc.fillColor(YELLOW).fontSize(12).font("Helvetica-Bold")
       .text("RAPPORT FINANCIER", PW - 220, 20, { width: 170, align: "right" });
    doc.fillColor("rgba(255,255,255,0.6)").fontSize(8).font("Helvetica")
       .text(`${fmtDate(debut)} — ${fmtDate(fin)}`, PW - 220, 40, { width: 170, align: "right" });
    doc.fillColor("rgba(255,255,255,0.35)").fontSize(7)
       .text(`Généré le ${fmtDate(new Date().toISOString().split("T")[0])}`, PW - 220, 56, { width: 170, align: "right" });

    doc.y = 108;

    // ── KPI Cards ──
    const kpiW = 113, kpiH = 62, kpiY = doc.y;
    const kpis = [
      { label: "Chiffre d'Affaires", value: fmt(v.ca_total),     color: BLUE,     bg: "#e8ecff" },
      { label: "Total Dépenses",     value: fmt(a.total_achats),  color: "#ef4444", bg: "#fef2f2" },
      { label: "Bénéfice Net",       value: fmt(benefice),        color: benefice >= 0 ? "#059669" : "#ef4444", bg: benefice >= 0 ? "#ecfdf5" : "#fef2f2" },
      { label: "Factures Émises",    value: fmtN(f.nb_total),     color: "#7c3aed", bg: "#f3e8ff" },
    ];
    kpis.forEach((k, i) => {
      const x = 50 + i * (kpiW + 8);
      doc.rect(x, kpiY, kpiW, kpiH).fill(k.bg);
      doc.rect(x, kpiY, 3, kpiH).fill(k.color);
      doc.fillColor(k.color).fontSize(13).font("Helvetica-Bold")
         .text(k.value, x + 8, kpiY + 10, { width: kpiW - 16, align: "center" });
      doc.fillColor("#64748b").fontSize(7).font("Helvetica")
         .text(k.label, x + 8, kpiY + 38, { width: kpiW - 16, align: "center" });
    });
    doc.y = kpiY + kpiH + 20;

    // ── Helpers sections ──
    const section = (title) => {
      doc.moveDown(0.4);
      doc.rect(50, doc.y, 495, 20).fill("#f0f2ff");
      doc.rect(50, doc.y, 3, 20).fill(BLUE);
      doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold").text(title, 60, doc.y + 5);
      doc.y += 26;
    };

    const row = (label, value, color = "#334155") => {
      const y = doc.y;
      doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(label, 60, y);
      doc.fillColor(color).fontSize(9).font("Helvetica-Bold").text(value, 350, y, { width: 185, align: "right" });
      doc.moveDown(0.55);
      doc.moveTo(60, doc.y).lineTo(540, doc.y).strokeColor("#e8ecff").lineWidth(0.5).stroke();
      doc.moveDown(0.15);
    };

    // ── Sections ──
    section("VENTES");
    row("Chiffre d'affaires",  fmt(v.ca_total),  BLUE);
    row("Nombre de factures",  fmtN(v.nb_factures));
    row("Quantités vendues",   fmtN(v.qte_totale) + " unités");

    section("APPROVISIONNEMENTS");
    row("Nombre d'achats",     fmtN(a.nb_achats));
    row("Total dépenses",      fmt(a.total_achats),  "#ef4444");
    row("Montant payé",        fmt(a.total_paye),    "#059669");
    row("Dettes fournisseurs", fmt(a.total_dettes),  parseInt(a.total_dettes) > 0 ? "#ef4444" : "#64748b");

    section("RECOUVREMENT FACTURES");
    row("Total facturé",       fmt(f.montant_total));
    row("Montant encaissé",    fmt(f.montant_encaisse), "#059669");
    row("Créances restantes",  fmt(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#ef4444" : "#64748b");
    row("Factures réglées",    fmtN(f.nb_reglees),     "#059669");
    row("Factures impayées",   fmtN(f.nb_impayees),    parseInt(f.nb_impayees) > 0 ? "#ef4444" : "#64748b");

    if (topArticles.rows.length > 0) {
      section("TOP 5 ARTICLES VENDUS");
      topArticles.rows.forEach((art, i) => {
        row(`${i + 1}. ${art.libelle}`, fmt(art.ca) + "  ·  " + fmtN(art.qte) + " u.", BLUE);
      });
    }

    // ── Bénéfice net ──
    doc.moveDown(0.8);
    const benY = doc.y;
    const benColor = benefice >= 0 ? "#059669" : "#dc2626";
    const benBg    = benefice >= 0 ? "#ecfdf5" : "#fef2f2";
    doc.rect(50, benY, 495, 60).fill(benBg);
    doc.rect(50, benY, 4, 60).fill(benColor);
    doc.fillColor("#64748b").fontSize(8).font("Helvetica")
       .text("BÉNÉFICE NET DE LA PÉRIODE", 62, benY + 10);
    doc.fillColor(benColor).fontSize(22).font("Helvetica-Bold")
       .text(fmt(benefice), 62, benY + 24);
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
       .text(`CA ${fmt(v.ca_total)}  —  Dépenses ${fmt(a.total_achats)}`, 62, benY + 50);

    // ── Pied de page ──
    const pageH = doc.page.height;
    doc.rect(0, pageH - 28, PW, 4).fill(BLUE);
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
       .text(`Document généré automatiquement par WariGest  ·  ${fmtDate(new Date().toISOString().split("T")[0])}`, 50, pageH - 20, { width: 495, align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération PDF." });
  }
}

module.exports = { getRapport, exportPDF };
