// src/controllers/rapportsController.js
const db     = require("../config/db");
const PDFDoc = require("pdfkit");
const { getEntrepriseConfig, logoBuffer } = require("../utils/entrepriseConfig");

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
    const entId = req.user.entreprise_id;

    const [ventes, achats, factures, graphVentes, graphAchats, topArticles, cogsRow] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(montant_total), 0)            AS ca_total,
           COUNT(DISTINCT facture_code)               AS nb_factures,
           COUNT(*)                                   AS nb_lignes,
           COALESCE(SUM(quantite), 0)                 AS qte_totale
         FROM lignes_vente
         WHERE entreprise_id = $3 AND date_vente BETWEEN $1 AND $2`,
        [debut, fin, entId]
      ),

      // total_achats = trésorerie dépensée pour le stock (achats de la période)
      // cogs = coût des marchandises vendues (prix_achat × qté vendue sur la période)
      db.query(
        `SELECT
           COUNT(*)                                                       AS nb_achats,
           COALESCE(SUM(prix_achat * quantite), 0)                        AS total_achats,
           COALESCE(SUM(montant_paye), 0)                                 AS total_paye,
           COALESCE(SUM(prix_achat * quantite - montant_paye), 0)         AS total_dettes
         FROM achats
         WHERE entreprise_id = $3 AND date_achat BETWEEN $1 AND $2`,
        [debut, fin, entId]
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
         WHERE entreprise_id = $3 AND date_facture BETWEEN $1 AND $2`,
        [debut, fin, entId]
      ),

      db.query(
        `SELECT date_vente::text AS jour, SUM(montant_total)::bigint AS ca
         FROM lignes_vente WHERE entreprise_id = $3 AND date_vente BETWEEN $1 AND $2
         GROUP BY date_vente ORDER BY date_vente`,
        [debut, fin, entId]
      ),

      db.query(
        `SELECT date_achat::text AS jour, SUM(prix_achat * quantite)::bigint AS total
         FROM achats WHERE entreprise_id = $3 AND date_achat BETWEEN $1 AND $2
         GROUP BY date_achat ORDER BY date_achat`,
        [debut, fin, entId]
      ),

      db.query(
        `SELECT article_code AS code, libelle, SUM(montant_total)::bigint AS ca,
                SUM(quantite) AS qte
         FROM lignes_vente WHERE entreprise_id = $3 AND date_vente BETWEEN $1 AND $2
         GROUP BY article_code, libelle ORDER BY ca DESC LIMIT 5`,
        [debut, fin, entId]
      ),

      // COGS : coût des marchandises vendues sur la période
      db.query(
        `SELECT COALESCE(SUM(lv.quantite * a.prix_achat), 0) AS cogs
         FROM lignes_vente lv
         JOIN articles a ON a.code = lv.article_code AND a.entreprise_id = lv.entreprise_id
         WHERE lv.entreprise_id = $3 AND lv.date_vente BETWEEN $1 AND $2`,
        [debut, fin, entId]
      ),
    ]);

    const v    = ventes.rows[0];
    const a    = achats.rows[0];
    const f    = factures.rows[0];
    const cogs = parseInt(cogsRow.rows[0]?.cogs || 0);

    res.json({
      periode:     { debut, fin },
      ventes:      { ca_total: parseInt(v.ca_total), nb_factures: parseInt(v.nb_factures), nb_lignes: parseInt(v.nb_lignes), qte_totale: parseInt(v.qte_totale) },
      achats:      { nb_achats: parseInt(a.nb_achats), total_achats: parseInt(a.total_achats), total_paye: parseInt(a.total_paye), total_dettes: parseInt(a.total_dettes) },
      cogs,
      // marge_brute = CA - coût des ventes (≠ CA - total achats stock)
      benefice:    parseInt(v.ca_total) - cogs,
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
    const entId = req.user.entreprise_id;

    // Réutiliser la même logique de données
    const [ventes, achats, factures, topArticles] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(montant_total), 0) AS ca_total,
                COUNT(DISTINCT facture_code) AS nb_factures,
                COALESCE(SUM(quantite), 0) AS qte_totale
         FROM lignes_vente WHERE entreprise_id = $3 AND date_vente BETWEEN $1 AND $2`,
        [debut, fin, entId]
      ),
      // Même correctif que ci-dessus : recalcul dynamique pour éviter de se fier
      // à la colonne stockée "montant_total" qui peut être à 0 sur d'anciens achats.
      db.query(
        `SELECT COUNT(*) AS nb_achats, COALESCE(SUM(prix_achat * quantite), 0) AS total_achats,
                COALESCE(SUM(montant_paye), 0) AS total_paye,
                COALESCE(SUM(prix_achat * quantite - montant_paye), 0) AS total_dettes
         FROM achats WHERE entreprise_id = $3 AND date_achat BETWEEN $1 AND $2`,
        [debut, fin, entId]
      ),
      db.query(
        `SELECT COUNT(*) AS nb_total, COUNT(*) FILTER (WHERE statut = TRUE) AS nb_reglees,
                COUNT(*) FILTER (WHERE statut = FALSE) AS nb_impayees,
                COALESCE(SUM(montant), 0) AS montant_total,
                COALESCE(SUM(montant_paye), 0) AS montant_encaisse,
                COALESCE(SUM(reste), 0) AS montant_creances
         FROM factures WHERE entreprise_id = $3 AND date_facture BETWEEN $1 AND $2`,
        [debut, fin, entId]
      ),
      db.query(
        `SELECT libelle, SUM(montant_total)::bigint AS ca, SUM(quantite) AS qte
         FROM lignes_vente WHERE entreprise_id = $3 AND date_vente BETWEEN $1 AND $2
         GROUP BY libelle ORDER BY ca DESC LIMIT 5`,
        [debut, fin, entId]
      ),
    ]);

    const v       = ventes.rows[0];
    const a       = achats.rows[0];
    const f       = factures.rows[0];
    const benefice = parseInt(v.ca_total) - parseInt(a.total_achats);
    const cfg      = await getEntrepriseConfig(entId);
    const logoBuf  = logoBuffer(cfg.logo);
    const ACC      = cfg.couleur || "#0023FF";   // couleur d'accent — personnalisable par entreprise
    const company  = cfg.nom;
    const compAddr = cfg.adresse;
    const compTel  = cfg.telephone;
    const money    = (n) => sep(n) + " " + (cfg.devise || "FCFA");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Rapport_${debut}_${fin}.pdf"`);

    const doc = new PDFDoc({ margin: 50, size: "A4" });
    doc.pipe(res);

    /* ── En-tête ── */
    doc.rect(0, 0, 595, 90).fill("#0F172A");
    let txtX = 50, txtW = 245;
    if (logoBuf) {
      try {
        doc.image(logoBuf, 50, 16, { fit: [58, 58] });
        txtX = 120; txtW = 175;
      } catch (e) { console.error("Logo PDF (rapport) ignoré :", e.message); }
    }
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold")
       .text(company, txtX, 28, { width: txtW });
    doc.fontSize(9).font("Helvetica").fillColor("#94a3b8")
       .text(compAddr + (compTel ? "  ·  " + compTel : ""), txtX, 55, { width: txtW });

    doc.fillColor(ACC).fontSize(13).font("Helvetica-Bold")
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
      doc.fillColor(ACC).fontSize(10).font("Helvetica-Bold")
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
      { label: "Chiffre d'Affaires", value: money(v.ca_total), color: ACC },
      { label: "Total Dépenses",     value: money(a.total_achats), color: "#ef4444" },
      { label: "Bénéfice Net",       value: money(benefice), color: benefice >= 0 ? "#10b981" : "#ef4444" },
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
    row("Chiffre d'affaires",   money(v.ca_total),      ACC);
    row("Nombre de factures",   fmtN(v.nb_factures));
    row("Quantités vendues",    fmtN(v.qte_totale) + " unités");

    /* ── Approvisionnements ── */
    section("APPROVISIONNEMENTS");
    row("Nombre d'achats",      fmtN(a.nb_achats));
    row("Total dépenses",       money(a.total_achats),  "#ef4444");
    row("Montant payé",         money(a.total_paye),    "#10b981");
    row("Dettes fournisseurs",  money(a.total_dettes),  parseInt(a.total_dettes) > 0 ? "#ef4444" : "#64748b");

    /* ── Factures ── */
    section("RECOUVREMENT FACTURES");
    row("Total facturé",        money(f.montant_total));
    row("Montant encaissé",     money(f.montant_encaisse), "#10b981");
    row("Créances restantes",   money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#ef4444" : "#64748b");
    row("Factures réglées",     fmtN(f.nb_reglees),     "#10b981");
    row("Factures impayées",    fmtN(f.nb_impayees),    parseInt(f.nb_impayees) > 0 ? "#ef4444" : "#64748b");

    /* ── Top articles ── */
    if (topArticles.rows.length > 0) {
      section("TOP 5 ARTICLES VENDUS");
      topArticles.rows.forEach((a, i) => {
        row(`${i + 1}. ${a.libelle}`, money(a.ca) + " · " + fmtN(a.qte) + " u.", ACC);
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
       .text(money(benefice), 60, benY + 24, { width: 380 });
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
       .text(`CA ${money(v.ca_total)}  —  Dépenses ${money(a.total_achats)}`, 60, benY + 50);

    /* ── Pied de page ── */
    // IMPORTANT : rester DANS la zone imprimable (au-dessus de doc.page.maxY(), c.-à-d.
    // hauteur de page - marge basse). Un Y situé dans la marge basse fait que PDFKit
    // déclenche un saut de page automatique avant d'écrire le texte — d'où la page 2
    // quasi-vide qui ne contenait que ce pied de page. On calcule donc sa position à
    // partir de maxY() plutôt que d'un offset fixe depuis le bas physique de la page.
    const footerY = doc.page.maxY() - 15;
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
       .text("Document généré automatiquement par WariGest — Logiciel de gestion & facturation", 50, footerY, { width: 495, align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération PDF." });
  }
}

module.exports = { getRapport, exportPDF };
