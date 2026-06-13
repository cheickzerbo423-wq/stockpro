// src/hooks/useApi.js
// Hook générique pour les appels API avec état loading/error/data
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// Hook de base : exécute une fonction async et gère les états
export function useApi(fetchFn, deps = []) {
  const [data,    setData]    = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Réf "vivante" : true tant que le composant est monté ET que ces deps
  // sont toujours les deps courantes. Évite tout setState après démontage
  // (avertissement React) ou après un changement de filtre qui aurait
  // déclenché un appel plus récent (la réponse de l'ancien appel, plus
  // lente, ne doit pas écraser celle du nouveau).
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (aliveRef.current) setData(result);
    } catch (err) {
      if (aliveRef.current) setError(err.response?.data?.message || err.message || "Erreur réseau");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

// Hook pour les mutations (create / update / delete)
// Hook de tri persistant : appliqué sur data, survit aux rechargements
export function useSortableData(data = [], defaultKey = null, defaultDir = "asc") {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey || !data.length) return data;
    return [...data].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (typeof av === "boolean") av = av ? 1 : 0;
      if (typeof bv === "boolean") bv = bv ? 1 : 0;
      const aN = parseFloat(av);
      const bN = parseFloat(bv);
      if (!isNaN(aN) && !isNaN(bN)) return sortDir === "asc" ? aN - bN : bN - aN;
      const aS = String(av ?? "").toLowerCase();
      const bS = String(bv ?? "").toLowerCase();
      const cmp = aS.localeCompare(bS, "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  return { sorted, sortKey, sortDir, handleSort };
}

export function useMutation(mutateFn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const mutate = async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutateFn(...args);
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Erreur";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}

// ── Hooks spécialisés par module ──────────────────────────

import {
  dashboardService, articlesService, ventesService,
  achatsService, clientsService, facturesService,
  utilisateursService, entrepriseService, superadminService,
} from "../services";

export const useDashboard = () =>
  useApi(() => dashboardService.getStats());

export const useArticles = (search = "") =>
  useApi(() => articlesService.getAll(search), [search]);

export const useAlertes = () =>
  useApi(() => articlesService.getAlertes());

export const useVentes = (filters) =>
  useApi(() => ventesService.getAll(filters), [JSON.stringify(filters)]);

export const useAchats = (filters) =>
  useApi(() => achatsService.getAll(filters), [JSON.stringify(filters)]);

export const useClients = (type) =>
  useApi(() => clientsService.getAll(type), [type]);

export const useFactures = (filters) =>
  useApi(() => facturesService.getAll(filters), [JSON.stringify(filters)]);

export const useUtilisateurs = () =>
  useApi(() => utilisateursService.getAll());

export const useEntreprise = () =>
  useApi(() => entrepriseService.getConfig());

export const useSuperadminEntreprises = () =>
  useApi(() => superadminService.getAll());

