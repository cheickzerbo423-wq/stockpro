// src/controllers/facturesController.js
// Équivalent Excel : Facture + Etat facture
const db     = require("../config/db");
const PDFDoc = require("pdfkit");
const { getEntrepriseConfig, logoBuffer } = require("../utils/entrepriseConfig");

// GET /api/factures
async function getAll(req, res) {
  try {
    const { client, statut, mois, annee } = req.query;
    let q = `
      SELECT f.*, COUNT(lv.id) AS nb_articles
      FROM factures f
      LEFT JOIN lignes_vente lv ON lv.facture_code = f.code AND lv.entreprise_id = f.entreprise_id
      WHERE f.entreprise_id = $1`;
    const params = [req.user.entreprise_id];
    let idx = 2;
    if (client) { q += ` AND f.client_nom ILIKE $${idx++}`; params.push(`%${client}%`); }
    if (statut !== undefined) {
      q += ` AND f.statut = $${idx++}`;
      params.push(statut === "true" || statut === "1");
    }
    if (annee)  { q += ` AND EXTRACT(YEAR FROM f.date_facture) = $${idx++}`; params.push(annee); }
    q += ` GROUP BY f.code, f.entreprise_id ORDER BY f.code ASC`;
    const result = await db.query(q, params);
    res.json(result.rows);
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
    res.status(500).json({ message: err.message || "Erreur serveur." });
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

    const PW  = 595, PH = 842;
    const M   = 52;
    const INN = PW - M * 2;
    const ACC = cfg.couleur || "#0023FF";
    const INK = "#111827";
    const SUB = "#6B7280";
    const LITE = "#D1D5DB";

    const hr = (y, w, col) =>
      doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(col).stroke();

    // ── En-tête : entreprise gauche / FACTURE droite ────────────────────────
    let nameX = M, nameW = 250;
    if (logoBuf) {
      try {
        doc.image(logoBuf, M, 40, { fit: [44, 44] });
        nameX = M + 54; nameW = 196;
      } catch (e) { /* logo ignoré */ }
    }

    doc.fontSize(16).fillColor(INK).font("Helvetica-Bold")
       .text(cfg.nom, nameX, 40, { width: nameW });
    let cy = 62;
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica");
    if (cfg.adresse)   { doc.text(cfg.adresse,            nameX, cy, { width: nameW }); cy += 12; }
    if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, nameX, cy, { width: nameW }); cy += 12; }
    if (cfg.email)     { doc.text(cfg.email,               nameX, cy, { width: nameW }); }

    // FACTURE + infos droite
    const rX = M + 300, rW = INN - 300;
    doc.fontSize(26).fillColor(ACC).font("Helvetica-Bold")
       .text("FACTURE", rX, 40, { width: rW, align: "right" });
    doc.fontSize(9).fillColor(INK).font("Helvetica-Bold")
       .text(f.code, rX, 74, { width: rW, align: "right" });
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica")
       .text(dateStr, rX, 88, { width: rW, align: "right" });
    const paid   = !!f.statut;
    const sColor = paid ? "#16A34A" : "#DC2626";
    const sLabel = paid ? "REGLEE" : "IMPAYEE";
    doc.fontSize(8.5).fillColor(sColor).font("Helvetica-Bold")
       .text(sLabel, rX, 104, { width: rW, align: "right" });

    // ── Filet séparation ────────────────────────────────────────────────────
    hr(128, 1, ACC);

    // ── Bloc client ─────────────────────────────────────────────────────────
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Bold")
       .text("FACTURE A :", M, 144);
    doc.fontSize(13).fillColor(INK).font("Helvetica-Bold")
       .text(f.client_nom, M, 157, { width: 260 });

    // ── Filet avant tableau ──────────────────────────────────────────────────
    hr(190, 0.5, LITE);

    // ── TABLEAU ─────────────────────────────────────────────────────────────
    const TY = 198, RH = 26;
    const C1x = M,       C1w = 240;
    const C2x = M + 240, C2w = 50;
    const C3x = M + 290, C3w = 115;
    const C4x = M + 405, C4w = INN - 405;

    // En-tête tableau : texte gras + filet bas
    doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold");
    doc.text("DESIGNATION",  C1x,     TY + 9, { width: C1w });
    doc.text("QTE",           C2x,     TY + 9, { width: C2w, align: "center" });
    doc.text("PRIX UNIT.",    C3x,     TY + 9, { width: C3w, align: "right" });
    doc.text("MONTANT",       C4x,     TY + 9, { width: C4w, align: "right" });
    hr(TY + RH, 1, INK);

    let ry = TY + RH;
    lignes.rows.forEach((l) => {
      ry += 4;
      doc.fontSize(9.5).fillColor(INK).font("Helvetica")
         .text(l.libelle,                                C1x,     ry, { width: C1w - 8 });
      doc.text(String(parseFloat(l.quantite) || 0),      C2x,     ry, { width: C2w, align: "center" });
      doc.fillColor(SUB)
         .text(money(l.prix_vente),                      C3x,     ry, { width: C3w, align: "right" });
      doc.fillColor(INK).font("Helvetica-Bold")
         .text(money(l.montant_total),                   C4x,     ry, { width: C4w, align: "right" });
      ry += 22;
      hr(ry, 0.3, LITE);
    });

    hr(ry + 4, 0.5, LITE);

    // ── TOTAUX ───────────────────────────────────────────────────────────────
    const TotW = 210, TotX = M + INN - TotW;
    let TotY = ry + 18;

    const tLine = (lbl, val, bold, col) => {
      doc.fontSize(9).fillColor(SUB).font("Helvetica")
         .text(lbl, TotX, TotY, { width: 108 });
      doc.fillColor(col || INK).font(bold ? "Helvetica-Bold" : "Helvetica")
         .text(val, TotX, TotY, { width: TotW, align: "right" });
      TotY += 18;
    };

    tLine("Sous-total", money(f.montant));
    hr(TotY, 0.3, LITE); TotY += 6;
    tLine("Montant encaisse", money(f.montant_paye), true, "#16A34A");
    if (parseFloat(f.reste) > 0)
      tLine("Reste a payer", money(f.reste), true, "#DC2626");

    // Filet double avant TOTAL
    hr(TotY + 2, 0.5, INK); TotY += 6;
    doc.fontSize(11).fillColor(INK).font("Helvetica-Bold")
       .text("TOTAL", TotX, TotY);
    doc.fontSize(14).fillColor(ACC).font("Helvetica-Bold")
       .text(money(f.montant), TotX, TotY - 1, { width: TotW, align: "right" });

    // ── PIED DE PAGE ─────────────────────────────────────────────────────────
    const footY = PH - 52;
    hr(footY, 0.5, LITE);
    doc.fontSize(7.5).fillColor(ACC).font("Helvetica-Bold")
       .text("WariGest", M, footY + 12);
    doc.fontSize(7).fillColor(SUB).font("Helvetica")
       .text("Logiciel de gestion & facturation", M, footY + 24);
    const msg = cfg.pied_de_page || "Merci pour votre confiance. Ce document tient lieu de facture officielle.";
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Oblique")
       .text(msg, M, footY + 17, { width: INN, align: "center" });

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
    const code    = req.params[0] || req.params.code;
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
    const ACC   = cfg.couleur || "#0023FF";
    const DARK  = "#111827";
    const GREY  = "#6B7280";
    const LITE  = "#D1D5DB";

    const LINE_H = 16;
    const extraH = parseFloat(f.reste) > 0 ? 16 : 0;
    const logoH  = logoBuf ? 46 : 0;
    const H      = 290 + logoH + lignes.rows.length * LINE_H + extraH;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="recu_${f.code}.pdf"`);

    const doc = new PDFDoc({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.pipe(res);

    const hr  = (yy, t, c) => doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(t).strokeColor(c).stroke();
    const hrW = (yy, t, c) => doc.moveTo(0, yy).lineTo(W, yy).lineWidth(t).strokeColor(c).stroke();

    let y = 12;

    // ── Logo centré ──────────────────────────────────────────────────────────
    if (logoBuf) {
      try {
        doc.image(logoBuf, (W - 36) / 2, y, { fit: [36, 36] });
        y += 44;
      } catch (e) { /* ignoré */ }
    }

    // ── Nom entreprise ───────────────────────────────────────────────────────
    doc.fontSize(12).fillColor(DARK).font("Helvetica-Bold")
       .text(cfg.nom, 0, y, { width: W, align: "center" });
    y += 15;
    doc.fontSize(7).fillColor(GREY).font("Helvetica");
    if (cfg.adresse)   { doc.text(cfg.adresse,          0, y, { width: W, align: "center" }); y += 10; }
    if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, 0, y, { width: W, align: "center" }); y += 10; }

    y += 4; hrW(y, 0.5, LITE); y += 8;

    // ── Titre ────────────────────────────────────────────────────────────────
    doc.fontSize(9.5).fillColor(DARK).font("Helvetica-Bold")
       .text("RECU DE PAIEMENT", 0, y, { width: W, align: "center" });
    y += 13;
    doc.fontSize(7).fillColor(GREY).font("Helvetica")
       .text("Ref : " + f.code, 0, y, { width: W, align: "center" });
    y += 10;

    hrW(y, 0.5, LITE); y += 8;

    // ── Date / Client ─────────────────────────────────────────────────────────
    const infoLine = (lbl, val) => {
      doc.fontSize(7.5).fillColor(GREY).font("Helvetica").text(lbl, M, y, { width: 40 });
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica-Bold").text(val, M + 40, y, { width: INNER - 40 });
      y += 12;
    };
    infoLine("Date :", dateStr);
    infoLine("Client :", f.client_nom);

    y += 3; hrW(y, 0.5, LITE); y += 8;

    // ── En-tête tableau ───────────────────────────────────────────────────────
    doc.fontSize(7).fillColor(GREY).font("Helvetica-Bold");
    doc.text("ARTICLE",  M,       y, { width: 72 });
    doc.text("QTE",      M + 72,  y, { width: 22, align: "center" });
    doc.text("P.U.",     M + 94,  y, { width: 50, align: "right" });
    doc.text("TOTAL",    M + 144, y, { width: INNER - 144, align: "right" });
    y += 10;
    hr(y, 0.8, DARK); y += 4;

    // ── Lignes articles ───────────────────────────────────────────────────────
    lignes.rows.forEach((l) => {
      const lib = l.libelle.length > 15 ? l.libelle.slice(0, 14) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica")
         .text(lib,                                 M,       y, { width: 72 });
      doc.text(String(parseFloat(l.quantite) || 0), M + 72,  y, { width: 22, align: "center" });
      doc.fillColor(GREY)
         .text(money(l.prix_vente),                 M + 94,  y, { width: 50, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold")
         .text(money(l.montant_total),              M + 144, y, { width: INNER - 144, align: "right" });
      y += LINE_H;
      hr(y, 0.3, LITE);
    });

    y += 5; hr(y, 0.8, DARK); y += 8;

    // ── Totaux ────────────────────────────────────────────────────────────────
    const totLn = (lbl, val, col) => {
      doc.fontSize(8).fillColor(GREY).font("Helvetica").text(lbl, M, y);
      doc.fillColor(col || DARK).font("Helvetica-Bold")
         .text(val, M, y, { width: INNER, align: "right" });
      y += 13;
    };

    totLn("Montant encaisse", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste a payer", money(f.reste), "#DC2626");

    y += 2; hr(y, 0.5, LITE); y += 6;

    // TOTAL
    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text("TOTAL", M, y);
    doc.fontSize(13).fillColor(ACC).font("Helvetica-Bold")
       .text(money(f.montant), M, y - 1, { width: INNER, align: "right" });
    y += 18;

    hr(y, 0.5, LITE); y += 8;

    // Statut
    const paid  = !!f.statut;
    const sCol  = paid ? "#16A34A" : "#DC2626";
    const sLbl  = paid ? "FACTURE REGLEE" : "RESTE A PAYER";
    doc.fontSize(8).fillColor(sCol).font("Helvetica-Bold")
       .text(sLbl, 0, y, { width: W, align: "center" });
    y += 13;

    hrW(y, 0.5, LITE); y += 8;

    doc.fontSize(7).fillColor(GREY).font("Helvetica-Oblique")
       .text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 11;
    doc.fontSize(6.5).fillColor(ACC).font("Helvetica-Bold")
       .text("Edite par WariGest", 0, y, { width: W, align: "center" });

    doc.end();
  } catch (err) {
    console.error("Recu error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la generation du recu." });
  }
}

module.exports = { getAll, getOne, updatePaiement, generatePDF, generateRecu };
