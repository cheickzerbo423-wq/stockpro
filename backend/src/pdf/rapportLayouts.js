// src/pdf/rapportLayouts.js
// 5 mises en page pour le rapport financier PDF (format A4), chacune
// paramétrée par une palette de couleurs (voir utils/pdfStyles.js).
//
// Chaque fonction reçoit le document PDFKit déjà créé (taille A4, marges à 0)
// et un contexte `ctx` :
//   { v, a, f, benefice, topArticles, cfg, money, fmtN, debutStr, finStr,
//     genStr, logoBuf, pal, PW, PH, M, INN }
// où `pal` = { primary, dark, light, mid }.

// ─── 1. Classique ───────────────────────────────────────────────────────────
function classic(doc, ctx) {
  const { v, a, f, benefice, topArticles, cfg, money, fmtN, debutStr, finStr, genStr, logoBuf, pal, PW, M, INN } = ctx;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", LITE = "#D1D5DB";
  const hr = (y, w, c) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(c).stroke();

  let txtX = M, txtW = 240;
  if (logoBuf) {
    try { doc.image(logoBuf, M, 36, { fit: [42, 42] }); txtX = M + 52; txtW = 188; } catch (e) { /* ignoré */ }
  }

  doc.fontSize(16).fillColor(INK).font("Helvetica-Bold").text(cfg.nom, txtX, 36, { width: txtW });
  doc.fontSize(8.5).fillColor(SUB).font("Helvetica")
     .text((cfg.adresse || "") + (cfg.telephone ? (cfg.adresse ? "  ·  " : "") + cfg.telephone : ""), txtX, 58, { width: txtW });

  doc.fontSize(22).fillColor(ACC).font("Helvetica-Bold").text("RAPPORT FINANCIER", PW - M - 230, 34, { width: 230, align: "right" });
  doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold").text(`${debutStr}  -  ${finStr}`, PW - M - 230, 63, { width: 230, align: "right" });
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("Genere le " + genStr, PW - M - 230, 77, { width: 230, align: "right" });

  hr(96, 1, ACC); hr(98, 0.3, LITE);
  doc.y = 112;

  const kpiW = 116, kpiH = 58, kpiY = doc.y;
  const kpiGap = Math.floor((INN - kpiW * 4) / 3);
  const kpis = [
    { label: "Chiffre d'Affaires", value: money(v.ca_total),     color: ACC },
    { label: "Total Depenses",     value: money(a.total_achats), color: "#EF4444" },
    { label: "Benefice Net",       value: money(benefice),       color: benefice >= 0 ? "#10B981" : "#EF4444" },
    { label: "Factures Emises",    value: fmtN(f.nb_total),      color: "#3B82F6" },
  ];
  kpis.forEach((k, i) => {
    const kx = M + i * (kpiW + kpiGap);
    doc.rect(kx, kpiY, kpiW, kpiH).strokeColor(LITE).lineWidth(0.8).stroke();
    doc.moveTo(kx, kpiY).lineTo(kx + kpiW, kpiY).lineWidth(2).strokeColor(k.color).stroke();
    doc.fillColor(k.color).fontSize(12).font("Helvetica-Bold").text(k.value, kx + 4, kpiY + 12, { width: kpiW - 8, align: "center" });
    doc.fillColor(SUB).fontSize(7).font("Helvetica").text(k.label, kx + 4, kpiY + 38, { width: kpiW - 8, align: "center" });
  });
  doc.y = kpiY + kpiH + 20;

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
    doc.fillColor(color || INK).font("Helvetica-Bold").text(value, M, ry, { width: INN, align: "right" });
    doc.moveTo(M, ry + 15).lineTo(M + INN, ry + 15).lineWidth(0.3).strokeColor(LITE).stroke();
    doc.y = ry + 15;
  };

  section("VENTES");
  row("Chiffre d'affaires", money(v.ca_total), ACC);
  row("Nombre de factures", fmtN(v.nb_factures));
  row("Quantites vendues",  fmtN(v.qte_totale) + " unites");

  section("APPROVISIONNEMENTS");
  row("Nombre d'achats",     fmtN(a.nb_achats));
  row("Total depenses",      money(a.total_achats), "#EF4444");
  row("Montant paye",        money(a.total_paye),   "#10B981");
  row("Dettes fournisseurs", money(a.total_dettes), parseInt(a.total_dettes) > 0 ? "#EF4444" : SUB);

  section("RECOUVREMENT FACTURES");
  row("Total facture",      money(f.montant_total));
  row("Montant encaisse",   money(f.montant_encaisse), "#10B981");
  row("Creances restantes", money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#EF4444" : SUB);
  row("Factures reglees",   fmtN(f.nb_reglees), "#10B981");
  row("Factures impayees",  fmtN(f.nb_impayees), parseInt(f.nb_impayees) > 0 ? "#EF4444" : SUB);

  if (topArticles.length > 0) {
    section("TOP 5 ARTICLES VENDUS");
    topArticles.forEach((art, i) => row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  /  " + fmtN(art.qte) + " u.", ACC));
  }

  doc.moveDown(0.8);
  const benY = doc.y;
  const benColor = benefice >= 0 ? "#10B981" : "#EF4444";
  doc.moveTo(M, benY).lineTo(M + INN, benY).lineWidth(1).strokeColor(LITE).stroke();
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("BENEFICE NET DE LA PERIODE", M, benY + 8);
  doc.fontSize(22).fillColor(benColor).font("Helvetica-Bold").text(money(benefice), M, benY + 20);
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("CA : " + money(v.ca_total) + "   -   Depenses : " + money(a.total_achats), M, benY + 47);
  doc.moveTo(M, benY + 58).lineTo(M + INN, benY + 58).lineWidth(0.5).strokeColor(LITE).stroke();

  const footerY = doc.page.maxY() - 15;
  doc.fillColor(SUB).fontSize(7).font("Helvetica")
     .text("Document genere automatiquement par WariGest - Logiciel de gestion & facturation", M, footerY, { width: INN, align: "center" });
}

// ─── 2. Moderne ─────────────────────────────────────────────────────────────
function moderne(doc, ctx) {
  const { v, a, f, benefice, topArticles, cfg, money, fmtN, debutStr, finStr, genStr, logoBuf, pal, PW, M, INN } = ctx;
  const ACC = pal.primary, INK = "#1F2937", SUB = "#9CA3AF", LINE = "#E5E7EB";
  const hr = (y, w, c) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(c).stroke();

  doc.rect(0, 0, PW, 4).fill(ACC);

  let nameX = M;
  if (logoBuf) {
    try { doc.image(logoBuf, M, 44, { fit: [30, 30] }); nameX = M + 40; } catch (e) { /* ignoré */ }
  }
  doc.fontSize(8).fillColor(SUB).font("Helvetica-Bold").text((cfg.nom || "").toUpperCase(), nameX, 50, { characterSpacing: 1.5 });
  doc.fontSize(30).fillColor(INK).font("Helvetica").text("Rapport financier", M, 70);

  doc.fontSize(8.5).fillColor(SUB).font("Helvetica")
     .text(`${debutStr} - ${finStr}`, PW - M - 180, 50, { width: 180, align: "right" })
     .text("Genere le " + genStr, PW - M - 180, 62, { width: 180, align: "right" });

  let y = 110;
  hr(y, 0.5, LINE);
  y += 18;

  const kpis = [
    { label: "Chiffre d'affaires", value: money(v.ca_total) },
    { label: "Depenses",           value: money(a.total_achats) },
    { label: "Benefice net",       value: money(benefice), color: benefice >= 0 ? "#10B981" : "#EF4444" },
    { label: "Factures emises",    value: fmtN(f.nb_total) },
  ];
  const kw = INN / 4;
  kpis.forEach((k, i) => {
    const kx = M + i * kw;
    doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text(k.label.toUpperCase(), kx, y, { width: kw - 10, characterSpacing: 0.5 });
    doc.fontSize(15).fillColor(k.color || INK).font("Helvetica-Bold").text(k.value, kx, y + 12, { width: kw - 10 });
  });
  y += 44;
  hr(y, 1.2, ACC);
  y += 18;
  doc.y = y;

  const section = (title) => {
    const sy = doc.y;
    doc.fontSize(9).fillColor(INK).font("Helvetica").text(title, M, sy, { characterSpacing: 1.5 });
    doc.y = sy + 20;
  };
  const row = (label, value, color) => {
    const ry = doc.y;
    doc.fontSize(9).fillColor(SUB).font("Helvetica").text(label, M, ry);
    doc.fillColor(color || INK).font("Helvetica-Bold").text(value, M, ry, { width: INN, align: "right" });
    doc.y = ry + 17;
    hr(doc.y - 6, 0.5, LINE);
  };

  section("VENTES");
  row("Chiffre d'affaires", money(v.ca_total));
  row("Nombre de factures", fmtN(v.nb_factures));
  row("Quantites vendues",  fmtN(v.qte_totale) + " unites");
  doc.moveDown(0.6);

  section("APPROVISIONNEMENTS");
  row("Nombre d'achats",     fmtN(a.nb_achats));
  row("Total depenses",      money(a.total_achats), "#EF4444");
  row("Montant paye",        money(a.total_paye), "#10B981");
  row("Dettes fournisseurs", money(a.total_dettes), parseInt(a.total_dettes) > 0 ? "#EF4444" : SUB);
  doc.moveDown(0.6);

  section("RECOUVREMENT FACTURES");
  row("Total facture",      money(f.montant_total));
  row("Montant encaisse",   money(f.montant_encaisse), "#10B981");
  row("Creances restantes", money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#EF4444" : SUB);
  row("Factures reglees",   fmtN(f.nb_reglees), "#10B981");
  row("Factures impayees",  fmtN(f.nb_impayees), parseInt(f.nb_impayees) > 0 ? "#EF4444" : SUB);

  if (topArticles.length > 0) {
    doc.moveDown(0.6);
    section("TOP 5 ARTICLES VENDUS");
    topArticles.forEach((art, i) => row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  /  " + fmtN(art.qte) + " u."));
  }

  const footerY = doc.page.maxY() - 15;
  doc.fillColor(SUB).fontSize(7).font("Helvetica")
     .text("Document genere automatiquement par WariGest", M, footerY, { width: INN, align: "center" });
}

// ─── 3. Bloc Couleur ────────────────────────────────────────────────────────
function bloc(doc, ctx) {
  const { v, a, f, benefice, topArticles, cfg, money, fmtN, debutStr, finStr, genStr, logoBuf, pal, PW, M, INN } = ctx;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", TINT = pal.light;
  const hr = (y, w, c) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(c).stroke();

  const bandH = 90;
  doc.rect(0, 0, PW, bandH).fill(ACC);

  let nameX = M;
  if (logoBuf) {
    try {
      doc.roundedRect(M, 22, 44, 44, 6).fill("#FFFFFF");
      doc.image(logoBuf, M + 4, 26, { fit: [36, 36] });
      nameX = M + 54;
    } catch (e) { /* ignoré */ }
  }
  doc.fontSize(14).fillColor("#FFFFFF").font("Helvetica-Bold").text(cfg.nom, nameX, 26, { width: 220 });
  doc.fontSize(8).fillColor("#FFFFFF").opacity(0.85).font("Helvetica")
     .text((cfg.adresse || "") + (cfg.telephone ? (cfg.adresse ? "  ·  " : "") + cfg.telephone : ""), nameX, 44, { width: 220 });
  doc.opacity(1);

  doc.fontSize(20).fillColor("#FFFFFF").font("Helvetica-Bold").text("RAPPORT FINANCIER", PW - M - 230, 24, { width: 230, align: "right" });
  doc.fontSize(8.5).fillColor("#FFFFFF").font("Helvetica-Bold").text(`${debutStr} - ${finStr}`, PW - M - 230, 50, { width: 230, align: "right" });
  doc.opacity(0.85).fontSize(7.5).fillColor("#FFFFFF").font("Helvetica").text("Genere le " + genStr, PW - M - 230, 64, { width: 230, align: "right" });
  doc.opacity(1);

  let y = bandH + 18;

  const kpiW = 116, kpiH = 58, kpiGap = Math.floor((INN - kpiW * 4) / 3);
  const kpis = [
    { label: "Chiffre d'Affaires", value: money(v.ca_total),     color: ACC },
    { label: "Total Depenses",     value: money(a.total_achats), color: "#EF4444" },
    { label: "Benefice Net",       value: money(benefice),       color: benefice >= 0 ? "#10B981" : "#EF4444" },
    { label: "Factures Emises",    value: fmtN(f.nb_total),      color: "#3B82F6" },
  ];
  kpis.forEach((k, i) => {
    const kx = M + i * (kpiW + kpiGap);
    doc.roundedRect(kx, y, kpiW, kpiH, 6).fill(TINT);
    doc.fillColor(k.color).fontSize(12).font("Helvetica-Bold").text(k.value, kx + 4, y + 12, { width: kpiW - 8, align: "center" });
    doc.fillColor(SUB).fontSize(7).font("Helvetica").text(k.label, kx + 4, y + 38, { width: kpiW - 8, align: "center" });
  });
  y += kpiH + 22;
  doc.y = y;

  const section = (title) => {
    const sy = doc.y;
    doc.rect(M, sy, INN, 20).fill(ACC);
    doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold").text(title, M + 8, sy + 6);
    doc.y = sy + 28;
  };
  const row = (label, value, color, alt) => {
    const ry = doc.y;
    if (alt) doc.rect(M, ry - 2, INN, 17).fill(TINT);
    doc.fontSize(8.5).fillColor(SUB).font("Helvetica").text(label, M + 6, ry);
    doc.fillColor(color || INK).font("Helvetica-Bold").text(value, M, ry, { width: INN - 6, align: "right" });
    doc.y = ry + 17;
  };

  section("VENTES");
  row("Chiffre d'affaires", money(v.ca_total), ACC, true);
  row("Nombre de factures", fmtN(v.nb_factures), null, false);
  row("Quantites vendues",  fmtN(v.qte_totale) + " unites", null, true);

  doc.moveDown(0.6);
  section("APPROVISIONNEMENTS");
  row("Nombre d'achats",     fmtN(a.nb_achats), null, true);
  row("Total depenses",      money(a.total_achats), "#EF4444", false);
  row("Montant paye",        money(a.total_paye), "#10B981", true);
  row("Dettes fournisseurs", money(a.total_dettes), parseInt(a.total_dettes) > 0 ? "#EF4444" : SUB, false);

  doc.moveDown(0.6);
  section("RECOUVREMENT FACTURES");
  row("Total facture",      money(f.montant_total), null, true);
  row("Montant encaisse",   money(f.montant_encaisse), "#10B981", false);
  row("Creances restantes", money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#EF4444" : SUB, true);
  row("Factures reglees",   fmtN(f.nb_reglees), "#10B981", false);
  row("Factures impayees",  fmtN(f.nb_impayees), parseInt(f.nb_impayees) > 0 ? "#EF4444" : SUB, true);

  if (topArticles.length > 0) {
    doc.moveDown(0.6);
    section("TOP 5 ARTICLES VENDUS");
    topArticles.forEach((art, i) => row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  /  " + fmtN(art.qte) + " u.", ACC, i % 2 === 0));
  }

  doc.moveDown(0.8);
  const benY = doc.y;
  const benColor = benefice >= 0 ? "#10B981" : "#EF4444";
  doc.roundedRect(M, benY, INN, 60, 6).fillAndStroke(TINT, ACC);
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("BENEFICE NET DE LA PERIODE", M + 12, benY + 10);
  doc.fontSize(22).fillColor(benColor).font("Helvetica-Bold").text(money(benefice), M + 12, benY + 22);
  doc.fontSize(7.5).fillColor(SUB).font("Helvetica").text("CA : " + money(v.ca_total) + "   -   Depenses : " + money(a.total_achats), M + 12, benY + 46);

  const footerY = doc.page.maxY() - 15;
  doc.fillColor(SUB).fontSize(7).font("Helvetica")
     .text("Document genere automatiquement par WariGest - Logiciel de gestion & facturation", M, footerY, { width: INN, align: "center" });
}

// ─── 4. Élégant ─────────────────────────────────────────────────────────────
function elegant(doc, ctx) {
  const { v, a, f, benefice, topArticles, cfg, money, fmtN, debutStr, finStr, genStr, logoBuf, pal, PW, M, INN } = ctx;
  const ACC = pal.primary, INK = "#1F2937", SUB = "#6B7280", LINE = "#E5E7EB";
  const hr = (y, w, c) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(c).stroke();

  let y = 40;
  if (logoBuf) {
    try { doc.image(logoBuf, (PW - 38) / 2, y, { fit: [38, 38] }); y += 46; } catch (e) { /* ignoré */ }
  }
  doc.fontSize(17).fillColor(INK).font("Times-Bold").text(cfg.nom, M, y, { width: INN, align: "center" });
  y += 20;
  const infoParts = [cfg.adresse, cfg.telephone && ("Tel : " + cfg.telephone)].filter(Boolean);
  if (infoParts.length) { doc.fontSize(8.5).fillColor(SUB).font("Times-Roman").text(infoParts.join("   -   "), M, y, { width: INN, align: "center" }); y += 14; }

  y += 6; hr(y, 0.6, ACC); hr(y + 2, 0.6, ACC); y += 16;

  doc.fontSize(18).fillColor(INK).font("Times-Bold").text("R A P P O R T   F I N A N C I E R", M, y, { width: INN, align: "center", characterSpacing: 1.5 });
  y += 22;
  doc.fontSize(9).fillColor(SUB).font("Times-Italic").text(`${debutStr}  -  ${finStr}   (genere le ${genStr})`, M, y, { width: INN, align: "center" });
  y += 26;

  const kpis = [
    { label: "Chiffre d'affaires", value: money(v.ca_total) },
    { label: "Depenses",           value: money(a.total_achats) },
    { label: "Benefice net",       value: money(benefice), color: benefice >= 0 ? "#15803D" : "#B91C1C" },
    { label: "Factures",           value: fmtN(f.nb_total) },
  ];
  const kw = INN / 4;
  kpis.forEach((k, i) => {
    const kx = M + i * kw;
    if (i > 0) doc.moveTo(kx, y).lineTo(kx, y + 38).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.fontSize(13).fillColor(k.color || ACC).font("Times-Bold").text(k.value, kx, y + 4, { width: kw, align: "center" });
    doc.fontSize(7.5).fillColor(SUB).font("Times-Italic").text(k.label, kx, y + 22, { width: kw, align: "center" });
  });
  y += 50;
  hr(y, 0.4, LINE); y += 18;
  doc.y = y;

  const section = (title) => {
    const sy = doc.y;
    doc.fontSize(11).fillColor(INK).font("Times-Bold").text(title, M, sy, { width: INN, align: "center" });
    doc.y = sy + 16;
    hr(doc.y, 0.4, LINE); hr(doc.y + 2, 0.4, LINE);
    doc.y += 10;
  };
  const row = (label, value, color) => {
    const ry = doc.y;
    doc.fontSize(9).fillColor(SUB).font("Times-Italic").text(label, M, ry);
    doc.fillColor(color || INK).font("Times-Bold").text(value, M, ry, { width: INN, align: "right" });
    doc.y = ry + 16;
  };

  section("Ventes");
  row("Chiffre d'affaires", money(v.ca_total), ACC);
  row("Nombre de factures", fmtN(v.nb_factures));
  row("Quantites vendues",  fmtN(v.qte_totale) + " unites");
  doc.moveDown(0.5);

  section("Approvisionnements");
  row("Nombre d'achats",     fmtN(a.nb_achats));
  row("Total depenses",      money(a.total_achats), "#B91C1C");
  row("Montant paye",        money(a.total_paye), "#15803D");
  row("Dettes fournisseurs", money(a.total_dettes), parseInt(a.total_dettes) > 0 ? "#B91C1C" : SUB);
  doc.moveDown(0.5);

  section("Recouvrement des factures");
  row("Total facture",      money(f.montant_total));
  row("Montant encaisse",   money(f.montant_encaisse), "#15803D");
  row("Creances restantes", money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#B91C1C" : SUB);
  row("Factures reglees",   fmtN(f.nb_reglees), "#15803D");
  row("Factures impayees",  fmtN(f.nb_impayees), parseInt(f.nb_impayees) > 0 ? "#B91C1C" : SUB);

  if (topArticles.length > 0) {
    doc.moveDown(0.5);
    section("Top 5 articles vendus");
    topArticles.forEach((art, i) => row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  /  " + fmtN(art.qte) + " u.", ACC));
  }

  doc.moveDown(1);
  const benY = doc.y;
  hr(benY, 0.6, ACC); hr(benY + 2, 0.6, ACC);
  const benColor = benefice >= 0 ? "#15803D" : "#B91C1C";
  doc.fontSize(8.5).fillColor(SUB).font("Times-Italic").text("Benefice net de la periode", M, benY + 12, { width: INN, align: "center" });
  doc.fontSize(20).fillColor(benColor).font("Times-Bold").text(money(benefice), M, benY + 26, { width: INN, align: "center" });

  const footerY = doc.page.maxY() - 15;
  doc.fillColor(SUB).fontSize(7.5).font("Times-Italic")
     .text("Document genere automatiquement par WariGest", M, footerY, { width: INN, align: "center" });
}

// ─── 5. Compact ─────────────────────────────────────────────────────────────
function compact(doc, ctx) {
  const { v, a, f, benefice, topArticles, cfg, money, fmtN, debutStr, finStr, genStr, logoBuf, pal, PW } = ctx;
  const M = 30, INN = PW - M * 2;
  const ACC = pal.primary, INK = "#111827", SUB = "#6B7280", LINE = "#E5E7EB";
  const hr = (y, w, c) => doc.moveTo(M, y).lineTo(M + INN, y).lineWidth(w).strokeColor(c).stroke();

  let nameX = M, nameW = 300;
  if (logoBuf) {
    try { doc.image(logoBuf, M, 22, { fit: [28, 28] }); nameX = M + 34; nameW = 266; } catch (e) { /* ignoré */ }
  }
  doc.fontSize(11).fillColor(INK).font("Helvetica-Bold").text(cfg.nom, nameX, 22, { width: nameW });
  doc.fontSize(7).fillColor(SUB).font("Helvetica")
     .text((cfg.adresse || "") + (cfg.telephone ? (cfg.adresse ? "  |  " : "") + cfg.telephone : ""), nameX, 35, { width: nameW });

  doc.fontSize(13).fillColor(ACC).font("Helvetica-Bold").text("RAPPORT FINANCIER", PW - M - 220, 22, { width: 220, align: "right" });
  doc.fontSize(7.5).fillColor(INK).font("Helvetica-Bold").text(`${debutStr} - ${finStr}`, PW - M - 220, 36, { width: 220, align: "right" });
  doc.fontSize(6.5).fillColor(SUB).font("Helvetica").text("Genere le " + genStr, PW - M - 220, 47, { width: 220, align: "right" });

  let y = 56;
  hr(y, 1, ACC); y += 8;

  // Ligne de KPI compacts
  const kpis = [
    { label: "CA",        value: money(v.ca_total) },
    { label: "Depenses",  value: money(a.total_achats) },
    { label: "Benefice",  value: money(benefice), color: benefice >= 0 ? "#10B981" : "#EF4444" },
    { label: "Factures",  value: fmtN(f.nb_total) },
  ];
  const kw = INN / 4;
  kpis.forEach((k, i) => {
    const kx = M + i * kw;
    doc.fontSize(6.5).fillColor(SUB).font("Helvetica-Bold").text(k.label.toUpperCase(), kx, y, { width: kw - 6 });
    doc.fontSize(11).fillColor(k.color || INK).font("Helvetica-Bold").text(k.value, kx, y + 9, { width: kw - 6 });
  });
  y += 28;
  hr(y, 0.5, LINE); y += 8;
  doc.y = y;

  const section = (title) => {
    const sy = doc.y;
    doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica-Bold");
    doc.rect(M, sy, INN, 14).fill(ACC);
    doc.fillColor("#FFFFFF").text(title, M + 6, sy + 3.5);
    doc.y = sy + 18;
  };
  const row = (label, value, color) => {
    const ry = doc.y;
    doc.fontSize(8).fillColor(SUB).font("Helvetica").text(label, M + 4, ry);
    doc.fillColor(color || INK).font("Helvetica-Bold").text(value, M, ry, { width: INN - 4, align: "right" });
    doc.y = ry + 12;
    hr(doc.y - 2, 0.3, LINE);
  };

  section("VENTES");
  row("Chiffre d'affaires", money(v.ca_total), ACC);
  row("Nombre de factures", fmtN(v.nb_factures));
  row("Quantites vendues",  fmtN(v.qte_totale) + " unites");

  section("APPROVISIONNEMENTS");
  row("Nombre d'achats",     fmtN(a.nb_achats));
  row("Total depenses",      money(a.total_achats), "#EF4444");
  row("Montant paye",        money(a.total_paye), "#10B981");
  row("Dettes fournisseurs", money(a.total_dettes), parseInt(a.total_dettes) > 0 ? "#EF4444" : SUB);

  section("RECOUVREMENT FACTURES");
  row("Total facture",      money(f.montant_total));
  row("Montant encaisse",   money(f.montant_encaisse), "#10B981");
  row("Creances restantes", money(f.montant_creances), parseInt(f.montant_creances) > 0 ? "#EF4444" : SUB);
  row("Factures reglees",   fmtN(f.nb_reglees), "#10B981");
  row("Factures impayees",  fmtN(f.nb_impayees), parseInt(f.nb_impayees) > 0 ? "#EF4444" : SUB);

  if (topArticles.length > 0) {
    section("TOP 5 ARTICLES VENDUS");
    topArticles.forEach((art, i) => row(`${i + 1}. ${art.libelle}`, money(art.ca) + "  /  " + fmtN(art.qte) + " u.", ACC));
  }

  doc.moveDown(0.6);
  const benY = doc.y;
  const benColor = benefice >= 0 ? "#10B981" : "#EF4444";
  hr(benY, 0.8, INK);
  doc.fontSize(7).fillColor(SUB).font("Helvetica").text("BENEFICE NET DE LA PERIODE", M, benY + 6);
  doc.fontSize(15).fillColor(benColor).font("Helvetica-Bold").text(money(benefice), M, benY + 16, { width: INN, align: "right" });

  const footerY = doc.page.maxY() - 14;
  doc.fillColor(SUB).fontSize(6.5).font("Helvetica")
     .text("Document genere automatiquement par WariGest - Logiciel de gestion & facturation", M, footerY, { width: INN, align: "center" });
}

module.exports = { classic, moderne, bloc, elegant, compact };
