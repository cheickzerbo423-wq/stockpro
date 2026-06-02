// src/pages/Login.jsx — WariGest
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BLUE   = "#0023FF";
const YELLOW = "#FFF900";
const DARK   = "#0a0f2e";

function WariGestLogo({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: BLUE, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0, position: "relative",
      boxShadow: `0 4px 16px rgba(0,35,255,0.35)`
    }}>
      <span style={{ color: "white", fontWeight: 900, fontSize: size * 0.38, letterSpacing: "-1px", lineHeight: 1 }}>Wi</span>
      <div style={{ position: "absolute", top: size * 0.12, right: size * 0.16, width: size * 0.14, height: size * 0.14, borderRadius: "50%", background: YELLOW }} />
    </div>
  );
}

export default function Login() {
  const { login }     = useAuth();
  const navigate      = useNavigate();
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

  const inputStyle = {
    width: "100%", padding: "12px 12px 12px 44px", background: "white",
    border: "1.5px solid #e0e5ff", borderRadius: 12, fontSize: 14,
    color: "#0a0f2e", outline: "none", boxSizing: "border-box",
    boxShadow: "0 1px 4px rgba(0,35,255,0.06)", transition: "border-color 0.15s",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Panneau gauche ── */}
      <div style={{
        display: "none", flexDirection: "column", justifyContent: "space-between",
        width: "50%", padding: "48px", position: "relative", overflow: "hidden",
        background: DARK,
      }} className="lg:flex lg:flex-col">

        {/* Cercles déco */}
        <div style={{ position: "absolute", top: -120, left: -120, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,35,255,0.4), transparent)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,249,0,0.15), transparent)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,35,255,0.2), transparent)`, pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
          <WariGestLogo size={44} />
          <div>
            <div style={{ fontWeight: 900, color: "white", fontSize: 22, letterSpacing: "-0.5px" }}>WariGest</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Gestion & Facturation</div>
          </div>
        </div>

        {/* Message */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,35,255,0.2)", border: "1px solid rgba(0,35,255,0.4)", borderRadius: 999, padding: "6px 16px", marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: YELLOW }} />
            <span style={{ color: YELLOW, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Plateforme de gestion</span>
          </div>

          <h2 style={{ fontSize: 38, fontWeight: 900, color: "white", lineHeight: 1.15, marginBottom: 16, margin: "0 0 16px" }}>
            Gérez votre<br />
            <span style={{ color: YELLOW }}>stock & facturation</span><br />
            en toute simplicité.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.7, maxWidth: 340, margin: "16px 0 40px" }}>
            Suivez vos articles, ventes, achats et générez vos factures PDF en quelques clics.
          </p>

          <div style={{ display: "flex", gap: 32 }}>
            {[{ v: "∞", l: "Articles" }, { v: "Auto", l: "Factures PDF" }, { v: "Multi", l: "Utilisateurs" }].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "white" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, position: "relative", zIndex: 1 }}>WariGest v1.0 — © 2026</p>
      </div>

      {/* ── Panneau droit ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#F0F2FF" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Logo mobile */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }} className="lg:hidden">
            <WariGestLogo size={44} />
            <div>
              <div style={{ fontWeight: 900, color: DARK, fontSize: 20 }}>WariGest</div>
              <div style={{ fontSize: 12, color: "#8892b0" }}>Gestion & Facturation</div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: DARK, margin: "0 0 6px" }}>Bon retour 👋</h1>
            <p style={{ fontSize: 14, color: "#8892b0", margin: 0 }}>Connectez-vous à votre espace de gestion</p>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <p style={{ color: "#DC2626", fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892b0", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Identifiant</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#c7d0ff", pointerEvents: "none" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                </div>
                <input type="text" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })}
                  placeholder="votre login" required style={{ ...inputStyle, paddingLeft: 44 }}
                  onFocus={e => e.target.style.borderColor = BLUE}
                  onBlur={e => e.target.style.borderColor = "#e0e5ff"} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892b0", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Mot de passe</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#c7d0ff", pointerEvents: "none" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input type={showPwd ? "text" : "password"} value={form.mdp} onChange={e => setForm({ ...form, mdp: e.target.value })}
                  placeholder="••••••••" required style={{ ...inputStyle, paddingLeft: 44, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = BLUE}
                  onBlur={e => e.target.style.borderColor = "#e0e5ff"} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#c7d0ff", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  {showPwd
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", marginTop: 8, padding: "14px",
              borderRadius: 12, fontWeight: 800, fontSize: 14,
              color: DARK, border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, background: YELLOW,
              boxShadow: "0 4px 20px rgba(255,249,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s", fontFamily: "inherit", letterSpacing: "0.02em",
            }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: `2px solid rgba(0,0,0,0.2)`, borderTopColor: DARK, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Connexion...</>
                : <>Se connecter <svg viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.5" width="16" height="16"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></>
              }
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#c7d0ff", fontSize: 11, marginTop: 32 }}>WariGest v1.0 — © 2026</p>
        </div>
      </div>
    </div>
  );
}
