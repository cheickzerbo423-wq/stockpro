// src/services/api.js
// Client HTTP central — toutes les requêtes passent ici
import axios from "axios";

// En production : Vercel proxy redirige /api/* vers Railway (voir vercel.json)
// En développement : CRA proxy redirige /api/* vers localhost:3000 (voir package.json "proxy")
const BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Intercepteur REQUEST : ajoute le token JWT automatiquement ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("warigest_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Intercepteur RESPONSE : gère les erreurs globalement ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré → déconnexion automatique
      localStorage.removeItem("warigest_token");
      localStorage.removeItem("warigest_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
