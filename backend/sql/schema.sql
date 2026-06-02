-- ============================================================
-- StockPro — Schéma PostgreSQL (correspondant au code source)
-- ============================================================

-- Nettoyage complet avant recréation
DROP VIEW  IF EXISTS vue_stock CASCADE;
DROP TABLE IF EXISTS audit_log            CASCADE;
DROP TABLE IF EXISTS devis                CASCADE;
DROP TABLE IF EXISTS achats               CASCADE;
DROP TABLE IF EXISTS lignes_vente         CASCADE;
DROP TABLE IF EXISTS factures             CASCADE;
DROP TABLE IF EXISTS clients_fournisseurs CASCADE;
DROP TABLE IF EXISTS utilisateurs         CASCADE;
DROP TABLE IF EXISTS articles             CASCADE;
DROP TABLE IF EXISTS gammes               CASCADE;

-- ── Gammes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gammes (
  code       VARCHAR(20)  PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  actif      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Articles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  code           VARCHAR(20)    PRIMARY KEY,
  libelle        VARCHAR(200)   NOT NULL,
  prix_achat     NUMERIC(15,2)  NOT NULL DEFAULT 0,
  prix_vente     NUMERIC(15,2)  NOT NULL DEFAULT 0,
  stock_min      INTEGER        NOT NULL DEFAULT 5,
  gamme_code     VARCHAR(20)    REFERENCES gammes(code) ON DELETE SET NULL,
  unite_par_base INTEGER        NOT NULL DEFAULT 1,
  actif          BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Utilisateurs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id               SERIAL        PRIMARY KEY,
  login            VARCHAR(50)   NOT NULL UNIQUE,
  mdp_hash         VARCHAR(255)  NOT NULL,
  nom              VARCHAR(100),
  categorie        VARCHAR(20)   NOT NULL DEFAULT 'Vendeur',
  perm_vente       BOOLEAN       NOT NULL DEFAULT TRUE,
  perm_appro       BOOLEAN       NOT NULL DEFAULT FALSE,
  perm_articles    BOOLEAN       NOT NULL DEFAULT FALSE,
  perm_facturation BOOLEAN       NOT NULL DEFAULT TRUE,
  perm_clients     BOOLEAN       NOT NULL DEFAULT TRUE,
  actif            BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Clients / Fournisseurs ───────────────────────────────────
CREATE TABLE IF NOT EXISTS clients_fournisseurs (
  id         SERIAL        PRIMARY KEY,
  nom        VARCHAR(150)  NOT NULL,
  type       VARCHAR(20)   NOT NULL DEFAULT 'Client'
                           CHECK (type IN ('Client','Fournisseur','Les deux')),
  telephone  VARCHAR(30),
  email      VARCHAR(150),
  adresse    TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Factures ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
  code          VARCHAR(50)   PRIMARY KEY,
  client_nom    VARCHAR(150)  NOT NULL,
  client_id     INTEGER       REFERENCES clients_fournisseurs(id) ON DELETE SET NULL,
  user_id       INTEGER       REFERENCES utilisateurs(id) ON DELETE SET NULL,
  date_facture  DATE          NOT NULL DEFAULT CURRENT_DATE,
  montant       NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_paye  NUMERIC(15,2) NOT NULL DEFAULT 0,
  reste         NUMERIC(15,2) GENERATED ALWAYS AS (montant - montant_paye) STORED,
  statut        BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Lignes de vente ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lignes_vente (
  id            SERIAL        PRIMARY KEY,
  facture_code  VARCHAR(50)   NOT NULL REFERENCES factures(code) ON DELETE CASCADE,
  article_code  VARCHAR(20)   NOT NULL REFERENCES articles(code),
  user_id       INTEGER       REFERENCES utilisateurs(id) ON DELETE SET NULL,
  libelle       VARCHAR(200)  NOT NULL,
  quantite      NUMERIC(15,3) NOT NULL DEFAULT 1,
  prix_vente    NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  date_vente    DATE          NOT NULL DEFAULT CURRENT_DATE,
  annee         INTEGER       GENERATED ALWAYS AS (EXTRACT(YEAR FROM date_vente)::INTEGER) STORED,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Achats / Approvisionnements ─────────────────────────────
CREATE TABLE IF NOT EXISTS achats (
  id              SERIAL        PRIMARY KEY,
  article_code    VARCHAR(20)   NOT NULL REFERENCES articles(code),
  user_id         INTEGER       REFERENCES utilisateurs(id) ON DELETE SET NULL,
  fournisseur_id  INTEGER       REFERENCES clients_fournisseurs(id) ON DELETE SET NULL,
  libelle         VARCHAR(200)  NOT NULL,
  quantite        NUMERIC(15,3) NOT NULL DEFAULT 1,
  prix_unitaire   NUMERIC(15,2) NOT NULL DEFAULT 0,
  montant_total   NUMERIC(15,2) NOT NULL DEFAULT 0,
  fournisseur     VARCHAR(150),
  date_achat      DATE          NOT NULL DEFAULT CURRENT_DATE,
  annee           INTEGER       GENERATED ALWAYS AS (EXTRACT(YEAR FROM date_achat)::INTEGER) STORED,
  statut_paiement VARCHAR(20)   NOT NULL DEFAULT 'Non payé'
                                CHECK (statut_paiement IN ('Non payé','Partiellement payé','Payé')),
  montant_paye    NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Devis ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis (
  id            SERIAL        PRIMARY KEY,
  numero        VARCHAR(50)   NOT NULL UNIQUE,
  client_nom    VARCHAR(150)  NOT NULL,
  montant       NUMERIC(15,2) NOT NULL DEFAULT 0,
  date_emission DATE          NOT NULL DEFAULT CURRENT_DATE,
  commentaire   TEXT,
  num_commande  VARCHAR(50),
  statut        VARCHAR(20)   NOT NULL DEFAULT 'En attente'
                              CHECK (statut IN ('En attente','Valide','Refuse','Facture')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Journal d'audit ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           SERIAL       PRIMARY KEY,
  user_id      INTEGER      REFERENCES utilisateurs(id) ON DELETE SET NULL,
  user_login   VARCHAR(50),
  action       VARCHAR(50)  NOT NULL,
  table_cible  VARCHAR(50),
  ip_address   VARCHAR(50),
  details      JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VUE STOCK
-- ============================================================
CREATE OR REPLACE VIEW vue_stock AS
SELECT
  a.code,
  a.libelle,
  a.prix_achat,
  a.prix_vente,
  a.stock_min,
  a.gamme_code,
  a.unite_par_base,
  a.actif,
  COALESCE(SUM(ac.quantite), 0)                                                      AS entrees,
  COALESCE(SUM(lv.quantite), 0)                                                      AS sorties,
  COALESCE(SUM(ac.quantite), 0) - COALESCE(SUM(lv.quantite), 0)                     AS stock_restant,
  a.prix_vente * (COALESCE(SUM(ac.quantite), 0) - COALESCE(SUM(lv.quantite), 0))    AS valeur_stock,
  CASE
    WHEN COALESCE(SUM(ac.quantite), 0) - COALESCE(SUM(lv.quantite), 0) <= 0              THEN 'Rupture stock'
    WHEN COALESCE(SUM(ac.quantite), 0) - COALESCE(SUM(lv.quantite), 0) <= a.stock_min    THEN 'Stock faible'
    ELSE 'En stock'
  END AS statut
FROM articles a
LEFT JOIN achats       ac ON ac.article_code = a.code
LEFT JOIN lignes_vente lv ON lv.article_code = a.code
WHERE a.actif = TRUE
GROUP BY a.code, a.libelle, a.prix_achat, a.prix_vente, a.stock_min,
         a.gamme_code, a.unite_par_base, a.actif;

-- ============================================================
-- ADMIN PAR DÉFAUT — mot de passe : admin123
-- ============================================================
INSERT INTO utilisateurs (login, mdp_hash, nom, categorie,
  perm_vente, perm_appro, perm_articles, perm_facturation, perm_clients)
VALUES (
  'admin',
  '$2a$10$Qe/5zaVdvh35rigKbJgeleWn3q.EQOzzM3wBJnMEt4bhcavMUS/sC',
  'Administrateur',
  'Admin',
  TRUE, TRUE, TRUE, TRUE, TRUE
)
ON CONFLICT (login) DO NOTHING;
