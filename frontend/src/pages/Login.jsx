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
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0F172A 0%, #0F172A 60%, #0023FF22 100%)" }}>
      <div className="w-full max-w-sm">

        {/* Logo WariGest */}
        <div className="text-center mb-8">
          {/* Icône Wi — carré arrondi bleu avec le monogramme exact */}
          <div className="w-20 h-20 rounded-3xl mx-auto mb-5 shadow-2xl shadow-[#0023FF]/30 overflow-hidden">
            <svg viewBox="0 0 52 52" width="80" height="80" fill="none">
              <rect width="52" height="52" fill="#0023FF"/>
              <rect x="4" y="4" width="44" height="44" rx="8" fill="white"/>
              <path d="M9,13 L9,29 C9,40 27,40 27,29 L27,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M25,13 L25,29 C25,40 43,40 43,29 L43,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <line x1="47" y1="22" x2="47" y2="40" stroke="#0023FF" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="47" cy="14" r="4" fill="#FFF900"/>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">WariGest</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Gestion & Facturation</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}
          className="rounded-2xl p-6 shadow-2xl border"
          style={{ background: "#1E293B", borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-white font-bold text-lg mb-5">Connexion</h2>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                Login
              </label>
              <input
                type="text"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="votre login"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none border"
                style={{
                  background: "#0F172A",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                onFocus={e => { e.target.style.borderColor = "#0023FF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,35,255,0.2)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
                Mot de passe
              </label>
              <input
                type="password"
                value={form.mdp}
                onChange={(e) => setForm({ ...form, mdp: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none border"
                style={{
                  background: "#0F172A",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                onFocus={e => { e.target.style.borderColor = "#0023FF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,35,255,0.2)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-white disabled:opacity-60"
            style={{ background: "#0023FF" }}
            onMouseEnter={e => { if (!loading) e.target.style.background = "#0019CC"; }}
            onMouseLeave={e => { e.target.style.background = "#0023FF"; }}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Badge WariGest bas */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-5 h-5 rounded-md flex-shrink-0 overflow-hidden">
            <svg viewBox="0 0 52 52" width="20" height="20" fill="none">
              <rect width="52" height="52" fill="#0023FF"/>
              <rect x="4" y="4" width="44" height="44" rx="8" fill="white"/>
              <path d="M9,13 L9,29 C9,40 27,40 27,29 L27,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M25,13 L25,29 C25,40 43,40 43,29 L43,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <line x1="47" y1="22" x2="47" y2="40" stroke="#0023FF" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="47" cy="14" r="4" fill="#FFF900"/>
            </svg>
          </div>
          <span className="text-slate-600 text-xs font-semibold">WariGest v1.0 — © 2026</span>
        </div>
      </div>
    </div>
  );
}
