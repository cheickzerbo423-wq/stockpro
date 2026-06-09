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

    const doc = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);

    const PW  = 595, PH = 842;
    const M   = 52;
    const INN = PW - M * 2;
    const INK = "#111827";
    const SUB = "#6B7280";
    const LITE = "#D1D5DB";

    const hr = (y, w, c) =>
      doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(c).stroke();

    // ── En-tête ──────────────────────────────────────────────────────────────
    let txtX = M, txtW = 240;
    if (logoBuf) {
      try {
        doc.image(logoBuf, M, 36, { fit: [42, 42] });
        txtX = M + 52; txtW = 188;
      } catch (e) { /* ignoré */ }
    }

    doc.fontSize(16).fillColor(INK).font("Helvetica-Bold")
       .text(company, txtX, 36, { width: txtW });
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica")
       .text((compAddr || "") + (compTel ? (compAddr ? "  ·  " : "") + compTel : ""), txtX, 58, { width: txtW });

    doc.fontSize(22).fillColor(ACC).font("Helvetica-Bold")
       .text("RAPPORT FINANCIER", PW - M - 230, 34, { width: 230, align: "right" });
    doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold")
       .text(fmtDate(debut) + "  -  " + fmtDate(fin), PW - M - 230, 63, { width: 230, align: "right" });
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica")
       .text("Genere le " + fmtDate(new Date().toISOString().split("T")[0]), PW - M - 230, 77, { width: 230, align: "right" });

    hr(96, 1, ACC); hr(98, 0.3, LITE);
    doc.y = 112;

    // ── KPIs (4 cases — contours seulement) ──────────────────────────────────
    const kpiW = 116, kpiH = 58, kpiY = doc.y;
    const kpiGap = Math.floor((INN - kpiW * 4) / 3);
    const kpis = [
      { label: "Chiffre d'Affaires", value: money(v.ca_total),    color: ACC },
      { label: "Total Depenses",     value: money(a.total_achats), color: "#EF4444" },
      { label: "Benefice Net",       value: money(benefice),      color: benefice >= 0 ? "#10B981" : "#EF4444" },
      { label: "Factures Emises",    value: fmtN(f.nb_total),     color: "#3B82F6" },
    ];
    kpis.forEach((k, i) => {
      const kx = M + i * (kpiW + kpiGap);
      doc.rect(kx, kpiY, kpiW, kpiH).strokeColor(LITE).lineWidth(0.8).stroke();
      // Trait accent en haut de chaque box
      doc.moveTo(kx, kpiY).lineTo(kx + kpiW, kpiY).lineWidth(2).strokeColor(k.color).stroke();
      doc.fillColor(k.color).fontSize(12).font("Helvetica-Bold")
         .text(k.value, kx + 4, kpiY + 12, { width: kpiW - 8, align: "center" });
      doc.fillColor(SUB).fontSize(7).font("Helvetica")
         .text(k.label, kx + 4, kpiY + 38, { width: kpiW - 8, align: "center" });
    });
    doc.y = kpiY + kpiH + 20;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const section = (title) => {
      doc.moveDown(0.4);
      const sy = doc.y;
      doc.fontSize(9).fillColor(INK).font("Helvetica-Bold").text(title, M, sy);
      doc.moveTo(M, sy + 13).lineTo(M + INN, sy + 13).lineWidth(1.2).strokeColor(ACC).stroke();
      doc.y = sy + 20;
    };

    const row = (label, value, color) => {
      const ry = doc.y;
      doc.fontSize(8.5).fillColor(SUB).font("Helvetica").text(label, M + 4, ry);
      doc.fillColor(color || INK).font("Helvetica-Bold")
         .text(value, M, ry, { width: INN, align: "right" });
      doc.moveTo(M, ry + 15).lineTo(M + INN, ry + 15).lineWidth(0.3).strokeColor(LITE).stroke();
      doc.y = ry + 15;
    };

    // ── Sections ──────────────────────────────────────────────────────────────
    section("VENTES");
    row("Chiffre d'affaires",  money(v.ca_total),   ACC);
    row("Nombre de factures",  fmtN(v.nb_factures));
    row("Quantites vendues",   fmtN(v.qte_totale) + " unites");

    section("APPROVISIONNEMENTS");
    row("Nombre d'achats",     fmtN(a.nb_achats));
    row("Total depenses",      money(a.total_achats),  "#EF4444");
    row("Montant paye",        money(a.total_paye),    "#10B981");
    row("Dettes fournisseurs", money(a.total_dettes),  parseInt(a.total_dettes) > 0 ? "#EF4444" : SUB);

    section("RECOUVREMENT FACTURES");
    row("Total facture",       money(f.montant_total));
    row("Montant encaisse",    money(f.montant_encaisse), "#10B981");
    row("Creances restantes",  money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#EF4444" : SUB);
    row("Factures reglees",    fmtN(f.nb_reglees),   "#10B981");
    row("Factures impayees",   fmtN(f.nb_impayees),  parseInt(f.nb_impayees) > 0 ? "#EF4444" : SUB);

    if (topArticles.rows.length > 0) {
      section("TOP 5 ARTICLES VENDUS");
      topArticles.rows.forEach((art, i) => {
        row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  /  " + fmtN(art.qte) + " u.", ACC);
      });
    }

    // ── Résumé bénéfice ───────────────────────────────────────────────────────
    doc.moveDown(0.8);
    const benY    = doc.y;
    const benColor = benefice >= 0 ? "#10B981" : "#EF4444";
    doc.moveTo(M, benY).lineTo(M + INN, benY).lineWidth(1).strokeColor(LITE).stroke();
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica")
       .text("BENEFICE NET DE LA PERIODE", M, benY + 8);
    doc.fontSize(22).fillColor(benColor).font("Helvetica-Bold")
       .text(money(benefice), M, benY + 20);
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica")
       .text("CA : " + money(v.ca_total) + "   -   Depenses : " + money(a.total_achats), M, benY + 47);
    doc.moveTo(M, benY + 58).lineTo(M + INN, benY + 58).lineWidth(0.5).strokeColor(LITE).stroke();

    // ── Pied de page ──────────────────────────────────────────────────────────
    const footerY = doc.page.maxY() - 15;
    doc.fillColor(SUB).fontSize(7).font("Helvetica")
       .text("Document genere automatiquement par WariGest - Logiciel de gestion & facturation", M, footerY, { width: INN, align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur generation PDF." });
  }
}

module.exports = { getRapport, exportPDF };
