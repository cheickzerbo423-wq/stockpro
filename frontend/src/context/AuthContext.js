// src/context/AuthContext.js
// Contexte global d'authentification — accessible partout dans l'app
import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // Chargement initial

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

  // Vérifier si l'utilisateur a accès à un module
  const canAccess = (module) => {
    if (!user) return false;
    if (user.categorie === "Admin") return true;
    return user.permissions?.[module] === true;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être dans AuthProvider");
  return ctx;
};
