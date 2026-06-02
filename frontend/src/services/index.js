// src/services/index.js
// Tous les appels API organisés par module
import api from "./api";

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
export const authService = {
  login: (login, mdp) =>
    api.post("/auth/login", { login, mdp }).then((r) => r.data),

  me: () =>
    api.get("/auth/me").then((r) => r.data),

  logout: () => {
    localStorage.removeItem("stockpro_token");
    localStorage.removeItem("stockpro_user");
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
    const token = localStorage.getItem("stockpro_token");
    const url = `${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/factures/${encodeURIComponent(code)}/pdf`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Erreur serveur");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank");
    if (win) win.addEventListener("load", () => URL.revokeObjectURL(blobUrl));
  },

  // Télécharge le PDF directement
  downloadPDF: async (code) => {
    const token = localStorage.getItem("stockpro_token");
    const url = `${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/factures/${encodeURIComponent(code)}/pdf`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Erreur serveur");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `Facture_${code}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },

  openRecu: async (code) => {
    const token = localStorage.getItem("stockpro_token");
    const url = `${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/factures/${encodeURIComponent(code)}/recu`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Erreur serveur");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank");
    if (win) win.addEventListener("load", () => URL.revokeObjectURL(blobUrl));
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
// RAPPORTS FINANCIERS
// ══════════════════════════════════════════
export const rapportsService = {
  getRapport: (debut, fin) =>
    api.get("/rapports", { params: { debut, fin } }).then((r) => r.data),

  exportPDF: async (debut, fin) => {
    const token = localStorage.getItem("stockpro_token");
    const base  = process.env.REACT_APP_API_URL || "http://localhost:3000/api";
    const res   = await fetch(`${base}/rapports/pdf?debut=${debut}&fin=${fin}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erreur export");
    const blob   = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `Rapport_${debut}_${fin}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },
};


// ══════════════════════════════════════════
// DEVIS
// ══════════════════════════════════════════
export const devisService = {
  getAll: () =>
    api.get("/devis").then((r) => r.data),

  create: (data) =>
    api.post("/devis", data).then((r) => r.data),

  updateStatut: (id, statut) =>
    api.put(`/devis/${id}/statut`, { statut }).then((r) => r.data),
};

// ══════════════════════════════════════════
// GAMMES
// ══════════════════════════════════════════
export const gammesService = {
  getAll:  ()           => api.get("/gammes").then((r) => r.data),
  create:  (data)       => api.post("/gammes", data).then((r) => r.data),
  rename:  (code, nom)  => api.put(`/gammes/${code}`, { nom }).then((r) => r.data),
  delete:  (code)       => api.delete(`/gammes/${code}`).then((r) => r.data),
};
