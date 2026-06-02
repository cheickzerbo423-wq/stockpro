// src/controllers/facturesController.js — WariGest
const db     = require("../config/db");
const PDFDoc = require("pdfkit");

const BLUE   = "#0023FF";
const YELLOW = "#FFF900";
const DARK   = "#060d2e";

function formatMoney(n) {
  const devise = process.env.COMPANY_DEVISE || "FCFA";
  const num = Math.round(n || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + devise;
}

// GET /api/factures
async function getAll(req, res) {
  try {
    const { client, statut, mois, annee } = req.query;
    let q = `SELECT f.*, COUNT(lv.id) AS nb_articles FROM factures f LEFT JOIN lignes_vente lv ON lv.facture_code = f.code WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (client) { q += ` AND f.client_nom ILIKE $${idx++}`; params.push(`%${client}%`); }
    if (statut !== undefined) { q += ` AND f.statut = $${idx++}`; params.push(statut === "true" || statut === "1"); }
    if (annee)  { q += ` AND EXTRACT(YEAR FROM f.date_facture) = $${idx++}`; params.push(annee); }
    q += ` GROUP BY f.code ORDER BY f.code ASC`;
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// GET /api/factures/:code
async function getOne(req, res) {
  try {
    const code = req.params[0] || req.params.code;
    const facture = await db.query(`SELECT * FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    const lignes = await db.query(`SELECT * FROM lignes_vente WHERE facture_code = $1 ORDER BY id`, [code]);
    res.json({ ...facture.rows[0], lignes: lignes.rows });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// PUT /api/factures/:code/paiement
async function updatePaiement(req, res) {
  try {
    const code = req.params[0] || req.params.code;
    const { montant_paye } = req.body;
    if (montant_paye === undefined || isNaN(parseFloat(montant_paye)))
      return res.status(400).json({ message: "Montant payé invalide." });
    const facture = await db.query(`SELECT montant, montant_paye FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    if (parseFloat(montant_paye) > parseFloat(facture.rows[0].montant))
      return res.status(400).json({ message: "Le montant payé dépasse le montant de la facture." });
    if (parseFloat(montant_paye) < parseFloat(facture.rows[0].montant_paye))
      return res.status(400).json({ message: "Le montant payé ne peut pas diminuer." });
    const result = await db.query(`UPDATE factures SET montant_paye = $1 WHERE code = $2 RETURNING *`, [parseFloat(montant_paye), code]);
    if (!result.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// GET /api/factures/:code/pdf
async function generatePDF(req, res) {
  try {
    const code = req.params[0] || req.params.code;
    const facture = await db.query(`SELECT * FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    const lignes = await db.query(`SELECT * FROM lignes_vente WHERE facture_code = $1 ORDER BY id`, [code]);

    const f    = facture.rows[0];
    const money = formatMoney;
    const d    = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    const dateStr = `${d.getDate().toString().padStart(2,"0")} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;

    const company = process.env.COMPANY_NAME    || "WariGest";
    const addr    = process.env.COMPANY_ADDRESS || "";
    const phone   = process.env.COMPANY_PHONE   || "";
    const email   = process.env.COMPANY_EMAIL   || "";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${f.code}.pdf"`);

    const doc  = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);

    const PW  = 595;
    const PH  = 842;
    const M   = 50;
    const INN = PW - M * 2;

    // ── Bande bleue haut ──
    doc.rect(0, 0, PW, 4).fill(BLUE);
    doc.rect(0, 4, PW, 86).fill(DARK);

    // Logo "Wi"
    doc.roundedRect(M, 18, 36, 36, 8).fill(BLUE);
    doc.fillColor("white").fontSize(15).font("Helvetica-Bold").text("Wi", M + 7, 28);
    doc.circle(M + 32, 22, 4).fill(YELLOW);

    // Nom entreprise
    doc.fillColor("white").fontSize(17).font("Helvetica-Bold").text(company, M + 46, 22);
    doc.fillColor("rgba(255,255,255,0.45)").fontSize(8).font("Helvetica");
    let cy = 42;
    if (addr)  { doc.text(addr,  M + 46, cy); cy += 11; }
    if (phone) { doc.text("Tél : " + phone, M + 46, cy); cy += 11; }
    if (email) { doc.text(email, M + 46, cy); }

    // Bloc FACTURE (droite)
    doc.fillColor(YELLOW).fontSize(28).font("Helvetica-Bold")
       .text("FACTURE", PW - M - 160, 18, { width: 160, align: "right" });
    doc.fillColor("rgba(255,255,255,0.55)").fontSize(8).font("Helvetica")
       .text("N°  ", PW - M - 160, 54, { continued: true, width: 160 })
       .fillColor("white").font("Helvetica-Bold").text(f.code, { align: "right" });
    doc.fillColor("rgba(255,255,255,0.55)").fontSize(8).font("Helvetica")
       .text("Date  ", PW - M - 160, 66, { continued: true })
       .fillColor("white").font("Helvetica-Bold").text(dateStr, { align: "right" });

    // Pill statut
    const pillBg    = f.statut ? "#059669" : "#dc2626";
    const pillLabel = f.statut ? "RÉGLÉE" : "IMPAYÉE";
    doc.roundedRect(PW - M - 70, 78, 70, 16, 8).fill(pillBg);
    doc.fillColor("white").fontSize(7).font("Helvetica-Bold")
       .text(pillLabel, PW - M - 70, 83, { width: 70, align: "center" });

    // ── Séparateur ──
    const hr1 = 104;
    doc.moveTo(M, hr1).lineTo(PW - M, hr1).lineWidth(0.5).strokeColor("#e8ecff").stroke();

    // ── Client ──
    doc.fillColor("#9ba5c9").fontSize(7).font("Helvetica-Bold")
       .text("FACTURÉ À", M, hr1 + 14);
    doc.fillColor(DARK).fontSize(13).font("Helvetica-Bold")
       .text(f.client_nom, M, hr1 + 26, { width: 280 });

    const hr2 = hr1 + 58;
    doc.moveTo(M, hr2).lineTo(PW - M, hr2).lineWidth(0.5).strokeColor("#e8ecff").stroke();

    // ── En-tête tableau ──
    const TY  = hr2 + 14;
    const RH  = 26;
    const C1x = M,       C1w = 250;
    const C2x = M + 250, C2w = 50;
    const C3x = M + 300, C3w = 110;
    const C4x = M + 410, C4w = INN - 410;

    doc.rect(M, TY, INN, RH).fill(DARK);
    doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
    doc.text("DÉSIGNATION",  C1x + 10, TY + 9, { width: C1w });
    doc.text("QTÉ",          C2x,      TY + 9, { width: C2w, align: "center" });
    doc.text("PRIX UNIT.",   C3x,      TY + 9, { width: C3w, align: "right" });
    doc.text("MONTANT",      C4x,      TY + 9, { width: C4w - 8, align: "right" });

    // ── Lignes ──
    let ry = TY + RH;
    lignes.rows.forEach((l, i) => {
      const bg = i % 2 === 0 ? "white" : "#f7f8ff";
      doc.rect(M, ry, INN, RH).fill(bg);
      doc.moveTo(M, ry + RH).lineTo(M + INN, ry + RH).lineWidth(0.3).strokeColor("#e8ecff").stroke();
      doc.fillColor(DARK).fontSize(9).font("Helvetica")
         .text(l.libelle,             C1x + 10, ry + 9, { width: C1w - 18 });
      doc.text(String(l.quantite),    C2x,      ry + 9, { width: C2w, align: "center" });
      doc.fillColor("#9ba5c9")
         .text(money(l.prix_vente),   C3x,      ry + 9, { width: C3w, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold")
         .text(money(l.montant_total || l.prix_vente * l.quantite), C4x, ry + 9, { width: C4w - 8, align: "right" });
      ry += RH;
    });
    doc.moveTo(M, ry).lineTo(M + INN, ry).lineWidth(0.8).strokeColor("#e8ecff").stroke();

    // ── Totaux ──
    const TotW = 220;
    const TotX = PW - M - TotW;
    let   TotY = ry + 18;

    const totLine = (label, val, bold, valColor) => {
      doc.fontSize(9).fillColor("#9ba5c9").font("Helvetica").text(label, TotX, TotY, { width: 110 });
      doc.fontSize(9).fillColor(valColor || DARK).font(bold ? "Helvetica-Bold" : "Helvetica")
         .text(val, TotX, TotY, { width: TotW, align: "right" });
      TotY += 17;
    };

    totLine("Sous-total", money(f.montant), false);
    doc.moveTo(TotX, TotY).lineTo(TotX + TotW, TotY).lineWidth(0.3).strokeColor("#e8ecff").stroke();
    TotY += 5;
    totLine("Montant payé", money(f.montant_paye), true, "#059669");
    if (parseFloat(f.reste) > 0) totLine("Reste à payer", money(f.reste), true, "#dc2626");

    // Ligne total finale
    doc.moveTo(TotX, TotY + 3).lineTo(TotX + TotW, TotY + 3).lineWidth(2).strokeColor(BLUE).stroke();
    TotY += 13;
    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text("TOTAL", TotX, TotY);
    doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold")
       .text(money(f.montant), TotX, TotY - 2, { width: TotW, align: "right" });

    // ── Pied de page ──
    doc.rect(0, PH - 28, PW, 4).fill(BLUE);
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
       .text("Merci pour votre confiance. Ce document tient lieu de facture officielle.  ·  WariGest", M, PH - 20, { width: INN, align: "center" });

    doc.end();
  } catch (err) {
    console.error("PDF error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur lors de la génération du PDF." });
  }
}

// GET /api/factures/:code/recu
async function generateRecu(req, res) {
  try {
    const code    = req.params[0] || req.params.code;
    const facture = await db.query(`SELECT * FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    const lignes  = await db.query(`SELECT * FROM lignes_vente WHERE facture_code = $1 ORDER BY id`, [code]);

    const f       = facture.rows[0];
    const money   = formatMoney;
    const dr      = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const dateStr = `${dr.getDate().toString().padStart(2,"0")}/${(dr.getMonth()+1).toString().padStart(2,"0")}/${dr.getFullYear()}`;
    const company = process.env.COMPANY_NAME || "WariGest";

    const W      = 226;
    const Mg     = 12;
    const INNER  = W - Mg * 2;
    const LINE_H = 15;
    const extraH = parseFloat(f.reste) > 0 ? 20 : 0;
    const H      = 300 + lignes.rows.length * LINE_H + extraH;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="recu_${f.code}.pdf"`);

    const doc = new PDFDoc({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.pipe(res);

    const hr = (yy, thick, color) =>
      doc.moveTo(Mg, yy).lineTo(W - Mg, yy).lineWidth(thick).strokeColor(color).stroke();

    let y = 0;

    // Bande bleue haut
    doc.rect(0, 0, W, 3).fill(BLUE);
    y = 10;

    // Logo mini
    doc.roundedRect(Mg, y, 22, 22, 5).fill(BLUE);
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold").text("Wi", Mg + 4, y + 7);
    doc.circle(Mg + 19, y + 5, 3).fill(YELLOW);

    // Nom
    doc.fillColor(DARK).fontSize(12).font("Helvetica-Bold")
       .text(company, Mg + 28, y + 4, { width: W - Mg - 28 - Mg });
    y += 28;

    doc.fillColor("#9ba5c9").fontSize(7).font("Helvetica");
    if (process.env.COMPANY_ADDRESS) { doc.text(process.env.COMPANY_ADDRESS, 0, y, { width: W, align: "center" }); y += 10; }
    if (process.env.COMPANY_PHONE)   { doc.text("Tél : " + process.env.COMPANY_PHONE, 0, y, { width: W, align: "center" }); y += 10; }

    y += 4; hr(y, 0.5, "#e8ecff"); y += 8;

    doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold")
       .text("REÇU DE PAIEMENT", 0, y, { width: W, align: "center" });
    y += 12;
    doc.fillColor("#9ba5c9").fontSize(7).font("Helvetica")
       .text(f.code, 0, y, { width: W, align: "center" });
    y += 12;

    hr(y, 0.5, "#e8ecff"); y += 8;

    const infoLine = (label, val) => {
      doc.fontSize(7.5).fillColor("#9ba5c9").font("Helvetica").text(label, Mg, y, { width: 40 });
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica-Bold").text(val, Mg + 40, y, { width: INNER - 40 });
      y += 11;
    };
    infoLine("Date :", dateStr);
    infoLine("Client :", f.client_nom);

    y += 3; hr(y, 0.5, "#e8ecff"); y += 8;

    // En-tête tableau
    doc.rect(Mg, y, INNER, 13).fill("#f0f2ff");
    doc.fontSize(6.5).fillColor("#9ba5c9").font("Helvetica-Bold");
    doc.text("ARTICLE", Mg + 3,    y + 4, { width: 78 });
    doc.text("QTE",     Mg + 81,   y + 4, { width: 20, align: "center" });
    doc.text("P.U.",    Mg + 101,  y + 4, { width: 45, align: "right" });
    doc.text("TOTAL",   Mg + 146,  y + 4, { width: INNER - 148, align: "right" });
    y += 13;

    lignes.rows.forEach((l) => {
      const lib = l.libelle.length > 17 ? l.libelle.slice(0, 16) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica")
         .text(lib,                  Mg + 3,   y + 3, { width: 78 });
      doc.text(String(l.quantite),   Mg + 81,  y + 3, { width: 20, align: "center" });
      doc.fillColor("#9ba5c9")
         .text(money(l.prix_vente),  Mg + 101, y + 3, { width: 45, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold")
         .text(money(l.montant_total || l.prix_vente * l.quantite), Mg + 146, y + 3, { width: INNER - 148, align: "right" });
      y += LINE_H;
      hr(y, 0.3, "#e8ecff");
    });

    y += 5; hr(y, 0.8, DARK); y += 7;

    const totLine = (label, val, valColor) => {
      doc.fontSize(8).fillColor("#9ba5c9").font("Helvetica").text(label, Mg, y);
      doc.fontSize(8).fillColor(valColor).font("Helvetica-Bold")
         .text(val, Mg, y, { width: INNER, align: "right" });
      y += 13;
    };

    totLine("Montant payé", money(f.montant_paye), "#059669");
    if (parseFloat(f.reste) > 0) totLine("Reste du", money(f.reste), "#dc2626");

    y += 2;
    doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold").text("TOTAL", Mg, y);
    doc.fontSize(12).fillColor(BLUE).font("Helvetica-Bold")
       .text(money(f.montant), Mg, y - 1, { width: INNER, align: "right" });
    y += 16;

    hr(y, 0.5, "#e8ecff"); y += 8;

    const sLabel = f.statut ? "RÉGLÉE ✓" : "RESTE À PAYER";
    const sColor = f.statut ? "#059669" : "#dc2626";
    doc.fontSize(8).fillColor(sColor).font("Helvetica-Bold")
       .text(sLabel, 0, y, { width: W, align: "center" });
    y += 13;

    hr(y, 0.5, "#e8ecff"); y += 8;
    doc.fontSize(7).fillColor("#9ba5c9").font("Helvetica")
       .text("Merci pour votre confiance !  —  WariGest", 0, y, { width: W, align: "center" });

    // Bande bleue bas
    doc.rect(0, H - 3, W, 3).fill(BLUE);

    doc.end();
  } catch (err) {
    console.error("Recu error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Erreur lors de la génération du recu." });
  }
}

module.exports = { getAll, getOne, updatePaiement, generatePDF, generateRecu };
