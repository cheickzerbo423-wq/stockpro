// src/controllers/facturesController.js
// Équivalent Excel : Facture + Etat facture
const db     = require("../config/db");
const PDFDoc = require("pdfkit");
const { getEntrepriseConfig, logoBuffer } = require("../utils/entrepriseConfig");
const { getStyle } = require("../utils/pdfStyles");
const factureLayouts = require("../pdf/facturesLayouts");
const recuLayouts = require("../pdf/recuLayouts");

// GET /api/factures — Liste des factures (paginée côté serveur)
// Réponse : { data, total, page, limit, totalPages, kpis }
// kpis est calculé sur l'ENSEMBLE des factures filtrées (pas seulement la
// page courante) afin que les cartes de synthèse (CA, reste, réglées/
// impayées) restent exactes quelle que soit la page affichée.
//
// "statut" : "paid" => f.reste <= 0 (facture réglée), "unpaid" => f.reste > 0.
// Aligné sur isFactureReglee() côté frontend, qui corrige le cas où la
// colonne "statut" (générée) est obsolète mais "reste" vaut 0.
async function getAll(req, res) {
  try {
    const { client, statut, annee, q: search } = req.query;
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const offset = (page - 1) * limit;

    let where = ` WHERE f.entreprise_id = $1`;
    const params = [req.user.entreprise_id];
    let idx = 2;
    if (client) { where += ` AND f.client_nom ILIKE $${idx++}`; params.push(`%${client}%`); }
    if (statut === "paid")   where += ` AND f.reste <= 0`;
    if (statut === "unpaid") where += ` AND f.reste > 0`;
    if (annee)  { where += ` AND EXTRACT(YEAR FROM f.date_facture) = $${idx++}`; params.push(annee); }
    if (search) { where += ` AND (f.client_nom ILIKE $${idx} OR f.code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const [dataResult, countResult, aggResult] = await Promise.all([
      db.query(
        `SELECT f.*, COUNT(lv.id) AS nb_articles
         FROM factures f
         LEFT JOIN lignes_vente lv ON lv.facture_code = f.code AND lv.entreprise_id = f.entreprise_id
         ${where}
         GROUP BY f.code, f.entreprise_id
         ORDER BY f.code ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM factures f ${where}`, params),
      db.query(
        `SELECT COALESCE(SUM(f.montant), 0)                       AS total_ca,
                COALESCE(SUM(f.reste), 0)                         AS total_reste,
                COUNT(*) FILTER (WHERE f.reste <= 0)              AS nb_reglees,
                COUNT(*) FILTER (WHERE f.reste > 0)               AS nb_impayees
         FROM factures f ${where}`,
        params
      ),
    ]);

    const total = parseInt(countResult.rows[0].total);
    res.json({
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      kpis: {
        total_ca:    aggResult.rows[0].total_ca,
        total_reste: aggResult.rows[0].total_reste,
        nb_reglees:  parseInt(aggResult.rows[0].nb_reglees),
        nb_impayees: parseInt(aggResult.rows[0].nb_impayees),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// GET /api/factures/:code — Détail d'une facture
async function getOne(req, res) {
  try {
    const code = decodeURIComponent(req.params[0] || req.params.code || "");
    const facture = await db.query(
      `SELECT * FROM factures WHERE code = $1 AND entreprise_id = $2`,
      [code, req.user.entreprise_id]
    );
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });

    const lignes = await db.query(
      `SELECT * FROM lignes_vente WHERE facture_code = $1 AND entreprise_id = $2 ORDER BY id`,
      [code, req.user.entreprise_id]
    );
    res.json({ ...facture.rows[0], lignes: lignes.rows });
  } catch (err) {
    console.error("getOne facture error:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// PUT /api/factures/:code/paiement — Mettre à jour le paiement
async function updatePaiement(req, res) {
  try {
    const code = decodeURIComponent(req.params[0] || req.params.code || "");
    const { montant_paye } = req.body;
    if (montant_paye === undefined || isNaN(parseFloat(montant_paye)))
      return res.status(400).json({ message: "Montant payé invalide." });

    const entId = req.user.entreprise_id;
    const facture = await db.query(
      `SELECT montant, montant_paye FROM factures WHERE code = $1 AND entreprise_id = $2`,
      [code, entId]
    );
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    if (parseFloat(montant_paye) > parseFloat(facture.rows[0].montant))
      return res.status(400).json({ message: "Le montant payé dépasse le montant de la facture." });
    if (parseFloat(montant_paye) < parseFloat(facture.rows[0].montant_paye))
      return res.status(400).json({ message: "Le montant payé ne peut pas diminuer." });

    const paye = parseFloat(montant_paye);

    // "reste" et "statut" sont des colonnes GENERATED ALWAYS ... STORED en base
    // (calculées automatiquement par PostgreSQL à partir de montant/montant_paye).
    // On ne doit JAMAIS leur assigner de valeur directement (Postgres rejette avec
    // "column ... can only be updated to DEFAULT") — on met à jour seulement
    // montant_paye, et la base recalcule reste/statut toute seule.
    const result = await db.query(
      `UPDATE factures
       SET montant_paye = $1::numeric
       WHERE code = $2 AND entreprise_id = $3
       RETURNING *`,
      [paye, code, entId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updatePaiement error:", err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour du paiement." });
  }
}

// Formatte un nombre sans séparateurs problématiques pour PDFKit
// (la devise vient désormais de la configuration "entreprise" de chaque
// société, avec repli sur la variable d'environnement COMPANY_DEVISE)
function formatMoney(n, devise) {
  const dev = devise || process.env.COMPANY_DEVISE || "FCFA";
  const num = Math.round(n || 0);
  const str = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return str + " " + dev;
}

// GET /api/factures/:code/pdf — Générer la facture en PDF
async function generatePDF(req, res) {
  try {
    const code = decodeURIComponent(req.params[0] || req.params.code || "");
    const entId = req.user.entreprise_id;
    const facture = await db.query(
      `SELECT * FROM factures WHERE code = $1 AND entreprise_id = $2`,
      [code, entId]
    );
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });

    const lignes = await db.query(
      `SELECT * FROM lignes_vente WHERE facture_code = $1 AND entreprise_id = $2 ORDER BY id`,
      [code, entId]
    );

    const f       = facture.rows[0];
    const cfg     = await getEntrepriseConfig(entId);
    const logoBuf = logoBuffer(cfg.logo);
    const money   = (n) => formatMoney(n, cfg.devise);
    const d       = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const MOIS_FR = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
    const dateStr = `${d.getDate().toString().padStart(2,"0")} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${f.code}.pdf"`);

    const doc = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);

    // ── Style choisi (catalogue layouts x palettes — voir utils/pdfStyles.js)
    const style = getStyle(cfg.facture_style);
    const renderer = factureLayouts[style.layoutId] || factureLayouts.classic;
    renderer(doc, {
      f, lignes: lignes.rows, cfg, money, dateStr, logoBuf,
      pal: style.palette,
      PW: 595, PH: 842, M: 52, INN: 595 - 52 * 2,
    });

    doc.end();
  } catch (err) {
    console.error("PDF error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la generation du PDF." });
  }
}

// GET /api/factures/:code/recu — Petit reçu thermique format 80mm
async function generateRecu(req, res) {
  try {
    const code    = decodeURIComponent(req.params[0] || req.params.code || "");
    const entId   = req.user.entreprise_id;
    const facture = await db.query(
      `SELECT * FROM factures WHERE code = $1 AND entreprise_id = $2`,
      [code, entId]
    );
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });

    const lignes  = await db.query(
      `SELECT * FROM lignes_vente WHERE facture_code = $1 AND entreprise_id = $2 ORDER BY id`,
      [code, entId]
    );

    const f       = facture.rows[0];
    const cfg     = await getEntrepriseConfig(entId);
    const logoBuf = logoBuffer(cfg.logo);
    const money   = (n) => formatMoney(n, cfg.devise);
    const dr      = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const dateStr = `${dr.getDate().toString().padStart(2,"0")}/${(dr.getMonth()+1).toString().padStart(2,"0")}/${dr.getFullYear()}`;

    const W     = 226;
    const M     = 12;
    const INNER = W - M * 2;

    const style    = getStyle(cfg.recu_style);
    const renderer = recuLayouts[style.layoutId] || recuLayouts.classic;
    const ctx = {
      f, lignes: lignes.rows, cfg, money, dateStr, logoBuf,
      pal: style.palette, W, M, INNER,
    };
    const H = renderer.height(ctx);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="recu_${f.code}.pdf"`);

    const doc = new PDFDoc({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.pipe(res);

    renderer.draw(doc, ctx);

    doc.end();
  } catch (err) {
    console.error("Recu error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la generation du recu." });
  }
}

module.exports = { getAll, getOne, updatePaiement, generatePDF, generateRecu };
