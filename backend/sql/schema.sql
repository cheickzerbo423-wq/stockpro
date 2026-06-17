-- ============================================================
-- WariGest — Schéma PostgreSQL (multi-entreprises)
-- ============================================================
-- Régénéré pour correspondre à l'état RÉEL de la base après application
-- de toutes les migrations historiques de src/config/db.js : table
-- "entreprises" (multi-tenant), entreprise_id sur toutes les tables
-- cloisonnées, "entreprise_config" par entreprise (styles PDF inclus),
-- image_url sur articles, must_change_password sur utilisateurs,
-- prix_achat figé sur lignes_vente (coût historique/COGS), PKs/FKs
-- composites (code, entreprise_id), vue_stock sans produit cartésien,
-- et les index de performance.
--
-- Ce script crée un schéma directement utilisable ("npm run db:init"
-- sur une base vide). Au démarrage du serveur, src/config/db.js exécute
-- en plus une série de migrations idempotentes (ALTER ... IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, etc.) : sur un schéma déjà à jour comme
-- celui-ci, elles ne font rien — elles restent utiles pour mettre à
-- niveau une base existante plus ancienne.
--
-- AUCUN compte utilisateur n'est créé par ce script : le compte
-- SUPERADMIN de la plateforme est créé automatiquement par db.js au
-- premier démarrage du serveur (mot de passe défini via la variable
-- d'environnement SUPERADMIN_INITIAL_PASSWORD, ou généré aléatoirement
-- et affiché une seule fois dans les logs).
-- ============================================================

-- Nettoyage complet avant recréation
DROP VIEW  IF EXISTS vue_stock CASCADE;
DROP TABLE IF EXISTS audit_log            CASCADE;
DROP TABLE IF EXISTS achats               CASCADE;
DROP TABLE IF EXISTS lignes_vente         CASCADE;
DROP TABLE IF EXISTS factures             CASCADE;
DROP TABLE IF EXISTS clients_fournisseurs CASCADE;
DROP TABLE IF EXISTS utilisateurs         CASCADE;
DROP TABLE IF EXISTS articles             CASCADE;
DROP TABLE IF EXISTS entreprise_config    CASCADE;
DROP TABLE IF EXISTS entreprises          CASCADE;

-- ── Entreprises (multi-tenant) ───────────────────────────────
-- Chaque société cliente de WariGest dispose de son propre espace
-- cloisonné (articles, ventes, clients, factures, utilisateurs...).
-- Le SuperAdmin (entreprise_id = NULL) pilote l'ensemble depuis la
-- page Super-admin.
CREATE TABLE entreprises (
  id               SERIAL        PRIMARY KEY,
  nom              VARCHAR(150)  NOT NULL,
  slug             VARCHAR(100)  UNIQUE,
  actif            BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Abonnement : 'essai' | 'mensuel' | 'annuel' | 'illimite'
  abonnement_type  VARCHAR(20)   DEFAULT 'mensuel',
  abonnement_debut DATE,
  abonnement_fin   DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Entreprise par défaut (id = 1) : rattache les données pré-existantes
-- d'une installation antérieure au multi-tenant.
INSERT INTO entreprises (id, nom, slug) VALUES (1, 'Entreprise par défaut', 'default');
SELECT setval('entreprises_id_seq', (SELECT MAX(id) FROM entreprises));

-- ── Personnalisation par entreprise (PDF factures/reçus/rapports) ───
-- 1 ligne par entreprise (entreprise_id UNIQUE) : logo, coordonnées,
-- devise, couleur d'accent, pied de page, et choix de style PDF
-- (catalogue de 6 mises en page × 5 palettes = 30 combinaisons).
CREATE TABLE entreprise_config (
  id            SERIAL        PRIMARY KEY,
  entreprise_id INTEGER       NOT NULL REFERENCES entreprises(id),
  nom           VARCHAR(150),
  adresse       VARCHAR(255),
  telephone     VARCHAR(50),
  email         VARCHAR(150),
  devise        VARCHAR(10)   DEFAULT 'FCFA',
  couleur       VARCHAR(10)   DEFAULT '#0023FF',
  logo          TEXT,
  pied_de_page  VARCHAR(255),
  facture_style VARCHAR(30)   DEFAULT 'classic-bleu',
  recu_style    VARCHAR(30)   DEFAULT 'classic-bleu',
  rapport_style VARCHAR(30)   DEFAULT 'classic-bleu',
  updated_at    TIMESTAMP     DEFAULT NOW(),
  CONSTRAINT entreprise_config_entreprise_unique UNIQUE (entreprise_id)
);

INSERT INTO entreprise_config (entreprise_id, devise, couleur) VALUES (1, 'FCFA', '#0023FF');

-- ── Utilisateurs ────────────────────────────────────────────
-- entreprise_id = NULL réservé au compte SuperAdmin de plateforme
-- (categorie = 'SuperAdmin'), créé automatiquement par db.js.
CREATE TABLE utilisateurs (
  id                   SERIAL        PRIMARY KEY,
  login                VARCHAR(50)   NOT NULL UNIQUE,
  mdp_hash             VARCHAR(255)  NOT NULL,
  categorie            VARCHAR(20)   NOT NULL DEFAULT 'Vendeur',
  entreprise_id        INTEGER       REFERENCES entreprises(id),
  perm_vente           BOOLEAN       NOT NULL DEFAULT TRUE,
  perm_appro           BOOLEAN       NOT NULL DEFAULT FALSE,
  perm_articles        BOOLEAN       NOT NULL DEFAULT FALSE,
  perm_facturation     BOOLEAN       NOT NULL DEFAULT TRUE,
  perm_clients         BOOLEAN       NOT NULL DEFAULT TRUE,
  actif                BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Force l'utilisateur à définir un nouveau mot de passe (conforme à la
  -- politique : 8+ car., majuscule, minuscule, chiffre, caractère spécial)
  -- à sa prochaine connexion.
  must_change_password BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Articles ────────────────────────────────────────────────
-- PK composite (code, entreprise_id) : chaque entreprise choisit
-- librement ses propres codes, même identiques à ceux d'une autre
-- entreprise.
CREATE TABLE articles (
  code          VARCHAR(20)    NOT NULL,
  libelle       VARCHAR(200)   NOT NULL,
  prix_achat    NUMERIC(15,2)  NOT NULL DEFAULT 0,
  prix_vente    NUMERIC(15,2)  NOT NULL DEFAULT 0,
  stock_min     INTEGER        NOT NULL DEFAULT 5,
  actif         BOOLEAN        NOT NULL DEFAULT TRUE,
  -- Photo produit (data URI base64, JPEG compressé ~15-30 Ko)
  image_url     TEXT,
  entreprise_id INTEGER        NOT NULL REFERENCES entreprises(id),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code, entreprise_id)
);

-- ── Clients / Fournisseurs ───────────────────────────────────
CREATE TABLE clients_fournisseurs (
  id            SERIAL        PRIMARY KEY,
  nom           VARCHAR(150)  NOT NULL,
  type          VARCHAR(20)   NOT NULL DEFAULT 'Client'
                CHECK (type IN ('Client','Fournisseur','Les deux','Clients','Fournisseurs')),
  contact       VARCHAR(100),
  telephone     VARCHAR(30),
  email         VARCHAR(150),
  ville         VARCHAR(100),
  adresse       TEXT          NOT NULL DEFAULT '',
  actif         BOOLEAN       NOT NULL DEFAULT TRUE,
  entreprise_id INTEGER       NOT NULL REFERENCES entreprises(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Factures ────────────────────────────────────────────────
-- PK composite (code, entreprise_id). "reste" et "statut" sont des
-- colonnes calculées (GENERATED ALWAYS) : ne jamais leur fournir de
-- valeur explicite dans un INSERT/UPDATE.
CREATE TABLE factures (
  code           VARCHAR(50)   NOT NULL,
  client_nom     VARCHAR(150)  NOT NULL,
  client_id      INTEGER       REFERENCES clients_fournisseurs(id) ON DELETE SET NULL,
  user_id        INTEGER       REFERENCES utilisateurs(id) ON DELETE SET NULL,
  entreprise_id  INTEGER       NOT NULL REFERENCES entreprises(id),
  date_facture   DATE          NOT NULL DEFAULT CURRENT_DATE,
  montant        NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_paye   NUMERIC(15,2) NOT NULL DEFAULT 0,
  monnaie_rendue NUMERIC(15,2) NOT NULL DEFAULT 0,
  reste          NUMERIC(15,2) GENERATED ALWAYS AS (montant - montant_paye) STORED,
  statut         BOOLEAN       GENERATED ALWAYS AS (montant_paye >= montant) STORED,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code, entreprise_id)
);

-- ── Lignes de vente ─────────────────────────────────────────
-- prix_achat : prix d'achat de l'article CAPTURÉ AU MOMENT DE LA VENTE
-- (coût historique figé) — base du calcul du COGS et de la marge
-- bénéficiaire, indépendante des changements ultérieurs du prix
-- d'achat dans "articles".
CREATE TABLE lignes_vente (
  id            SERIAL        PRIMARY KEY,
  facture_code  VARCHAR(50)   NOT NULL,
  article_code  VARCHAR(20)   NOT NULL,
  entreprise_id INTEGER       NOT NULL REFERENCES entreprises(id),
  user_id       INTEGER       REFERENCES utilisateurs(id) ON DELETE SET NULL,
  libelle       VARCHAR(200)  NOT NULL,
  client_nom    VARCHAR(150)  NOT NULL DEFAULT '',
  quantite      NUMERIC(15,3) NOT NULL DEFAULT 1,
  prix_vente    NUMERIC(15,2) NOT NULL DEFAULT 0,
  prix_achat    NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_total NUMERIC(15,2) GENERATED ALWAYS AS (quantite * prix_vente) STORED,
  mois          VARCHAR(20),
  date_vente    DATE          NOT NULL DEFAULT CURRENT_DATE,
  annee         INTEGER       GENERATED ALWAYS AS (EXTRACT(YEAR FROM date_vente)::INTEGER) STORED,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT lignes_vente_article_fkey FOREIGN KEY (article_code, entreprise_id) REFERENCES articles(code, entreprise_id),
  CONSTRAINT lignes_vente_facture_fkey FOREIGN KEY (facture_code, entreprise_id) REFERENCES factures(code, entreprise_id) ON DELETE CASCADE
);

-- ── Achats / Approvisionnements ─────────────────────────────
CREATE TABLE achats (
  id              SERIAL        PRIMARY KEY,
  article_code    VARCHAR(20)   NOT NULL,
  entreprise_id   INTEGER       NOT NULL REFERENCES entreprises(id),
  user_id         INTEGER       REFERENCES utilisateurs(id) ON DELETE SET NULL,
  fournisseur_id  INTEGER       REFERENCES clients_fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom VARCHAR(150),
  libelle         VARCHAR(200)  NOT NULL,
  quantite        NUMERIC(15,3) NOT NULL DEFAULT 1,
  prix_achat      NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_total   NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_paye    NUMERIC(15,2) NOT NULL DEFAULT 0,
  date_achat      DATE          NOT NULL DEFAULT CURRENT_DATE,
  mois            VARCHAR(20),
  annee           INTEGER,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT achats_article_fkey FOREIGN KEY (article_code, entreprise_id) REFERENCES articles(code, entreprise_id)
);

-- ── Journal d'audit ─────────────────────────────────────────
-- "detail" : résumé JSON (body/params sanitisés, tronqué à 500 car.)
-- de l'action effectuée — colonne texte, pas JSONB (la troncature peut
-- produire un JSON invalide, c'est volontaire : usage purement
-- informatif/diagnostic).
CREATE TABLE audit_log (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      REFERENCES utilisateurs(id) ON DELETE SET NULL,
  user_login    VARCHAR(50),
  action        VARCHAR(50)  NOT NULL,
  table_cible   VARCHAR(50),
  detail        TEXT,
  ip_address    VARCHAR(50),
  entreprise_id INTEGER      REFERENCES entreprises(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VUE STOCK
-- ============================================================
-- Agrège séparément les quantités achetées et vendues PAR
-- (article_code, entreprise_id) avant de les joindre à "articles" —
-- évite tout produit cartésien entre achats et lignes_vente.
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

-- ============================================================
-- INDEX (cloisonnement entreprise, dates, FKs)
-- ============================================================
CREATE INDEX idx_utilisateurs_entreprise        ON utilisateurs(entreprise_id);
CREATE INDEX idx_clients_fournisseurs_entreprise ON clients_fournisseurs(entreprise_id);

CREATE INDEX idx_factures_entreprise_date  ON factures(entreprise_id, date_facture);
CREATE INDEX idx_factures_client           ON factures(client_id);

CREATE INDEX idx_lignes_vente_entreprise_date ON lignes_vente(entreprise_id, date_vente);
CREATE INDEX idx_lignes_vente_article         ON lignes_vente(article_code, entreprise_id);
CREATE INDEX idx_lignes_vente_facture         ON lignes_vente(facture_code, entreprise_id);

CREATE INDEX idx_achats_entreprise_date ON achats(entreprise_id, date_achat);
CREATE INDEX idx_achats_article         ON achats(article_code, entreprise_id);
CREATE INDEX idx_achats_fournisseur     ON achats(fournisseur_id);

CREATE INDEX idx_audit_log_entreprise ON audit_log(entreprise_id);
CREATE INDEX idx_audit_log_created    ON audit_log(created_at);
CREATE INDEX idx_audit_log_user       ON audit_log(user_id);
