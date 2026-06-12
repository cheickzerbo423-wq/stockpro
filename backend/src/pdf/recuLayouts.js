// src/pdf/recuLayouts.js
// 5 mises en page pour le reçu PDF (format thermique 80mm), chacune
// paramétrée par une palette de couleurs (voir utils/pdfStyles.js).
//
// Chaque layout exporte :
//   - height(ctx) : calcule la hauteur totale de la page (dépend du nombre
//     de lignes, de la présence d'un logo et d'un éventuel "reste à payer")
//   - draw(doc, ctx) : dessine le contenu sur le document PDFKit déjà créé
//     à la bonne taille [W, H]
//
// ctx = { f, lignes, cfg, money, dateStr, logoBuf, pal, W, M, INNER }
//   pal = { primary, dark, light, mid }, lignes = tableau de lignes de vente

// ─── 1. Classique ───────────────────────────────────────────────────────────
const classic = {
  height(ctx) {
    const { lignes, logoBuf, f } = ctx;
    const LINE_H = 16;
    const extraH = parseFloat(f.reste) > 0 ? 16 : 0;
    const logoH  = logoBuf ? 46 : 0;
    const adrH   = f.client_adresse ? 12 : 0;
    return 290 + logoH + lignes.length * LINE_H + extraH + adrH;
  },
  draw(doc, ctx) {
    const { f, lignes, cfg, money, dateStr, logoBuf, pal, W, M, INNER } = ctx;
    const ACC = pal.primary, DARK = "#111827", GREY = "#6B7280", LITE = "#D1D5DB";
    const hr  = (yy, t, c) => doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(t).strokeColor(c).stroke();
    const hrW = (yy, t, c) => doc.moveTo(0, yy).lineTo(W, yy).lineWidth(t).strokeColor(c).stroke();

    let y = 12;
    if (logoBuf) {
      try { doc.image(logoBuf, (W - 36) / 2, y, { fit: [36, 36] }); y += 44; } catch (e) { /* ignoré */ }
    }

    doc.fontSize(12).fillColor(DARK).font("Helvetica-Bold").text(cfg.nom, 0, y, { width: W, align: "center" });
    y += 15;
    doc.fontSize(7).fillColor(GREY).font("Helvetica");
    if (cfg.adresse)   { doc.text(cfg.adresse,              0, y, { width: W, align: "center" }); y += 10; }
    if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, 0, y, { width: W, align: "center" }); y += 10; }

    y += 4; hrW(y, 0.5, LITE); y += 8;

    doc.fontSize(9.5).fillColor(DARK).font("Helvetica-Bold").text("RECU DE PAIEMENT", 0, y, { width: W, align: "center" });
    y += 13;
    doc.fontSize(7).fillColor(GREY).font("Helvetica").text("Ref : " + f.code, 0, y, { width: W, align: "center" });
    y += 10;

    hrW(y, 0.5, LITE); y += 8;

    const infoLine = (lbl, val) => {
      doc.fontSize(7.5).fillColor(GREY).font("Helvetica").text(lbl, M, y, { width: 40 });
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica-Bold").text(val, M + 40, y, { width: INNER - 40 });
      y += 12;
    };
    infoLine("Date :", dateStr);
    infoLine("Client :", f.client_nom);
    if (f.client_adresse) infoLine("Adresse :", f.client_adresse);

    y += 3; hrW(y, 0.5, LITE); y += 8;

    doc.fontSize(7).fillColor(GREY).font("Helvetica-Bold");
    doc.text("ARTICLE", M,       y, { width: 72 });
    doc.text("QTE",     M + 72,  y, { width: 22, align: "center" });
    doc.text("P.U.",    M + 94,  y, { width: 50, align: "right" });
    doc.text("TOTAL",   M + 144, y, { width: INNER - 144, align: "right" });
    y += 10;
    hr(y, 0.8, DARK); y += 4;

    lignes.forEach((l) => {
      const lib = l.libelle.length > 15 ? l.libelle.slice(0, 14) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(DARK).font("Helvetica").text(lib, M, y, { width: 72 });
      doc.text(String(parseFloat(l.quantite) || 0), M + 72, y, { width: 22, align: "center" });
      doc.fillColor(GREY).text(money(l.prix_vente), M + 94, y, { width: 50, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold").text(money(l.montant_total), M + 144, y, { width: INNER - 144, align: "right" });
      y += 16;
      hr(y, 0.3, LITE);
    });

    y += 5; hr(y, 0.8, DARK); y += 8;

    const totLn = (lbl, val, col) => {
      doc.fontSize(8).fillColor(GREY).font("Helvetica").text(lbl, M, y);
      doc.fillColor(col || DARK).font("Helvetica-Bold").text(val, M, y, { width: INNER, align: "right" });
      y += 13;
    };
    totLn("Montant encaisse", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste a payer", money(f.reste), "#DC2626");

    y += 2; hr(y, 0.5, LITE); y += 6;

    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text("TOTAL", M, y);
    doc.fontSize(13).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), M, y - 1, { width: INNER, align: "right" });
    y += 18;

    hr(y, 0.5, LITE); y += 8;

    const paid = !!f.statut;
    const sCol = paid ? "#16A34A" : "#DC2626";
    const sLbl = paid ? "FACTURE REGLEE" : "RESTE A PAYER";
    doc.fontSize(8).fillColor(sCol).font("Helvetica-Bold").text(sLbl, 0, y, { width: W, align: "center" });
    y += 13;

    hrW(y, 0.5, LITE); y += 8;

    doc.fontSize(7).fillColor(GREY).font("Helvetica-Oblique")
       .text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 11;
    doc.fontSize(6.5).fillColor(ACC).font("Helvetica-Bold").text("Edite par WariGest", 0, y, { width: W, align: "center" });
  },
};

// ─── 2. Moderne ─────────────────────────────────────────────────────────────
// Très épuré : titre "Reçu" en grand, lignes fines, peu de filets.
const moderne = {
  height(ctx) {
    const { lignes, logoBuf, f } = ctx;
    const extraH = parseFloat(f.reste) > 0 ? 14 : 0;
    const logoH  = logoBuf ? 40 : 0;
    const adrH   = f.client_adresse ? 12 : 0;
    return 250 + logoH + lignes.length * 15 + extraH + adrH;
  },
  draw(doc, ctx) {
    const { f, lignes, cfg, money, dateStr, logoBuf, pal, W, M, INNER } = ctx;
    const ACC = pal.primary, INK = "#1F2937", SUB = "#9CA3AF", LINE = "#F3F4F6";
    const hrW = (yy, t, c) => doc.moveTo(0, yy).lineTo(W, yy).lineWidth(t).strokeColor(c).stroke();
    const hr  = (yy, t, c) => doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(t).strokeColor(c).stroke();

    let y = 14;
    if (logoBuf) {
      try { doc.image(logoBuf, (W - 30) / 2, y, { fit: [30, 30] }); y += 38; } catch (e) { /* ignoré */ }
    }

    doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold").text((cfg.nom || "").toUpperCase(), 0, y, { width: W, align: "center", characterSpacing: 1 });
    y += 16;
    doc.fontSize(15).fillColor(INK).font("Helvetica").text("Reçu", 0, y, { width: W, align: "center" });
    y += 22;
    doc.fontSize(7).fillColor(SUB).font("Helvetica").text(`${f.code}  -  ${dateStr}`, 0, y, { width: W, align: "center" });
    y += 16;

    hrW(y, 0.5, LINE); y += 10;

    doc.fontSize(7).fillColor(SUB).font("Helvetica").text("Client", M, y);
    doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold").text(f.client_nom, M, y + 10, { width: INNER });
    y += 22;
    if (f.client_adresse) {
      doc.fontSize(7).fillColor(SUB).font("Helvetica").text(f.client_adresse, M, y, { width: INNER });
      y += 12;
    } else {
      y += 6;
    }

    lignes.forEach((l) => {
      doc.fontSize(7.5).fillColor(INK).font("Helvetica").text(l.libelle, M, y, { width: INNER - 60 });
      doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text(`x${parseFloat(l.quantite) || 0}`, M, y + 9, { width: INNER - 60 });
      doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), M, y, { width: INNER, align: "right" });
      y += 22;
      hr(y - 5, 0.5, LINE);
    });

    y += 6; hr(y, 1, ACC); y += 10;

    const tLine = (lbl, val, bold, col) => {
      doc.fontSize(8).fillColor(SUB).font("Helvetica").text(lbl, M, y, { width: INNER - 80 });
      doc.fillColor(col || INK).font(bold ? "Helvetica-Bold" : "Helvetica").text(val, M, y, { width: INNER, align: "right" });
      y += 14;
    };
    tLine("Encaisse", money(f.montant_paye), false, "#16A34A");
    if (parseFloat(f.reste) > 0) tLine("Reste a payer", money(f.reste), false, "#DC2626");

    y += 4;
    doc.fontSize(9).fillColor(SUB).font("Helvetica").text("TOTAL", M, y, { width: INNER - 80 });
    doc.fontSize(13).fillColor(INK).font("Helvetica-Bold").text(money(f.montant), M, y - 1, { width: INNER, align: "right" });
    y += 24;

    const paid = !!f.statut;
    doc.fontSize(7.5).fillColor(paid ? "#16A34A" : "#DC2626").font("Helvetica-Bold")
       .text(paid ? "Reglee" : "Reste a payer", 0, y, { width: W, align: "center" });
    y += 14;

    doc.fontSize(7).fillColor(SUB).font("Helvetica").text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 10;
    doc.fontSize(6.5).fillColor(SUB).font("Helvetica-Bold").text("WariGest", 0, y, { width: W, align: "center" });
  },
};

// ─── 3. Bloc Couleur ────────────────────────────────────────────────────────
// Bandeau coloré en tête avec "REÇU" en blanc.
const bloc = {
  height(ctx) {
    const { lignes, logoBuf, f } = ctx;
    const extraH = parseFloat(f.reste) > 0 ? 16 : 0;
    const logoH  = logoBuf ? 44 : 0;
    const adrH   = f.client_adresse ? 12 : 0;
    return 290 + logoH + lignes.length * 16 + extraH + adrH;
  },
  draw(doc, ctx) {
    const { f, lignes, cfg, money, dateStr, logoBuf, pal, W, M, INNER } = ctx;
    const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", TINT = pal.light, LITE = "#D1D5DB";
    const hrW = (yy, t, c) => doc.moveTo(0, yy).lineTo(W, yy).lineWidth(t).strokeColor(c).stroke();
    const hr  = (yy, t, c) => doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(t).strokeColor(c).stroke();

    let bandH = logoBuf ? 78 : 56;
    doc.rect(0, 0, W, bandH).fill(ACC);

    let y = 10;
    if (logoBuf) {
      try { doc.image(logoBuf, (W - 32) / 2, y, { fit: [32, 32] }); y += 38; } catch (e) { /* ignoré */ }
    }
    doc.fontSize(11).fillColor("#FFFFFF").font("Helvetica-Bold").text(cfg.nom, 0, y, { width: W, align: "center" });
    y += 14;
    doc.fontSize(9).fillColor("#FFFFFF").font("Helvetica-Bold").text("RECU DE PAIEMENT", 0, y, { width: W, align: "center" });

    y = bandH + 10;

    doc.fontSize(7).fillColor(SUB).font("Helvetica").text("Ref : " + f.code + "   " + dateStr, 0, y, { width: W, align: "center" });
    y += 14;

    hrW(y, 0.5, LITE); y += 8;

    const infoLine = (lbl, val) => {
      doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text(lbl, M, y, { width: 40 });
      doc.fontSize(7.5).fillColor(INK).font("Helvetica-Bold").text(val, M + 40, y, { width: INNER - 40 });
      y += 12;
    };
    infoLine("Client :", f.client_nom);
    if (f.client_adresse) infoLine("Adresse :", f.client_adresse);

    y += 3;
    doc.rect(M, y, INNER, 16).fill(TINT);
    doc.fontSize(7).fillColor(INK).font("Helvetica-Bold");
    doc.text("ARTICLE", M + 4,   y + 4, { width: 70 });
    doc.text("QTE",     M + 74,  y + 4, { width: 22, align: "center" });
    doc.text("P.U.",    M + 96,  y + 4, { width: 48, align: "right" });
    doc.text("TOTAL",   M + 144, y + 4, { width: INNER - 148, align: "right" });
    y += 20;

    lignes.forEach((l) => {
      const lib = l.libelle.length > 15 ? l.libelle.slice(0, 14) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(INK).font("Helvetica").text(lib, M, y, { width: 72 });
      doc.text(String(parseFloat(l.quantite) || 0), M + 72, y, { width: 22, align: "center" });
      doc.fillColor(SUB).text(money(l.prix_vente), M + 94, y, { width: 50, align: "right" });
      doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), M + 144, y, { width: INNER - 144, align: "right" });
      y += 16;
    });

    y += 4; hr(y, 0.8, ACC); y += 8;

    const totLn = (lbl, val, col) => {
      doc.fontSize(8).fillColor(SUB).font("Helvetica").text(lbl, M, y);
      doc.fillColor(col || INK).font("Helvetica-Bold").text(val, M, y, { width: INNER, align: "right" });
      y += 13;
    };
    totLn("Montant encaisse", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste a payer", money(f.reste), "#DC2626");

    y += 4;
    doc.roundedRect(M, y - 4, INNER, 26, 4).fill(TINT);
    doc.fontSize(10).fillColor(INK).font("Helvetica-Bold").text("TOTAL", M + 6, y + 4);
    doc.fontSize(13).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), M, y + 3, { width: INNER - 6, align: "right" });
    y += 30;

    const paid = !!f.statut;
    const sCol = paid ? "#16A34A" : "#DC2626";
    const sLbl = paid ? "FACTURE REGLEE" : "RESTE A PAYER";
    doc.fontSize(8).fillColor(sCol).font("Helvetica-Bold").text(sLbl, 0, y, { width: W, align: "center" });
    y += 13;

    hrW(y, 0.5, LITE); y += 8;

    doc.fontSize(7).fillColor(SUB).font("Helvetica-Oblique")
       .text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 11;
    doc.fontSize(6.5).fillColor(ACC).font("Helvetica-Bold").text("Edite par WariGest", 0, y, { width: W, align: "center" });
  },
};
// ─── 4. Élégant ─────────────────────────────────────────────────────────────
// Typographie serif, doubles filets, présentation soignée.
const elegant = {
  height(ctx) {
    const { lignes, logoBuf, f } = ctx;
    const extraH = parseFloat(f.reste) > 0 ? 14 : 0;
    const logoH  = logoBuf ? 44 : 0;
    const adrH   = f.client_adresse ? 12 : 0;
    return 295 + logoH + lignes.length * 17 + extraH + adrH;
  },
  draw(doc, ctx) {
    const { f, lignes, cfg, money, dateStr, logoBuf, pal, W, M, INNER } = ctx;
    const ACC = pal.primary, INK = "#1F2937", SUB = "#6B7280", LINE = "#E5E7EB";
    const hrW = (yy, t, c) => doc.moveTo(0, yy).lineTo(W, yy).lineWidth(t).strokeColor(c).stroke();
    const hr  = (yy, t, c) => doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(t).strokeColor(c).stroke();

    let y = 12;
    if (logoBuf) {
      try { doc.image(logoBuf, (W - 34) / 2, y, { fit: [34, 34] }); y += 42; } catch (e) { /* ignoré */ }
    }

    doc.fontSize(11).fillColor(INK).font("Times-Bold").text(cfg.nom, 0, y, { width: W, align: "center" });
    y += 14;
    doc.fontSize(7).fillColor(SUB).font("Times-Roman");
    if (cfg.adresse)   { doc.text(cfg.adresse,              0, y, { width: W, align: "center" }); y += 10; }
    if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, 0, y, { width: W, align: "center" }); y += 10; }

    y += 4; hrW(y, 0.5, ACC); hrW(y + 2, 0.5, ACC); y += 12;

    doc.fontSize(11).fillColor(INK).font("Times-Bold").text("R E C U", 0, y, { width: W, align: "center", characterSpacing: 2 });
    y += 14;
    doc.fontSize(7).fillColor(SUB).font("Times-Italic").text(`N° ${f.code}   -   ${dateStr}`, 0, y, { width: W, align: "center" });
    y += 16;

    hrW(y, 0.5, LINE); y += 8;

    doc.fontSize(7.5).fillColor(SUB).font("Times-Italic").text("Recu de", M, y);
    doc.fontSize(9.5).fillColor(INK).font("Times-Bold").text(f.client_nom, M, y + 10, { width: INNER });
    y += 22;
    if (f.client_adresse) {
      doc.fontSize(7.5).fillColor(SUB).font("Times-Roman").text(f.client_adresse, M, y, { width: INNER });
      y += 12;
    } else {
      y += 4;
    }

    hr(y, 0.4, LINE); y += 8;

    lignes.forEach((l) => {
      const lib = l.libelle.length > 18 ? l.libelle.slice(0, 17) + "." : l.libelle;
      doc.fontSize(8).fillColor(INK).font("Times-Roman").text(lib, M, y, { width: INNER - 90 });
      doc.fillColor(SUB).text(`x${parseFloat(l.quantite) || 0}`, M + INNER - 90, y, { width: 30, align: "center" });
      doc.fillColor(INK).font("Times-Bold").text(money(l.montant_total), M, y, { width: INNER, align: "right" });
      y += 17;
    });

    y += 4; hr(y, 0.4, LINE); y += 8;

    const totLn = (lbl, val, col) => {
      doc.fontSize(8).fillColor(SUB).font("Times-Roman").text(lbl, M, y);
      doc.fillColor(col || INK).font("Times-Bold").text(val, M, y, { width: INNER, align: "right" });
      y += 13;
    };
    totLn("Encaisse", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste a payer", money(f.reste), "#DC2626");

    y += 2; hrW(y, 0.5, ACC); hrW(y + 2, 0.5, ACC); y += 10;

    doc.fontSize(10).fillColor(INK).font("Times-Bold").text("TOTAL", M, y);
    doc.fontSize(13).fillColor(ACC).font("Times-Bold").text(money(f.montant), M, y - 1, { width: INNER, align: "right" });
    y += 20;

    const paid = !!f.statut;
    doc.fontSize(8).fillColor(paid ? "#16A34A" : "#DC2626").font("Times-Bold")
       .text(paid ? "Facture reglee" : "Reste a payer", 0, y, { width: W, align: "center" });
    y += 14;

    hrW(y, 0.5, LINE); y += 8;

    doc.fontSize(7).fillColor(SUB).font("Times-Italic").text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 11;
    doc.fontSize(6.5).fillColor(ACC).font("Times-Bold").text("Edite par WariGest", 0, y, { width: W, align: "center" });
  },
};

// ─── 5. Compact ─────────────────────────────────────────────────────────────
// Lignes serrées, polices fines : maximum d'articles sur le ticket.
const compact = {
  height(ctx) {
    const { lignes, logoBuf, f } = ctx;
    const extraH = parseFloat(f.reste) > 0 ? 12 : 0;
    const logoH  = logoBuf ? 36 : 0;
    const adrH   = f.client_adresse ? 9 : 0;
    return 230 + logoH + lignes.length * 13 + extraH + adrH;
  },
  draw(doc, ctx) {
    const { f, lignes, cfg, money, dateStr, logoBuf, pal, W, M, INNER } = ctx;
    const ACC = pal.primary, DARK = "#111827", GREY = "#6B7280", LITE = "#D1D5DB";
    const hrW = (yy, t, c) => doc.moveTo(0, yy).lineTo(W, yy).lineWidth(t).strokeColor(c).stroke();
    const hr  = (yy, t, c) => doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(t).strokeColor(c).stroke();

    let y = 8;
    if (logoBuf) {
      try { doc.image(logoBuf, (W - 26) / 2, y, { fit: [26, 26] }); y += 32; } catch (e) { /* ignoré */ }
    }

    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text(cfg.nom, 0, y, { width: W, align: "center" });
    y += 12;
    doc.fontSize(6.5).fillColor(GREY).font("Helvetica");
    const infoLine = [cfg.adresse, cfg.telephone && ("Tel:" + cfg.telephone)].filter(Boolean).join(" - ");
    if (infoLine) { doc.text(infoLine, 0, y, { width: W, align: "center" }); y += 9; }

    y += 2; hrW(y, 0.5, LITE); y += 6;

    doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold").text("RECU N° " + f.code, 0, y, { width: W, align: "center" });
    y += 10;
    doc.fontSize(6.5).fillColor(GREY).font("Helvetica").text(dateStr + "  -  " + f.client_nom, 0, y, { width: W, align: "center" });
    y += 9;
    if (f.client_adresse) {
      doc.fontSize(6).fillColor(GREY).font("Helvetica").text(f.client_adresse, 0, y, { width: W, align: "center" });
      y += 9;
    } else {
      y += 1;
    }

    hrW(y, 0.5, LITE); y += 5;

    doc.fontSize(6.5).fillColor(GREY).font("Helvetica-Bold");
    doc.text("ARTICLE", M,       y, { width: 78 });
    doc.text("QTE",     M + 78,  y, { width: 20, align: "center" });
    doc.text("P.U.",    M + 98,  y, { width: 46, align: "right" });
    doc.text("TOTAL",   M + 144, y, { width: INNER - 144, align: "right" });
    y += 9;
    hr(y, 0.6, DARK); y += 3;

    lignes.forEach((l) => {
      const lib = l.libelle.length > 16 ? l.libelle.slice(0, 15) + "." : l.libelle;
      doc.fontSize(7).fillColor(DARK).font("Helvetica").text(lib, M, y, { width: 78 });
      doc.text(String(parseFloat(l.quantite) || 0), M + 78, y, { width: 20, align: "center" });
      doc.fillColor(GREY).text(money(l.prix_vente), M + 98, y, { width: 46, align: "right" });
      doc.fillColor(DARK).font("Helvetica-Bold").text(money(l.montant_total), M + 144, y, { width: INNER - 144, align: "right" });
      y += 13;
    });

    y += 2; hr(y, 0.6, DARK); y += 5;

    const totLn = (lbl, val, col) => {
      doc.fontSize(7).fillColor(GREY).font("Helvetica").text(lbl, M, y);
      doc.fillColor(col || DARK).font("Helvetica-Bold").text(val, M, y, { width: INNER, align: "right" });
      y += 11;
    };
    totLn("Encaisse", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste a payer", money(f.reste), "#DC2626");

    y += 1; hr(y, 0.4, LITE); y += 5;

    doc.fontSize(9).fillColor(DARK).font("Helvetica-Bold").text("TOTAL", M, y);
    doc.fontSize(11).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), M, y - 1, { width: INNER, align: "right" });
    y += 15;

    const paid = !!f.statut;
    const sCol = paid ? "#16A34A" : "#DC2626";
    const sLbl = paid ? "REGLEE" : "RESTE A PAYER";
    doc.fontSize(7).fillColor(sCol).font("Helvetica-Bold").text(sLbl, 0, y, { width: W, align: "center" });
    y += 11;

    hrW(y, 0.4, LITE); y += 5;

    doc.fontSize(6).fillColor(GREY).font("Helvetica-Oblique")
       .text(cfg.pied_de_page || "Merci pour votre confiance !", 0, y, { width: W, align: "center" });
    y += 8;
    doc.fontSize(5.5).fillColor(ACC).font("Helvetica-Bold").text("Edite par WariGest", 0, y, { width: W, align: "center" });
  },
};

// ─── 6. Latéral ─────────────────────────────────────────────────────────────
// Bandeau vertical colore sur le bord gauche (type "talon de billet"),
// separateurs en pointilles, encadre TOTAL. Disposition structurellement
// differente des 5 precedentes (toutes centrees, sans bandeau ni pointilles).
const sidebar = {
  height(ctx) {
    const { lignes, logoBuf, f } = ctx;
    const extraH = parseFloat(f.reste) > 0 ? 13 : 0;
    const logoH  = logoBuf ? 42 : 0;
    const adrH   = f.client_adresse ? 12 : 0;
    return 300 + logoH + lignes.length * 16 + extraH + adrH;
  },
  draw(doc, ctx) {
    const { f, lignes, cfg, money, dateStr, logoBuf, pal, M, INNER } = ctx;
    const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", LITE = "#D1D5DB";
    const BAND = 8;
    const CX = M + BAND + 4, CW = INNER - BAND - 4;
    const dashed = (yy) => {
      doc.dash(2, { space: 2 }).moveTo(CX, yy).lineTo(CX + CW, yy).lineWidth(0.7).strokeColor(LITE).stroke();
      doc.undash();
    };

    // Bandeau vertical colore sur toute la hauteur de la page
    doc.rect(0, 0, BAND, doc.page.height).fill(ACC);

    let y = 14;
    if (logoBuf) {
      try { doc.image(logoBuf, CX, y, { fit: [34, 34] }); y += 42; } catch (e) { /* logo ignore */ }
    }

    doc.fontSize(11).fillColor(INK).font("Helvetica-Bold").text(cfg.nom, CX, y, { width: CW });
    y += 14;
    doc.fontSize(7).fillColor(SUB).font("Helvetica");
    if (cfg.adresse)   { doc.text(cfg.adresse,              CX, y, { width: CW }); y += 10; }
    if (cfg.telephone) { doc.text("Tel : " + cfg.telephone, CX, y, { width: CW }); y += 10; }

    y += 4; dashed(y); y += 10;

    doc.fontSize(9.5).fillColor(ACC).font("Helvetica-Bold").text("RECU DE PAIEMENT", CX, y, { width: CW });
    y += 13;
    doc.fontSize(7).fillColor(SUB).font("Helvetica").text("Ref : " + f.code + "   " + dateStr, CX, y, { width: CW });
    y += 14;

    doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("Client", CX, y, { width: CW });
    y += 10;
    doc.fontSize(9).fillColor(INK).font("Helvetica-Bold").text(f.client_nom, CX, y, { width: CW });
    y += 14;
    if (f.client_adresse) {
      doc.fontSize(7).fillColor(SUB).font("Helvetica").text(f.client_adresse, CX, y, { width: CW });
      y += 12;
    } else {
      y += 2;
    }

    dashed(y); y += 8;

    doc.fontSize(7).fillColor(SUB).font("Helvetica-Bold");
    doc.text("ARTICLE", CX,           y, { width: CW - 70 });
    doc.text("QTE",     CX + CW - 70, y, { width: 20, align: "center" });
    doc.text("TOTAL",   CX + CW - 50, y, { width: 50, align: "right" });
    y += 12;

    lignes.forEach((l) => {
      const lib = l.libelle.length > 18 ? l.libelle.slice(0, 17) + "." : l.libelle;
      doc.fontSize(7.5).fillColor(INK).font("Helvetica").text(lib, CX, y, { width: CW - 70 });
      doc.fillColor(SUB).text(String(parseFloat(l.quantite) || 0), CX + CW - 70, y, { width: 20, align: "center" });
      doc.fillColor(INK).font("Helvetica-Bold").text(money(l.montant_total), CX + CW - 50, y, { width: 50, align: "right" });
      y += 16;
    });

    y += 4; dashed(y); y += 8;

    const totLn = (lbl, val, col) => {
      doc.fontSize(8).fillColor(SUB).font("Helvetica").text(lbl, CX, y, { width: CW });
      doc.fillColor(col || INK).font("Helvetica-Bold").text(val, CX, y, { width: CW, align: "right" });
      y += 13;
    };
    totLn("Montant encaisse", money(f.montant_paye), "#15803D");
    if (parseFloat(f.reste) > 0) totLn("Reste a payer", money(f.reste), "#DC2626");
    y += 4;

    doc.roundedRect(CX, y, CW, 28, 5).lineWidth(1).strokeColor(ACC).stroke();
    doc.fontSize(9).fillColor(INK).font("Helvetica-Bold").text("TOTAL", CX + 8, y + 9);
    doc.fontSize(13).fillColor(ACC).font("Helvetica-Bold").text(money(f.montant), CX, y + 7, { width: CW - 8, align: "right" });
    y += 38;

    const paid = !!f.statut;
    const sCol = paid ? "#16A34A" : "#DC2626";
    const sLbl = paid ? "FACTURE REGLEE" : "RESTE A PAYER";
    doc.fontSize(8).fillColor(sCol).font("Helvetica-Bold").text(sLbl, CX, y, { width: CW, align: "center" });
    y += 16;

    doc.fontSize(7).fillColor(SUB).font("Helvetica-Oblique")
       .text(cfg.pied_de_page || "Merci pour votre confiance !", CX, y, { width: CW, align: "center" });
    y += 11;
    doc.fontSize(6.5).fillColor(ACC).font("Helvetica-Bold").text("Edite par WariGest", CX, y, { width: CW, align: "center" });
  },
};

module.exports = { classic, moderne, bloc, elegant, compact, sidebar };
