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
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expiré → déconnexion automatique
      localStorage.removeItem("warigest_token");
      localStorage.removeItem("warigest_user");
      window.location.href = "/login";
      return Promise.reject(error);
    }
    // Changement de mot de passe imposé : le serveur bloque désormais (403)
    // toute route (sauf /auth/me et /auth/password) tant que
    // must_change_password = true, même si ce flag n'était pas encore connu
    // au moment du login (ex: politique changée en base entre deux requêtes,
    // ou flag chargé après coup). On met à jour l'utilisateur en local et on
    // recharge l'app : PrivateRoute affichera alors l'écran de changement de
    // mot de passe obligatoire (cf. App.jsx).
    if (error.response?.status === 403 && error.response?.data?.must_change_password && !isLoginRequest) {
      try {
        const saved = JSON.parse(localStorage.getItem("warigest_user") || "null");
        if (saved && !saved.must_change_password) {
          localStorage.setItem("warigest_user", JSON.stringify({ ...saved, must_change_password: true }));
          window.location.reload();
        }
      } catch {
        // Si la lecture/écriture échoue, on laisse simplement l'erreur
        // remonter normalement (pas de blocage de l'app).
      }
    }
    return Promise.reject(error);
  }
);

export default api;
