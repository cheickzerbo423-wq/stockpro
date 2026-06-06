// src/controllers/ventesController.js
// Équivalent Excel : VenteMultiple + Donnees_vente
const db = require("../config/db");

// Génère un numéro de facture séquentiel : FACT-2026-0001
async function genFactureCode(dbClient, date) {
  const annee = new Date(date).getFullYear();
  const result = await dbClient.query(
    `SELECT COUNT(*) AS nb FROM factures WHERE EXTRACT(YEAR FROM date_facture) = $1`,
    [annee]
  );
  const next = parseInt(result.rows[0].nb) + 1;
  return `FACT-${annee}-${String(next).padStart(4, "0")}`;
}

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// GET /api/ventes — Historique des ventes
async function getAll(req, res) {
  try {
    const { client, mois, annee, facture } = req.query;
    let q = `
      SELECT lv.*, f.client_nom, f.date_facture, f.montant AS facture_montant,
             f.montant_paye, f.reste, f.statut AS facture_statut
      FROM lignes_vente lv
      JOIN factures f ON f.code = lv.facture_code
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (client)  { q += ` AND f.client_nom ILIKE $${idx++}`; params.push(`%${client}%`); }
    if (mois)    { q += ` AND lv.mois = $${idx++}`;          params.push(mois); }
    if (annee)   { q += ` AND lv.annee = $${idx++}`;         params.push(annee); }
    if (facture) { q += ` AND lv.facture_code = $${idx++}`;  params.push(facture); }
    q += ` ORDER BY lv.date_vente ASC, lv.id ASC`;
    const result = await db.query(q, params);
    res.json(result.rows);
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

    if (!articles || articles.length === 0)
      return res.status(400).json({ message: "Le panier est vide." });
    if (!client_nom)
      return res.status(400).json({ message: "Client obligatoire." });

    await client.query("BEGIN");

    // Vérification des stocks avant toute transaction
    for (const item of articles) {
      const stock = await client.query(
        `SELECT stock_restant FROM vue_stock WHERE code = $1`,
        [item.code]
      );
      if (!stock.rows[0])
        throw new Error(`Article "${item.code}" introuvable.`);
      if (stock.rows[0].stock_restant < item.quantite)
        throw new Error(`Stock insuffisant pour "${item.code}" : disponible ${stock.rows[0].stock_restant}, demandé ${item.quantite}.`);
    }

    // Calcul du total
    const total   = articles.reduce((s, a) => s + a.prix_vente * a.quantite, 0);
    const paye    = (montant_paye !== undefined && montant_paye !== null) ? parseFloat(montant_paye) : total;
    const monnaie = Math.max(0, paye - total);
    const date    = date_vente || new Date().toISOString().split("T")[0];
    const factCode = await genFactureCode(client, date);
    const mois = MOIS[new Date(date).getMonth()];
    const annee = new Date(date).getFullYear();

    // Créer la facture
    // NB : "reste" et "statut" sont des colonnes GENERATED ALWAYS ... STORED en base
    // (calculées automatiquement à partir de montant/montant_paye) — il ne faut
    // jamais leur fournir de valeur explicite (Postgres rejette avec
    // "column ... can only be updated to DEFAULT"). On les omet, la base les calcule.
    const factResult = await client.query(
      `INSERT INTO factures (code, date_facture, montant, montant_paye, monnaie_rendue, client_id, client_nom, user_id)
       VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric, $6, $7, $8)
       RETURNING *`,
      [factCode, date, parseFloat(total), paye, parseFloat(monnaie), client_id || null, client_nom, req.user?.id || null]
    );

    // Créer les lignes de vente
    const lignes = [];
    for (const item of articles) {
      const art = await client.query(`SELECT libelle FROM articles WHERE code = $1`, [item.code]);
      const ligne = await client.query(
        `INSERT INTO lignes_vente (facture_code, article_code, libelle, prix_vente, quantite, date_vente, client_nom, user_id)
         VALUES ($1, $2, $3, $4::numeric, $5::integer, $6, $7, $8::integer)
         RETURNING *`,
        [factCode, item.code, art.rows[0]?.libelle || item.code, parseFloat(item.prix_vente), parseInt(item.quantite), date, client_nom, req.user?.id ? parseInt(req.user.id) : null]
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

    // CA par mois
    const caMois = await db.query(
      `SELECT mois, annee, SUM(montant_total) AS ca
       FROM lignes_vente
       WHERE annee = $1
       GROUP BY mois, annee, EXTRACT(MONTH FROM date_vente)
       ORDER BY EXTRACT(MONTH FROM date_vente)`,
      [yr]
    );

    // Totaux globaux
    const totaux = await db.query(
      `SELECT
         SUM(lv.montant_total)                                  AS ca_total,
         COUNT(DISTINCT lv.facture_code)                        AS nb_factures,
         (SELECT SUM(montant_total) FROM achats)                AS depenses_total,
         (SELECT SUM(valeur_stock) FROM vue_stock)              AS valeur_stock,
         (SELECT COUNT(*) FROM factures WHERE statut = FALSE)   AS factures_impayees,
         (SELECT SUM(reste) FROM factures WHERE statut = FALSE) AS montant_a_recouvrer
       FROM lignes_vente lv`
    );

    // Top 5 articles vendus
    const topArticles = await db.query(
      `SELECT article_code, libelle,
              SUM(quantite) AS qte_vendue,
              SUM(montant_total) AS ca
       FROM lignes_vente
       GROUP BY article_code, libelle
       ORDER BY ca DESC
       LIMIT 5`
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
