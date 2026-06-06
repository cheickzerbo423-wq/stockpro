// src/controllers/achatsController.js
// Équivalent Excel : feuille Donnees_Achat
const db = require("../config/db");
const Tesseract = require("tesseract.js");

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

/* ─── Scan de facture fournisseur (OCR) ───────────────────────────
   But : le fournisseur tend une facture papier → on la prend en photo →
   l'app lit le texte (Tesseract OCR, gratuit) et PROPOSE un remplissage
   du formulaire d'approvisionnement (fournisseur, date, articles, prix).
   L'OCR n'étant jamais sûr à 100 %, le résultat est une suggestion que
   l'utilisateur vérifie/corrige avant d'enregistrer — rien n'est écrit
   en base directement par cette route. ────────────────────────────── */

const MOIS_NOMS = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11,
  décembre: 12, decembre: 12,
};

// Convertit un nombre écrit en texte (séparateurs de milliers en espace,
// point ou virgule, éventuel suffixe "FCFA"/"CFA") en valeur numérique.
// Ex : "12 500 FCFA" / "12.500" / "12,500" → 12500
function toNumber(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  s = s.replace(/FCFA|CFA|XOF|F\.?$/gi, "").trim();
  s = s.replace(/\s+/g, "");
  s = s.replace(/[.,](\d{3})(?=\D|$)/g, "$1");   // "12.500" → "12500" (séparateur de milliers)
  s = s.replace(",", ".");                        // virgule décimale restante → point
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractNumbers(line) {
  const found = line.match(/\d[\d\s.,]{0,12}\d|\d/g) || [];
  return found.map(toNumber).filter((n) => n !== null);
}

// Analyse heuristique du texte brut OCR : en extrait fournisseur, date,
// montant total et lignes d'articles (libellé + quantité + prix unitaire).
// C'est une PROPOSITION best-effort, pas une lecture garantie.
function parseFacture(texte) {
  const lines = texte
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  /* — Date (JJ/MM/AAAA ou "6 juin 2026") — */
  let date_achat = null;
  const dmy = texte.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (dmy) {
    date_achat = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  } else {
    const dm = texte.match(/\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b/i);
    if (dm) {
      const mo = MOIS_NOMS[dm[2].toLowerCase()];
      if (mo) date_achat = `${dm[3]}-${String(mo).padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    }
  }

  /* — Nom du fournisseur — */
  let fournisseur_nom = null;
  const fournRe = /(fournisseur|vendeur|exp[ée]diteur|[ée]mis par|soci[ée]t[ée]|entreprise|raison sociale|de\s*:)\s*[:\-]?\s*(.{2,})/i;
  for (const line of lines) {
    const m = line.match(fournRe);
    if (m && m[2]?.trim().length > 1) { fournisseur_nom = m[2].trim(); break; }
  }
  if (!fournisseur_nom) {
    // À défaut : la première ligne "solide" (souvent l'en-tête / nom de l'entreprise)
    for (const line of lines.slice(0, 6)) {
      if (line.length >= 3 && line.length <= 60 &&
          !/^(facture|invoice|re[çc]u|bon de|devis|n[°o]|r[ée]f|date|t[ée]l|email|adresse|fcfa|cfa)/i.test(line) &&
          /[a-zA-ZÀ-ÿ]{3,}/.test(line)) {
        const cleaned = line.replace(/[^\p{L}\p{N}\s'&.,-]/gu, "").trim();
        if (cleaned.length >= 3) { fournisseur_nom = cleaned; break; }
      }
    }
  }

  /* — Montant total — */
  let montant_total_detecte = null;
  const totalRe = /(total\s*(g[ée]n[ée]ral|ttc|net)?|montant\s*(total|net|[àa]\s*payer|d[ûu])?|net\s*[àa]\s*payer|somme\s*due)\s*[:\-]?\s*([\d\s.,]{2,})/i;
  for (const line of lines) {
    const m = line.match(totalRe);
    if (m && m[4]) {
      const n = toNumber(m[4]);
      if (n) { montant_total_detecte = Math.round(n); break; }
    }
  }

  /* — Lignes d'articles : "<désignation> <quantité> <prix> [total]" — */
  const lignes = [];
  const skipRe = /^(total|sous[\s-]?total|montant|net\s|tva|remise|date|facture|n[°o]|r[ée]f|adresse|t[ée]l|email|merci|signature|cachet)/i;
  for (const line of lines) {
    if (skipRe.test(line)) continue;
    const nums = extractNumbers(line);
    if (nums.length < 2) continue;

    const firstDigit = line.search(/\d/);
    const libelle = (firstDigit > 1 ? line.slice(0, firstDigit) : line)
      .replace(/[-:|.\s]+$/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (libelle.length < 2 || /^\d+$/.test(libelle)) continue;

    let quantite = null, prix_achat = null;

    if (nums.length >= 3) {
      // Cherche un trio où qté × prix ≈ total parmi les nombres trouvés
      let trouve = false;
      for (let i = 0; i < nums.length && !trouve; i++) {
        for (let j = 0; j < nums.length && !trouve; j++) {
          if (i === j) continue;
          for (let k = 0; k < nums.length && !trouve; k++) {
            if (k === i || k === j) continue;
            if (Math.abs(nums[i] * nums[j] - nums[k]) <= Math.max(1, nums[k] * 0.02)) {
              quantite = nums[i]; prix_achat = nums[j]; trouve = true;
            }
          }
        }
      }
      if (!trouve) { quantite = nums[0]; prix_achat = nums[1]; }
    } else if (Number.isInteger(nums[0]) && nums[0] < 1000 && nums[0] < nums[1]) {
      quantite = nums[0]; prix_achat = nums[1];
    } else {
      quantite = 1; prix_achat = nums[0];
    }

    if (quantite && prix_achat) {
      lignes.push({
        libelle,
        quantite: Math.max(1, Math.round(quantite)),
        prix_achat: Math.round(prix_achat),
      });
    }
    if (lignes.length >= 25) break;
  }

  return { fournisseur_nom, date_achat, montant_total_detecte, lignes };
}

// POST /api/achats/scanner-facture — Lit la photo d'une facture fournisseur (OCR)
// et propose un remplissage du formulaire d'approvisionnement à vérifier.
// Body : { image: "data:image/jpeg;base64,...." }
// ⚠️ N'écrit RIEN en base — renvoie juste une proposition pour pré-remplissage.
async function scanFacture(req, res) {
  try {
    const { image } = req.body;
    if (!image || typeof image !== "string")
      return res.status(400).json({ message: "Aucune image reçue." });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    let buffer;
    try { buffer = Buffer.from(base64, "base64"); }
    catch { return res.status(400).json({ message: "Image invalide." }); }

    if (!buffer.length) return res.status(400).json({ message: "Image vide." });
    if (buffer.length > 10 * 1024 * 1024)
      return res.status(400).json({ message: "Image trop volumineuse (max 10 Mo)." });

    const { data } = await Tesseract.recognize(buffer, "fra");
    const texte = (data?.text || "").trim();

    if (!texte)
      return res.status(422).json({ message: "Aucun texte détecté sur cette image. Reprenez la photo avec un meilleur éclairage et un cadrage bien net sur le texte." });

    const analyse = parseFacture(texte);

    res.json({
      message: analyse.lignes.length > 0
        ? `${analyse.lignes.length} ligne(s) détectée(s) — vérifiez et corrigez avant d'enregistrer.`
        : "Texte lu, mais aucune ligne d'article identifiée automatiquement — complétez le formulaire manuellement.",
      texte_brut: texte,
      ...analyse,
    });
  } catch (err) {
    console.error("Erreur scan facture (OCR) :", err);
    res.status(500).json({ message: "Impossible d'analyser cette image. Réessayez avec une photo plus nette et bien éclairée." });
  }
}

// GET /api/achats
async function getAll(req, res) {
  try {
    const { fournisseur, article, mois, annee } = req.query;
    let q = `
      SELECT *,
        (montant_total - montant_paye)          AS reste,
        (montant_paye >= montant_total)          AS statut
      FROM achats WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (fournisseur) { q += ` AND fournisseur_nom ILIKE $${idx++}`; params.push(`%${fournisseur}%`); }
    if (article)     { q += ` AND article_code = $${idx++}`;        params.push(article); }
    if (mois)        { q += ` AND mois = $${idx++}`;                params.push(mois); }
    if (annee)       { q += ` AND annee = $${idx++}`;               params.push(annee); }
    q += ` ORDER BY date_achat ASC, id ASC`;
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des achats." });
  }
}

// POST /api/achats — Enregistrer un approvisionnement
async function create(req, res) {
  try {
    const { article_code, fournisseur_id, fournisseur_nom, prix_achat, quantite, date_achat } = req.body;

    if (!article_code || !quantite || !prix_achat)
      return res.status(400).json({ message: "Article, quantité et prix d'achat sont obligatoires." });

    // Vérifier que l'article existe
    const art = await db.query(`SELECT libelle FROM articles WHERE code = $1 AND actif = TRUE`, [article_code]);
    if (!art.rows[0])
      return res.status(404).json({ message: "Article introuvable." });

    const date  = date_achat || new Date().toISOString().split("T")[0];
    const mois  = MOIS[new Date(date).getMonth()];
    const annee = new Date(date).getFullYear();

    const prixNum = parseInt(prix_achat, 10);
    const qteNum  = parseInt(quantite, 10);
    if (!Number.isFinite(prixNum) || !Number.isFinite(qteNum) || prixNum <= 0 || qteNum <= 0)
      return res.status(400).json({ message: "Quantité ou prix d'achat invalide. Saisissez des nombres positifs." });

    const montantTotal = prixNum * qteNum;
    // La colonne montant_total (générée) est de type entier : au-delà d'environ
    // 2,1 milliards, Postgres renvoie une erreur "out of range" peu compréhensible.
    // On bloque ici avec un message clair plutôt que de laisser planter l'insertion.
    if (montantTotal > 2_000_000_000)
      return res.status(400).json({ message: "Le montant total (quantité × prix) est trop élevé pour être enregistré. Vérifiez la quantité et le prix saisis pour cet article." });

    const montantPaye  = req.body.montant_paye !== undefined
      ? Math.min(parseFloat(req.body.montant_paye), montantTotal)
      : montantTotal;

    const result = await db.query(
      `INSERT INTO achats (article_code, libelle, fournisseur_id, fournisseur_nom, prix_achat, quantite, date_achat, user_id, montant_paye)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [article_code, art.rows[0].libelle, fournisseur_id || null, fournisseur_nom || "", prixNum, qteNum, date, req.user?.id || null, montantPaye]
    );

    // Retourner aussi le stock mis à jour
    const stockMaj = await db.query(`SELECT stock_restant, statut FROM vue_stock WHERE code = $1`, [article_code]);

    res.status(201).json({
      message: "Approvisionnement enregistré. Stock mis à jour.",
      achat: result.rows[0],
      nouveau_stock: stockMaj.rows[0]?.stock_restant,
      statut_stock:  stockMaj.rows[0]?.statut,
    });
  } catch (err) {
    // On journalise le détail Postgres (code + message + detail) pour pouvoir
    // diagnostiquer précisément côté logs Railway, et on traduit les causes les
    // plus courantes en message clair pour l'utilisateur (au lieu d'un message
    // générique qui ne dit pas quoi corriger).
    console.error("Erreur enregistrement achat :", err.code, err.message, err.detail || "");
    const messagesParCode = {
      "22003": "La quantité ou le prix saisi est trop élevé (le total dépasse la limite acceptée). Vérifiez ces deux valeurs pour cet article.",
      "22001": "Le nom de l'article ou du fournisseur est trop long pour être enregistré tel quel. Raccourcissez-le.",
      "22P02": "La quantité, le prix ou la date saisi est dans un format invalide.",
      "23502": "Une information obligatoire est manquante (fournisseur, date, quantité ou prix).",
      "23503": "Le fournisseur sélectionné est introuvable en base. Resélectionnez-le dans la liste ou recréez-le.",
      "23505": "Cet approvisionnement semble déjà enregistré (doublon détecté).",
      "23514": "Une valeur saisie ne respecte pas une règle de validation de la base (quantité, prix ou montant). Vérifiez ces valeurs.",
    };
    // Si le code Postgres n'est pas dans notre liste, on l'affiche quand même
    // (entre parenthèses) : ça permet de voir immédiatement la cause exacte
    // sans devoir consulter les logs serveur, et de l'ajouter ensuite à la liste.
    const message = messagesParCode[err.code]
      || `Erreur lors de l'enregistrement de l'achat${err.code ? ` (code base de données : ${err.code} — ${err.message || ""})` : ""}.`;
    res.status(500).json({ message });
  }
}

// DELETE /api/achats/:id
async function remove(req, res) {
  try {
    const result = await db.query(
      `DELETE FROM achats WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ message: "Achat introuvable." });
    res.json({ message: "Achat supprimé." });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
}

// PUT /api/achats/:id/paiement
async function updatePaiement(req, res) {
  try {
    const { id } = req.params;
    const { montant_paye } = req.body;
    if (montant_paye === undefined || isNaN(parseFloat(montant_paye)))
      return res.status(400).json({ message: "Montant payé invalide." });

    const achat = await db.query(`SELECT montant_total, montant_paye FROM achats WHERE id = $1`, [id]);
    if (!achat.rows[0]) return res.status(404).json({ message: "Achat introuvable." });
    if (parseFloat(montant_paye) > parseFloat(achat.rows[0].montant_total))
      return res.status(400).json({ message: "Le montant payé dépasse le montant total." });
    if (parseFloat(montant_paye) < parseFloat(achat.rows[0].montant_paye))
      return res.status(400).json({ message: "Le montant payé ne peut pas diminuer." });

    const result = await db.query(
      `UPDATE achats SET montant_paye = $1 WHERE id = $2
       RETURNING *, (montant_total - montant_paye) AS reste, (montant_paye >= montant_total) AS statut`,
      [parseFloat(montant_paye), id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Achat introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour du paiement." });
  }
}

module.exports = { getAll, create, remove, updatePaiement, scanFacture };
