// src/routes/index.js — Point d'entrée de toutes les routes
const express = require("express");
const router  = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const audit = require("../middleware/audit");

const authCtrl     = require("../controllers/authController");
const articlesCtrl = require("../controllers/articlesController");
const ventesCtrl   = require("../controllers/ventesController");
const achatsCtrl   = require("../controllers/achatsController");
const clientsCtrl  = require("../controllers/clientsController");
const facturesCtrl = require("../controllers/facturesController");
const usersCtrl    = require("../controllers/utilisateursController");
const rapportsCtrl = require("../controllers/rapportsController");
const entrepriseCtrl = require("../controllers/entrepriseController");

// ============================================================
// AUTH — Public
// ============================================================
router.post("/auth/login", authCtrl.login);
router.get ("/auth/me",    authenticate, authCtrl.me);

// ============================================================
// ARTICLES — Protégées
// ============================================================
router.get   ("/articles",                  authenticate, articlesCtrl.getAll);
router.get   ("/articles/generate-code",    authenticate, articlesCtrl.generateCode);
router.get   ("/articles/alertes/ruptures", authenticate, articlesCtrl.alertes);
router.get   ("/articles/:code",           authenticate, articlesCtrl.getOne);
router.post  ("/articles",                 authenticate, authorize("articles"), audit("CREATION", "articles"), articlesCtrl.create);
router.put   ("/articles/:code",           authenticate, authorize("articles"), audit("MODIFICATION", "articles"), articlesCtrl.update);
router.delete("/articles/:code",           authenticate, authorize("articles"), audit("SUPPRESSION", "articles"), articlesCtrl.remove);

// ============================================================
// VENTES
// ============================================================
router.get ("/ventes",       authenticate, authorize("vente"), ventesCtrl.getAll);
router.post("/ventes",       authenticate, authorize("vente"), audit("VENTE", "lignes_vente"), ventesCtrl.create);
router.get ("/ventes/stats", authenticate, ventesCtrl.stats);

// ============================================================
// ACHATS / APPROVISIONNEMENTS
// ============================================================
router.get   ("/achats",              authenticate, authorize("appro"), achatsCtrl.getAll);
router.post  ("/achats/scanner-facture", authenticate, authorize("appro"), achatsCtrl.scanFacture);
router.post  ("/achats",              authenticate, authorize("appro"), audit("ACHAT", "achats"), achatsCtrl.create);
router.put   ("/achats/:id/paiement", authenticate, authorize("appro"), audit("PAIEMENT", "achats"), achatsCtrl.updatePaiement);
router.delete("/achats/:id",          authenticate, authorize("appro"), audit("SUPPRESSION", "achats"), achatsCtrl.remove);

// ============================================================
// CLIENTS & FOURNISSEURS
// ============================================================
router.get   ("/clients",          authenticate, authorize("clients"), clientsCtrl.getAll);
router.get   ("/clients/:id/bilan",authenticate, authorize("clients"), clientsCtrl.getBilan);
router.post  ("/clients",          authenticate, authorize("clients"), audit("CREATION", "clients_fournisseurs"), clientsCtrl.create);
router.put   ("/clients/:id",      authenticate, authorize("clients"), audit("MODIFICATION", "clients_fournisseurs"), clientsCtrl.update);
router.delete("/clients/:id",      authenticate, authorize("clients"), audit("SUPPRESSION", "clients_fournisseurs"), clientsCtrl.remove);

// ============================================================
// FACTURES
// ============================================================
router.get("/factures",                              authenticate, authorize("facturation"), facturesCtrl.getAll);
// Routes avec regex pour supporter les codes contenant des "/" (ex: Fact17/03/2026A8073)
router.get(/^\/factures\/(.+)\/pdf$/,      authenticate, authorize("facturation"), facturesCtrl.generatePDF);
router.get(/^\/factures\/(.+)\/recu$/,     authenticate, authorize("facturation"), facturesCtrl.generateRecu);
router.put(/^\/factures\/(.+)\/paiement$/, authenticate, authorize("facturation"), audit("PAIEMENT", "factures"), facturesCtrl.updatePaiement);
router.get(/^\/factures\/(.+)$/,           authenticate, authorize("facturation"), facturesCtrl.getOne);

// ============================================================
// UTILISATEURS — Admin uniquement
// ============================================================
router.get   ("/utilisateurs",     authenticate, usersCtrl.getAll);
router.post  ("/utilisateurs",     authenticate, audit("CREATION_USER", "utilisateurs"), usersCtrl.create);
router.put   ("/utilisateurs/:id", authenticate, audit("MODIF_USER",    "utilisateurs"), usersCtrl.update);
router.delete("/utilisateurs/:id", authenticate, audit("SUPPRESSION_USER", "utilisateurs"), usersCtrl.remove);

router.post("/admin/reset", authenticate, usersCtrl.resetData);

// ============================================================
// ENTREPRISE — Personnalisation factures/reçus/rapports PDF
// (lecture : tout utilisateur connecté ; modification : admin uniquement,
// vérifié dans le contrôleur comme pour /utilisateurs)
// ============================================================
router.get("/entreprise", authenticate, entrepriseCtrl.getConfig);
router.put("/entreprise", authenticate, audit("MODIFICATION", "entreprise_config"), entrepriseCtrl.updateConfig);


// ============================================================
// RAPPORTS FINANCIERS
// ============================================================
router.get("/rapports",     authenticate, rapportsCtrl.getRapport);
router.get("/rapports/pdf", authenticate, rapportsCtrl.exportPDF);

// ============================================================
// TABLEAU DE BORD — Stats combinées
// ============================================================
router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const db = require("../config/db");
    const annee = new Date().getFullYear();

    const [totaux, alertes, caAnnee, topClients, recentFactures] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COALESCE(SUM(montant_total),0) FROM lignes_vente WHERE annee = $1)   AS ca_total,
          (SELECT COALESCE(SUM(valeur_stock),0)  FROM vue_stock WHERE actif = TRUE)      AS valeur_stock,
          -- depenses_total / benefice recalculés dynamiquement (prix_achat * quantite)
          -- au lieu de SUM(achats.montant_total) : cette colonne stockée peut être à 0
          -- sur d'anciens enregistrements (cf. correctif identique appliqué dans
          -- clientsController.js, ventesController.js et rapportsController.js).
          (SELECT COALESCE(SUM(prix_achat * quantite),0) FROM achats WHERE annee = $1)  AS depenses_total,
          (SELECT COALESCE(SUM(montant_total),0) FROM lignes_vente WHERE annee = $1)
           - (SELECT COALESCE(SUM(prix_achat * quantite),0) FROM achats WHERE annee = $1) AS benefice,
          (SELECT COUNT(*) FROM factures WHERE statut = FALSE)                           AS factures_impayees,
          (SELECT COALESCE(SUM(reste),0)  FROM factures WHERE statut = FALSE)           AS montant_a_recouvrer,
          (SELECT COALESCE(SUM(montant),0) FROM factures WHERE EXTRACT(YEAR FROM date_facture)=$1) AS ca_facture,
          (SELECT COALESCE(SUM(montant_paye),0) FROM factures WHERE EXTRACT(YEAR FROM date_facture)=$1) AS encaisse,
          (SELECT COUNT(*) FROM articles WHERE actif = TRUE)                            AS nb_articles,
          (SELECT COUNT(*) FROM factures WHERE EXTRACT(YEAR FROM date_facture)=$1)      AS nb_factures,
          (SELECT COUNT(DISTINCT UPPER(client_nom)) FROM lignes_vente WHERE annee = $1)  AS nb_clients
      `, [annee]),

      // Alertes stock
      db.query(`SELECT code, libelle, stock_restant, stock_min, statut FROM vue_stock WHERE actif = TRUE AND stock_restant <= stock_min ORDER BY stock_restant ASC LIMIT 8`),

      db.query(`
        SELECT TO_CHAR(date_vente, 'YYYY-MM') AS mois, SUM(montant_total)::bigint AS ca
        FROM lignes_vente WHERE annee = $1
        GROUP BY TO_CHAR(date_vente, 'YYYY-MM')
        ORDER BY TO_CHAR(date_vente, 'YYYY-MM')
      `, [annee]),

      db.query(`
        SELECT UPPER(client_nom) AS client_nom, SUM(montant_total)::bigint AS ca, COUNT(DISTINCT facture_code) AS nb_factures
        FROM lignes_vente WHERE annee = $1
        GROUP BY UPPER(client_nom) ORDER BY ca DESC LIMIT 5
      `, [annee]),

      db.query(`
        SELECT code, client_nom, montant, montant_paye, reste, statut, date_facture
        FROM factures ORDER BY created_at DESC LIMIT 6
      `),
    ]);

    res.json({
      kpis:             totaux.rows[0],
      alertes_stock:    alertes.rows,
      ca_par_mois:      caAnnee.rows,
      top_clients:      topClients.rows,
      recent_factures:  recentFactures.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur tableau de bord." });
  }
});

module.exports = router;
