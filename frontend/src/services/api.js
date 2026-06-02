// src/services/api.js
// Client HTTP central — toutes les requêtes passent ici
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Intercepteur REQUEST : ajoute le token JWT automatiquement ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("stockpro_token");
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
      localStorage.removeItem("stockpro_token");
      localStorage.removeItem("stockpro_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
