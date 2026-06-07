// src/controllers/clientsController.js
const db = require("../config/db");

async function getAll(req, res) {
  try {
    const { type, search } = req.query;
    let where = `cf.actif = TRUE`;
    const params = [];
    let idx = 1;
    if (type)   { where += ` AND cf.type = $${idx++}`;        params.push(type); }
    if (search) { where += ` AND cf.nom ILIKE $${idx++}`;     params.push(`%${search}%`); }

    const q = `
      SELECT cf.*,
        /* ── Agrégats clients ─────────────────────────── */
        COALESCE((
          SELECT COUNT(code)::bigint FROM factures
          WHERE client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = cf.nom)
        ), 0) AS nb_transactions,

        COALESCE((
          SELECT SUM(montant)::bigint FROM factures
          WHERE client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = cf.nom)
        ), 0) AS total_ca,

        COALESCE((
          SELECT SUM(montant_paye)::bigint FROM factures
          WHERE client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = cf.nom)
        ), 0) AS total_encaisse,

        COALESCE((
          SELECT SUM(reste)::bigint FROM factures
          WHERE client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = cf.nom)
        ), 0) AS total_creances,

        /* ── Agrégats fournisseurs ─────────────────────── */
        COALESCE((
          SELECT COUNT(id)::bigint FROM achats
          WHERE fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = cf.nom)
        ), 0) AS nb_achats,

        /* total_achats recalculé dynamiquement (prix_achat * quantite) — la
           colonne stockée "montant_total" peut être à 0 sur d'anciens
           enregistrements (cf. commentaire identique dans achatsController.js
           getAll), ce qui faussait total_achats ET, par ricochet, total_dettes
           (donnant des dettes négatives du type "payé > total acheté"). */
        COALESCE((
          SELECT SUM(prix_achat * quantite)::bigint FROM achats
          WHERE fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = cf.nom)
        ), 0) AS total_achats,

        COALESCE((
          SELECT SUM(montant_paye)::bigint FROM achats
          WHERE fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = cf.nom)
        ), 0) AS total_paye,

        COALESCE((
          SELECT SUM(prix_achat * quantite - montant_paye)::bigint FROM achats
          WHERE fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = cf.nom)
        ), 0) AS total_dettes

      FROM clients_fournisseurs cf
      WHERE ${where}
      ORDER BY cf.type, cf.nom`;

    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function create(req, res) {
  try {
    const { nom, type, contact, email, ville, adresse } = req.body;
    if (!nom || !type)
      return res.status(400).json({ message: "Nom et type sont obligatoires." });
    const result = await db.query(
      `INSERT INTO clients_fournisseurs (nom, type, contact, email, ville, adresse)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nom.toUpperCase(), type, contact || "", email || "", ville || "", adresse || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la création." });
  }
}

async function update(req, res) {
  try {
    const { nom, contact, email, ville, adresse } = req.body;
    const result = await db.query(
      `UPDATE clients_fournisseurs
       SET nom = COALESCE($1, nom), contact = COALESCE($2, contact),
           email = COALESCE($3, email), ville = COALESCE($4, ville),
           adresse = COALESCE($5, adresse)
       WHERE id = $6 RETURNING *`,
      [nom ? nom.toUpperCase() : null, contact, email, ville, adresse, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function remove(req, res) {
  try {
    await db.query(`UPDATE clients_fournisseurs SET actif = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ message: "Contact supprimé." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function getBilan(req, res) {
  try {
    const { id } = req.params;
    const contact = await db.query(
      `SELECT * FROM clients_fournisseurs WHERE id = $1 AND actif = TRUE`, [id]
    );
    if (contact.rows.length === 0)
      return res.status(404).json({ message: "Contact introuvable." });
    const cf = contact.rows[0];

    if (cf.type === "Clients") {
      const [kpi, transactions, topArticles, evolution] = await Promise.all([
        db.query(`
          SELECT
            COUNT(code)::int                                          AS nb_factures,
            COALESCE(SUM(montant),      0)::bigint                    AS ca_total,
            COALESCE(SUM(montant_paye), 0)::bigint                    AS encaisse,
            COALESCE(SUM(reste),        0)::bigint                    AS creances,
            COUNT(CASE WHEN statut      THEN 1 END)::int              AS nb_reglees,
            COUNT(CASE WHEN NOT statut  THEN 1 END)::int              AS nb_impayees,
            MIN(date_facture)                                         AS premiere_facture,
            MAX(date_facture)                                         AS derniere_facture
          FROM factures
          WHERE client_id = $1 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($2))`,
          [id, cf.nom]),

        db.query(`
          SELECT code, date_facture, montant, montant_paye, reste, statut
          FROM factures
          WHERE client_id = $1 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($2))
          ORDER BY date_facture DESC`,
          [id, cf.nom]),

        db.query(`
          SELECT lv.article_code, lv.libelle,
            SUM(lv.quantite)::int        AS qte_totale,
            SUM(lv.montant_total)::bigint AS ca
          FROM lignes_vente lv
          JOIN factures f ON lv.facture_code = f.code
          WHERE f.client_id = $1 OR (f.client_id IS NULL AND UPPER(f.client_nom) = UPPER($2))
          GROUP BY lv.article_code, lv.libelle
          ORDER BY ca DESC LIMIT 5`,
          [id, cf.nom]),

        db.query(`
          SELECT TO_CHAR(date_facture, 'YYYY-MM') AS mois,
            SUM(montant)::bigint      AS ca,
            SUM(montant_paye)::bigint AS encaisse
          FROM factures
          WHERE client_id = $1 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($2))
          GROUP BY TO_CHAR(date_facture, 'YYYY-MM') ORDER BY 1`,
          [id, cf.nom]),
      ]);
      res.json({ ...cf, kpi: kpi.rows[0], transactions: transactions.rows, top_articles: topArticles.rows, evolution: evolution.rows });

    } else {
      const [kpi, transactions, topArticles, evolution] = await Promise.all([
        db.query(`
          SELECT
            COUNT(id)::int                                                    AS nb_achats,
            COALESCE(SUM(prix_achat * quantite),               0)::bigint     AS total_achats,
            COALESCE(SUM(montant_paye),                        0)::bigint     AS total_paye,
            COALESCE(SUM(prix_achat * quantite - montant_paye),0)::bigint     AS total_dettes,
            MIN(date_achat)                                                   AS premier_achat,
            MAX(date_achat)                                                   AS dernier_achat
          FROM achats
          WHERE fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2))`,
          [id, cf.nom]),

        db.query(`
          SELECT id, article_code, libelle, quantite, prix_achat,
            (prix_achat * quantite) AS montant_total, montant_paye,
            (prix_achat * quantite - montant_paye) AS reste,
            date_achat,
            CASE WHEN montant_paye >= (prix_achat * quantite) THEN TRUE ELSE FALSE END AS statut
          FROM achats
          WHERE fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2))
          ORDER BY date_achat DESC`,
          [id, cf.nom]),

        db.query(`
          SELECT article_code, libelle,
            SUM(quantite)::int                AS qte_totale,
            SUM(prix_achat * quantite)::bigint AS total
          FROM achats
          WHERE fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2))
          GROUP BY article_code, libelle
          ORDER BY total DESC LIMIT 5`,
          [id, cf.nom]),

        db.query(`
          SELECT TO_CHAR(date_achat, 'YYYY-MM') AS mois,
            SUM(prix_achat * quantite)::bigint AS total,
            SUM(montant_paye)::bigint          AS paye
          FROM achats
          WHERE fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2))
          GROUP BY TO_CHAR(date_achat, 'YYYY-MM') ORDER BY 1`,
          [id, cf.nom]),
      ]);
      res.json({ ...cf, kpi: kpi.rows[0], transactions: transactions.rows, top_articles: topArticles.rows, evolution: evolution.rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, create, update, remove, getBilan };
