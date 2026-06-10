// src/controllers/rapportsController.js
const db     = require("../config/db");
const PDFDoc = require("pdfkit");
const { getEntrepriseConfig, logoBuffer } = require("../utils/entrepriseConfig");
const { getStyle } = require("../utils/pdfStyles");
const rapportLayouts = require("../pdf/rapportLayouts");

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
    const money    = (n) => sep(n) + " " + (cfg.devise || "FCFA");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Rapport_${debut}_${fin}.pdf"`);

    const doc = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);

    // ── Style choisi (catalogue layouts x palettes — voir utils/pdfStyles.js)
    const style = getStyle(cfg.rapport_style);
    const renderer = rapportLayouts[style.layoutId] || rapportLayouts.classic;
    renderer(doc, {
      v, a, f, benefice,
      topArticles: topArticles.rows,
      cfg, money, fmtN,
      debutStr: fmtDate(debut),
      finStr:   fmtDate(fin),
      genStr:   fmtDate(new Date().toISOString().split("T")[0]),
      logoBuf,
      pal: style.palette,
      PW: 595, PH: 842, M: 52, INN: 595 - 52 * 2,
    });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur generation PDF." });
  }
}

module.exports = { getRapport, exportPDF };
