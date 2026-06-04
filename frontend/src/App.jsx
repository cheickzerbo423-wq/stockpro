// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
// UI components imported per-page

import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Articles     from "./pages/Articles";
import Ventes       from "./pages/Ventes";
import Achats       from "./pages/Achats";
import Clients      from "./pages/Clients";
import Factures     from "./pages/Factures";
import Devis        from "./pages/Devis";
import Utilisateurs from "./pages/Utilisateurs";
import Rapports     from "./pages/Rapports";
import Guide        from "./pages/Guide";

// 5 onglets principaux pour la barre de navigation mobile bas
const BOTTOM_NAV = [
  { path: "/",         label: "Accueil"  },
  { path: "/articles", label: "Articles" },
  { path: "/ventes",   label: "Ventes"   },
  { path: "/achats",   label: "Achats"   },
  { path: "/clients",  label: "Contacts" },
];

const NAV_ITEMS = [
  { path: "/",             label: "Tableau de bord",         icon: "⊞",  module: null },
  { path: "/articles",     label: "Articles & Stock",        icon: "◫",  module: "articles" },
  { path: "/ventes",       label: "Ventes",                  icon: "↗",  module: "vente" },
  { path: "/achats",       label: "Approvisionnements",      icon: "↙",  module: "appro" },
  { path: "/clients",      label: "Clients & Fournisseurs",  icon: "◎",  module: "clients" },
  { path: "/factures",     label: "Factures",                icon: "▤",  module: "facturation" },
  { path: "/devis",        label: "Devis",                   icon: "📋", module: "devis" },
  { path: "/rapports",      label: "Rapports financiers",     icon: "◈",  module: null },
  { path: "/guide",         label: "Guide utilisateur",       icon: "?",  module: null },
  { path: "/utilisateurs", label: "Utilisateurs",            icon: "◉",  module: null, adminOnly: true },
];

// Icônes SVG inline pour la barre mobile (plus jolies que les emojis)
const MOBILE_ICONS = {
  "/":             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  "/articles":     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
  "/ventes":       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  "/achats":       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  "/clients":      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  "/factures":     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  "/rapports":     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  "/guide":        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  "/utilisateurs": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
};

function SidebarIcon({ path }) {
  return MOBILE_ICONS[path] || <span className="w-5 h-5 flex items-center justify-center text-base">·</span>;
}

function BottomNav({ visibleItems }) {
  const items = BOTTOM_NAV.filter((b) => visibleItems.some((v) => v.path === b.path));
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex h-14"
      style={{ boxShadow: "0 -1px 10px rgba(0,0,0,0.07)" }}>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 transition
            ${isActive ? "text-orange-500" : "text-gray-400 hover:text-gray-600"}`
          }
        >
          {MOBILE_ICONS[item.path]}
          <span className="text-[10px] font-bold">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Layout({ children }) {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [collapsed,   setCollapsed]   = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  const handleLogout   = () => { logout(); navigate("/login"); };
  const visibleItems   = NAV_ITEMS.filter(i => {
    if (i.adminOnly && user?.categorie !== "Admin") return false;
    return i.module === null || canAccess(i.module);
  });
  const currentItem    = visibleItems.find(i =>
    window.location.pathname === i.path ||
    (i.path !== "/" && window.location.pathname.startsWith(i.path))
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8F9FB", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Overlay mobile ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (toujours visible) ── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{ width: collapsed ? 64 : 228, background: "#0F172A" }}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/5 flex-shrink-0 ${collapsed ? "justify-center p-4" : "gap-3 px-4 py-4"}`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            S
          </div>
          {!collapsed && (
            <div className="leading-tight overflow-hidden">
              <div className="font-black text-sm text-white tracking-tight">WariGest</div>
              <div className="text-[10px] font-medium" style={{ color: "#f97316" }}>Gestion & Facturation</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden px-2 space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-xl transition-all duration-150
                ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}
                ${isActive
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-900/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span className={`flex-shrink-0 transition-transform ${collapsed ? "" : ""}`}>
                <SidebarIcon path={item.path} />
              </span>
              {!collapsed && (
                <span className="text-xs font-semibold truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t border-white/5 flex-shrink-0">
          {!collapsed && (
            <div className="px-3 py-3">
              <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                  {user?.login?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{user?.login}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.categorie}</div>
                </div>
                <button onClick={handleLogout}
                  className="text-slate-500 hover:text-red-400 transition flex-shrink-0" title="Déconnexion">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
          {collapsed && (
            <button onClick={handleLogout}
              className="w-full py-3 flex items-center justify-center text-slate-500 hover:text-red-400 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          )}
          {/* Collapse toggle desktop */}
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center py-2.5 text-slate-600 hover:text-white border-t border-white/5 transition text-xs">
            {collapsed
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
            }
          </button>
        </div>
      </aside>

      {/* ── Drawer mobile (gauche) ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col"
          style={{ width: 240, background: "#0F172A" }}
        >
          {/* Logo + fermer */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>S</div>
              <div>
                <div className="font-black text-sm text-white">WariGest</div>
                <div className="text-[10px] font-medium" style={{ color: "#f97316" }}>Gestion & Facturation</div>
              </div>
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 overflow-y-auto px-2 space-y-0.5">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150
                  ${isActive
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-900/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"}`
                }
              >
                <SidebarIcon path={item.path} />
                <span className="text-sm font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/5 px-3 py-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{user?.login}</div>
                <div className="text-[10px] text-slate-500">{user?.categorie}</div>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition" title="Déconnexion">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contenu principal ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          {/* Hamburger mobile */}
          <button className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"
            onClick={() => setDrawerOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">{currentItem?.label || "WariGest"}</h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-orange-100">
              <div className="w-5 h-5 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <span>{user?.login}</span>
              <span className="text-orange-400">·</span>
              <span className="text-orange-500 font-bold">{user?.categorie}</span>
            </div>
          </div>
        </header>

        {/* Contenu page */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      {/* Barre de navigation mobile bas */}
      <BottomNav visibleItems={visibleItems} />
    </div>
  );
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#F8F9FB" }}>
      <div className="w-9 h-9 border-[3px] border-orange-100 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.categorie !== "Admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/articles" element={<PrivateRoute><Layout><Articles /></Layout></PrivateRoute>} />
          <Route path="/ventes" element={<PrivateRoute><Layout><Ventes /></Layout></PrivateRoute>} />
          <Route path="/achats" element={<PrivateRoute><Layout><Achats /></Layout></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><Layout><Clients /></Layout></PrivateRoute>} />
          <Route path="/factures" element={<PrivateRoute><Layout><Factures /></Layout></PrivateRoute>} />
          <Route path="/devis"    element={<PrivateRoute><Layout><Devis    /></Layout></PrivateRoute>} />
          <Route path="/rapports"      element={<PrivateRoute><Layout><Rapports     /></Layout></PrivateRoute>} />
          <Route path="/guide"         element={<PrivateRoute><Layout><Guide        /></Layout></PrivateRoute>} />
          <Route path="/utilisateurs" element={<PrivateRoute adminOnly><Layout><Utilisateurs /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
