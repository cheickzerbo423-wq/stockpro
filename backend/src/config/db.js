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
          // ══════════════════════════════════════════════════════════════
          // MULTI-ENTREPRISES (multi-tenant) — chaque société cliente de
          // WariGest dispose désormais de son propre espace cloisonné :
          // ses articles, ventes, clients, factures, utilisateurs… Un rôle
          // "SuperAdmin" (entreprise_id = NULL) pilote la plateforme entière
          // depuis la page Super-admin (créer/suspendre/supprimer des
          // entreprises, tout voir). Toutes les données déjà présentes sont
          // rattachées à une entreprise "par défaut" (id = 1) — aucune perte,
          // l'app continue de fonctionner normalement pour les utilisateurs
          // déjà en place. CREATE+ALTER+UPDATE idempotents : sûrs à rejouer.
          //
          // IMPORTANT — ORDRE DES MIGRATIONS : la table "entreprises" et les
          // colonnes "entreprise_id" doivent être créées AVANT la (re)création
          // de la vue "vue_stock" plus bas, qui référence a.entreprise_id.
          // ══════════════════════════════════════════════════════════════
          return client.query(`
            CREATE TABLE IF NOT EXISTS entreprises (
              id          SERIAL PRIMARY KEY,
              nom         VARCHAR(150) NOT NULL,
              slug        VARCHAR(100) UNIQUE,
              actif       BOOLEAN DEFAULT TRUE,
              created_at  TIMESTAMP DEFAULT NOW(),
              updated_at  TIMESTAMP DEFAULT NOW()
            );
            INSERT INTO entreprises (id, nom, slug)
            VALUES (1, 'Entreprise par défaut', 'default')
            ON CONFLICT (id) DO NOTHING;
            SELECT setval('entreprises_id_seq', GREATEST((SELECT MAX(id) FROM entreprises), 1));
          `);
        })
        .then(() => console.log("✅ Table 'entreprises' vérifiée (multi-tenant)."))
        .catch((e) => console.error("⚠️  Migration 'entreprises' ignorée :", e.message))
        .then(() => {
          // Rattachement de chaque table cloisonnée à une entreprise.
          // Colonne ajoutée en NULL d'abord puis renseignée avec l'entreprise
          // par défaut (id = 1) pour les lignes déjà existantes. Chaque table
          // est migrée indépendamment (son propre try/catch).
          const tables = [
            "utilisateurs", "articles", "clients_fournisseurs", "achats",
            "factures", "lignes_vente", "audit_log",
          ];
          return tables.reduce((p, t) => p.then(() =>
            client.query(`
              ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS entreprise_id INTEGER REFERENCES entreprises(id);
              UPDATE ${t} SET entreprise_id = 1 WHERE entreprise_id IS NULL;
            `)
              .then(() => console.log(`   · ${t}.entreprise_id OK`))
              .catch((e) => console.error(`   · ${t}.entreprise_id ignorée : ${e.message}`))
          ), Promise.resolve());
        })
        .then(() => console.log("✅ Colonnes 'entreprise_id' vérifiées sur les tables cloisonnées."))
        .catch((e) => console.error("⚠️  Migration entreprise_id ignorée :", e.message))
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
          // produit cartésien et donne des totaux exacts. La vue expose
          // désormais aussi "entreprise_id" (colonne ajoutée juste avant)
          // pour permettre le cloisonnement par entreprise dans les contrôleurs.
          //
          // DURCISSEMENT MULTI-ENTREPRISES (audit MLD) : les sous-requêtes
          // groupent désormais par (article_code, entreprise_id) ET la
          // jointure se fait sur LES DEUX colonnes — pas seulement sur
          // "code". Auparavant, le rapprochement reposait uniquement sur
          // l'unicité globale des codes d'articles, garantie au niveau
          // applicatif (articlesController.create) mais pas au niveau de la
          // base : la moindre brèche dans cette vérification (bug futur,
          // contournement, etc.) aurait mélangé silencieusement les entrées/
          // sorties de stock de DEUX entreprises différentes partageant un
          // même code article. Cette double jointure rend la vue correcte
          // par construction, sans dépendre de cette hypothèse externe.
          //
          // DROP + CREATE (plutôt que CREATE OR REPLACE) car PostgreSQL
          // refuse de modifier les noms/types de colonnes d'une vue existante
          // avec REPLACE ; la recréation est idempotente et sûre à rejouer à
          // chaque démarrage du serveur.
          return client.query(`
            DROP VIEW IF EXISTS vue_stock;

            CREATE VIEW vue_stock AS
            SELECT
              a.entreprise_id,
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
              SELECT article_code, entreprise_id, SUM(quantite) AS total
              FROM achats
              GROUP BY article_code, entreprise_id
            ) ent ON ent.article_code = a.code AND ent.entreprise_id = a.entreprise_id
            LEFT JOIN (
              SELECT article_code, entreprise_id, SUM(quantite) AS total
              FROM lignes_vente
              GROUP BY article_code, entreprise_id
            ) sor ON sor.article_code = a.code AND sor.entreprise_id = a.entreprise_id;
          `);
        })
        .then(() => console.log("✅ Vue 'vue_stock' recréée avec un calcul de stock correct (plus de produit cartésien, entreprise_id exposé)."))
        .then(() =>
          // Backfill achats.annee et achats.mois pour les lignes existantes insérées
          // avant que ces colonnes soient remplies automatiquement.
          client.query(`
            DO $bfill$
            BEGIN
              -- Backfill annee (colonne plain INTEGER ajoutée par migration).
              -- Si la colonne est GENERATED ALWAYS (schéma initial), l'exception
              -- est capturée et ignorée — la valeur est déjà calculée automatiquement.
              BEGIN
                UPDATE achats
                SET annee = EXTRACT(YEAR FROM date_achat)::INTEGER
                WHERE annee IS NULL AND date_achat IS NOT NULL;
              EXCEPTION WHEN generated_always THEN
                -- Colonne générée : déjà peuplée, rien à faire.
                NULL;
              END;

              -- Backfill mois (colonne plain VARCHAR, jamais générée).
              UPDATE achats
              SET mois = CASE EXTRACT(MONTH FROM date_achat)::INTEGER
                WHEN 1  THEN 'Janvier'   WHEN 2  THEN 'Février'
                WHEN 3  THEN 'Mars'      WHEN 4  THEN 'Avril'
                WHEN 5  THEN 'Mai'       WHEN 6  THEN 'Juin'
                WHEN 7  THEN 'Juillet'   WHEN 8  THEN 'Août'
                WHEN 9  THEN 'Septembre' WHEN 10 THEN 'Octobre'
                WHEN 11 THEN 'Novembre'  WHEN 12 THEN 'Décembre'
              END
              WHERE mois IS NULL AND date_achat IS NOT NULL;
            END;
            $bfill$;
          `)
            .then((r) => console.log(`✅ Backfill achats.annee/mois OK (${r.rowCount ?? '?'} lignes mises à jour).`))
            .catch((e) => console.error("⚠️  Backfill achats.annee/mois ignoré :", e.message))
        )
        .catch((e) => console.error("⚠️  Recréation de 'vue_stock' ignorée :", e.message))
        .then(() =>
          // entreprise_config passe de table "singleton" (1 ligne globale,
          // id figé à 1) à 1 ligne PAR entreprise : on retire la contrainte
          // CHECK(id=1), on ajoute entreprise_id (rattaché par défaut à
          // l'entreprise 1 = les réglages déjà saisis), on le rend unique
          // (1 config par entreprise), et on bascule "id" sur une séquence
          // auto-incrémentée (au lieu de DEFAULT 1) pour permettre l'ajout
          // de nouvelles lignes lors de la création de nouvelles entreprises.
          client.query(`ALTER TABLE entreprise_config DROP CONSTRAINT IF EXISTS entreprise_config_id_unique;`)
            .then(() => client.query(`
              ALTER TABLE entreprise_config ADD COLUMN IF NOT EXISTS entreprise_id INTEGER REFERENCES entreprises(id);
              UPDATE entreprise_config SET entreprise_id = 1 WHERE entreprise_id IS NULL;
            `))
            .then(() => client.query(`
              DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entreprise_config_entreprise_unique') THEN
                  ALTER TABLE entreprise_config ADD CONSTRAINT entreprise_config_entreprise_unique UNIQUE (entreprise_id);
                END IF;
              END $$;
            `))
            .then(() => client.query(`
              CREATE SEQUENCE IF NOT EXISTS entreprise_config_id_seq;
              SELECT setval('entreprise_config_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM entreprise_config), false);
              ALTER TABLE entreprise_config ALTER COLUMN id SET DEFAULT nextval('entreprise_config_id_seq');
              ALTER SEQUENCE entreprise_config_id_seq OWNED BY entreprise_config.id;
            `))
        )
        .then(() => console.log("✅ Table 'entreprise_config' restructurée pour le multi-entreprises (1 ligne par entreprise)."))
        .catch((e) => console.error("⚠️  Restructuration entreprise_config ignorée :", e.message))
        // ── Migration : PKs composites (code, entreprise_id) sur articles et
        //    factures, FKs composites sur lignes_vente et achats.
        //    Objectif : que CHAQUE ENTREPRISE puisse librement choisir ses
        //    propres codes (même identiques à ceux d'autres entreprises).
        //    Un code est unique PAR entreprise mais deux entreprises différentes
        //    peuvent utiliser le même code sans aucune contrainte.
        .then(() =>
          client.query(`
            DO $mk_composite$
            DECLARE r RECORD;
            BEGIN
              -- 0. Supprimer toutes les contraintes UNIQUE standalone sur
              --    articles.code et factures.code (une seule colonne) qui
              --    bloqueraient le même code dans deux entreprises différentes.
              --    Seule la PK composite (code, entreprise_id) doit subsister.
              FOR r IN
                SELECT c.conname, t.relname AS tbl
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE c.contype = 'u'
                  AND t.relname IN ('articles', 'factures')
                  AND array_length(c.conkey, 1) = 1
              LOOP
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
              END LOOP;

              -- 1. Backfill NULL entreprise_id (sécurité, ne devrait pas arriver)
              UPDATE articles     SET entreprise_id = 1 WHERE entreprise_id IS NULL;
              UPDATE factures     SET entreprise_id = 1 WHERE entreprise_id IS NULL;
              UPDATE lignes_vente SET entreprise_id = 1 WHERE entreprise_id IS NULL;
              UPDATE achats       SET entreprise_id = 1 WHERE entreprise_id IS NULL;

              -- 2. Contraintes NOT NULL
              BEGIN ALTER TABLE articles     ALTER COLUMN entreprise_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END;
              BEGIN ALTER TABLE factures     ALTER COLUMN entreprise_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END;
              BEGIN ALTER TABLE lignes_vente ALTER COLUMN entreprise_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END;
              BEGIN ALTER TABLE achats       ALTER COLUMN entreprise_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END;

              -- 3. Supprimer toutes les FKs qui pointent vers articles(code)
              FOR r IN
                SELECT c.conname, t.relname AS tbl
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE c.confrelid = 'articles'::regclass AND c.contype = 'f'
              LOOP
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
              END LOOP;

              -- 4. Supprimer toutes les FKs qui pointent vers factures(code)
              FOR r IN
                SELECT c.conname, t.relname AS tbl
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE c.confrelid = 'factures'::regclass AND c.contype = 'f'
              LOOP
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
              END LOOP;

              -- 5. PK composite sur articles (code, entreprise_id)
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'articles'::regclass
                  AND contype = 'p'
                  AND array_length(conkey, 1) > 1
              ) THEN
                ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_pkey;
                ALTER TABLE articles ADD PRIMARY KEY (code, entreprise_id);
              END IF;

              -- 6. PK composite sur factures (code, entreprise_id)
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'factures'::regclass
                  AND contype = 'p'
                  AND array_length(conkey, 1) > 1
              ) THEN
                ALTER TABLE factures DROP CONSTRAINT IF EXISTS factures_pkey;
                ALTER TABLE factures ADD PRIMARY KEY (code, entreprise_id);
              END IF;

              -- 7. FKs composites sur lignes_vente
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lignes_vente_article_fkey') THEN
                ALTER TABLE lignes_vente ADD CONSTRAINT lignes_vente_article_fkey
                  FOREIGN KEY (article_code, entreprise_id) REFERENCES articles(code, entreprise_id);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lignes_vente_facture_fkey') THEN
                ALTER TABLE lignes_vente ADD CONSTRAINT lignes_vente_facture_fkey
                  FOREIGN KEY (facture_code, entreprise_id) REFERENCES factures(code, entreprise_id) ON DELETE CASCADE;
              END IF;

              -- 8. FK composite sur achats
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achats_article_fkey') THEN
                ALTER TABLE achats ADD CONSTRAINT achats_article_fkey
                  FOREIGN KEY (article_code, entreprise_id) REFERENCES articles(code, entreprise_id);
              END IF;
            END;
            $mk_composite$;
          `)
        )
        .then(() => console.log("✅ PKs composites (code, entreprise_id) sur articles/factures + FKs composites."))
        .catch((e) => console.error("⚠️  Migration PKs composites ignorée :", e.message))
        .then(() => {
          // Compte SuperAdmin de plateforme (entreprise_id = NULL — détaché de
          // toute entreprise, voit/gère tout).
          //
          // Créé UNE SEULE FOIS (ON CONFLICT DO NOTHING) : si le compte existe
          // déjà, on ne touche plus à son mot de passe — sinon tout changement
          // de mot de passe effectué depuis l'interface serait silencieusement
          // annulé au prochain redémarrage du serveur.
          //
          // Le mot de passe initial peut être fourni via la variable d'env
          // SUPERADMIN_INITIAL_PASSWORD (recommandé en production). À défaut,
          // un mot de passe aléatoire fort est généré et affiché UNE SEULE FOIS
          // dans les logs au moment de la création du compte — plus aucun mot
          // de passe par défaut connu/codé en dur n'existe dans le code source.
          const bcrypt = require("bcryptjs");
          const crypto = require("crypto");
          const { isPasswordValid } = require("../utils/passwordPolicy");
          const SUPERADMIN_LOGIN = "superadmin";

          function generateSecurePassword() {
            const lower   = "abcdefghijkmnpqrstuvwxyz";
            const upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const digits  = "23456789";
            const special = "!@#$%&*?";
            const all = lower + upper + digits + special;
            const pick = (set) => set[crypto.randomInt(set.length)];
            let pwd = pick(upper) + pick(lower) + pick(digits) + pick(special);
            for (let i = 0; i < 12; i++) pwd += pick(all);
            return pwd.split("").sort(() => crypto.randomInt(3) - 1).join("");
          }

          let SUPERADMIN_MDP = process.env.SUPERADMIN_INITIAL_PASSWORD;
          let generated = false;
          if (!SUPERADMIN_MDP || !isPasswordValid(SUPERADMIN_MDP)) {
            SUPERADMIN_MDP = generateSecurePassword();
            generated = true;
          }

          return bcrypt.hash(SUPERADMIN_MDP, 10).then((hash) =>
            client.query(
              `INSERT INTO utilisateurs (login, mdp_hash, categorie, entreprise_id, actif,
                 perm_vente, perm_appro, perm_articles, perm_facturation, perm_clients)
               VALUES ($1, $2, 'SuperAdmin', NULL, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE)
               ON CONFLICT (login) DO NOTHING
               RETURNING id`,
              [SUPERADMIN_LOGIN, hash]
            ).then((result) => {
              if (result.rowCount > 0) {
                console.log("════════════════════════════════════════════════════════════");
                console.log(`🔑 Compte SUPERADMIN créé — login : ${SUPERADMIN_LOGIN}`);
                if (generated) {
                  console.log(`🔑 Mot de passe généré aléatoirement : ${SUPERADMIN_MDP}`);
                  console.log("⚠️  Notez-le et changez-le immédiatement après la première connexion.");
                  console.log("⚠️  Il ne sera plus jamais affiché — définissez SUPERADMIN_INITIAL_PASSWORD");
                  console.log("⚠️  pour fixer ce mot de passe initial lors des prochains déploiements.");
                } else {
                  console.log("🔑 Mot de passe initial défini via SUPERADMIN_INITIAL_PASSWORD.");
                }
                console.log("════════════════════════════════════════════════════════════");
              }
            })
          );
        })
        .then(() => console.log("✅ Compte 'SuperAdmin' vérifié (plateforme multi-entreprises)."))
        .catch((e) => console.error("⚠️  Création SuperAdmin ignorée :", e.message))
        // ── Migration : colonnes abonnement sur entreprises ─────────────────
        // abonnement_type : 'essai' | 'mensuel' | 'annuel' | 'illimite'
        // abonnement_debut / abonnement_fin : dates de la période souscrite
        .then(() =>
          client.query(`
            ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS abonnement_type VARCHAR(20) DEFAULT 'mensuel';
            ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS abonnement_debut DATE;
            ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS abonnement_fin   DATE;
          `)
        )
        .then(() => console.log("✅ Colonnes abonnement sur 'entreprises' vérifiées."))
        .catch((e) => console.error("⚠️  Migration abonnement ignorée :", e.message))
        // ── Migration : factures.statut → GENERATED ALWAYS ─────────────────
        // BUG CORRIGÉ : "statut" était déclaré BOOLEAN DEFAULT FALSE (jamais
        // mis à jour automatiquement) — ce qui faisait que toutes les factures
        // restaient "Impayées" dans les rapports même après règlement complet.
        // Solution : recréer "statut" comme colonne GENERATED ALWAYS AS
        // (montant_paye >= montant), exactement comme "reste".
        // On vérifie d'abord si la colonne est déjà générée (pg_attribute.attgenerated = 's')
        // pour rendre la migration idempotente et sûre à rejouer à chaque démarrage.
        .then(() =>
          client.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_attribute a
                JOIN pg_class c ON c.oid = a.attrelid
                WHERE c.relname = 'factures'
                  AND a.attname = 'statut'
                  AND a.attgenerated = 's'
              ) THEN
                ALTER TABLE factures DROP COLUMN IF EXISTS statut;
                ALTER TABLE factures ADD COLUMN statut BOOLEAN
                  GENERATED ALWAYS AS (montant_paye >= montant) STORED;
              END IF;
            END $$;
          `)
        )
        .then(() => console.log("✅ factures.statut converti en GENERATED ALWAYS AS (montant_paye >= montant)."))
        .catch((e) => console.error("⚠️  Migration factures.statut ignorée :", e.message))
        // ── Migration : images produits ──────────────────────────────────────
        // Ajoute image_url (TEXT, nullable) sur la table articles pour stocker
        // les photos de produits compressées en base64 (JPEG ~15-30 Ko chacune).
        // La vue vue_stock est recrée pour exposer image_url au frontend.
        // Migration idempotente : IF NOT EXISTS / DROP+CREATE sûrs à rejouer.
        .then(() =>
          client.query(`
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;
            DROP VIEW IF EXISTS vue_stock;
            CREATE VIEW vue_stock AS
            SELECT
              a.entreprise_id,
              a.code,
              a.libelle,
              a.prix_achat,
              a.prix_vente,
              a.stock_min,
              a.actif,
              a.image_url,
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
              SELECT article_code, entreprise_id, SUM(quantite) AS total
              FROM achats
              GROUP BY article_code, entreprise_id
            ) ent ON ent.article_code = a.code AND ent.entreprise_id = a.entreprise_id
            LEFT JOIN (
              SELECT article_code, entreprise_id, SUM(quantite) AS total
              FROM lignes_vente
              GROUP BY article_code, entreprise_id
            ) sor ON sor.article_code = a.code AND sor.entreprise_id = a.entreprise_id;
          `)
        )
        .then(() => console.log("✅ Migration images : articles.image_url + vue_stock mise à jour."))
        .catch((e) => console.error("⚠️  Migration images ignorée :", e.message))
        // ── Migration : politique de mot de passe renforcée ──────────────────
        // Ajoute la colonne must_change_password (BOOLEAN) sur utilisateurs et,
        // lors de l'ajout initial uniquement, marque tous les comptes existants
        // (hors SuperAdmin, dont le mot de passe respecte déjà la nouvelle
        // politique) pour qu'ils soient forcés de définir un nouveau mot de
        // passe conforme (8+ car., majuscule, minuscule, chiffre, spécial) à
        // leur prochaine connexion.
        .then(() =>
          client.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='utilisateurs' AND column_name='must_change_password'
              ) THEN
                ALTER TABLE utilisateurs ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE NOT NULL;
                UPDATE utilisateurs SET must_change_password = TRUE WHERE categorie != 'SuperAdmin';
              END IF;
            END $$;
          `)
        )
        .then(() => console.log("✅ Colonne 'must_change_password' vérifiée + comptes existants marqués pour changement de mot de passe."))
        .catch((e) => console.error("⚠️  Migration must_change_password ignorée :", e.message))
        // ── Migration : styles de documents PDF (factures/reçus/rapports) ────
        // Chaque entreprise peut choisir, parmi un catalogue de styles (6 mises
        // en page × 5 palettes de couleurs = 30 combinaisons), l'apparence de
        // ses factures, reçus et rapports financiers PDF. Valeur par défaut
        // "classic-bleu" = design historique avec la couleur d'accent existante.
        .then(() =>
          client.query(`
            ALTER TABLE entreprise_config ADD COLUMN IF NOT EXISTS facture_style VARCHAR(30) DEFAULT 'classic-bleu';
            ALTER TABLE entreprise_config ADD COLUMN IF NOT EXISTS recu_style    VARCHAR(30) DEFAULT 'classic-bleu';
            ALTER TABLE entreprise_config ADD COLUMN IF NOT EXISTS rapport_style VARCHAR(30) DEFAULT 'classic-bleu';
          `)
        )
        .then(() => console.log("✅ Colonnes 'facture_style/recu_style/rapport_style' vérifiées (catalogue de styles PDF)."))
        .catch((e) => console.error("⚠️  Migration styles PDF ignorée :", e.message))
        // ── Migration : contrainte CHECK clients_fournisseurs.type ───────────
        // Sur certaines bases existantes, cette contrainte n'autorisait que
        // les valeurs singulières ('Client','Fournisseur','Les deux'). Le code
        // (auto-réparation des fournisseurs orphelins, filtres ?type=...)
        // utilise désormais aussi les valeurs plurielles 'Clients'/'Fournisseurs'.
        // Une INSERT avec une valeur non autorisée par l'ancienne contrainte
        // provoquait une erreur 500 sur GET /api/clients. On recrée la
        // contrainte pour autoriser toutes les valeurs utilisées.
        .then(() =>
          client.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
              FOR r IN
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class t ON t.oid = con.conrelid
                WHERE t.relname = 'clients_fournisseurs'
                  AND con.contype = 'c'
                  AND pg_get_constraintdef(con.oid) ILIKE '%type%'
              LOOP
                EXECUTE format('ALTER TABLE clients_fournisseurs DROP CONSTRAINT IF EXISTS %I', r.conname);
              END LOOP;

              ALTER TABLE clients_fournisseurs
                ADD CONSTRAINT clients_fournisseurs_type_check
                CHECK (type IN ('Client','Fournisseur','Les deux','Clients','Fournisseurs'));
            END $$;
          `)
        )
        .then(() => console.log("✅ Contrainte clients_fournisseurs.type mise à jour (valeurs plurielles autorisées)."))
        .catch((e) => console.error("⚠️  Migration contrainte type clients_fournisseurs ignorée :", e.message))
        .then(() =>
          client.query(`
            UPDATE clients_fournisseurs SET adresse = '' WHERE adresse IS NULL;
          `)
        )
        .then(() =>
          client.query(`
            ALTER TABLE clients_fournisseurs ALTER COLUMN adresse SET NOT NULL;
          `)
        )
        .then(() => console.log("✅ Colonne 'adresse' rendue obligatoire sur clients_fournisseurs."))
        .catch((e) => console.error("⚠️  Migration adresse NOT NULL ignorée :", e.message))
        // ── Migration : index manquants (cloisonnement entreprise, dates, FKs) ──
        // Sans ces index, chaque requête filtrée par entreprise_id (présente sur
        // quasi toutes les requêtes de l'application multi-tenant) ou par plage
        // de dates (rapports, historiques) fait un scan séquentiel complet —
        // négligeable avec peu de données, mais coûteux dès que les tables
        // grossissent. CREATE INDEX IF NOT EXISTS : idempotent, sûr à rejouer.
        .then(() =>
          client.query(`
            CREATE INDEX IF NOT EXISTS idx_utilisateurs_entreprise        ON utilisateurs(entreprise_id);
            CREATE INDEX IF NOT EXISTS idx_clients_fournisseurs_entreprise ON clients_fournisseurs(entreprise_id);

            CREATE INDEX IF NOT EXISTS idx_factures_entreprise_date  ON factures(entreprise_id, date_facture);
            CREATE INDEX IF NOT EXISTS idx_factures_client           ON factures(client_id);

            CREATE INDEX IF NOT EXISTS idx_lignes_vente_entreprise_date ON lignes_vente(entreprise_id, date_vente);
            CREATE INDEX IF NOT EXISTS idx_lignes_vente_article         ON lignes_vente(article_code, entreprise_id);
            CREATE INDEX IF NOT EXISTS idx_lignes_vente_facture         ON lignes_vente(facture_code, entreprise_id);

            CREATE INDEX IF NOT EXISTS idx_achats_entreprise_date ON achats(entreprise_id, date_achat);
            CREATE INDEX IF NOT EXISTS idx_achats_article         ON achats(article_code, entreprise_id);
            CREATE INDEX IF NOT EXISTS idx_achats_fournisseur     ON achats(fournisseur_id);

            CREATE INDEX IF NOT EXISTS idx_audit_log_entreprise ON audit_log(entreprise_id);
            CREATE INDEX IF NOT EXISTS idx_audit_log_created    ON audit_log(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log(user_id);
          `)
        )
        .then(() => console.log("✅ Index DB vérifiés (entreprise_id, dates, article_code, FKs)."))
        .catch((e) => console.error("⚠️  Migration index ignorée :", e.message))
        // ── Migration : coût historique (COGS) figé à la vente ──────────────
        // Ajoute lignes_vente.prix_achat (NUMERIC) : capture le prix d'achat de
        // l'article AU MOMENT DE LA VENTE, pour calculer un coût des marchandises
        // vendues (COGS) et une marge bénéficiaire fiables — indépendants des
        // changements ultérieurs de prix d'achat dans articles. Backfill des
        // lignes existantes avec le prix d'achat ACTUEL de l'article (meilleure
        // estimation disponible pour l'historique).
        .then(() =>
          client.query(`
            ALTER TABLE lignes_vente ADD COLUMN IF NOT EXISTS prix_achat NUMERIC DEFAULT 0;

            UPDATE lignes_vente lv
            SET prix_achat = a.prix_achat
            FROM articles a
            WHERE a.code = lv.article_code
              AND a.entreprise_id = lv.entreprise_id
              AND lv.prix_achat = 0;
          `)
        )
        .then(() => console.log("✅ Colonne 'lignes_vente.prix_achat' vérifiée (coût historique figé à la vente)."))
        .catch((e) => console.error("⚠️  Migration prix_achat lignes_vente ignorée :", e.message))
        .finally(() => release());
    });
});

module.exports = pool;
