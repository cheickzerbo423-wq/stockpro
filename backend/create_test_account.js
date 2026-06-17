// Script ponctuel : crée une entreprise de test + un compte Admin de test
// pour permettre les tests UI manuels (login, navigation des pages internes)
// sans toucher au compte SuperAdmin réel.
//
// Usage : node create_test_account.js
// Peut être exécuté plusieurs fois sans danger (ON CONFLICT / vérifications).

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const TEST_ENTREPRISE_NOM = "Entreprise Test QA";
const TEST_ENTREPRISE_SLUG = "test-qa";
const TEST_LOGIN = "test_admin";
const TEST_PASSWORD = "TestQA@2026";

(async () => {
  try {
    // 1. Créer (ou récupérer) l'entreprise de test
    let res = await pool.query(
      `INSERT INTO entreprises (nom, slug, actif)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (slug) DO UPDATE SET actif = TRUE
       RETURNING id`,
      [TEST_ENTREPRISE_NOM, TEST_ENTREPRISE_SLUG]
    );
    const entrepriseId = res.rows[0].id;
    console.log(`Entreprise test id=${entrepriseId}`);

    // 2. Créer/mettre à jour le compte Admin de test (toutes permissions,
    //    pas de changement de mot de passe forcé pour faciliter les tests)
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    await pool.query(
      `INSERT INTO utilisateurs
         (login, mdp_hash, categorie, entreprise_id, actif,
          perm_vente, perm_appro, perm_articles, perm_facturation, perm_clients,
          must_change_password)
       VALUES ($1, $2, 'Admin', $3, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE)
       ON CONFLICT (login) DO UPDATE SET
         mdp_hash = $2,
         categorie = 'Admin',
         entreprise_id = $3,
         actif = TRUE,
         perm_vente = TRUE, perm_appro = TRUE, perm_articles = TRUE,
         perm_facturation = TRUE, perm_clients = TRUE,
         must_change_password = FALSE`,
      [TEST_LOGIN, hash, entrepriseId]
    );

    // 3. Config entreprise (devise, etc.) — idempotent
    await pool.query(
      `INSERT INTO entreprise_config (entreprise_id, nom, devise, couleur)
       VALUES ($1, $2, 'FCFA', '#0023FF')
       ON CONFLICT (entreprise_id) DO NOTHING`,
      [entrepriseId, TEST_ENTREPRISE_NOM]
    );

    console.log("════════════════════════════════════════");
    console.log("Compte de test créé / mis à jour :");
    console.log(`  login : ${TEST_LOGIN}`);
    console.log(`  mdp   : ${TEST_PASSWORD}`);
    console.log(`  entreprise_id : ${entrepriseId}`);
    console.log("════════════════════════════════════════");
  } catch (e) {
    console.error("ERREUR :", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
