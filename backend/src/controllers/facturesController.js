// src/controllers/facturesController.js
// Équivalent Excel : Facture + Etat facture
const db     = require("../config/db");
const PDFDoc = require("pdfkit");

// GET /api/factures
async function getAll(req, res) {
  try {
    const { client, statut, mois, annee } = req.query;
    let q = `
      SELECT f.*, COUNT(lv.id) AS nb_articles
      FROM factures f
      LEFT JOIN lignes_vente lv ON lv.facture_code = f.code
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (client) { q += ` AND f.client_nom ILIKE $${idx++}`; params.push(`%${client}%`); }
    if (statut !== undefined) {
      q += ` AND f.statut = $${idx++}`;
      params.push(statut === "true" || statut === "1");
    }
    if (annee)  { q += ` AND EXTRACT(YEAR FROM f.date_facture) = $${idx++}`; params.push(annee); }
    q += ` GROUP BY f.code ORDER BY f.code ASC`;
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
    const code = req.params[0] || req.params.code;
    const facture = await db.query(`SELECT * FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });

    const lignes = await db.query(
      `SELECT * FROM lignes_vente WHERE facture_code = $1 ORDER BY id`,
      [code]
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

    const paye = parseFloat(montant_paye);

    // "reste" et "statut" sont des colonnes GENERATED ALWAYS ... STORED en base
    // (calculées automatiquement par PostgreSQL à partir de montant/montant_paye).
    // On ne doit JAMAIS leur assigner de valeur directement (Postgres rejette avec
    // "column ... can only be updated to DEFAULT") — on met à jour seulement
    // montant_paye, et la base recalcule reste/statut toute seule.
    const result = await db.query(
      `UPDATE factures
       SET montant_paye = $1::numeric
       WHERE code = $2
       RETURNING *`,
      [paye, code]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Facture introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updatePaiement error:", err);
    res.status(500).json({ message: err.message || "Erreur serveur." });
  }
}

// Formatte un nombre sans séparateurs problématiques pour PDFKit
function formatMoney(n) {
  const devise = process.env.COMPANY_DEVISE || "FCFA";
  const num = Math.round(n || 0);
  const str = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return str + " " + devise;
}

// GET /api/factures/:code/pdf — Générer la facture en PDF
async function generatePDF(req, res) {
  try {
    const code = req.params[0] || req.params.code;
    const facture = await db.query(`SELECT * FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });

    const lignes = await db.query(
      `SELECT * FROM lignes_vente WHERE facture_code = $1 ORDER BY id`,
      [code]
    );

    const f       = facture.rows[0];
    const money   = formatMoney;
    const d       = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    const dateStr = `${d.getDate().toString().padStart(2,"0")} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${f.code}.pdf"`);

    const doc   = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);

    const PW    = 595;
    const PH    = 842;
    const ACC   = "#0023FF";   // WariGest blue — accent principal
    const INK   = "#111827";   // quasi-noir pour textes
    const SUB   = "#6B7280";   // gris secondaire
    const RULE  = "#E5E7EB";   // gris très clair pour les lignes
    const PALE  = "#F9FAFB";   // fond alterné tableau
    const M     = 55;
    const INN   = PW - M * 2;

    // ── Filet orange fin en haut (seul élément couleur du header) ──
    doc.rect(0, 0, PW, 4).fillColor(ACC).fill();

    // ── SECTION HAUTE : entreprise à gauche, référence à droite ──
    const topY = 30;

    // Nom entreprise — grand, noir
    doc.fontSize(19).fillColor(INK).font("Helvetica-Bold")
       .text(process.env.COMPANY_NAME || "NOM ENTREPRISE", M, topY, { width: 280 });

    // Infos contact — petits, gris
    let cy = topY + 28;
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica");
    if (process.env.COMPANY_ADDRESS) { doc.text(process.env.COMPANY_ADDRESS, M, cy, { width: 280 }); cy += 12; }
    if (process.env.COMPANY_PHONE)   { doc.text("Tel : " + process.env.COMPANY_PHONE, M, cy, { width: 280 }); cy += 12; }
    if (process.env.COMPANY_EMAIL)   { doc.text(process.env.COMPANY_EMAIL, M, cy, { width: 280 }); }

    // Bloc référence (droite) — sans fond criard
    const rBx = M + 300;
    const rBw = INN - 300;

    doc.fontSize(32).fillColor(INK).font("Helvetica-Bold")
       .text("FACTURE", rBx, topY, { width: rBw, align: "right" });

    doc.fontSize(9).fillColor(SUB).font("Helvetica")
       .text("N°", rBx, topY + 42, { continued: true })
       .fillColor(INK).font("Helvetica-Bold").text("  " + f.code, { align: "left" });

    doc.fontSize(9).fillColor(SUB).font("Helvetica")
       .text("Date :", rBx, topY + 57, { continued: true })
       .fillColor(INK).font("Helvetica-Bold").text("  " + dateStr);

    // Statut pill
    const pillColor = f.statut ? "#16A34A" : "#DC2626";
    const pillLabel = f.statut ? "REGLÉE" : "IMPAYÉE";
    doc.roundedRect(rBx + rBw - 70, topY + 74, 70, 18, 9).fillColor(pillColor).fill();
    doc.fontSize(8).fillColor("white").font("Helvetica-Bold")
       .text(pillLabel, rBx + rBw - 70, topY + 79, { width: 70, align: "center" });

    // ── Logo WariGest (texte, côté droit sous référence) ──
    // Already displayed as part of company name. Mark brand in footer only.

    // ── Filet de séparation ──
    const hrY = 128;
    doc.moveTo(M, hrY).lineTo(PW - M, hrY).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── BLOC CLIENT ──
    const clY = hrY + 18;
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Bold")
       .text("FACTURÉ À", M, clY);
    doc.fontSize(12).fillColor(INK).font("Helvetica-Bold")
       .text(f.client_nom, M, clY + 13, { width: 280 });

    // ── Filet ──
    const hr2Y = clY + 40;
    doc.moveTo(M, hr2Y).lineTo(PW - M, hr2Y).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── TABLEAU ──
    const TY   = hr2Y + 16;
    const RH   = 27;
    // Colonnes : désignation | qté | prix unit. | total
    const C1x = M,      C1w = 245;
    const C2x = M+245,  C2w = 55;
    const C3x = M+300,  C3w = 115;
    const C4x = M+415,  C4w = INN - 415;

    // En-tête colonnes — fond sombre, texte blanc
    doc.rect(M, TY, INN, RH).fillColor(INK).fill();
    doc.fontSize(8.5).fillColor("white").font("Helvetica-Bold");
    doc.text("DÉSIGNATION", C1x + 10, TY + 9, { width: C1w });
    doc.text("QTÉ",         C2x,      TY + 9, { width: C2w, align: "center" });
    doc.text("PRIX UNIT.",  C3x,      TY + 9, { width: C3w, align: "right" });
    doc.text("MONTANT",     C4x,      TY + 9, { width: C4w - 10, align: "right" });

    let ry = TY + RH;
    lignes.rows.forEach((l, i) => {
      // Fond alterné léger
      doc.rect(M, ry, INN, RH).fillColor(i % 2 === 0 ? "white" : PALE).fill();
      // Séparateur horizontal
      doc.moveTo(M, ry + RH).lineTo(M + INN, ry + RH).lineWidth(0.3).strokeColor(RULE).stroke();

      doc.fontSize(9.5).fillColor(INK).font("Helvetica")
         .text(l.libelle,           C1x + 10, ry + 9, { width: C1w - 20 });
      doc.text(String(l.quantite),  C2x,      ry + 9, { width: C2w, align: "center" });
      doc.fillColor(SUB)
         .text(money(l.prix_vente), C3x,      ry + 9, { width: C3w, align: "right" });
      doc.fillColor(INK).font("Helvetica-Bold")
         .text(money(l.montant_total), C4x,   ry + 9, { width: C4w - 10, align: "right" });
      ry += RH;
    });
    // Bordure basse tableau
    doc.moveTo(M, ry).lineTo(M + INN, ry).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── TOTAUX (bloc droit, propre) ──
    const TotW = 220;
    const TotX = PW - M - TotW;
    let   TotY = ry + 20;

    const totLine = (label, val, bold, valColor) => {
      doc.fontSize(9).fillColor(SUB).font("Helvetica")
         .text(label, TotX, TotY, { width: 110 });
      doc.fontSize(9).fillColor(valColor || INK).font(bold ? "Helvetica-Bold" : "Helvetica")
         .text(val, TotX, TotY, { width: TotW, align: "right" });
      TotY += 18;
    };

    totLine("Sous-total", money(f.montant), false, INK);

    // filet léger
    doc.moveTo(TotX, TotY).lineTo(TotX + TotW, TotY).lineWidth(0.3).strokeColor(RULE).stroke();
    TotY += 6;

    totLine("Montant payé", money(f.montant_paye), true, "#16A34A");
    if (parseFloat(f.reste) > 0) totLine("Reste à payer", money(f.reste), true, "#DC2626");

    // filet épais avant total
    doc.moveTo(TotX, TotY + 4).lineTo(TotX + TotW, TotY + 4).lineWidth(1.5).strokeColor(ACC).stroke();
    TotY += 14;

    // Ligne TOTAL FINAL
    doc.fontSize(11).fillColor(INK).font("Helvetica-Bold")
       .text("TOTAL", TotX, TotY);
    doc.fontSize(14).fillColor(ACC).font("Helvetica-Bold")
       .text(money(f.montant), TotX, TotY - 2, { width: TotW, align: "right" });

    // ── PIED DE PAGE ──
    const footY = PH - 48;
    doc.moveTo(0, footY).lineTo(PW, footY).lineWidth(0.3).strokeColor(RULE).stroke();
    // Bande accent gauche
    doc.rect(0, footY, 4, PH - footY).fillColor(ACC).fill();
    // Texte pied de page gauche : marque WariGest
    doc.fontSize(7.5).fillColor(ACC).font("Helvetica-Bold")
       .text("WariGest", M, footY + 12);
    doc.fontSize(7).fillColor(SUB).font("Helvetica")
       .text("Logiciel de gestion & facturation", M, footY + 23);
    // Texte pied de page centré : message confiance
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Oblique")
       .text("Merci pour votre confiance. Ce document tient lieu de facture officielle.", M, footY + 32, { width: INN, align: "center" });

    doc.end();
  } catch (err) {
    console.error("PDF error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la génération du PDF." });
  }
}

// GET /api/factures/:code/recu — Petit reçu thermique format 80mm
async function generateRecu(req, res) {
  try {
    const code    = req.params[0] || req.params.code;
    const facture = await db.query(`SELECT * FROM factures WHERE code = $1`, [code]);
    if (!facture.rows[0]) return res.status(404).json({ message: "Facture introuvable." });

    const lignes  = await db.query(
      `SELECT * FROM lignes_vente WHERE facture_code = $1 ORDER BY id`,
      [code]
    );

    const f      = facture.rows[0];
    const money  = formatMoney;
    const dr     = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const dateStr = `${dr.getDate().toString().padStart(2,"0")}/${(dr.getMonth()+1).toString().padStart(2,"0")}/${dr.getFullYear()}`;

    // Dimensions : 226pt ≈ 80mm, hauteur dynamique
    const W      = 226;
    const M      = 12;
    const INNER  = W - M * 2;
    const BRAND  = "#0023FF";   // WariGest blue
    const DARK   = "#111827";
    const GREY   = "#6B7280";

    const LINE_H = 15;
    const extraH = parseFloat(f.reste) > 0 ? 20 : 0;
    const H      = 305 + lignes.rows.length * LINE_H + extraH;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="recu_${f.code}.pdf"`);

    const doc = new PDFDoc({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.pipe(res);

    const hr = (yy, thick, color) =>
      doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(thick).strokeColor(color).stroke();

    let y = 0;

    // ── Filet WariGest fin haut ──
    doc.rect(0, 0, W, 3).fillColor(BRAND).fill();
    y = 12;

    // ── Nom entreprise ──
    doc.fontSize(13).fillColor(DARK).font("Helvetica-Bold")
       .text(process.env.COMPANY_NAME || "NOM ENTREPRISE", 0, y, { width: W, align: "center" });
    y += 17;

    doc.fontSize(7).fillColor(GREY).font("Helvetica");
    if (process.env.COMPANY_ADDRESS) {
      doc.text(process.env.COMPANY_ADDRESS, 0, y, { width: W, align: "center" });
      y += 10;
    }
    if (process.env.COMPANY_PHONE) {
      doc.text("Tel : " + process.env.COMPANY_PHONE, 0, y, { width: W, align: "center" });
      y += 10;
    }

    y += 5;
    hr(y, 0.5, GREY);
    y += 8;

    // ── Label REÇU ──
    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
       .text("RECU DE PAIEMENT", 0, y, { width: W, align: "center" });
    y += 13;
    doc.fontSize(7).fillColor(GREY).font("Helvetica")
       .text(f.code, 0, y, { width: W, align: "center" });
    y += 13;

    hr(y, 0.5, GREY);
    y += 8;

    // ── Infos ──
    const infoLine = (label, val) => {
      doc.fontSize(7.5).fillColor(GREY).font("Helvetica").text(label, M, y, { width: 40 });
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica-Bold").text(val, M + 40, y, { width: INNER - 40 });
      y += 11;
    };
    infoLine("Date :", dateStr);
    infoLine("Client :", f.client_nom);

    y += 4;
    hr(y, 0.5, GREY);
    y += 8;

    // ── En-tête tableau ──
    doc.rect(M, y, INNER, 13).fillColor("#F3F4F6").fill();
    doc.fontSize(6.5).fillColor(GREY).font("Helvetica-Bold");
    doc.text("ARTICLE", M + 3,    y + 4, { width: 78 });
    doc.text("QTE",     M + 81,   y + 4, { width: 20, align: "center" });
    doc.text("P.U.",    M + 101,  y + 4, { width: 45, align: "right" });
    doc.text("TOTAL",   M + 146,  y + 4, { width: INNER - 148, align: "right" });
    y += 13;

    // ── Lignes ──
    lignes.rows.forEach((l) => {
      const lib = l.libelle.length > 17 ? l.libelle.slice(0, 16) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica")
         .text(lib,                  M + 3,   y + 3, { width: 78 });
      doc.text(String(l.quantite),   M + 81,  y + 3, { width: 20, align: "center" });
      doc.fillColor(GREY)
         .text(money(l.prix_vente),  M + 101, y + 3, { width: 45, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold")
         .text(money(l.montant_total), M + 146, y + 3, { width: INNER - 148, align: "right" });
      y += LINE_H;
      hr(y, 0.3, "#E5E7EB");
    });

    y += 6;
    hr(y, 0.8, DARK);
    y += 7;

    // ── Totaux ──
    const totLine = (label, val, valColor) => {
      doc.fontSize(8).fillColor(GREY).font("Helvetica").text(label, M, y);
      doc.fontSize(8).fillColor(valColor).font("Helvetica-Bold")
         .text(val, M, y, { width: INNER, align: "right" });
      y += 13;
    };

    totLine("Montant payé", money(f.montant_paye), "#16A34A");
    if (parseFloat(f.reste) > 0) totLine("Reste du", money(f.reste), "#DC2626");

    y += 2;
    // Total final — ligne sobre
    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text("TOTAL", M, y);
    doc.fontSize(12).fillColor(BRAND).font("Helvetica-Bold")
       .text(money(f.montant), M, y - 1, { width: INNER, align: "right" });
    y += 16;

    hr(y, 0.5, GREY);
    y += 8;

    // ── Statut ──
    const sLabel = f.statut ? "REGLÉE" : "RESTE A PAYER";
    const sColor = f.statut ? "#16A34A" : "#DC2626";
    doc.fontSize(8).fillColor(sColor).font("Helvetica-Bold")
       .text(sLabel, 0, y, { width: W, align: "center" });
    y += 13;

    hr(y, 0.5, GREY);
    y += 8;

    doc.fontSize(7).fillColor(GREY).font("Helvetica-Oblique")
       .text("Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 12;

    // ── Marque WariGest ──
    doc.fontSize(6.5).fillColor(BRAND).font("Helvetica-Bold")
       .text("Édité par WariGest", 0, y, { width: W, align: "center" });
    y += 10;

    // ── Filet WariGest fin bas ──
    doc.rect(0, H - 3, W, 3).fillColor(BRAND).fill();

    doc.end();
  } catch (err) {
    console.error("Recu error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la génération du recu." });
  }
}

module.exports = { getAll, getOne, updatePaiement, generatePDF, generateRecu };
