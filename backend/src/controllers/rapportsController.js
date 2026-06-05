// src/controllers/rapportsController.js
const db     = require("../config/db");
const PDFDoc = require("pdfkit");

/* ─── helpers ─────────────────────────────────────────────────── */
const sep = (n) => String(parseInt(n) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmt  = (n) => sep(n) + " FCFA";
const fmtN = (n) => sep(n);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "";

/* ─── GET /rapports?debut=&fin= ───────────────────────────────── */
async function getRapport(req, res) {
  try {
    const now   = new Date();
    const debut = req.query.debut || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    const fin   = req.query.fin   || now.toISOString().split("T")[0];

    const [ventes, achats, factures, graphVentes, graphAchats, topArticles] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(montant_total), 0)            AS ca_total,
           COUNT(DISTINCT facture_code)               AS nb_factures,
           COUNT(*)                                   AS nb_lignes,
           COALESCE(SUM(quantite), 0)                 AS qte_totale
         FROM lignes_vente
         WHERE date_vente BETWEEN $1 AND $2`,
        [debut, fin]
      ),

      db.query(
        `SELECT
           COUNT(*)                                   AS nb_achats,
           COALESCE(SUM(montant_total), 0)            AS total_achats,
           COALESCE(SUM(montant_paye), 0)             AS total_paye,
           COALESCE(SUM(montant_total - montant_paye), 0) AS total_dettes
         FROM achats
         WHERE date_achat BETWEEN $1 AND $2`,
        [debut, fin]
      ),

      db.query(
        `SELECT
           COUNT(*)                                   AS nb_total,
           COUNT(*) FILTER (WHERE statut = TRUE)      AS nb_reglees,
           COUNT(*) FILTER (WHERE statut = FALSE)     AS nb_impayees,
           COALESCE(SUM(montant), 0)                  AS montant_total,
           COALESCE(SUM(montant_paye), 0)             AS montant_encaisse,
           COALESCE(SUM(reste), 0)                    AS montant_creances
         FROM factures
         WHERE date_facture BETWEEN $1 AND $2`,
        [debut, fin]
      ),

      db.query(
        `SELECT date_vente::text AS jour, SUM(montant_total)::bigint AS ca
         FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2
         GROUP BY date_vente ORDER BY date_vente`,
        [debut, fin]
      ),

      db.query(
        `SELECT date_achat::text AS jour, SUM(montant_total)::bigint AS total
         FROM achats WHERE date_achat BETWEEN $1 AND $2
         GROUP BY date_achat ORDER BY date_achat`,
        [debut, fin]
      ),

      db.query(
        `SELECT article_code AS code, libelle, SUM(montant_total)::bigint AS ca,
                SUM(quantite) AS qte
         FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2
         GROUP BY article_code, libelle ORDER BY ca DESC LIMIT 5`,
        [debut, fin]
      ),
    ]);

    const v  = ventes.rows[0];
    const a  = achats.rows[0];
    const f  = factures.rows[0];

    res.json({
      periode:     { debut, fin },
      ventes:      { ca_total: parseInt(v.ca_total), nb_factures: parseInt(v.nb_factures), nb_lignes: parseInt(v.nb_lignes), qte_totale: parseInt(v.qte_totale) },
      achats:      { nb_achats: parseInt(a.nb_achats), total_achats: parseInt(a.total_achats), total_paye: parseInt(a.total_paye), total_dettes: parseInt(a.total_dettes) },
      benefice:    parseInt(v.ca_total) - parseInt(a.total_achats),
      factures:    { nb_total: parseInt(f.nb_total), nb_reglees: parseInt(f.nb_reglees), nb_impayees: parseInt(f.nb_impayees), montant_total: parseInt(f.montant_total), montant_encaisse: parseInt(f.montant_encaisse), montant_creances: parseInt(f.montant_creances) },
      graphique:   { ventes: graphVentes.rows, achats: graphAchats.rows },
      top_articles: topArticles.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur chargement rapport." });
  }
}

/* ─── GET /rapports/pdf?debut=&fin= ──────────────────────────── */
async function exportPDF(req, res) {
  try {
    const { debut, fin } = req.query;
    if (!debut || !fin)
      return res.status(400).json({ message: "Paramètres debut et fin requis." });

    // Réutiliser la même logique de données
    const [ventes, achats, factures, topArticles] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(montant_total), 0) AS ca_total,
                COUNT(DISTINCT facture_code) AS nb_factures,
                COALESCE(SUM(quantite), 0) AS qte_totale
         FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2`,
        [debut, fin]
      ),
      db.query(
        `SELECT COUNT(*) AS nb_achats, COALESCE(SUM(montant_total), 0) AS total_achats,
                COALESCE(SUM(montant_paye), 0) AS total_paye,
                COALESCE(SUM(montant_total - montant_paye), 0) AS total_dettes
         FROM achats WHERE date_achat BETWEEN $1 AND $2`,
        [debut, fin]
      ),
      db.query(
        `SELECT COUNT(*) AS nb_total, COUNT(*) FILTER (WHERE statut = TRUE) AS nb_reglees,
                COUNT(*) FILTER (WHERE statut = FALSE) AS nb_impayees,
                COALESCE(SUM(montant), 0) AS montant_total,
                COALESCE(SUM(montant_paye), 0) AS montant_encaisse,
                COALESCE(SUM(reste), 0) AS montant_creances
         FROM factures WHERE date_facture BETWEEN $1 AND $2`,
        [debut, fin]
      ),
      db.query(
        `SELECT libelle, SUM(montant_total)::bigint AS ca, SUM(quantite) AS qte
         FROM lignes_vente WHERE date_vente BETWEEN $1 AND $2
         GROUP BY libelle ORDER BY ca DESC LIMIT 5`,
        [debut, fin]
      ),
    ]);

    const v       = ventes.rows[0];
    const a       = achats.rows[0];
    const f       = factures.rows[0];
    const benefice = parseInt(v.ca_total) - parseInt(a.total_achats);
    const company  = process.env.COMPANY_NAME  || "WariGest";
    const compAddr = process.env.COMPANY_ADDRESS || "";
    const compTel  = process.env.COMPANY_PHONE   || "";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Rapport_${debut}_${fin}.pdf"`);

    const doc = new PDFDoc({ margin: 50, size: "A4" });
    doc.pipe(res);

    /* ── En-tête ── */
    doc.rect(0, 0, 595, 90).fill("#0F172A");
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold")
       .text(company, 50, 28);
    doc.fontSize(9).font("Helvetica").fillColor("#94a3b8")
       .text(compAddr + (compTel ? "  ·  " + compTel : ""), 50, 55);

    doc.fillColor("#0023FF").fontSize(13).font("Helvetica-Bold")
       .text("RAPPORT FINANCIER", 595 - 220, 30, { width: 170, align: "right" });
    doc.fillColor("#cbd5e1").fontSize(9).font("Helvetica")
       .text(`Période : ${fmtDate(debut)} — ${fmtDate(fin)}`, 595 - 220, 52, { width: 170, align: "right" });
    doc.fillColor("#64748b").fontSize(8)
       .text(`Généré le ${fmtDate(new Date().toISOString().split("T")[0])}`, 595 - 220, 68, { width: 170, align: "right" });

    doc.y = 110;

    /* ── Fonction helpers PDF ── */
    const section = (title) => {
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 495, 22).fill("#f1f5f9");
      doc.fillColor("#0023FF").fontSize(10).font("Helvetica-Bold")
         .text(title, 58, doc.y + 5);
      doc.y += 28;
    };

    const row = (label, value, color = "#1e293b") => {
      const y = doc.y;
      doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(label, 60, y);
      doc.fillColor(color).fontSize(9).font("Helvetica-Bold").text(value, 350, y, { width: 185, align: "right" });
      doc.moveDown(0.6);
      doc.moveTo(60, doc.y).lineTo(540, doc.y).strokeColor("#f1f5f9").lineWidth(0.5).stroke();
      doc.moveDown(0.2);
    };

    /* ── KPIs ── */
    const kpiW = 115, kpiH = 60, kpiY = doc.y;
    const kpis = [
      { label: "Chiffre d'Affaires", value: fmt(v.ca_total), color: "#0023FF" },
      { label: "Total Dépenses",     value: fmt(a.total_achats), color: "#ef4444" },
      { label: "Bénéfice Net",       value: fmt(benefice), color: benefice >= 0 ? "#10b981" : "#ef4444" },
      { label: "Factures Émises",    value: fmtN(f.nb_total), color: "#3b82f6" },
    ];
    kpis.forEach((k, i) => {
      const x = 50 + i * (kpiW + 10);
      doc.rect(x, kpiY, kpiW, kpiH).fill("#f8fafc").stroke("#e2e8f0");
      doc.fillColor(k.color).fontSize(14).font("Helvetica-Bold")
         .text(k.value, x + 6, kpiY + 10, { width: kpiW - 12, align: "center" });
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
         .text(k.label, x + 6, kpiY + 35, { width: kpiW - 12, align: "center" });
    });
    doc.y = kpiY + kpiH + 18;

    /* ── Ventes ── */
    section("VENTES");
    row("Chiffre d'affaires",   fmt(v.ca_total),        "#0023FF");
    row("Nombre de factures",   fmtN(v.nb_factures));
    row("Quantités vendues",    fmtN(v.qte_totale) + " unités");

    /* ── Approvisionnements ── */
    section("APPROVISIONNEMENTS");
    row("Nombre d'achats",      fmtN(a.nb_achats));
    row("Total dépenses",       fmt(a.total_achats),    "#ef4444");
    row("Montant payé",         fmt(a.total_paye),      "#10b981");
    row("Dettes fournisseurs",  fmt(a.total_dettes),    parseInt(a.total_dettes) > 0 ? "#ef4444" : "#64748b");

    /* ── Factures ── */
    section("RECOUVREMENT FACTURES");
    row("Total facturé",        fmt(f.montant_total));
    row("Montant encaissé",     fmt(f.montant_encaisse), "#10b981");
    row("Créances restantes",   fmt(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#ef4444" : "#64748b");
    row("Factures réglées",     fmtN(f.nb_reglees),     "#10b981");
    row("Factures impayées",    fmtN(f.nb_impayees),    parseInt(f.nb_impayees) > 0 ? "#ef4444" : "#64748b");

    /* ── Top articles ── */
    if (topArticles.rows.length > 0) {
      section("TOP 5 ARTICLES VENDUS");
      topArticles.rows.forEach((a, i) => {
        row(`${i + 1}. ${a.libelle}`, fmt(a.ca) + " · " + fmtN(a.qte) + " u.", "#0023FF");
      });
    }

    /* ── Résumé bénéfice ── */
    doc.moveDown(1);
    const benY = doc.y;
    doc.rect(50, benY, 495, 55).fill(benefice >= 0 ? "#ecfdf5" : "#fef2f2")
       .stroke(benefice >= 0 ? "#a7f3d0" : "#fecaca");
    doc.fillColor("#64748b").fontSize(8).font("Helvetica")
       .text("BÉNÉFICE NET DE LA PÉRIODE", 60, benY + 10);
    doc.fillColor(benefice >= 0 ? "#047857" : "#dc2626").fontSize(22).font("Helvetica-Bold")
       .text(fmt(benefice), 60, benY + 24, { width: 380 });
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
       .text(`CA ${fmt(v.ca_total)}  —  Dépenses ${fmt(a.total_achats)}`, 60, benY + 50);

    /* ── Pied de page ── */
    const pageH = doc.page.height;
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
       .text("Document généré automatiquement par WariGest — Logiciel de gestion & facturation", 50, pageH - 40, { width: 495, align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération PDF." });
  }
}

module.exports = { getRapport, exportPDF };
