// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const svgProps = { fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" };

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
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Panneau gauche branding (desktop) ── */}
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:w-1/2 lg:p-12"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)", position: "relative", overflow: "hidden" }}>

        <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.15), transparent)" }} />
        <div style={{ position: "absolute", bottom: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.1), transparent)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: 18 }}>S</div>
          <span style={{ fontWeight: 900, color: "white", fontSize: 20, letterSpacing: "-0.5px" }}>StockPro</span>
        </div>

        {/* Contenu central */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 999, padding: "6px 16px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb923c" }} />
            <span style={{ color: "#fb923c", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Plateforme de gestion</span>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
            Gérez votre<br />
            <span style={{ color: "#f97316" }}>stock & facturation</span><br />
            en toute simplicité.
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
            Suivez vos articles, ventes, achats et générez vos factures PDF en quelques clics.
          </p>

          <div style={{ display: "flex", gap: 32, marginTop: 40 }}>
            {[{ label: "Articles", value: "∞" }, { label: "Factures PDF", value: "Auto" }, { label: "Multi-users", value: "✓" }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "white" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "#334155", fontSize: 11, position: "relative", zIndex: 1 }}>StockPro v1.0 — © 2026</p>
      </div>

      {/* ── Panneau droit formulaire ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#F8F9FB" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: 18 }}>S</div>
            <div>
              <div style={{ fontWeight: 900, color: "#111827", fontSize: 18 }}>StockPro</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Gestion & Facturation</div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111827", margin: 0 }}>Bon retour 👋</h1>
            <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4 }}>Connectez-vous à votre espace de gestion</p>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" {...svgProps} stroke="#EF4444"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <p style={{ color: "#DC2626", fontSize: 14, fontWeight: 500, margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Login */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Identifiant
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#d1d5db", pointerEvents: "none" }}>
                  <svg viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                </div>
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="votre login"
                  required
                  style={{ width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = "#f97316"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#d1d5db", pointerEvents: "none" }}>
                  <svg viewBox="0 0 24 24" {...svgProps}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.mdp}
                  onChange={(e) => setForm({ ...form, mdp: e.target.value })}
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", paddingLeft: 40, paddingRight: 44, paddingTop: 12, paddingBottom: 12, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = "#f97316"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#d1d5db", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  {showPwd
                    ? <svg viewBox="0 0 24 24" {...svgProps}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" {...svgProps}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", marginTop: 8, padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 14,
                color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: "0 4px 15px rgba(249,115,22,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
              }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Connexion...</>
                : <>Se connecter <svg viewBox="0 0 24 24" {...svgProps} stroke="white"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></>
              }
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#d1d5db", fontSize: 11, marginTop: 32 }} className="lg:hidden">
            StockPro v1.0 — © 2026
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
