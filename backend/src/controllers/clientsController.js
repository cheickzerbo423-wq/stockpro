// src/controllers/clientsController.js
const db = require("../config/db");

async function getAll(req, res) {
  try {
    const { type, search } = req.query;
    const entId = req.user.entreprise_id;

    // Auto-réparation : certains approvisionnements (ex. "Stock initial" saisi
    // en texte libre, sans sélection dans la liste des fournisseurs) ne sont
    // rattachés à aucun fournisseur_id et ne correspondent à aucune fiche
    // fournisseur existante. Sans cela, leurs montants restent invisibles dans
    // l'onglet Fournisseurs (aucune ligne ne les agrège). On crée ici, de façon
    // idempotente, une fiche fournisseur pour chaque nom orphelin trouvé dans
    // achats — leurs totaux apparaîtront ensuite normalement dans la liste.
    // Cette auto-réparation est une "best effort" : si elle échoue pour une
    // raison quelconque (contrainte de schéma inattendue, etc.), on ne doit
    // surtout pas faire échouer tout l'affichage de la liste Clients/Fournisseurs.
    try {
      await db.query(`
        INSERT INTO clients_fournisseurs (nom, type, contact, email, ville, adresse, entreprise_id)
        SELECT DISTINCT UPPER(TRIM(a.fournisseur_nom)), 'Fournisseurs', '', '', '', '', $1
        FROM achats a
        WHERE a.entreprise_id = $1
          AND a.fournisseur_id IS NULL
          AND COALESCE(TRIM(a.fournisseur_nom), '') <> ''
          AND NOT EXISTS (
            SELECT 1 FROM clients_fournisseurs cf
            WHERE cf.entreprise_id = $1 AND UPPER(cf.nom) = UPPER(TRIM(a.fournisseur_nom))
          )
      `, [entId]);
    } catch (repairErr) {
      console.error("⚠️  Auto-réparation fournisseurs orphelins ignorée :", repairErr.message);
    }

    // Cloisonnement multi-entreprises : $1 = entreprise courante, référencé à
    // la fois dans le WHERE principal et dans chaque sous-requête corrélée
    // (les colonnes "entreprise_id" de factures/achats portent la même valeur
    // que celle du contact, par construction des INSERT scopés par entreprise).
    let where = `cf.actif = TRUE AND cf.entreprise_id = $1`;
    const params = [req.user.entreprise_id];
    let idx = 2;
    if (type)   { where += ` AND cf.type = $${idx++}`;        params.push(type); }
    if (search) { where += ` AND cf.nom ILIKE $${idx++}`;     params.push(`%${search}%`); }

    const q = `
      SELECT cf.*,
        /* ── Agrégats clients ─────────────────────────── */
        COALESCE((
          SELECT COUNT(code)::bigint FROM factures
          WHERE entreprise_id = $1 AND (client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = UPPER(cf.nom)))
        ), 0) AS nb_transactions,

        COALESCE((
          SELECT SUM(montant)::bigint FROM factures
          WHERE entreprise_id = $1 AND (client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = UPPER(cf.nom)))
        ), 0) AS total_ca,

        COALESCE((
          SELECT SUM(montant_paye)::bigint FROM factures
          WHERE entreprise_id = $1 AND (client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = UPPER(cf.nom)))
        ), 0) AS total_encaisse,

        COALESCE((
          SELECT SUM(reste)::bigint FROM factures
          WHERE entreprise_id = $1 AND (client_id = cf.id
             OR (client_id IS NULL AND UPPER(client_nom) = UPPER(cf.nom)))
        ), 0) AS total_creances,

        /* ── Agrégats fournisseurs ─────────────────────── */
        COALESCE((
          SELECT COUNT(id)::bigint FROM achats
          WHERE entreprise_id = $1 AND (fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER(cf.nom)))
        ), 0) AS nb_achats,

        /* total_achats recalculé dynamiquement (prix_achat * quantite) — la
           colonne stockée "montant_total" peut être à 0 sur d'anciens
           enregistrements (cf. commentaire identique dans achatsController.js
           getAll), ce qui faussait total_achats ET, par ricochet, total_dettes
           (donnant des dettes négatives du type "payé > total acheté"). */
        COALESCE((
          SELECT SUM(prix_achat * quantite)::bigint FROM achats
          WHERE entreprise_id = $1 AND (fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER(cf.nom)))
        ), 0) AS total_achats,

        COALESCE((
          SELECT SUM(montant_paye)::bigint FROM achats
          WHERE entreprise_id = $1 AND (fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER(cf.nom)))
        ), 0) AS total_paye,

        COALESCE((
          SELECT SUM(prix_achat * quantite - montant_paye)::bigint FROM achats
          WHERE entreprise_id = $1 AND (fournisseur_id = cf.id
             OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER(cf.nom)))
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
    if ((type === "Clients" || type === "Client" || type === "Les deux") && !(adresse || "").trim())
      return res.status(400).json({ message: "L'adresse est obligatoire pour l'enregistrement d'un client." });
    const result = await db.query(
      `INSERT INTO clients_fournisseurs (nom, type, contact, email, ville, adresse, entreprise_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nom.toUpperCase(), type, contact || "", email || "", ville || "", adresse || "", req.user.entreprise_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la création." });
  }
}

async function update(req, res) {
  try {
    const { nom, contact, email, ville, adresse } = req.body;

    const existing = await db.query(
      `SELECT type FROM clients_fournisseurs WHERE id = $1 AND entreprise_id = $2`,
      [req.params.id, req.user.entreprise_id]
    );
    if (!existing.rows[0]) return res.status(404).json({ message: "Introuvable." });
    const isClientType = ["Clients", "Client", "Les deux"].includes(existing.rows[0].type);
    if (isClientType && adresse !== undefined && !(adresse || "").trim())
      return res.status(400).json({ message: "L'adresse est obligatoire pour un client." });

    const result = await db.query(
      `UPDATE clients_fournisseurs
       SET nom = COALESCE($1, nom), contact = COALESCE($2, contact),
           email = COALESCE($3, email), ville = COALESCE($4, ville),
           adresse = COALESCE($5, adresse)
       WHERE id = $6 AND entreprise_id = $7 RETURNING *`,
      [nom ? nom.toUpperCase() : null, contact, email, ville, adresse, req.params.id, req.user.entreprise_id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const entId = req.user.entreprise_id;

    const contact = await db.query(
      `SELECT * FROM clients_fournisseurs WHERE id = $1 AND entreprise_id = $2 AND actif = TRUE`,
      [id, entId]
    );
    if (contact.rows.length === 0)
      return res.status(404).json({ message: "Contact introuvable." });
    const cf = contact.rows[0];

    // Empêche la suppression d'un contact ayant un solde non soldé : sinon
    // ses créances/dettes disparaissent silencieusement des totaux de la
    // page Clients & Fournisseurs (cf.actif = TRUE est requis dans getAll),
    // alors que les factures/achats correspondants existent toujours.
    if (cf.type === "Clients") {
      const r = await db.query(
        `SELECT COALESCE(SUM(reste), 0)::bigint AS creances FROM factures
         WHERE entreprise_id = $1 AND (client_id = $2 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($3)))`,
        [entId, id, cf.nom]
      );
      const creances = parseFloat(r.rows[0].creances);
      if (creances > 0) {
        return res.status(400).json({
          message: `Impossible de supprimer "${cf.nom}" : il reste ${creances.toLocaleString("fr-FR")} FCFA de créances impayées. Réglez le solde avant de supprimer ce client.`,
        });
      }
    } else {
      const r = await db.query(
        `SELECT COALESCE(SUM(prix_achat * quantite - montant_paye), 0)::bigint AS dettes FROM achats
         WHERE entreprise_id = $1 AND (fournisseur_id = $2 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($3)))`,
        [entId, id, cf.nom]
      );
      const dettes = parseFloat(r.rows[0].dettes);
      if (dettes > 0) {
        return res.status(400).json({
          message: `Impossible de supprimer "${cf.nom}" : il reste ${dettes.toLocaleString("fr-FR")} FCFA de dettes impayées envers ce fournisseur. Réglez le solde avant de supprimer.`,
        });
      }
    }

    await db.query(
      `UPDATE clients_fournisseurs SET actif = FALSE WHERE id = $1 AND entreprise_id = $2`,
      [id, entId]
    );
    res.json({ message: "Contact supprimé." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

async function getBilan(req, res) {
  try {
    const { id } = req.params;
    const entId = req.user.entreprise_id;
    const contact = await db.query(
      `SELECT * FROM clients_fournisseurs WHERE id = $1 AND actif = TRUE AND entreprise_id = $2`, [id, entId]
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
          WHERE entreprise_id = $3 AND (client_id = $1 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($2)))`,
          [id, cf.nom, entId]),

        db.query(`
          SELECT code, date_facture, montant, montant_paye, reste, statut
          FROM factures
          WHERE entreprise_id = $3 AND (client_id = $1 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($2)))
          ORDER BY date_facture DESC`,
          [id, cf.nom, entId]),

        db.query(`
          SELECT lv.article_code, lv.libelle,
            SUM(lv.quantite)::int        AS qte_totale,
            SUM(lv.montant_total)::bigint AS ca
          FROM lignes_vente lv
          JOIN factures f ON lv.facture_code = f.code AND lv.entreprise_id = f.entreprise_id
          WHERE f.entreprise_id = $3 AND (f.client_id = $1 OR (f.client_id IS NULL AND UPPER(f.client_nom) = UPPER($2)))
          GROUP BY lv.article_code, lv.libelle
          ORDER BY ca DESC LIMIT 5`,
          [id, cf.nom, entId]),

        db.query(`
          SELECT TO_CHAR(date_facture, 'YYYY-MM') AS mois,
            SUM(montant)::bigint      AS ca,
            SUM(montant_paye)::bigint AS encaisse
          FROM factures
          WHERE entreprise_id = $3 AND (client_id = $1 OR (client_id IS NULL AND UPPER(client_nom) = UPPER($2)))
          GROUP BY TO_CHAR(date_facture, 'YYYY-MM') ORDER BY 1`,
          [id, cf.nom, entId]),
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
          WHERE entreprise_id = $3 AND (fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2)))`,
          [id, cf.nom, entId]),

        db.query(`
          SELECT id, article_code, libelle, quantite, prix_achat,
            (prix_achat * quantite) AS montant_total, montant_paye,
            (prix_achat * quantite - montant_paye) AS reste,
            date_achat,
            CASE WHEN montant_paye >= (prix_achat * quantite) THEN TRUE ELSE FALSE END AS statut
          FROM achats
          WHERE entreprise_id = $3 AND (fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2)))
          ORDER BY date_achat DESC`,
          [id, cf.nom, entId]),

        db.query(`
          SELECT article_code, libelle,
            SUM(quantite)::int                AS qte_totale,
            SUM(prix_achat * quantite)::bigint AS total
          FROM achats
          WHERE entreprise_id = $3 AND (fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2)))
          GROUP BY article_code, libelle
          ORDER BY total DESC LIMIT 5`,
          [id, cf.nom, entId]),

        db.query(`
          SELECT TO_CHAR(date_achat, 'YYYY-MM') AS mois,
            SUM(prix_achat * quantite)::bigint AS total,
            SUM(montant_paye)::bigint          AS paye
          FROM achats
          WHERE entreprise_id = $3 AND (fournisseur_id = $1 OR (fournisseur_id IS NULL AND UPPER(fournisseur_nom) = UPPER($2)))
          GROUP BY TO_CHAR(date_achat, 'YYYY-MM') ORDER BY 1`,
          [id, cf.nom, entId]),
      ]);
      res.json({ ...cf, kpi: kpi.rows[0], transactions: transactions.rows, top_articles: topArticles.rows, evolution: evolution.rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = { getAll, create, update, remove, getBilan };
