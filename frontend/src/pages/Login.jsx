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
  const [showPwd, setShowPwd] = useState(false);

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
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Panneau gauche — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}>

        {/* Cercles décoratifs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>S</div>
          <span className="font-black text-white text-xl tracking-tight">StockPro</span>
        </div>

        {/* Message central */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-400 text-xs font-semibold tracking-wide">Plateforme de gestion</span>
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Gérez votre<br />
            <span style={{ color: "#f97316" }}>stock & facturation</span><br />
            en toute simplicité.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Suivez vos articles, ventes, achats et générez vos factures PDF en quelques clics.
          </p>

          {/* Stats */}
          <div className="flex gap-6 mt-10">
            {[
              { label: "Articles suivis", value: "∞" },
              { label: "Factures PDF", value: "Auto" },
              { label: "Utilisateurs", value: "Multi" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs relative z-10">StockPro v1.0 — © 2026</p>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: "#F8F9FB" }}>
        <div className="w-full max-w-sm">

          {/* Logo mobile seulement */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>S</div>
            <div>
              <div className="font-black text-gray-900 text-lg">StockPro</div>
              <div className="text-xs text-gray-400">Gestion & Facturation</div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Bon retour 👋</h1>
            <p className="text-gray-400 text-sm mt-1">Connectez-vous à votre espace de gestion</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-3.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">
                Identifiant
              </label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none">
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="votre login"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 text-gray-800 rounded-xl text-sm
                    focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-400
                    placeholder-gray-300 transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">
                Mot de passe
              </label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.mdp}
                  onChange={(e) => setForm({ ...form, mdp: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 text-gray-800 rounded-xl text-sm
                    focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-400
                    placeholder-gray-300 transition shadow-sm"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                  {showPwd
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
              style={{ background: loading ? "#f97316" : "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connexion...</>
                : <>Se connecter <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></>
              }
            </button>
          </form>

          <p className="text-center text-gray-300 text-xs mt-8 lg:hidden">StockPro v1.0 — © 2026</p>
        </div>
      </div>
    </div>
  );
}
