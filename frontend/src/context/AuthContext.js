// src/context/AuthContext.js
// Contexte global d'authentification — accessible partout dans l'app
import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services";
import { AUTH_SESSION_EXPIRED_EVENT, AUTH_PASSWORD_POLICY_EVENT } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // Chargement initial
  // Message à afficher (toast) suite à un événement d'authentification
  // global (session expirée, etc.) — affiché par App.jsx.
  const [authNotice, setAuthNotice] = useState(null);

  // Au démarrage : vérifier si un token valide existe déjà
  useEffect(() => {
    const token = localStorage.getItem("warigest_token");
    const savedUser = localStorage.getItem("warigest_user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // Écoute les événements émis par l'intercepteur axios (services/api.js)
  // pour réagir aux expirations de session / changements de politique de
  // mot de passe sans recharger toute la page : PrivateRoute (App.jsx)
  // redirige alors vers /login via React Router dès que `user` passe à null.
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setAuthNotice("Votre session a expiré. Veuillez vous reconnecter.");
    };
    const onPasswordPolicy = () => {
      setUser((prev) => (prev ? { ...prev, must_change_password: true } : prev));
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    window.addEventListener(AUTH_PASSWORD_POLICY_EVENT, onPasswordPolicy);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
      window.removeEventListener(AUTH_PASSWORD_POLICY_EVENT, onPasswordPolicy);
    };
  }, []);

  // Connexion
  const login = async (login, mdp) => {
    const data = await authService.login(login, mdp);
    localStorage.setItem("warigest_token", data.token);
    localStorage.setItem("warigest_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // Déconnexion
  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Mettre à jour partiellement les infos de l'utilisateur connecté (ex: après
  // un changement de mot de passe forcé) sans nécessiter une reconnexion.
  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...patch };
      localStorage.setItem("warigest_user", JSON.stringify(next));
      return next;
    });
  };

  // Vérifier si l'utilisateur a accès à un module
  const canAccess = (module) => {
    if (!user) return false;
    if (user.categorie === "Admin") return true;
    return user.permissions?.[module] === true;
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, canAccess, updateUser,
      authNotice, clearAuthNotice: () => setAuthNotice(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être dans AuthProvider");
  return ctx;
};
