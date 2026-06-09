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

    // ── Constantes ────────────────────────────────────────────────────────
    const PW   = 595, PH = 842;
    const ML   = 14;              // barre accent gauche
    const M    = 50;              // marge texte
    const INN  = PW - M - 32;    // largeur utile
    const INK  = "#0F172A";
    const SUB  = "#64748B";
    const RULE = "#E2E8F0";
    const PALE = "#F8FAFC";

    // ── Bande accent gauche pleine hauteur ────────────────────────────────
    doc.rect(0, 0, ML, PH).fillColor(ACC).fill();

    // ── Zone en-tête (fond très léger) ───────────────────────────────────
    doc.rect(ML, 0, PW - ML, 100).fillColor("#FAFBFF").fill();
    doc.moveTo(ML, 100).lineTo(PW, 100).lineWidth(0.5).strokeColor(RULE).stroke();

    // Logo
    let txtX = M, txtW = 230;
    if (logoBuf) {
      try {
        doc.image(logoBuf, M, 18, { fit: [50, 50] });
        txtX = M + 60; txtW = 170;
      } catch (e) { console.error("Logo PDF (rapport) ignoré :", e.message); }
    }

    // Entreprise
    doc.fontSize(16).fillColor(INK).font("Helvetica-Bold")
       .text(company, txtX, 22, { width: txtW });
    doc.fontSize(8).fillColor(SUB).font("Helvetica")
       .text((compAddr || "") + (compTel ? (compAddr ? "  ·  " : "") + compTel : ""), txtX, 46, { width: txtW });

    // Titre rapport (droite)
    doc.fontSize(22).fillColor(ACC).font("Helvetica-Bold")
       .text("RAPPORT", PW - 32 - 200, 20, { width: 200, align: "right" });
    doc.fontSize(10).fillColor(INK).font("Helvetica-Bold")
       .text("FINANCIER", PW - 32 - 200, 46, { width: 200, align: "right" });
    doc.fontSize(8).fillColor(SUB).font("Helvetica")
       .text(`${fmtDate(debut)} — ${fmtDate(fin)}`, PW - 32 - 200, 62, { width: 200, align: "right" });
    doc.fontSize(7).fillColor(SUB)
       .text(`Généré le ${fmtDate(new Date().toISOString().split("T")[0])}`, PW - 32 - 200, 76, { width: 200, align: "right" });

    doc.y = 116;

    // ── KPIs (4 cases) ────────────────────────────────────────────────────
    const kpiW = 118, kpiH = 64, kpiY = doc.y;
    const kpiGap = (INN - M - kpiW * 4) / 3;
    const kpis = [
      { label: "Chiffre d'Affaires", value: money(v.ca_total),    color: ACC },
      { label: "Total Dépenses",     value: money(a.total_achats), color: "#EF4444" },
      { label: "Bénéfice Net",       value: money(benefice),      color: benefice >= 0 ? "#10B981" : "#EF4444" },
      { label: "Factures Émises",    value: fmtN(f.nb_total),     color: "#3B82F6" },
    ];
    kpis.forEach((k, i) => {
      const kx = M + i * (kpiW + kpiGap);
      // Fond + bord supérieur coloré
      doc.rect(kx, kpiY, kpiW, kpiH).fillColor("white").fill();
      doc.rect(kx, kpiY, kpiW, 3).fillColor(k.color).fill();
      // Contour léger
      doc.rect(kx, kpiY, kpiW, kpiH).strokeColor(RULE).lineWidth(0.5).stroke();
      doc.fillColor(k.color).fontSize(13).font("Helvetica-Bold")
         .text(k.value, kx + 6, kpiY + 14, { width: kpiW - 12, align: "center" });
      doc.fillColor(SUB).fontSize(7).font("Helvetica")
         .text(k.label, kx + 4, kpiY + 42, { width: kpiW - 8, align: "center" });
    });
    doc.y = kpiY + kpiH + 18;

    // ── Helpers sections & lignes ─────────────────────────────────────────
    const section = (title) => {
      doc.moveDown(0.3);
      doc.rect(M, doc.y, INN - M, 20).fillColor(ACC).fill();
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
         .text(title, M + 8, doc.y + 6);
      doc.y += 26;
    };

    let rowAlt = false;
    const row = (label, value, color = INK) => {
      const ry = doc.y;
      doc.rect(M, ry, INN - M, 18).fillColor(rowAlt ? PALE : "white").fill();
      doc.fillColor(SUB).fontSize(8.5).font("Helvetica").text(label, M + 8, ry + 5);
      doc.fillColor(color).fontSize(8.5).font("Helvetica-Bold")
         .text(value, M, ry + 5, { width: INN - M - 8, align: "right" });
      doc.moveTo(M, ry + 18).lineTo(M + INN - M, ry + 18).lineWidth(0.3).strokeColor(RULE).stroke();
      doc.y += 18;
      rowAlt = !rowAlt;
    };

    // ── Sections ──────────────────────────────────────────────────────────
    section("VENTES");
    rowAlt = false;
    row("Chiffre d'affaires",  money(v.ca_total),   ACC);
    row("Nombre de factures",  fmtN(v.nb_factures));
    row("Quantités vendues",   fmtN(v.qte_totale) + " unités");

    section("APPROVISIONNEMENTS");
    rowAlt = false;
    row("Nombre d'achats",     fmtN(a.nb_achats));
    row("Total dépenses",      money(a.total_achats),  "#EF4444");
    row("Montant payé",        money(a.total_paye),    "#10B981");
    row("Dettes fournisseurs", money(a.total_dettes),  parseInt(a.total_dettes) > 0 ? "#EF4444" : SUB);

    section("RECOUVREMENT FACTURES");
    rowAlt = false;
    row("Total facturé",       money(f.montant_total));
    row("Montant encaissé",    money(f.montant_encaisse), "#10B981");
    row("Créances restantes",  money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#EF4444" : SUB);
    row("Factures réglées",    fmtN(f.nb_reglees),   "#10B981");
    row("Factures impayées",   fmtN(f.nb_impayees),  parseInt(f.nb_impayees) > 0 ? "#EF4444" : SUB);

    if (topArticles.rows.length > 0) {
      section("TOP 5 ARTICLES VENDUS");
      rowAlt = false;
      topArticles.rows.forEach((art, i) => {
        row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  ·  " + fmtN(art.qte) + " u.", ACC);
      });
    }

    // ── Résumé bénéfice ───────────────────────────────────────────────────
    doc.moveDown(0.8);
    const benY = doc.y;
    const benColor = benefice >= 0 ? "#10B981" : "#EF4444";
    const benBg    = benefice >= 0 ? "#ECFDF5" : "#FEF2F2";
    doc.rect(M, benY, INN - M, 52).fillColor(benBg).fill();
    doc.rect(M, benY, 4, 52).fillColor(benColor).fill();
    doc.fillColor(SUB).fontSize(7.5).font("Helvetica")
       .text("BÉNÉFICE NET DE LA PÉRIODE", M + 14, benY + 9);
    doc.fillColor(benColor).fontSize(20).font("Helvetica-Bold")
       .text(money(benefice), M + 14, benY + 22);
    doc.fillColor(SUB).fontSize(7.5).font("Helvetica")
       .text(`CA : ${money(v.ca_total)}   —   Dépenses : ${money(a.total_achats)}`, M + 14, benY + 44);

    // ── Pied de page ──────────────────────────────────────────────────────
    const footerY = doc.page.maxY() - 15;
    doc.fillColor(SUB).fontSize(7).font("Helvetica")
       .text("Document généré automatiquement par WariGest — Logiciel de gestion & facturation", ML, footerY, { width: PW - ML, align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération PDF." });
  }
}

module.exports = { getRapport, exportPDF };
