// src/controllers/ventesController.js
// Équivalent Excel : VenteMultiple + Donnees_vente
const db = require("../config/db");

// Génère un numéro de facture séquentiel PAR ENTREPRISE : FACT-2026-0001
// Unicité garantie par entreprise grâce à la PK composite (code, entreprise_id).
//
// Atomicité : deux ventes concurrentes pourraient lire le même COUNT(*) et
// générer le même code (doublon). On acquiert d'abord un verrou consultatif
// Postgres (pg_advisory_xact_lock), propre à la combinaison entreprise+année,
// qui sérialise la génération du numéro pour tous les appels concurrents —
// le verrou est automatiquement libéré à la fin de la transaction (COMMIT
// ou ROLLBACK), donc aucun nettoyage manuel n'est nécessaire.
async function genFactureCode(dbClient, date, entId) {
  const annee = new Date(date).getFullYear();
  await dbClient.query(
    `SELECT pg_advisory_xact_lock(hashtext('facture_code_' || $1::text || '_' || $2::text))`,
    [entId === null || entId === undefined ? "null" : entId, annee]
  );
  const result = await dbClient.query(
    `SELECT COUNT(*) AS nb FROM factures WHERE EXTRACT(YEAR FROM date_facture) = $1 AND entreprise_id = $2`,
    [annee, entId]
  );
  const next = parseInt(result.rows[0].nb) + 1;
  return `FACT-${annee}-${String(next).padStart(4, "0")}`;
}

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// GET /api/ventes — Historique des ventes (paginé côté serveur)
// Réponse : { data, total, page, limit, totalPages, kpis }
// kpis est calculé sur l'ENSEMBLE des lignes filtrées (pas seulement la page
// courante) afin que les cartes de synthèse (CA, clients, panier moyen)
// restent exactes quelle que soit la page affichée.
async function getAll(req, res) {
  try {
    const { client, mois, annee, facture, q: search } = req.query;
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const offset = (page - 1) * limit;

    let where = ` WHERE lv.entreprise_id = $1`;
    const params = [req.user.entreprise_id];
    let idx = 2;
    if (client)  { where += ` AND f.client_nom ILIKE $${idx++}`; params.push(`%${client}%`); }
    if (mois)    { where += ` AND lv.mois = $${idx++}`;          params.push(mois); }
    if (annee)   { where += ` AND lv.annee = $${idx++}`;         params.push(annee); }
    if (facture) { where += ` AND lv.facture_code = $${idx++}`;  params.push(facture); }
    if (search)  {
      where += ` AND (lv.libelle ILIKE $${idx} OR f.client_nom ILIKE $${idx} OR lv.facture_code ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const fromClause = `FROM lignes_vente lv
      JOIN factures f ON f.code = lv.facture_code AND f.entreprise_id = lv.entreprise_id`;

    const [dataResult, countResult, aggResult] = await Promise.all([
      db.query(
        `SELECT lv.*, f.client_nom, f.date_facture, f.montant AS facture_montant,
                f.montant_paye, f.reste, f.statut AS facture_statut
         ${fromClause}
         ${where}
         ORDER BY lv.date_vente ASC, lv.id ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total ${fromClause} ${where}`, params),
      db.query(
        `SELECT COALESCE(SUM(lv.montant_total), 0) AS total_ca,
                COUNT(DISTINCT f.client_nom)        AS nb_clients,
                COUNT(DISTINCT lv.facture_code)     AS nb_factures
         ${fromClause} ${where}`,
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
        nb_clients:  parseInt(aggResult.rows[0].nb_clients),
        nb_factures: parseInt(aggResult.rows[0].nb_factures),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des ventes." });
  }
}

// POST /api/ventes — Nouvelle vente (panier multi-articles)
// Body : { client_id, client_nom, date_vente, montant_paye, articles: [{code, quantite, prix_vente}] }
async function create(req, res) {
  const client = await db.connect();
  try {
    const { client_id, client_nom, date_vente, montant_paye, articles } = req.body;
    const entId = req.user.entreprise_id;

    if (!articles || articles.length === 0)
      return res.status(400).json({ message: "Le panier est vide." });
    if (!client_nom)
      return res.status(400).json({ message: "Client obligatoire." });

    // Validation des articles : code, prix_vente et quantite doivent être
    // des nombres valides et strictement positifs avant tout calcul/insertion
    // (un panier corrompu côté client ne doit jamais produire une facture à
    // 0 FCFA ou avec NaN en base).
    for (const item of articles) {
      if (!item.code)
        return res.status(400).json({ message: "Article invalide : code manquant." });
      const prix = parseFloat(item.prix_vente);
      if (isNaN(prix) || prix <= 0)
        return res.status(400).json({ message: `Prix de vente invalide pour "${item.code}".` });
      const qte = parseInt(item.quantite);
      if (isNaN(qte) || qte <= 0)
        return res.status(400).json({ message: `Quantité invalide pour "${item.code}".` });
      item.prix_vente = prix;
      item.quantite = qte;
    }

    // Validation du montant payé (s'il est fourni)
    let payeInput = null;
    if (montant_paye !== undefined && montant_paye !== null && montant_paye !== "") {
      payeInput = parseFloat(montant_paye);
      if (isNaN(payeInput) || payeInput < 0)
        return res.status(400).json({ message: "Montant payé invalide." });
    }

    await client.query("BEGIN");

    // Validation cross-tenant : si un client_id est fourni, il doit appartenir
    // à l'entreprise courante. Sans cette vérification, un utilisateur pourrait
    // rattacher une facture à un client d'une autre entreprise (fuite de
    // données entre tenants via un identifiant deviné/forgé).
    if (client_id !== undefined && client_id !== null && client_id !== "") {
      const clientCheck = await client.query(
        `SELECT id FROM clients_fournisseurs WHERE id = $1 AND entreprise_id = $2`,
        [client_id, entId]
      );
      if (!clientCheck.rows[0])
        throw new Error("Client introuvable.");
    }

    // Vérification des stocks avant toute transaction (cloisonné par entreprise)
    // — on verrouille la ligne "articles" de chaque produit (FOR UPDATE) pour
    // empêcher deux ventes concurrentes de lire le même stock_restant et de
    // toutes deux le considérer suffisant (survente). La transaction
    // concurrente reste bloquée sur ce verrou jusqu'au COMMIT/ROLLBACK courant.
    for (const item of articles) {
      const lock = await client.query(
        `SELECT code FROM articles WHERE code = $1 AND entreprise_id = $2 FOR UPDATE`,
        [item.code, entId]
      );
      if (!lock.rows[0])
        throw new Error(`Article "${item.code}" introuvable.`);

      const stock = await client.query(
        `SELECT stock_restant FROM vue_stock WHERE code = $1 AND entreprise_id = $2`,
        [item.code, entId]
      );
      if (stock.rows[0].stock_restant < item.quantite)
        throw new Error(`Stock insuffisant pour "${item.code}" : disponible ${stock.rows[0].stock_restant}, demandé ${item.quantite}.`);
    }

    // Calcul du total
    const total   = articles.reduce((s, a) => s + a.prix_vente * a.quantite, 0);
    const paye    = payeInput !== null ? payeInput : total;
    const monnaie = Math.max(0, paye - total);
    const date    = date_vente || new Date().toISOString().split("T")[0];
    const factCode = await genFactureCode(client, date, entId);
    const mois = MOIS[new Date(date).getMonth()];
    const annee = new Date(date).getFullYear();

    // Créer la facture
    // NB : "reste" et "statut" sont des colonnes GENERATED ALWAYS ... STORED en base
    // (calculées automatiquement à partir de montant/montant_paye) — il ne faut
    // jamais leur fournir de valeur explicite (Postgres rejette avec
    // "column ... can only be updated to DEFAULT"). On les omet, la base les calcule.
    const factResult = await client.query(
      `INSERT INTO factures (code, date_facture, montant, montant_paye, monnaie_rendue, client_id, client_nom, user_id, entreprise_id)
       VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric, $6, $7, $8, $9)
       RETURNING *`,
      [factCode, date, parseFloat(total), paye, parseFloat(monnaie), client_id || null, client_nom, req.user?.id || null, entId]
    );

    // Créer les lignes de vente
    const lignes = [];
    for (const item of articles) {
      const art = await client.query(`SELECT libelle, prix_achat FROM articles WHERE code = $1 AND entreprise_id = $2`, [item.code, entId]);
      const ligne = await client.query(
        `INSERT INTO lignes_vente (facture_code, article_code, libelle, prix_vente, prix_achat, quantite, date_vente, mois, client_nom, user_id, entreprise_id)
         VALUES ($1, $2, $3, $4::numeric, $5::numeric, $6::integer, $7, $8, $9, $10::integer, $11)
         RETURNING *`,
        [factCode, item.code, art.rows[0]?.libelle || item.code, parseFloat(item.prix_vente), parseFloat(art.rows[0]?.prix_achat) || 0, parseInt(item.quantite), date, mois, client_nom, req.user?.id ? parseInt(req.user.id) : null, entId]
      );
      lignes.push(ligne.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Vente enregistrée avec succès.",
      facture: factResult.rows[0],
      lignes,
      monnaie_rendue: monnaie,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ message: err.message || "Erreur lors de l'enregistrement de la vente." });
  } finally {
    client.release();
  }
}

// GET /api/ventes/stats — Statistiques pour le tableau de bord
async function stats(req, res) {
  try {
    const { annee } = req.query;
    const yr = annee || new Date().getFullYear();
    const entId = req.user.entreprise_id;

    // CA par mois (cloisonné par entreprise)
    const caMois = await db.query(
      `SELECT mois, annee, SUM(montant_total) AS ca
       FROM lignes_vente
       WHERE annee = $1 AND entreprise_id = $2
       GROUP BY mois, annee, EXTRACT(MONTH FROM date_vente)
       ORDER BY EXTRACT(MONTH FROM date_vente)`,
      [yr, entId]
    );

    // Totaux globaux (cloisonnés par entreprise)
    // NB : "depenses_total" est recalculé dynamiquement (prix_achat * quantite)
    // au lieu de SUM(achats.montant_total) — cette colonne stockée peut être à 0
    // sur d'anciens enregistrements (même bug que celui corrigé dans
    // clientsController.js pour les fournisseurs : cf. commentaire dans
    // achatsController.js getAll). Sans ce correctif, le tableau de bord
    // sous-évaluait le total des dépenses d'achat.
    const totaux = await db.query(
      `SELECT
         SUM(lv.montant_total)                                                              AS ca_total,
         COUNT(DISTINCT lv.facture_code)                                                    AS nb_factures,
         (SELECT SUM(prix_achat * quantite) FROM achats WHERE entreprise_id = $1)           AS depenses_total,
         (SELECT SUM(valeur_stock) FROM vue_stock WHERE entreprise_id = $1)                 AS valeur_stock,
         (SELECT COUNT(*) FROM factures WHERE statut = FALSE AND entreprise_id = $1)        AS factures_impayees,
         (SELECT SUM(reste) FROM factures WHERE statut = FALSE AND entreprise_id = $1)      AS montant_a_recouvrer
       FROM lignes_vente lv
       WHERE lv.entreprise_id = $1`,
      [entId]
    );

    // Top 5 articles vendus (cloisonné par entreprise)
    const topArticles = await db.query(
      `SELECT article_code, libelle,
              SUM(quantite) AS qte_vendue,
              SUM(montant_total) AS ca
       FROM lignes_vente
       WHERE entreprise_id = $1
       GROUP BY article_code, libelle
       ORDER BY ca DESC
       LIMIT 5`,
      [entId]
    );

    res.json({
      ca_par_mois:  caMois.rows,
      totaux:       totaux.rows[0],
      top_articles: topArticles.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
  }
}

module.exports = { getAll, create, stats };
