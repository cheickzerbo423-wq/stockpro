// src/pages/Login.jsx — Premium split-screen login
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

const WiLogo = ({ size = 52 }) => (
  <svg viewBox="555 550 1372 1380" width={size} height={size}
       style={{ flexShrink: 0, fillRule: "evenodd", clipRule: "evenodd" }}>
    <path d="M1921.296,898.435l0,683.444c0,189.808 -154.1,343.908 -343.908,343.908l-674.461,0c-189.808,0 -343.908,-154.1 -343.908,-343.908l0,-683.444c0,-189.808 154.1,-343.908 343.908,-343.908l674.461,0c189.808,0 343.908,154.1 343.908,343.908Z" fill="#0023ff"/>
    <ellipse cx="1569.466" cy="974.341" rx="113.239" ry="117.957" fill="#fff900"/>
    <path d="M1121.277,1160.585l0,164.319c-0.337,-2.607 -0.511,-5.264 -0.511,-7.962l0,-156.512l0.511,0.155Z" fill="#fff"/>
    <path d="M1121.277,905.88l0,419.025c-0.337,-2.607 -0.511,-5.264 -0.511,-7.962l0,-403.1c0,-2.698 0.174,-5.356 0.511,-7.962Z" fill="#fff"/>
    <path d="M1448.414,1149.957c10.344,-14.463 27.279,-23.898 46.4,-23.898l129.693,0c31.464,0 57.009,25.545 57.009,57.009l0,111.803c0,10.837 -3.03,20.972 -8.29,29.603c5.406,19.518 8.29,40.031 8.29,61.191c0,130.211 -109.178,235.926 -243.655,235.926c-79.644,0 -150.414,-37.081 -194.886,-94.37c-44.471,57.289 -115.242,94.37 -194.886,94.37c-134.477,0 -243.655,-105.715 -243.655,-235.926c-0,-15.783 1.604,-31.206 4.663,-46.124c-2.768,-6.997 -4.29,-14.622 -4.29,-22.599l0,-403.1c0,-33.956 27.568,-61.525 61.525,-61.525l120.66,0c33.956,0 61.525,27.568 61.525,61.525l0,446.257c0,10.138 8.23,18.368 18.368,18.368l36.023,0c10.138,0 18.368,-8.23 18.368,-18.368l0,-454.219c3.91,-30.201 29.755,-53.562 61.013,-53.562l120.66,0c33.956,0 61.525,27.568 61.525,61.525l0,246.804l0.572,-0.174l0,199.627c0,10.138 8.23,18.368 18.368,18.368l36.023,0c10.138,0 18.368,-8.23 18.368,-18.368l-0,-177.031c0,-12.343 3.931,-23.775 10.608,-33.111Z" fill="#fff"/>
  </svg>
);

const FEATURES = [
  { icon: "box", title: "Stock en temps réel", sub: "Alertes automatiques de rupture" },
  { icon: "receipt", title: "Facturation rapide", sub: "PDF générés en 1 clic" },
  { icon: "chart", title: "Rapports financiers", sub: "CA, bénéfices, dépenses" },
];

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
    <div className="min-h-screen flex" style={{ fontFamily: "'Montserrat', 'Segoe UI', sans-serif" }}>

      {/* ── Panneau gauche — Brand ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden px-12 py-10"
        style={{ background: "linear-gradient(145deg, #060E2B 0%, #0F172A 55%, #001080 100%)" }}>

        {/* Cercles décoratifs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
          style={{ background: "radial-gradient(circle, #0023FF, transparent)" }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-8 translate-y-1/3 -translate-x-1/3"
          style={{ background: "radial-gradient(circle, #FFF900, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full opacity-5 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, #0023FF, transparent)" }} />

        {/* Logo & titre */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <WiLogo size={56} />
            <div>
              <div className="text-3xl font-black text-white tracking-tight">WariGest</div>
              <div className="text-sm text-blue-300/70 font-medium">Gestion & Facturation</div>
            </div>
          </div>
        </div>

        {/* Accroche centrale */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Gérez votre<br />
            <span style={{ color: "#FFF900" }}>entreprise</span><br />
            intelligemment.
          </h2>
          <p className="text-blue-300/70 text-base font-medium leading-relaxed max-w-sm">
            De la gestion de stock à la facturation, tout en un seul endroit — rapide, simple, efficace.
          </p>

          {/* Feature cards */}
          <div className="mt-8 space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)"
                }}>
                <div className="flex-shrink-0 text-white/90"><Icon name={f.icon} size={24} /></div>
                <div>
                  <div className="text-white text-sm font-bold">{f.title}</div>
                  <div className="text-blue-300/60 text-xs font-medium">{f.sub}</div>
                </div>
                <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,35,255,0.4)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-3 h-3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer gauche */}
        <div className="relative z-10">
          <p className="text-blue-400/40 text-xs font-medium">
            © {new Date().getFullYear()} WariGest — Tous droits réservés
          </p>
        </div>
      </div>

      {/* ── Panneau droit — Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-gray-50">

        {/* Logo mobile uniquement */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <WiLogo size={44} />
          <div>
            <div className="text-2xl font-black text-gray-900">WariGest</div>
            <div className="text-xs text-gray-400 font-medium">Gestion & Facturation</div>
          </div>
        </div>

        <div className="w-full max-w-md">

          {/* Titre formulaire */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Bienvenue</h1>
            <p className="text-gray-400 text-sm font-medium">Connectez-vous à votre espace de gestion</p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Login */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Identifiant
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="w-4.5 h-4.5">
                    <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="votre identifiant"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-300 bg-white border border-gray-200 rounded-2xl outline-none transition-all duration-200
                    focus:border-[#0023FF] focus:ring-4 focus:ring-[#0023FF]/8 hover:border-gray-300"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="w-4.5 h-4.5">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.mdp}
                  onChange={(e) => setForm({ ...form, mdp: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 text-sm text-gray-800 placeholder-gray-300 bg-white border border-gray-200 rounded-2xl outline-none transition-all duration-200
                    focus:border-[#0023FF] focus:ring-4 focus:ring-[#0023FF]/8 hover:border-gray-300"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-0.5">
                  {showPwd
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              style={{
                background: loading ? "#0019CC" : "#0023FF",
                boxShadow: "0 4px 16px rgba(0,35,255,0.35)",
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "#0019CC"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,35,255,0.45)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = "#0023FF"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,35,255,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connexion en cours…</>
                : <>
                    Se connecter
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
              }
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
            <WiLogo size={20} />
            <span className="text-gray-400 text-xs font-semibold">WariGest v1.0 — © {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
