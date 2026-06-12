// src/pdf/facturesLayouts.js
// 5 mises en page pour la facture PDF (format A4), chacune paramétrée par une
// palette de couleurs (voir utils/pdfStyles.js). Chaque fonction reçoit le
// document PDFKit déjà créé (taille A4, marges à 0) et un contexte `ctx` :
//   { f, lignes, cfg, money, dateStr, logoBuf, pal, PW, PH, M, INN }
// où `pal` = { primary, dark, light, mid } et `lignes` = tableau de lignes
// de vente. Chaque renderer dessine l'intégralité de la page.

// ─── 1. Classique ───────────────────────────────────────────────────────────
// En-tête deux colonnes (entreprise / FACTURE), tableau structuré, pied de
// page avec mention WariGest. C'est le design d'origine de l'application.
function classic(doc, ctx) {
  const { f, lignes, cfg, money, dateStr, logoBuf, pal, PH, M, INN } = ctx;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", LITE = "#D1D5DB";
  const hr = (y, w, col) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(col).stroke();

  let nameX = M, nameW = 250;
  if (logoBuf) {
    try {
      doc.image(logoBuf, M, 40, { fit: [44, 44] });
      nameX = M + 54; nameW = 196;
    } catch (e) { /* logo ignoré */ }
  }

  doc.fontSize(16).fillColor(INK).font("Helvetica-Bold").text(cfg.nom, nameX, 40, { width: nameW });
  let cy = 62;
  doc.fontSize(8.5).fillColor(SUB).font("Helvetica");
  if (cfg.adresse)   { doc.text(cfg.adresse,              nameX, cy, { width: nameW }); cy += 12; }
  if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, nameX, cy, { width: nameW }); cy += 12; }
  if (cfg.email)     { doc.text(cfg.email,                nameX, cy, { width: nameW }); }

  const rX = M + 300, rW = INN - 300;
  doc.fontSize(26).fillColor(ACC).font("Helvetica-Bold").text("FACTURE", rX, 40, { width: rW, align: "right" });
  doc.fontSize(9).fillColor(INK).font("Helvetica-Bold").text(f.code, rX, 74, { width: rW, align: "right" });
  doc.fontSize(8.5).fillColor(SUB).font("Helvetica").text(dateStr, rX, 88, { width: rW, align: "right" });
  const paid   = !!f.statut;
  const sColor = paid ? "#16A34A" : "#DC2626";
  const sLabel = paid ? "REGLEE" : "IMPAYEE";
  doc.fontSize(8.5).fillColor(sColor).font("Helvetica-Bold").text(sLabel, rX, 104, { width: rW, align: "right" });

  hr(128, 1, ACC);

  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Bold").text("FACTURE A :", M, 144);
  doc.fontSize(13).fillColor(INK).font("Helvetica-Bold").text(f.client_nom, M, 157, { width: 260 });
  if (f.client_adresse) {
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica").text(f.client_adresse, M, 176, { width: 260 });
  }

  hr(204, 0.5, LITE);

  const TY = 212, RH = 26;
  const C1x = M,       C1w = 240;
  const C2x = M + 240, C2w = 50;
  const C3x = M + 290, C3w = 115;
  const C4x = M + 405, C4w = INN - 405;

  doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold");
  doc.text("DESIGNATION", C1x, TY + 9, { width: C1w });
  doc.text("QTE",         C2x, TY + 9, { width: C2w, align: "center" });
  doc.text("PRIX UNIT.",  C3x, TY + 9, { width: C3w, align: "right" });
  doc.text("MONTANT",     C4x, TY + 9, { width: C4w, align: "right" });
  hr(TY + RH, 1, INK);

  let ry = TY + RH;
  lignes.forEach((l) => {
    ry += 4;
    doc.fontSize(9.5).fillColor(INK).font("Helvetica").text(l.libelle, C1x, ry, { width: C1w - 8 });
    doc.text(String(parseFloat(l.quantite) || 0), C2x, ry, { width: C2w, align: "center" });
    doc.fillColor(SUB).text(money(l.prix_vente), C3x, ry, { width: C3w, align: "right" });
    doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), C4x, ry, { width: C4w, align: "right" });
    ry += 22;
    hr(ry, 0.3, LITE);
  });

  hr(ry + 4, 0.5, LITE);

  const TotW = 210, TotX = M + INN - TotW;
  let TotY = ry + 18;
  const tLine = (lbl, val, bold, col) => {
    doc.fontSize(9).fillColor(SUB).font("Helvetica").text(lbl, TotX, TotY, { width: 108 });
    doc.fillColor(col || INK).font(bold ? "Helvetica-Bold" : "Helvetica").text(val, TotX, TotY, { width: TotW, align: "right" });
    TotY += 18;
  };

  tLine("Sous-total", money(f.montant));
  hr(TotY, 0.3, LITE); TotY += 6;
  tLine("Montant encaisse", money(f.montant_paye), true, "#16A34A");
  if (parseFloat(f.reste) > 0) tLine("Reste a payer", money(f.reste), true, "#DC2626");

  hr(TotY + 2, 0.5, INK); TotY += 6;
  doc.fontSize(11).fillColor(INK).font("Helvetica-Bold").text("TOTAL", TotX, TotY);
  doc.fontSize(14).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), TotX, TotY - 1, { width: TotW, align: "right" });

  const footY = PH - 52;
  hr(footY, 0.5, LITE);
  doc.fontSize(7.5).fillColor(ACC).font("Helvetica-Bold").text("WariGest", M, footY + 12);
  doc.fontSize(7).fillColor(SUB).font("Helvetica").text("Logiciel de gestion & facturation", M, footY + 24);
  const msg = cfg.pied_de_page || "Merci pour votre confiance. Ce document tient lieu de facture officielle.";
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Oblique").text(msg, M, footY + 17, { width: INN, align: "center" });
}

// ─── 2. Moderne ─────────────────────────────────────────────────────────────
// Très épuré : fine bande d'accent en tête de page, gros titre fin "Facture",
// lignes de séparation discrètes, totaux soulignés d'un trait de couleur.
function moderne(doc, ctx) {
  const { f, lignes, cfg, money, dateStr, logoBuf, pal, PW, PH, M, INN } = ctx;
  const ACC = pal.primary, INK = "#1F2937", SUB = "#9CA3AF", LINE = "#E5E7EB";
  const hr = (y, w, col) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(col).stroke();

  doc.rect(0, 0, PW, 4).fill(ACC);

  let y = 50;
  let nameX = M;
  if (logoBuf) {
    try { doc.image(logoBuf, M, y, { fit: [32, 32] }); nameX = M + 42; } catch (e) { /* ignoré */ }
  }
  doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold")
     .text((cfg.nom || "").toUpperCase(), nameX, y + (logoBuf ? 8 : 0), { characterSpacing: 1.5 });

  doc.fontSize(34).fillColor(INK).font("Helvetica").text("Facture", M, y + 28);

  doc.fontSize(8.5).fillColor(SUB).font("Helvetica")
     .text(f.code, PW - M - 160, y, { width: 160, align: "right" })
     .text(dateStr, PW - M - 160, y + 12, { width: 160, align: "right" });
  const paid = !!f.statut;
  doc.fontSize(8.5).fillColor(paid ? "#16A34A" : "#DC2626").font("Helvetica-Bold")
     .text(paid ? "Reglee" : "Impayee", PW - M - 160, y + 24, { width: 160, align: "right" });

  y += 88;
  hr(y, 0.5, LINE);
  y += 16;

  doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("FACTURE A", M, y);
  y += 12;
  doc.fontSize(12).fillColor(INK).font("Helvetica-Bold").text(f.client_nom, M, y);
  y += 14;
  if (f.client_adresse) {
    doc.fontSize(8).fillColor(SUB).font("Helvetica").text(f.client_adresse, M, y, { width: INN });
  }
  y += 18;

  const C1x = M, C1w = 260, C2x = M + 260, C2w = 50, C3x = M + 310, C3w = 110, C4x = M + 420, C4w = INN - 420;
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica");
  doc.text("DESIGNATION", C1x, y, { width: C1w });
  doc.text("QTE",         C2x, y, { width: C2w, align: "center" });
  doc.text("PRIX",        C3x, y, { width: C3w, align: "right" });
  doc.text("MONTANT",     C4x, y, { width: C4w, align: "right" });
  y += 16;
  hr(y, 0.5, LINE);
  y += 12;

  lignes.forEach((l) => {
    doc.fontSize(9.5).fillColor(INK).font("Helvetica").text(l.libelle, C1x, y, { width: C1w - 8 });
    doc.text(String(parseFloat(l.quantite) || 0), C2x, y, { width: C2w, align: "center" });
    doc.fillColor(SUB).text(money(l.prix_vente), C3x, y, { width: C3w, align: "right" });
    doc.fillColor(INK).text(money(l.montant_total), C4x, y, { width: C4w, align: "right" });
    y += 24;
    hr(y - 8, 0.5, LINE);
  });

  y += 10;
  const TotW = 220, TotX = M + INN - TotW;
  const tLine = (lbl, val, bold, col) => {
    doc.fontSize(9).fillColor(SUB).font("Helvetica").text(lbl, TotX, y, { width: 120 });
    doc.fillColor(col || INK).font(bold ? "Helvetica-Bold" : "Helvetica").text(val, TotX, y, { width: TotW, align: "right" });
    y += 18;
  };
  tLine("Sous-total", money(f.montant));
  tLine("Encaisse", money(f.montant_paye), false, "#16A34A");
  if (parseFloat(f.reste) > 0) tLine("Reste a payer", money(f.reste), false, "#DC2626");
  y += 6;
  hr(y, 1.2, ACC);
  y += 10;
  doc.fontSize(10).fillColor(SUB).font("Helvetica").text("TOTAL", TotX, y, { width: 120 });
  doc.fontSize(16).fillColor(INK).font("Helvetica-Bold").text(money(f.montant), TotX, y - 2, { width: TotW, align: "right" });

  const footY = PH - 50;
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica")
     .text(cfg.pied_de_page || "Merci pour votre confiance.", M, footY, { width: INN, align: "center" });
  doc.fontSize(7).fillColor(SUB).font("Helvetica-Bold")
     .text("WariGest", M, footY + 12, { width: INN, align: "center" });
}

// ─── 3. Bloc Couleur ────────────────────────────────────────────────────────
// Bandeau d'en-tête plein de couleur, bloc client teinté, en-tête de tableau
// inversé, lignes alternées, encadré totaux teinté.
function bloc(doc, ctx) {
  const { f, lignes, cfg, money, dateStr, logoBuf, pal, PW, PH, M, INN } = ctx;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", TINT = pal.light;

  const bandH = 110;
  doc.rect(0, 0, PW, bandH).fill(ACC);

  let nameX = M;
  if (logoBuf) {
    try {
      doc.roundedRect(M, 28, 50, 50, 6).fill("#FFFFFF");
      doc.image(logoBuf, M + 5, 33, { fit: [40, 40] });
      nameX = M + 62;
    } catch (e) { /* ignoré */ }
  }
  doc.fontSize(15).fillColor("#FFFFFF").font("Helvetica-Bold").text(cfg.nom, nameX, 32, { width: 230 });
  doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica").opacity(0.85);
  let cy = 52;
  if (cfg.adresse)   { doc.text(cfg.adresse,              nameX, cy, { width: 230 }); cy += 12; }
  if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, nameX, cy, { width: 230 }); }
  doc.opacity(1);

  doc.fontSize(28).fillColor("#FFFFFF").font("Helvetica-Bold").text("FACTURE", PW - M - 220, 30, { width: 220, align: "right" });
  doc.fontSize(9).fillColor("#FFFFFF").font("Helvetica-Bold").text(f.code, PW - M - 220, 65, { width: 220, align: "right" });
  doc.opacity(0.85).fontSize(8.5).fillColor("#FFFFFF").font("Helvetica").text(dateStr, PW - M - 220, 78, { width: 220, align: "right" });
  doc.opacity(1);

  let y = bandH + 24;

  const paid = !!f.statut;
  const blocBoxH = f.client_adresse ? 60 : 46;
  doc.roundedRect(M, y, INN, blocBoxH, 6).fill(TINT);
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Bold").text("FACTURE A", M + 14, y + 10);
  doc.fontSize(12).fillColor(INK).font("Helvetica-Bold").text(f.client_nom, M + 14, y + 22, { width: 300 });
  if (f.client_adresse) {
    doc.fontSize(8).fillColor(SUB).font("Helvetica").text(f.client_adresse, M + 14, y + 38, { width: 300 });
  }
  doc.fontSize(9).fillColor(paid ? "#16A34A" : "#DC2626").font("Helvetica-Bold")
     .text(paid ? "REGLEE" : "IMPAYEE", M, y + 18, { width: INN - 14, align: "right" });
  y += blocBoxH + 24;

  const C1x = M, C1w = 240, C2x = M + 240, C2w = 50, C3x = M + 290, C3w = 115, C4x = M + 405, C4w = INN - 405;
  doc.rect(M, y, INN, 22).fill(ACC);
  doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica-Bold");
  doc.text("DESIGNATION", C1x + 8, y + 7, { width: C1w });
  doc.text("QTE",         C2x,     y + 7, { width: C2w, align: "center" });
  doc.text("PRIX UNIT.",  C3x,     y + 7, { width: C3w, align: "right" });
  doc.text("MONTANT",     C4x,     y + 7, { width: C4w - 8, align: "right" });
  y += 22;

  lignes.forEach((l, i) => {
    if (i % 2 === 1) doc.rect(M, y, INN, 24).fill(TINT);
    doc.fontSize(9.5).fillColor(INK).font("Helvetica").text(l.libelle, C1x + 8, y + 6, { width: C1w - 12 });
    doc.text(String(parseFloat(l.quantite) || 0), C2x, y + 6, { width: C2w, align: "center" });
    doc.fillColor(SUB).text(money(l.prix_vente), C3x, y + 6, { width: C3w, align: "right" });
    doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), C4x, y + 6, { width: C4w - 8, align: "right" });
    y += 24;
  });

  y += 14;
  const TotW = 220, TotX = M + INN - TotW;
  const boxH = parseFloat(f.reste) > 0 ? 100 : 84;
  doc.lineWidth(1).roundedRect(TotX - 14, y - 6, TotW + 14, boxH, 6).fillAndStroke(TINT, ACC);

  const tLine = (lbl, val, bold, col) => {
    doc.fontSize(9).fillColor(SUB).font("Helvetica").text(lbl, TotX, y, { width: 120 });
    doc.fillColor(col || INK).font(bold ? "Helvetica-Bold" : "Helvetica").text(val, TotX, y, { width: TotW, align: "right" });
    y += 18;
  };
  tLine("Sous-total", money(f.montant));
  tLine("Encaisse", money(f.montant_paye), true, "#16A34A");
  if (parseFloat(f.reste) > 0) tLine("Reste a payer", money(f.reste), true, "#DC2626");
  doc.fontSize(11).fillColor(INK).font("Helvetica-Bold").text("TOTAL", TotX, y + 4);
  doc.fontSize(15).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), TotX, y + 2, { width: TotW, align: "right" });

  const footY = PH - 40;
  doc.rect(0, footY - 10, PW, 6).fill(ACC);
  const msg = cfg.pied_de_page || "Merci pour votre confiance. Ce document tient lieu de facture officielle.";
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Oblique").text(msg, M, footY + 4, { width: INN, align: "center" });
}

// ─── 4. Élégant ─────────────────────────────────────────────────────────────
// Typographie serif, en-tête centré, doubles filets, table sobre.
function elegant(doc, ctx) {
  const { f, lignes, cfg, money, dateStr, logoBuf, pal, PW, PH, M, INN } = ctx;
  const ACC = pal.primary, INK = "#1F2937", SUB = "#6B7280", LINE = "#E5E7EB";
  const hr = (y, w, col) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(col).stroke();

  let y = 44;
  if (logoBuf) {
    try { doc.image(logoBuf, (PW - 40) / 2, y, { fit: [40, 40] }); y += 50; } catch (e) { /* ignoré */ }
  }
  doc.fontSize(18).fillColor(INK).font("Times-Bold").text(cfg.nom, M, y, { width: INN, align: "center" });
  y += 22;
  const infoParts = [cfg.adresse, cfg.telephone && ("Tel : " + cfg.telephone), cfg.email].filter(Boolean);
  if (infoParts.length) {
    doc.fontSize(8.5).fillColor(SUB).font("Times-Roman").text(infoParts.join("   -   "), M, y, { width: INN, align: "center" });
    y += 14;
  }

  y += 8;
  hr(y, 0.6, ACC); hr(y + 2, 0.6, ACC);
  y += 18;

  doc.fontSize(20).fillColor(INK).font("Times-Bold")
     .text("F A C T U R E", M, y, { width: INN, align: "center", characterSpacing: 3 });
  y += 26;
  doc.fontSize(9).fillColor(SUB).font("Times-Italic")
     .text(`N° ${f.code}   -   ${dateStr}`, M, y, { width: INN, align: "center" });
  y += 26;

  const paid = !!f.statut;
  doc.fontSize(9).fillColor(SUB).font("Times-Italic").text("Facture adressee a", M, y);
  doc.fontSize(13).fillColor(INK).font("Times-Bold").text(f.client_nom, M, y + 13);
  if (f.client_adresse) {
    doc.fontSize(8.5).fillColor(SUB).font("Times-Roman").text(f.client_adresse, M, y + 29, { width: INN });
  }
  doc.fontSize(9).fillColor(paid ? "#16A34A" : "#DC2626").font("Times-Bold")
     .text(paid ? "Reglee" : "Impayee", M, y + 2, { width: INN, align: "right" });
  y += f.client_adresse ? 56 : 42;

  hr(y, 0.4, LINE);
  y += 10;

  const C1x = M, C1w = 260, C2x = M + 260, C2w = 50, C3x = M + 310, C3w = 110, C4x = M + 420, C4w = INN - 420;
  doc.fontSize(8).fillColor(SUB).font("Times-Bold");
  doc.text("Designation", C1x, y, { width: C1w });
  doc.text("Qte",         C2x, y, { width: C2w, align: "center" });
  doc.text("Prix unit.",  C3x, y, { width: C3w, align: "right" });
  doc.text("Montant",     C4x, y, { width: C4w, align: "right" });
  y += 14;
  hr(y, 0.4, LINE);
  y += 10;

  lignes.forEach((l) => {
    doc.fontSize(10).fillColor(INK).font("Times-Roman").text(l.libelle, C1x, y, { width: C1w - 8 });
    doc.text(String(parseFloat(l.quantite) || 0), C2x, y, { width: C2w, align: "center" });
    doc.fillColor(SUB).font("Times-Roman").text(money(l.prix_vente), C3x, y, { width: C3w, align: "right" });
    doc.fillColor(INK).font("Times-Bold").text(money(l.montant_total), C4x, y, { width: C4w, align: "right" });
    y += 22;
    hr(y - 6, 0.3, LINE);
  });

  y += 12;
  const TotW = 220, TotX = M + INN - TotW;
  const tLine = (lbl, val, bold, col) => {
    doc.fontSize(9).fillColor(SUB).font("Times-Roman").text(lbl, TotX, y, { width: 120 });
    doc.fillColor(col || INK).font(bold ? "Times-Bold" : "Times-Roman").text(val, TotX, y, { width: TotW, align: "right" });
    y += 17;
  };
  tLine("Sous-total", money(f.montant));
  tLine("Encaisse", money(f.montant_paye), false, "#16A34A");
  if (parseFloat(f.reste) > 0) tLine("Reste a payer", money(f.reste), false, "#DC2626");
  hr(y, 0.6, ACC); hr(y + 2, 0.6, ACC);
  y += 12;
  doc.fontSize(11).fillColor(INK).font("Times-Bold").text("TOTAL", TotX, y);
  doc.fontSize(15).fillColor(ACC).font("Times-Bold").text(money(f.montant), TotX, y - 1, { width: TotW, align: "right" });

  const footY = PH - 50;
  hr(footY, 0.4, LINE);
  const msg = cfg.pied_de_page || "Merci pour votre confiance. Ce document tient lieu de facture officielle.";
  doc.fontSize(8).fillColor(SUB).font("Times-Italic").text(msg, M, footY + 10, { width: INN, align: "center" });
}

// ─── 5. Compact ─────────────────────────────────────────────────────────────
// Marges réduites, polices fines, lignes serrées : maximum d'informations sur
// une page, idéal pour les factures à nombreuses lignes.
function compact(doc, ctx) {
  const { f, lignes, cfg, money, dateStr, logoBuf, pal, PW, PH } = ctx;
  const M = 30, INN = PW - M * 2;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", LINE = "#E5E7EB";
  const hr = (y, w, col) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(col).stroke();

  let y = 26;
  let nameX = M, nameW = 280;
  if (logoBuf) {
    try { doc.image(logoBuf, M, y, { fit: [28, 28] }); nameX = M + 34; nameW = 246; } catch (e) { /* ignoré */ }
  }
  doc.fontSize(11).fillColor(INK).font("Helvetica-Bold").text(cfg.nom, nameX, y, { width: nameW });
  const infoLine1 = [cfg.adresse, cfg.telephone && ("Tel: " + cfg.telephone), cfg.email].filter(Boolean).join("  |  ");
  doc.fontSize(7).fillColor(SUB).font("Helvetica").text(infoLine1, nameX, y + 13, { width: nameW });

  doc.fontSize(14).fillColor(ACC).font("Helvetica-Bold").text("FACTURE", PW - M - 200, y, { width: 200, align: "right" });
  doc.fontSize(8).fillColor(INK).font("Helvetica-Bold")
     .text(`${f.code}   ${dateStr}`, PW - M - 200, y + 14, { width: 200, align: "right" });
  const paid = !!f.statut;
  doc.fontSize(8).fillColor(paid ? "#16A34A" : "#DC2626").font("Helvetica-Bold")
     .text(paid ? "REGLEE" : "IMPAYEE", PW - M - 200, y + 24, { width: 200, align: "right" });

  y += 38;
  hr(y, 1, ACC);
  y += 10;

  doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold").text("Client : ", M, y, { continued: true })
     .fillColor(INK).font("Helvetica-Bold").text(f.client_nom);
  y += 11;
  if (f.client_adresse) {
    doc.fontSize(7).fillColor(SUB).font("Helvetica").text(f.client_adresse, M, y, { width: INN });
    y += 10;
  } else {
    y += 5;
  }

  const C1x = M, C1w = 260, C2x = M + 260, C2w = 44, C3x = M + 304, C3w = 100, C4x = M + 404, C4w = INN - 404;
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Bold");
  doc.text("DESIGNATION", C1x, y, { width: C1w });
  doc.text("QTE",         C2x, y, { width: C2w, align: "center" });
  doc.text("P.U.",        C3x, y, { width: C3w, align: "right" });
  doc.text("MONTANT",     C4x, y, { width: C4w, align: "right" });
  y += 11;
  hr(y, 0.5, INK);
  y += 6;

  lignes.forEach((l, i) => {
    if (i % 2 === 1) doc.rect(M, y - 2, INN, 14).fill("#F9FAFB");
    doc.fontSize(8.5).fillColor(INK).font("Helvetica").text(l.libelle, C1x, y, { width: C1w - 6 });
    doc.text(String(parseFloat(l.quantite) || 0), C2x, y, { width: C2w, align: "center" });
    doc.fillColor(SUB).text(money(l.prix_vente), C3x, y, { width: C3w, align: "right" });
    doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), C4x, y, { width: C4w, align: "right" });
    y += 14;
  });

  y += 4;
  hr(y, 0.5, LINE);
  y += 8;

  const TotW = 200, TotX = M + INN - TotW;
  const tLine = (lbl, val, bold, col) => {
    doc.fontSize(8).fillColor(SUB).font("Helvetica").text(lbl, TotX, y, { width: 100 });
    doc.fillColor(col || INK).font(bold ? "Helvetica-Bold" : "Helvetica").text(val, TotX, y, { width: TotW, align: "right" });
    y += 13;
  };
  tLine("Sous-total", money(f.montant));
  tLine("Encaisse", money(f.montant_paye), true, "#16A34A");
  if (parseFloat(f.reste) > 0) tLine("Reste a payer", money(f.reste), true, "#DC2626");
  hr(y + 1, 0.8, INK);
  y += 7;
  doc.fontSize(10).fillColor(INK).font("Helvetica-Bold").text("TOTAL", TotX, y);
  doc.fontSize(12).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), TotX, y - 1, { width: TotW, align: "right" });

  const footY = PH - 26;
  hr(footY, 0.5, LINE);
  const msg = cfg.pied_de_page || "Merci pour votre confiance.";
  doc.fontSize(6.5).fillColor(SUB).font("Helvetica-Oblique").text(msg, M, footY + 5, { width: INN, align: "center" });
}

// ─── 6. Latéral ─────────────────────────────────────────────────────────────
// Bandeau latéral coloré sur toute la hauteur (identité, statut, récapitulatif
// des totaux) + zone principale à droite pour le client et le détail des
// articles. Disposition en deux colonnes : structurellement différente des
// 5 layouts précédents, tous en flux vertical pleine largeur.
function sidebar(doc, ctx) {
  const { f, lignes, cfg, money, dateStr, logoBuf, pal, PH, M, INN } = ctx;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", LITE = "#D1D5DB";
  const SBW = 168; // largeur du bandeau lateral
  const CX = SBW + 28, CW = M + INN - CX; // zone principale (jusqu'a M+INN = PW-M)
  const hr = (y, w, col) => doc.moveTo(CX, y).lineTo(CX + CW, y).lineWidth(w).strokeColor(col).stroke();

  // Bandeau lateral colore sur toute la hauteur
  doc.rect(0, 0, SBW, PH).fill(ACC);

  let sy = 36;
  if (logoBuf) {
    try {
      doc.roundedRect(20, sy, 46, 46, 8).fill("#FFFFFF");
      doc.image(logoBuf, 25, sy + 5, { fit: [36, 36] });
      sy += 58;
    } catch (e) { /* logo ignore */ }
  }
  doc.fontSize(13).fillColor("#FFFFFF").font("Helvetica-Bold").text(cfg.nom, 20, sy, { width: SBW - 36 });
  sy += doc.heightOfString(cfg.nom, { width: SBW - 36 }) + 6;
  doc.fillColor("#FFFFFF").opacity(0.85).fontSize(7.5).font("Helvetica");
  if (cfg.adresse)   { doc.text(cfg.adresse, 20, sy, { width: SBW - 36 }); sy += doc.heightOfString(cfg.adresse, { width: SBW - 36 }) + 2; }
  if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, 20, sy, { width: SBW - 36 }); sy += 12; }
  if (cfg.email)     { doc.text(cfg.email, 20, sy, { width: SBW - 36 }); sy += 12; }
  doc.opacity(1);

  sy += 16;
  doc.opacity(0.4).moveTo(20, sy).lineTo(SBW - 20, sy).lineWidth(0.5).strokeColor("#FFFFFF").stroke();
  doc.opacity(1);
  sy += 14;

  doc.fontSize(22).fillColor("#FFFFFF").font("Helvetica-Bold").text("FACTURE", 20, sy, { width: SBW - 36 });
  sy += 28;
  doc.fontSize(8.5).fillColor("#FFFFFF").font("Helvetica-Bold").text(f.code, 20, sy, { width: SBW - 36 });
  sy += 12;
  doc.opacity(0.85).fontSize(8).fillColor("#FFFFFF").font("Helvetica").text(dateStr, 20, sy, { width: SBW - 36 });
  doc.opacity(1);
  sy += 22;

  const paid = !!f.statut;
  doc.roundedRect(20, sy, SBW - 40, 20, 4).fill(paid ? "#16A34A" : "#DC2626");
  doc.fontSize(8.5).fillColor("#FFFFFF").font("Helvetica-Bold").text(paid ? "REGLEE" : "IMPAYEE", 20, sy + 5, { width: SBW - 40, align: "center" });
  sy += 36;

  doc.opacity(0.4).moveTo(20, sy).lineTo(SBW - 20, sy).lineWidth(0.5).strokeColor("#FFFFFF").stroke();
  doc.opacity(1);
  sy += 14;

  const sLine = (lbl, val, big) => {
    doc.opacity(0.75).fontSize(7.5).fillColor("#FFFFFF").font("Helvetica").text(lbl, 20, sy, { width: SBW - 36 });
    sy += 11;
    doc.opacity(1).fontSize(big ? 15 : 10).fillColor("#FFFFFF").font("Helvetica-Bold").text(val, 20, sy, { width: SBW - 36 });
    sy += big ? 22 : 16;
  };
  sLine("SOUS-TOTAL", money(f.montant));
  sLine("ENCAISSE", money(f.montant_paye));
  if (parseFloat(f.reste) > 0) sLine("RESTE A PAYER", money(f.reste));
  sLine("TOTAL", money(f.montant), true);

  // ── Zone principale ──────────────────────────────────────────────────
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Bold").text("FACTURE A :", CX, 44);
  doc.fontSize(15).fillColor(INK).font("Helvetica-Bold").text(f.client_nom, CX, 58, { width: CW });
  if (f.client_adresse) {
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica").text(f.client_adresse, CX, 78, { width: CW });
  }

  hr(100, 1, ACC);

  const TY = 116, RH = 24;
  const C2w = 40, C3w = 70, C4w = 70, C1w = CW - C2w - C3w - C4w;
  const C1x = CX, C2x = CX + C1w, C3x = C2x + C2w, C4x = C3x + C3w;

  doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold");
  doc.text("DESIGNATION", C1x, TY + 9, { width: C1w });
  doc.text("QTE",         C2x, TY + 9, { width: C2w, align: "center" });
  doc.text("PRIX UNIT.",  C3x, TY + 9, { width: C3w, align: "right" });
  doc.text("MONTANT",     C4x, TY + 9, { width: C4w, align: "right" });
  hr(TY + RH, 1, INK);

  let ry = TY + RH;
  lignes.forEach((l) => {
    ry += 4;
    doc.fontSize(9.5).fillColor(INK).font("Helvetica").text(l.libelle, C1x, ry, { width: C1w - 8 });
    doc.text(String(parseFloat(l.quantite) || 0), C2x, ry, { width: C2w, align: "center" });
    doc.fillColor(SUB).text(money(l.prix_vente), C3x, ry, { width: C3w, align: "right" });
    doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), C4x, ry, { width: C4w, align: "right" });
    ry += 22;
    hr(ry, 0.3, LITE);
  });

  const footY = PH - 40;
  const msg = cfg.pied_de_page || "Merci pour votre confiance. Ce document tient lieu de facture officielle.";
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica-Oblique").text(msg, CX, footY, { width: CW, align: "left" });
  doc.fontSize(7).fillColor(ACC).font("Helvetica-Bold").text("WariGest", CX, footY + 14, { width: CW, align: "left" });
}

module.exports = { classic, moderne, bloc, elegant, compact, sidebar };
