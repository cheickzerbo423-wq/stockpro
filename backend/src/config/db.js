// src/config/db.js — Connexion PostgreSQL
require("dotenv").config();
const { Pool } = require("pg");

// Supporte DATABASE_URL (Railway/Heroku) ou variables individuelles
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME     || "warigest_db",
      user:     process.env.DB_USER     || "warigest_user",
      password: process.env.DB_PASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Erreur inattendue sur le pool PostgreSQL :", err);
});

// Filet de sécurité : si une connexion reste bloquée "idle in transaction"
// (BEGIN sans COMMIT/ROLLBACK, suite à un bug applicatif), PostgreSQL la
// termine automatiquement après 30s — ce qui libère la connexion et les
// verrous au lieu de bloquer en cascade tout le reste de l'application.
pool.on("connect", (client) => {
  client.query("SET idle_in_transaction_session_timeout = 30000").catch(() => {});
});

// Test de connexion au démarrage + nettoyage des connexions "zombies"
// (sessions restées "idle in transaction" suite à un ancien bug applicatif :
// elles bloquent des verrous et saturent le pool tant qu'elles ne sont pas
// fermées. On les termine une bonne fois au démarrage du serveur.)
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Impossible de se connecter à PostgreSQL :", err.message);
    return;
  }
  console.log("✅ Connecté à PostgreSQL — Base :", process.env.DB_NAME);

  client.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'idle in transaction'
       AND pid <> pg_backend_pid()
       AND datname = current_database()`
  )
    .then((r) => {
      if (r.rowCount > 0)
        console.log(`🧹 ${r.rowCount} connexion(s) "idle in transaction" nettoyée(s) au démarrage.`);
    })
    .catch((e) => console.error("Nettoyage connexions zombies — ignoré :", e.message))
    .finally(() => {
      // Migration légère : la table "achats" a été créée avant l'ajout du
      // suivi mensuel/annuel (filtres "mois"/"annee" dans achatsController).
      // IF NOT EXISTS rend l'opération idempotente — sûre à rejouer à chaque
      // démarrage, sans script de migration séparé à exécuter manuellement.
      client.query(
        `ALTER TABLE achats ADD COLUMN IF NOT EXISTS mois  VARCHAR(20);
         ALTER TABLE achats ADD COLUMN IF NOT EXISTS annee INTEGER;`
      )
        .then(() => console.log("✅ Schéma 'achats' vérifié (colonnes mois/annee OK)."))
        .catch((e) => console.error("⚠️  Migration achats (mois/annee) ignorée :", e.message))
        .then(() => {
          // ── Personnalisation par entreprise (factures/reçus/rapports PDF) ──
          // Table à une seule ligne (id = 1) : chaque entreprise qui déploie
          // WariGest peut renseigner ses propres nom, coordonnées, devise,
          // logo (data-URI base64) et couleur d'accent depuis la page
          // "Paramètres" (admin) — sans avoir à modifier de variables
          // d'environnement ni redéployer. CREATE+INSERT idempotents : sûrs
          // à rejouer à chaque démarrage.
          return client.query(`
            CREATE TABLE IF NOT EXISTS entreprise_config (
              id            INTEGER PRIMARY KEY DEFAULT 1,
              nom           VARCHAR(150),
              adresse       VARCHAR(255),
              telephone     VARCHAR(50),
              email         VARCHAR(150),
              devise        VARCHAR(10)  DEFAULT 'FCFA',
              couleur       VARCHAR(10)  DEFAULT '#0023FF',
              logo          TEXT,
              pied_de_page  VARCHAR(255),
              updated_at    TIMESTAMP DEFAULT NOW(),
              CONSTRAINT entreprise_config_id_unique CHECK (id = 1)
            );
            INSERT INTO entreprise_config (id, devise, couleur)
            VALUES (1, 'FCFA', '#0023FF')
            ON CONFLICT (id) DO NOTHING;
          `);
        })
        .then(() => console.log("✅ Table 'entreprise_config' vérifiée (personnalisation PDF par entreprise)."))
        .catch((e) => console.error("⚠️  Migration entreprise_config ignorée :", e.message))
        .then(() => {
          // ── Correction définitive de la vue "vue_stock" ──────────────────
          // Bug constaté : les chiffres de stock affichés (Articles & Stock,
          // alertes de rupture, valeur de stock) étaient totalement faux et
          // ne correspondaient ni aux quantités achetées ni aux quantités
          // vendues (ex. ARACHIDE affichait un stock de 50 468 au lieu de
          // ~10 084, et les colonnes Entrées/Sorties affichaient 0 partout).
          //
          // Cause racine : l'ancienne définition de la vue joignait
          // directement la table "achats" et la table "lignes_vente" sur
          // articles.code. Un JOIN direct entre deux tables liées à une même
          // ligne d'article produit un produit cartésien : chaque ligne
          // d'achat est associée à CHAQUE ligne de vente (et vice-versa),
          // donc SUM(achats.quantite) et SUM(lignes_vente.quantite) comptent
          // les quantités en double, triple, etc. — proportionnellement au
          // nombre de lignes de l'autre table. C'est exactement ce qui
          // donnait 50 468 (= 10 100 × 5 ventes − 16 × 2 achats) au lieu de
          // 10 084 (= 10 100 − 16).
          //
          // Correction : on agrège D'ABORD séparément les quantités achetées
          // et vendues par article (sous-requêtes groupées), PUIS on les
          // joint à la table "articles" — ce qui élimine totalement le
          // produit cartésien et donne des totaux exacts.
          //
          // DROP + CREATE (plutôt que CREATE OR REPLACE) car PostgreSQL
          // refuse de modifier les noms/types de colonnes d'une vue existante
          // avec REPLACE ; la recréation est idempotente et sûre à rejouer à
          // chaque démarrage du serveur.
          return client.query(`
            DROP VIEW IF EXISTS vue_stock;

            CREATE VIEW vue_stock AS
            SELECT
              a.id,
              a.code,
              a.libelle,
              a.prix_achat,
              a.prix_vente,
              a.stock_min,
              a.actif,
              COALESCE(ent.total, 0)::integer                                     AS entree,
              COALESCE(sor.total, 0)::integer                                     AS sortie,
              (COALESCE(ent.total, 0) - COALESCE(sor.total, 0))::integer          AS stock_restant,
              CASE
                WHEN (COALESCE(ent.total, 0) - COALESCE(sor.total, 0)) <= 0
                  THEN 'Rupture stock'
                WHEN (COALESCE(ent.total, 0) - COALESCE(sor.total, 0)) <= a.stock_min
                  THEN 'Stock faible'
                ELSE 'En stock'
              END                                                                  AS statut,
              ((COALESCE(ent.total, 0) - COALESCE(sor.total, 0)) * a.prix_achat)::numeric AS valeur_stock
            FROM articles a
            LEFT JOIN (
              SELECT article_code, SUM(quantite) AS total
              FROM achats
              GROUP BY article_code
            ) ent ON ent.article_code = a.code
            LEFT JOIN (
              SELECT article_code, SUM(quantite) AS total
              FROM lignes_vente
              GROUP BY article_code
            ) sor ON sor.article_code = a.code;
          `);
        })
        .then(() => console.log("✅ Vue 'vue_stock' recréée avec un calcul de stock correct (plus de produit cartésien)."))
        .catch((e) => console.error("⚠️  Recréation de 'vue_stock' ignorée :", e.message))
        .finally(() => release());
    });
});

module.exports = pool;
