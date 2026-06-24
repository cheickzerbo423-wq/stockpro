// src/services/index.js
// Tous les appels API organisés par module
import api, { fetchBlobAuthenticated, openBlob, downloadBlob, printBlob } from "./api";

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
export const authService = {
  login: (login, mdp) =>
    api.post("/auth/login", { login, mdp }).then((r) => r.data),

  me: () =>
    api.get("/auth/me").then((r) => r.data),

  // Changement de son propre mot de passe (disponible pour tout compte
  // connecté, y compris le SuperAdmin qui n'a pas de page Utilisateurs).
  changePassword: (mdp_actuel, nouveau_mdp) =>
    api.put("/auth/password", { mdp_actuel, nouveau_mdp }).then((r) => r.data),

  logout: () => {
    localStorage.removeItem("warigest_token");
    localStorage.removeItem("warigest_user");
  },
};

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
export const dashboardService = {
  getStats: () =>
    api.get("/dashboard").then((r) => r.data),
};

// ══════════════════════════════════════════
// ARTICLES
// ══════════════════════════════════════════
export const articlesService = {
  getAll: (search = "") =>
    api.get("/articles", { params: { search } }).then((r) => r.data),

  getOne: (code) =>
    api.get(`/articles/${code}`).then((r) => r.data),

  create: (data) =>
    api.post("/articles", data).then((r) => r.data),

  update: (code, data) =>
    api.put(`/articles/${code}`, data).then((r) => r.data),

  delete: (code) =>
    api.delete(`/articles/${code}`).then((r) => r.data),

  getAlertes: () =>
    api.get("/articles/alertes/ruptures").then((r) => r.data),

  generateCode: (libelle) =>
    api.get("/articles/generate-code", { params: { libelle } }).then((r) => r.data),
};

// ══════════════════════════════════════════
// VENTES
// ══════════════════════════════════════════
export const ventesService = {
  getAll: (filters = {}) =>
    api.get("/ventes", { params: filters }).then((r) => r.data),

  // panier : [{ code, quantite, prix_vente }]
  create: ({ client_id, client_nom, date_vente, montant_paye, articles }) =>
    api.post("/ventes", { client_id, client_nom, date_vente, montant_paye, articles })
       .then((r) => r.data),

  getStats: (annee) =>
    api.get("/ventes/stats", { params: { annee } }).then((r) => r.data),
};

// ══════════════════════════════════════════
// ACHATS / APPROVISIONNEMENTS
// ══════════════════════════════════════════
export const achatsService = {
  getAll: (filters = {}) =>
    api.get("/achats", { params: filters }).then((r) => r.data),

  create: (data) =>
    api.post("/achats", data).then((r) => r.data),

  updatePaiement: (id, montant_paye) =>
    api.put(`/achats/${id}/paiement`, { montant_paye }).then((r) => r.data),

  delete: (id) =>
    api.delete(`/achats/${id}`).then((r) => r.data),
};

// ══════════════════════════════════════════
// CLIENTS & FOURNISSEURS
// ══════════════════════════════════════════
export const clientsService = {
  getAll: (type) =>
    api.get("/clients", { params: type ? { type } : {} }).then((r) => r.data),

  getBilan: (id) =>
    api.get(`/clients/${id}/bilan`).then((r) => r.data),

  create: (data) =>
    api.post("/clients", data).then((r) => r.data),

  update: (id, data) =>
    api.put(`/clients/${id}`, data).then((r) => r.data),

  delete: (id) =>
    api.delete(`/clients/${id}`).then((r) => r.data),
};

// ══════════════════════════════════════════
// FACTURES
// ══════════════════════════════════════════
export const facturesService = {
  getAll: (filters = {}) =>
    api.get("/factures", { params: filters }).then((r) => r.data),

  getOne: (code) =>
    api.get(`/factures/${encodeURIComponent(code)}`).then((r) => r.data),

  updatePaiement: (code, montant_paye) =>
    api.put(`/factures/${encodeURIComponent(code)}/paiement`, { montant_paye }).then((r) => r.data),

  // Ouvre le PDF dans un nouvel onglet
  openPDF: async (code) => {
    const blob = await fetchBlobAuthenticated(`/factures/${encodeURIComponent(code)}/pdf`);
    openBlob(blob, `Facture_${code}.pdf`);
  },

  // Télécharge le PDF directement
  downloadPDF: async (code) => {
    const blob = await fetchBlobAuthenticated(`/factures/${encodeURIComponent(code)}/pdf`);
    downloadBlob(blob, `Facture_${code}.pdf`);
  },

  openRecu: async (code) => {
    const blob = await fetchBlobAuthenticated(`/factures/${encodeURIComponent(code)}/recu`);
    openBlob(blob, `Recu_${code}.pdf`);
  },

  // Imprime la facture (PDF) via la fenêtre d'impression du système.
  printPDF: async (code) => {
    const blob = await fetchBlobAuthenticated(`/factures/${encodeURIComponent(code)}/pdf`);
    printBlob(blob, `Facture_${code}.pdf`);
  },

  // Imprime le reçu (PDF) via la fenêtre d'impression du système.
  printRecu: async (code) => {
    const blob = await fetchBlobAuthenticated(`/factures/${encodeURIComponent(code)}/recu`);
    printBlob(blob, `Recu_${code}.pdf`);
  },
};

// ══════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════
export const utilisateursService = {
  getAll: () =>
    api.get("/utilisateurs").then((r) => r.data),

  create: (data) =>
    api.post("/utilisateurs", data).then((r) => r.data),

  update: (id, data) =>
    api.put(`/utilisateurs/${id}`, data).then((r) => r.data),

  delete: (id) =>
    api.delete(`/utilisateurs/${id}`).then((r) => r.data),
};

// ══════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════
export const adminService = {
  reset: (modules) =>
    api.post("/admin/reset", { modules }).then((r) => r.data),
};

// ══════════════════════════════════════════
// ENTREPRISE — Personnalisation factures/reçus/rapports PDF
// (nom, coordonnées, devise, logo, couleur d'accent — appliqués
// automatiquement aux PDF générés par le serveur)
// ══════════════════════════════════════════
export const entrepriseService = {
  getConfig: () =>
    api.get("/entreprise").then((r) => r.data),

  updateConfig: (data) =>
    api.put("/entreprise", data).then((r) => r.data),

  getPdfStyles: () =>
    api.get("/entreprise/pdf-styles").then((r) => r.data),

  // Récupère un PDF d'exemple (données fictives) pour prévisualiser un style
  // avant de l'enregistrer. Retourne une URL "blob:" à utiliser dans un
  // <iframe> ou window.open — penser à révoquer l'URL après usage.
  getPdfPreviewBlobUrl: async (type, style) => {
    const blob = await fetchBlobAuthenticated("/entreprise/pdf-preview", { type, style });
    return URL.createObjectURL(blob);
  },

  // Variante renvoyant le Blob brut (utilisée pour la prévisualisation
  // sur mobile, qui passe par openBlob/le partage natif Capacitor).
  getPdfPreviewBlob: (type, style) =>
    fetchBlobAuthenticated("/entreprise/pdf-preview", { type, style }),
};

// ══════════════════════════════════════════
// SUPER-ADMIN — Pilotage de la plateforme multi-entreprises
// (créer/renommer/suspendre/supprimer des entreprises clientes)
// ══════════════════════════════════════════
export const superadminService = {
  getAll: () =>
    api.get("/superadmin/entreprises").then((r) => r.data),

  create: (data) =>
    api.post("/superadmin/entreprises", data).then((r) => r.data),

  update: (id, data) =>
    api.put(`/superadmin/entreprises/${id}`, data).then((r) => r.data),

  toggleStatut: (id, actif) =>
    api.put(`/superadmin/entreprises/${id}/statut`, { actif }).then((r) => r.data),

  updateAbonnement: (id, data) =>
    api.put(`/superadmin/entreprises/${id}/abonnement`, data).then((r) => r.data),

  delete: (id) =>
    api.delete(`/superadmin/entreprises/${id}`).then((r) => r.data),
};

// ══════════════════════════════════════════
// RAPPORTS FINANCIERS
// ══════════════════════════════════════════
export const rapportsService = {
  getRapport: (debut, fin) =>
    api.get("/rapports", { params: { debut, fin } }).then((r) => r.data),

  exportPDF: async (debut, fin) => {
    const blob = await fetchBlobAuthenticated("/rapports/pdf", { debut, fin });
    downloadBlob(blob, `Rapport_${debut}_${fin}.pdf`);
  },

  // Imprime le rapport (PDF) via la fenêtre d'impression du système.
  printPDF: async (debut, fin) => {
    const blob = await fetchBlobAuthenticated("/rapports/pdf", { debut, fin });
    printBlob(blob, `Rapport_${debut}_${fin}.pdf`);
  },
};


