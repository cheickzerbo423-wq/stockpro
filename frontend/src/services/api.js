// src/services/api.js
// Client HTTP central — toutes les requêtes passent ici
import axios from "axios";
import { Capacitor } from "@capacitor/core";

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

// ─── Événements d'authentification ───
// Cet intercepteur s'exécute hors de l'arbre React (pas de useNavigate /
// useAuth disponibles ici). Plutôt que de forcer un rechargement complet de
// la page (window.location.href / reload(), qui réinitialise tout l'état
// React et coupe brutalement l'utilisateur), on émet des événements que
// AuthContext écoute pour mettre à jour son état proprement : PrivateRoute
// redirige alors vers /login via React Router (navigation SPA), et un toast
// explique ce qui s'est passé.
export const AUTH_SESSION_EXPIRED_EVENT = "warigest:session-expired";
export const AUTH_PASSWORD_POLICY_EVENT = "warigest:must-change-password";

// ─── Intercepteur RESPONSE : gère les erreurs globalement ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expiré ou invalide → déconnexion automatique (navigation SPA,
      // cf. AuthContext qui écoute cet événement).
      localStorage.removeItem("warigest_token");
      localStorage.removeItem("warigest_user");
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
      return Promise.reject(error);
    }
    // Changement de mot de passe imposé : le serveur bloque désormais (403)
    // toute route (sauf /auth/me et /auth/password) tant que
    // must_change_password = true, même si ce flag n'était pas encore connu
    // au moment du login (ex: politique changée en base entre deux requêtes,
    // ou flag chargé après coup). On met à jour l'utilisateur (local +
    // contexte React) : PrivateRoute affichera alors l'écran de changement
    // de mot de passe obligatoire (cf. App.jsx), sans recharger la page.
    if (error.response?.status === 403 && error.response?.data?.must_change_password && !isLoginRequest) {
      try {
        const saved = JSON.parse(localStorage.getItem("warigest_user") || "null");
        if (saved && !saved.must_change_password) {
          localStorage.setItem("warigest_user", JSON.stringify({ ...saved, must_change_password: true }));
          window.dispatchEvent(new CustomEvent(AUTH_PASSWORD_POLICY_EVENT));
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

// ══════════════════════════════════════════
// TÉLÉCHARGEMENT DE FICHIERS BINAIRES (PDF, etc.)
// Les endpoints PDF renvoient du binaire (pas du JSON) : on ne peut pas
// utiliser l'instance axios `api` directement, donc on passe par fetch()
// en réutilisant le même token JWT. Factorisé ici pour éviter la
// duplication entre facturesService, rapportsService, entrepriseService...
// ══════════════════════════════════════════

// Récupère un endpoint protégé et retourne un Blob (lève une erreur si
// la réponse n'est pas OK, ex: 401/404/500).
export async function fetchBlobAuthenticated(path, params = {}) {
  const token = localStorage.getItem("warigest_token");
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const url = `${BASE_URL}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Erreur serveur");
  return res.blob();
}

// ─── App mobile (Capacitor) ───────────────────────────────
// Dans le WebView Android, `window.open(blob:...)` n'ouvre rien (pas
// d'onglets) et les téléchargements <a download> ne déclenchent rien non
// plus. On écrit donc le PDF dans le cache de l'app puis on ouvre la
// boîte de partage native (l'utilisateur choisit "Ouvrir avec" un lecteur
// PDF, ou l'enregistre/partage directement).
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveAndShareBlob(blob, filename) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const base64 = await blobToBase64(blob);
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title: filename, url: uri });
}

// Ouvre un Blob (prévisualisation PDF/reçu) : nouvel onglet sur le web,
// boîte de partage/ouverture native dans l'app mobile.
export function openBlob(blob, filename = "document.pdf") {
  if (Capacitor.isNativePlatform()) {
    saveAndShareBlob(blob, filename);
    return;
  }
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank");
  if (win) win.addEventListener("load", () => URL.revokeObjectURL(blobUrl));
  else URL.revokeObjectURL(blobUrl);
}

// Télécharge un Blob sous le nom de fichier donné (web), ou propose de
// l'enregistrer/partager via la boîte de partage native (mobile).
export function downloadBlob(blob, filename) {
  if (Capacitor.isNativePlatform()) {
    saveAndShareBlob(blob, filename);
    return;
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
