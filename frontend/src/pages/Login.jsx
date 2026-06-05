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
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-[#0023FF]/30"
            style={{ background: "#0023FF" }}>
            <svg viewBox="0 0 36 26" width="30" height="22" fill="none">
              {/* W : deux arches arrondies */}
              <path
                d="M2 4 C2 16 7 20 10.5 20 C14 20 14.5 11 14.5 11 C14.5 11 15 20 18.5 20 C22 20 27 16 27 4"
                stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
              {/* i — tige */}
              <line x1="32" y1="10" x2="32" y2="21" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              {/* i — point jaune */}
              <circle cx="32" cy="4.5" r="2.8" fill="#FFF900"/>
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
          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "#0023FF" }}>
            <svg viewBox="0 0 18 14" width="12" height="10" fill="none">
              <path d="M1 2 C1 8 3.5 10 5.5 10 C7.5 10 7.5 5.5 7.5 5.5 C7.5 5.5 7.5 10 9.5 10 C11.5 10 14 8 14 2"
                stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <line x1="16.5" y1="5" x2="16.5" y2="10.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16.5" cy="2" r="1.4" fill="#FFF900"/>
            </svg>
          </div>
          <span className="text-slate-600 text-xs font-semibold">WariGest v1.0 — © 2026</span>
        </div>
      </div>
    </div>
  );
}
