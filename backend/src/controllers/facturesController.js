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
    const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    const dateStr = `${d.getDate().toString().padStart(2,"0")} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${f.code}.pdf"`);

    const doc = new PDFDoc({ margin: 0, size: "A4" });
    doc.pipe(res);

    // ── Constantes de mise en page ──────────────────────────────────────────
    const PW   = 595, PH = 842;
    const ML   = 14;                          // barre accent gauche (14pt)
    const M    = 52;                          // marge texte
    const INN  = PW - M - 32;                // largeur utile
    const ACC  = cfg.couleur || "#0023FF";   // couleur d'accent entreprise
    const INK  = "#0F172A";                  // quasi-noir textes
    const SUB  = "#64748B";                  // gris secondaire
    const RULE = "#E2E8F0";                  // séparateurs légers
    const PALE = "#F8FAFC";                  // fond alterné tableau

    // ── Bande couleur gauche (pleine hauteur — signature visuelle du doc) ──
    doc.rect(0, 0, ML, PH).fillColor(ACC).fill();

    // ── Fond très léger pour la zone en-tête ──
    doc.rect(ML, 0, PW - ML, 150).fillColor("#FAFBFF").fill();

    // ── Logo entreprise ──
    let nameX = M, nameW = 240;
    if (logoBuf) {
      try {
        doc.image(logoBuf, M, 24, { fit: [48, 48] });
        nameX = M + 58; nameW = 240 - 58;
      } catch (e) { console.error("Logo PDF (facture) ignoré :", e.message); }
    }

    // ── Nom & coordonnées entreprise ──
    doc.fontSize(17).fillColor(INK).font("Helvetica-Bold")
       .text(cfg.nom, nameX, 26, { width: nameW });
    let cy = 48;
    doc.fontSize(8).fillColor(SUB).font("Helvetica");
    if (cfg.adresse)   { doc.text(cfg.adresse,   nameX, cy, { width: nameW }); cy += 11; }
    if (cfg.telephone) { doc.text("Tél : " + cfg.telephone, nameX, cy, { width: nameW }); cy += 11; }
    if (cfg.email)     { doc.text(cfg.email,     nameX, cy, { width: nameW }); }

    // ── Bloc FACTURE (droite) ──
    const rBx = M + 268, rBw = INN - 268;
    doc.fontSize(30).fillColor(ACC).font("Helvetica-Bold")
       .text("FACTURE", rBx, 24, { width: rBw, align: "right" });

    doc.fontSize(9).fillColor(SUB).font("Helvetica")
       .text("Référence :", rBx, 64, { width: rBw - 2, align: "right" });
    doc.fontSize(10).fillColor(INK).font("Helvetica-Bold")
       .text(f.code, rBx, 76, { width: rBw - 2, align: "right" });
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica")
       .text("Date : " + dateStr, rBx, 91, { width: rBw - 2, align: "right" });

    // Statut pill élégant
    const paid     = !!f.statut;
    const pillBg   = paid ? "#DCFCE7" : "#FEE2E2";
    const pillTxt  = paid ? "#15803D" : "#DC2626";
    const pillLbl  = paid ? "REGLÉE" : "IMPAYÉE";
    doc.rect(PW - 32 - 74, 108, 74, 19).fillColor(pillBg).fill();
    doc.fontSize(8).fillColor(pillTxt).font("Helvetica-Bold")
       .text(pillLbl, PW - 32 - 74, 112, { width: 74, align: "center" });

    // ── Filet de séparation header / body ──
    doc.moveTo(M, 150).lineTo(PW - 32, 150).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── BLOC CLIENT ──
    const clY = 164;
    doc.rect(M, clY, 220, 50).fillColor("#F1F5F9").fill();
    doc.fontSize(7).fillColor(SUB).font("Helvetica-Bold")
       .text("FACTURÉ À", M + 10, clY + 9);
    doc.fontSize(12).fillColor(INK).font("Helvetica-Bold")
       .text(f.client_nom, M + 10, clY + 21, { width: 200 });

    // ── Filet avant tableau ──
    doc.moveTo(M, 226).lineTo(PW - 32, 226).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── TABLEAU ──
    const TY = 234;
    const RH = 26;
    const C1x = M,       C1w = 238;
    const C2x = M + 238, C2w = 52;
    const C3x = M + 290, C3w = 120;
    const C4x = M + 410, C4w = INN - 410;

    // En-tête tableau — fond accent, texte blanc
    doc.rect(M, TY, INN, RH).fillColor(ACC).fill();
    doc.fontSize(8).fillColor("white").font("Helvetica-Bold");
    doc.text("DÉSIGNATION", C1x + 8, TY + 9, { width: C1w });
    doc.text("QTÉ",         C2x,      TY + 9, { width: C2w, align: "center" });
    doc.text("PRIX UNIT.",  C3x,      TY + 9, { width: C3w, align: "right" });
    doc.text("MONTANT",     C4x,      TY + 9, { width: C4w - 8, align: "right" });

    let ry = TY + RH;
    lignes.rows.forEach((l, i) => {
      doc.rect(M, ry, INN, RH).fillColor(i % 2 === 0 ? "white" : PALE).fill();
      doc.moveTo(M, ry + RH).lineTo(M + INN, ry + RH).lineWidth(0.3).strokeColor(RULE).stroke();

      doc.fontSize(9.5).fillColor(INK).font("Helvetica")
         .text(l.libelle,              C1x + 8, ry + 8, { width: C1w - 16 });
      doc.text(String(parseFloat(l.quantite) || 0),     C2x,      ry + 8, { width: C2w, align: "center" });
      doc.fillColor(SUB)
         .text(money(l.prix_vente),    C3x,      ry + 8, { width: C3w, align: "right" });
      doc.fillColor(INK).font("Helvetica-Bold")
         .text(money(l.montant_total), C4x,      ry + 8, { width: C4w - 8, align: "right" });
      ry += RH;
    });

    // Ligne de clôture tableau
    doc.moveTo(M, ry).lineTo(M + INN, ry).lineWidth(1).strokeColor(ACC).stroke();

    // ── TOTAUX (alignés à droite) ──
    const TotW = 220;
    const TotX = PW - 32 - TotW;
    let TotY = ry + 22;

    const totLine = (label, val, bold, valColor) => {
      doc.fontSize(9).fillColor(SUB).font("Helvetica")
         .text(label, TotX, TotY, { width: 108 });
      doc.fontSize(9).fillColor(valColor || INK).font(bold ? "Helvetica-Bold" : "Helvetica")
         .text(val, TotX, TotY, { width: TotW, align: "right" });
      TotY += 17;
    };

    totLine("Sous-total HT", money(f.montant));
    doc.moveTo(TotX, TotY).lineTo(TotX + TotW, TotY).lineWidth(0.3).strokeColor(RULE).stroke();
    TotY += 5;
    totLine("Montant encaissé", money(f.montant_paye), true, "#16A34A");
    if (parseFloat(f.reste) > 0)
      totLine("Reste à payer", money(f.reste), true, "#DC2626");

    // Bande TOTAL FINAL
    doc.rect(TotX, TotY + 2, TotW, 28).fillColor(ACC).fill();
    doc.fontSize(10).fillColor("white").font("Helvetica-Bold")
       .text("TOTAL", TotX + 10, TotY + 9);
    doc.fontSize(13).fillColor("white").font("Helvetica-Bold")
       .text(money(f.montant), TotX, TotY + 8, { width: TotW - 8, align: "right" });

    // ── PIED DE PAGE ──
    const footY = PH - 46;
    doc.rect(ML, footY, PW - ML, PH - footY).fillColor(PALE).fill();
    doc.moveTo(ML, footY).lineTo(PW, footY).lineWidth(0.4).strokeColor(RULE).stroke();
    // Marque
    doc.fontSize(7.5).fillColor(ACC).font("Helvetica-Bold")
       .text("WariGest", M, footY + 11);
    doc.fontSize(6.5).fillColor(SUB).font("Helvetica")
       .text("Logiciel de gestion & facturation", M, footY + 21);
    // Message personnalisé centré
    const msg = cfg.pied_de_page || "Merci pour votre confiance. Ce document tient lieu de facture officielle.";
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Oblique")
       .text(msg, ML, footY + 16, { width: PW - ML, align: "center" });

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

    const f      = facture.rows[0];
    const cfg    = await getEntrepriseConfig(entId);
    const logoBuf = logoBuffer(cfg.logo);
    const money  = (n) => formatMoney(n, cfg.devise);
    const dr     = f.date_facture instanceof Date ? f.date_facture : new Date(f.date_facture);
    const dateStr = `${dr.getDate().toString().padStart(2,"0")}/${(dr.getMonth()+1).toString().padStart(2,"0")}/${dr.getFullYear()}`;

    // ── Dimensions : 226pt ≈ 80mm, hauteur dynamique ──
    const W     = 226;
    const M     = 12;
    const INNER = W - M * 2;
    const ACC   = cfg.couleur || "#0023FF";
    const DARK  = "#0F172A";
    const GREY  = "#64748B";
    const PALE  = "#F8FAFC";
    const RULE  = "#E2E8F0";

    const LINE_H = 15;
    const extraH = parseFloat(f.reste) > 0 ? 15 : 0;
    const logoH  = logoBuf ? 50 : 0;
    const H      = 320 + logoH + lignes.rows.length * LINE_H + extraH;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="recu_${f.code}.pdf"`);

    const doc = new PDFDoc({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.pipe(res);

    const hr = (yy, thick, color) =>
      doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(thick).strokeColor(color).stroke();
    const hrFull = (yy, thick, color) =>
      doc.moveTo(0, yy).lineTo(W, yy).lineWidth(thick).strokeColor(color).stroke();

    let y = 0;

    // ── Bandeau en-tête accent (fond couleur entreprise) ──
    const headerH = 8 + logoH + 18 + (cfg.adresse ? 10 : 0) + (cfg.telephone ? 10 : 0) + 14;
    doc.rect(0, 0, W, headerH).fillColor(ACC).fill();

    y = 8;

    // ── Logo de l'entreprise (si configuré), centré ──
    if (logoBuf) {
      try {
        // Cercle blanc derrière le logo pour lisibilité
        doc.circle((W / 2), y + 22, 26).fillColor("white").fill();
        doc.image(logoBuf, (W - 40) / 2, y + 4, { fit: [40, 40] });
        y += 50;
      } catch (e) { console.error("Logo PDF (reçu) ignoré :", e.message); }
    }

    // ── Nom entreprise (blanc sur accent) ──
    doc.fontSize(13).fillColor("white").font("Helvetica-Bold")
       .text(cfg.nom, 0, y, { width: W, align: "center" });
    y += 17;

    doc.fontSize(7).fillColor("rgba(255,255,255,0.85)").font("Helvetica");
    if (cfg.adresse) {
      doc.text(cfg.adresse, 0, y, { width: W, align: "center" });
      y += 10;
    }
    if (cfg.telephone) {
      doc.text("Tél : " + cfg.telephone, 0, y, { width: W, align: "center" });
      y += 10;
    }

    y += 6;
    // Fin du bandeau accent
    y += 2;

    // ── Zone blanche corps du reçu ──
    y += 6;

    // ── Badge REÇU DE PAIEMENT ──
    const badgeW = 106, badgeH = 18;
    const badgeX = (W - badgeW) / 2;
    doc.rect(badgeX, y, badgeW, badgeH).fillColor(ACC).fill();
    doc.fontSize(8.5).fillColor("white").font("Helvetica-Bold")
       .text("REÇU DE PAIEMENT", badgeX, y + 5, { width: badgeW, align: "center" });
    y += badgeH + 6;

    doc.fontSize(7).fillColor(GREY).font("Helvetica")
       .text("Réf : " + f.code, 0, y, { width: W, align: "center" });
    y += 12;

    hr(y, 0.5, RULE);
    y += 8;

    // ── Infos ──
    const infoLine = (label, val) => {
      doc.fontSize(7.5).fillColor(GREY).font("Helvetica").text(label, M, y, { width: 42 });
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica-Bold").text(val, M + 42, y, { width: INNER - 42 });
      y += 11;
    };
    infoLine("Date :", dateStr);
    infoLine("Client :", f.client_nom);

    y += 4;
    hr(y, 0.5, RULE);
    y += 8;

    // ── En-tête tableau (fond accent léger) ──
    doc.rect(M, y, INNER, 14).fillColor(ACC).fill();
    doc.fontSize(6.5).fillColor("white").font("Helvetica-Bold");
    doc.text("ARTICLE",  M + 3,    y + 4, { width: 75 });
    doc.text("QTÉ",      M + 78,   y + 4, { width: 22, align: "center" });
    doc.text("P.U.",     M + 100,  y + 4, { width: 48, align: "right" });
    doc.text("TOTAL",    M + 148,  y + 4, { width: INNER - 150, align: "right" });
    y += 14;

    // ── Lignes articles ──
    lignes.rows.forEach((l, i) => {
      if (i % 2 === 0) doc.rect(M, y, INNER, LINE_H).fillColor(PALE).fill();
      const lib = l.libelle.length > 17 ? l.libelle.slice(0, 16) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica")
         .text(lib,                  M + 3,   y + 4, { width: 75 });
      doc.text(String(parseFloat(l.quantite) || 0),   M + 78,  y + 4, { width: 22, align: "center" });
      doc.fillColor(GREY)
         .text(money(l.prix_vente),  M + 100, y + 4, { width: 48, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold")
         .text(money(l.montant_total), M + 148, y + 4, { width: INNER - 150, align: "right" });
      y += LINE_H;
      hr(y, 0.3, RULE);
    });

    y += 5;
    hr(y, 1, ACC);
    y += 8;

    // ── Totaux ──
    const totLn = (label, val, valColor) => {
      doc.fontSize(8).fillColor(GREY).font("Helvetica").text(label, M, y);
      doc.fontSize(8).fillColor(valColor || DARK).font("Helvetica-Bold")
         .text(val, M, y, { width: INNER, align: "right" });
      y += 12;
    };

    totLn("Montant encaissé", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste à payer", money(f.reste), "#DC2626");

    y += 3;
    // Bande TOTAL accent
    doc.rect(M, y, INNER, 22).fillColor(ACC).fill();
    doc.fontSize(9).fillColor("white").font("Helvetica-Bold")
       .text("TOTAL", M + 6, y + 7);
    doc.fontSize(11).fillColor("white").font("Helvetica-Bold")
       .text(money(f.montant), M, y + 6, { width: INNER - 6, align: "right" });
    y += 28;

    hr(y, 0.5, RULE);
    y += 8;

    // ── Statut pill ──
    const paid  = !!f.statut;
    const sBg   = paid ? "#DCFCE7" : "#FEE2E2";
    const sTxt  = paid ? "#15803D" : "#DC2626";
    const sLbl  = paid ? "✓ FACTURE REGLÉE" : "⚠ RESTE À PAYER";
    const sW    = 120;
    doc.rect((W - sW) / 2, y, sW, 16).fillColor(sBg).fill();
    doc.fontSize(7.5).fillColor(sTxt).font("Helvetica-Bold")
       .text(sLbl, (W - sW) / 2, y + 5, { width: sW, align: "center" });
    y += 22;

    hr(y, 0.3, RULE);
    y += 8;

    doc.fontSize(7).fillColor(GREY).font("Helvetica-Oblique")
       .text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 12;

    // ── Marque WariGest ──
    doc.fontSize(6.5).fillColor(ACC).font("Helvetica-Bold")
       .text("Édité par WariGest", 0, y, { width: W, align: "center" });
    y += 10;

    // ── Bande accent bas ──
    doc.rect(0, H - 5, W, 5).fillColor(ACC).fill();

    doc.end();
  } catch (err) {
    console.error("Recu error:", err);
    if (!res.headersSent)
      res.status(500).json({ message: "Erreur lors de la génération du recu." });
  }
}

module.exports = { getAll, getOne, updatePaiement, generatePDF, generateRecu };
