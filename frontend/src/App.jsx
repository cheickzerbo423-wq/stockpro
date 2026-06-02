// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Articles     from "./pages/Articles";
import Ventes       from "./pages/Ventes";
import Achats       from "./pages/Achats";
import Clients      from "./pages/Clients";
import Factures     from "./pages/Factures";
import Utilisateurs from "./pages/Utilisateurs";
import Rapports     from "./pages/Rapports";
import Guide        from "./pages/Guide";
import Devis        from "./pages/Devis";

const NAV_ITEMS = [
  { path: "/",             label: "Tableau de bord",        icon: "dashboard", module: null },
  { path: "/articles",     label: "Articles & Stock",       icon: "articles",  module: "articles" },
  { path: "/ventes",       label: "Ventes",                 icon: "ventes",    module: "vente" },
  { path: "/achats",       label: "Approvisionnements",     icon: "achats",    module: "appro" },
  { path: "/clients",      label: "Clients & Fournisseurs", icon: "clients",   module: "clients" },
  { path: "/factures",     label: "Factures",               icon: "factures",  module: "facturation" },
  { path: "/devis",        label: "Devis",                  icon: "devis",     module: "devis" },
  { path: "/rapports",     label: "Rapports",               icon: "rapports",  module: null },
  { path: "/guide",        label: "Guide",                  icon: "guide",     module: null },
  { path: "/utilisateurs", label: "Utilisateurs",           icon: "users",     module: null, adminOnly: true },
];

const BOTTOM_NAV = ["/", "/articles", "/ventes", "/achats", "/factures"];

function Icon({ name, className = "w-[18px] h-[18px]" }) {
  const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    articles:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
    ventes:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    achats:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    clients:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    factures:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
    devis:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    rapports:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    guide:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    users:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
    logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    menu:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    chevLeft:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="15 18 9 12 15 6"/></svg>,
    chevRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="9 18 15 12 9 6"/></svg>,
  };
  return icons[name] || null;
}

function BottomNav({ visibleItems }) {
  const items = visibleItems.filter(i => BOTTOM_NAV.includes(i.path));
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex h-16"
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} end={item.path === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200
            ${isActive ? "text-orange-500" : "text-gray-300 hover:text-gray-500"}`
          }>
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-orange-50" : ""}`}>
                <Icon name={item.icon} />
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? "text-orange-500" : "text-gray-400"}`}>
                {item.label.split(" ")[0]}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const NAV_GROUPS = [
  { label: "Principal",   paths: ["/", "/articles"] },
  { label: "Commerce",    paths: ["/ventes", "/achats", "/clients", "/factures", "/devis"] },
  { label: "Gestion",     paths: ["/rapports", "/guide", "/utilisateurs"] },
];

function Layout({ children }) {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };
  const visibleItems = NAV_ITEMS.filter(i => {
    if (i.adminOnly && user?.categorie !== "Admin") return false;
    return i.module === null || canAccess(i.module);
  });
  const currentItem = visibleItems.find(i =>
    window.location.pathname === i.path ||
    (i.path !== "/" && window.location.pathname.startsWith(i.path))
  );

  const SidebarContent = ({ mobile = false }) => (
    <>
      {/* Logo */}
      <div className={`flex items-center border-b flex-shrink-0 ${collapsed && !mobile ? "justify-center py-5" : "gap-3 px-5 py-4"}`}
        style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0 shadow-lg"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>S</div>
        {(!collapsed || mobile) && (
          <div className="overflow-hidden">
            <div className="font-black text-sm text-white tracking-tight leading-none">StockPro</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#f97316" }}>Gestion & Facturation</div>
          </div>
        )}
        {mobile && (
          <button onClick={() => setDrawerOpen(false)}
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav groupée */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden px-2 space-y-5">
        {NAV_GROUPS.map((group) => {
          const groupItems = visibleItems.filter(i => group.paths.includes(i.path));
          if (!groupItems.length) return null;
          return (
            <div key={group.label}>
              {(!collapsed || mobile) && (
                <div className="px-3 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.15em]"
                    style={{ color: "rgba(148,163,184,0.5)" }}>{group.label}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {groupItems.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.path === "/"}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 rounded-xl transition-all duration-150 group relative
                      ${collapsed && !mobile ? "justify-center px-0 py-3 mx-1" : "px-3 py-2.5"}
                      ${isActive
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                      }
                    `}
                    style={({ isActive }) => isActive ? {
                      background: "linear-gradient(135deg, rgba(249,115,22,0.9), rgba(234,88,12,0.9))",
                      boxShadow: "0 4px 15px rgba(249,115,22,0.25)"
                    } : {}}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex-shrink-0">
                          <Icon name={item.icon} />
                        </span>
                        {(!collapsed || mobile) && (
                          <span className="text-xs font-semibold truncate">{item.label}</span>
                        )}
                        {/* Tooltip en mode collapsed */}
                        {collapsed && !mobile && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg
                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            {item.label}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {(!collapsed || mobile) ? (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{user?.login}</div>
                <div className="text-[10px] font-medium truncate" style={{ color: "rgba(148,163,184,0.6)" }}>{user?.categorie}</div>
              </div>
              <button onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition p-1 rounded-lg hover:bg-white/5 flex-shrink-0"
                title="Déconnexion">
                <Icon name="logout" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleLogout}
            className="w-full py-3 flex items-center justify-center text-slate-500 hover:text-red-400 transition">
            <Icon name="logout" />
          </button>
        )}
        {/* Toggle collapse (desktop only) */}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center py-2.5 transition text-xs"
            style={{ color: "rgba(100,116,139,0.6)", borderTop: "1px solid rgba(255,255,255,0.04)" }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(148,163,184,0.9)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(100,116,139,0.6)"}>
            <Icon name={collapsed ? "chevRight" : "chevLeft"} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: "#F1F5F9", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Overlay mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300"
        style={{ width: collapsed ? 68 : 232, background: "#0F172A" }}>
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300"
          style={{ width: 248, background: "#0F172A" }}>
          <SidebarContent mobile />
        </div>
      )}

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 md:px-6"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            height: 60,
          }}>

          <button className="md:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition flex-shrink-0"
            onClick={() => setDrawerOpen(true)}>
            <Icon name="menu" className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900 truncate">{currentItem?.label || "StockPro"}</h1>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block capitalize">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={{ background: "#FFF7ED", borderColor: "#FED7AA", color: "#C2410C" }}>
              <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <span>{user?.login}</span>
              <span style={{ color: "#FDBA74" }}>·</span>
              <span style={{ color: "#EA580C" }}>{user?.categorie}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      <BottomNav visibleItems={visibleItems} />
    </div>
  );
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#F1F5F9" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-lg"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>S</div>
        <div className="w-8 h-8 border-[3px] border-orange-100 border-t-orange-500 rounded-full animate-spin" />
      </div>
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
          <Route path="/"             element={<PrivateRoute><Layout><Dashboard    /></Layout></PrivateRoute>} />
          <Route path="/articles"     element={<PrivateRoute><Layout><Articles     /></Layout></PrivateRoute>} />
          <Route path="/ventes"       element={<PrivateRoute><Layout><Ventes       /></Layout></PrivateRoute>} />
          <Route path="/achats"       element={<PrivateRoute><Layout><Achats       /></Layout></PrivateRoute>} />
          <Route path="/clients"      element={<PrivateRoute><Layout><Clients      /></Layout></PrivateRoute>} />
          <Route path="/factures"     element={<PrivateRoute><Layout><Factures     /></Layout></PrivateRoute>} />
          <Route path="/devis"        element={<PrivateRoute><Layout><Devis        /></Layout></PrivateRoute>} />
          <Route path="/rapports"     element={<PrivateRoute><Layout><Rapports     /></Layout></PrivateRoute>} />
          <Route path="/guide"        element={<PrivateRoute><Layout><Guide        /></Layout></PrivateRoute>} />
          <Route path="/utilisateurs" element={<PrivateRoute adminOnly><Layout><Utilisateurs /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
