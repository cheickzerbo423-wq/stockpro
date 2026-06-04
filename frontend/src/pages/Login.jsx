// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login }         = useAuth();
  const navigate          = useNavigate();
  const [form, setForm]   = useState({ login: "", mdp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.login, form.mdp);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-lg">
            S
          </div>
          <h1 className="text-3xl font-black text-white">StockPro</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion des Stocks & Facturation</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
          <h2 className="text-white font-bold text-lg mb-5">Connexion</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                Login
              </label>
              <input
                type="text"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="votre login"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password"
                value={form.mdp}
                onChange={(e) => setForm({ ...form, mdp: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          StockPro v1.0 — © 2026
        </p>
      </div>
    </div>
  );
}
