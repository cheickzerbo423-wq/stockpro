// src/App.jsx — WariGest Premium
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

const B = "#0023FF";
const Y = "#FFF900";
const D = "#060d2e";

const NAV_ITEMS = [
  { path: "/",             label: "Tableau de bord",        icon: "dashboard", module: null,          group: "principal" },
  { path: "/articles",     label: "Articles & Stock",       icon: "articles",  module: "articles",    group: "principal" },
  { path: "/ventes",       label: "Ventes",                 icon: "ventes",    module: "vente",       group: "commerce" },
  { path: "/achats",       label: "Approvisionnements",     icon: "achats",    module: "appro",       group: "commerce" },
  { path: "/clients",      label: "Clients & Fournisseurs", icon: "clients",   module: "clients",     group: "commerce" },
  { path: "/factures",     label: "Factures",               icon: "factures",  module: "facturation", group: "commerce" },
  { path: "/rapports",     label: "Rapports",               icon: "rapports",  module: null,          group: "gestion" },
  { path: "/guide",        label: "Guide",                  icon: "guide",     module: null,          group: "gestion" },
  { path: "/utilisateurs", label: "Utilisateurs",           icon: "users",     module: null,          group: "gestion", adminOnly: true },
];

const GROUPS = {
  principal: "Principal",
  commerce:  "Commerce",
  gestion:   "Gestion",
};

const BOTTOM_NAV = ["/", "/articles", "/ventes", "/achats", "/factures"];

function Icon({ name, size = 18 }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: "1.75", width: size, height: size, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    dashboard: <svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    articles:  <svg viewBox="0 0 24 24" {...p}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
    ventes:    <svg viewBox="0 0 24 24" {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    achats:    <svg viewBox="0 0 24 24" {...p}><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    clients:   <svg viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    factures:  <svg viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
    rapports:  <svg viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    guide:     <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    users:     <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
    logout:    <svg viewBox="0 0 24 24" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    menu:      <svg viewBox="0 0 24 24" {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    chevL:     <svg viewBox="0 0 24 24" {...p}><polyline points="15 18 9 12 15 6"/></svg>,
    chevR:     <svg viewBox="0 0 24 24" {...p}><polyline points="9 18 15 12 9 6"/></svg>,
    notif:     <svg viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  };
  return icons[name] || null;
}

function WiLogo({ size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: B, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", boxShadow: `0 4px 14px rgba(0,35,255,0.45)` }}>
      <span style={{ color: "white", fontWeight: 900, fontSize: size * 0.38, letterSpacing: "-0.5px", lineHeight: 1 }}>Wi</span>
      <div style={{ position: "absolute", top: size * 0.1, right: size * 0.12, width: size * 0.17, height: size * 0.17, borderRadius: "50%", background: Y }} />
    </div>
  );
}

function BottomNav({ items }) {
  return (
    <nav className="bottom-nav-mobile" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid #e8ecff", display: "flex", height: 64, boxShadow: "0 -4px 24px rgba(0,35,255,0.08)" }}>
      {items.map(item => (
        <NavLink key={item.path} to={item.path} end={item.path === "/"}
          style={({ isActive }) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, textDecoration: "none", color: isActive ? B : "#9ba5c9", transition: "color 0.15s" })}>
          {({ isActive }) => (<>
            <div style={{ padding: "5px 10px", borderRadius: 10, background: isActive ? "#e8ecff" : "transparent", transition: "background 0.15s" }}><Icon name={item.icon} size={18} /></div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.02em" }}>{item.label.split(" ")[0]}</span>
          </>)}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar({ collapsed, setCollapsed, visibleItems, mobile, onClose, user, onLogout }) {
  const grouped = Object.entries(GROUPS).map(([key, label]) => ({
    label,
    items: visibleItems.filter(i => i.group === key),
  })).filter(g => g.items.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: D, overflow: "hidden" }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: collapsed && !mobile ? 0 : 12, padding: collapsed && !mobile ? "18px 0" : "16px 18px", justifyContent: collapsed && !mobile ? "center" : "flex-start", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <WiLogo size={36} />
        {(!collapsed || mobile) && (
          <div>
            <div style={{ fontWeight: 900, color: "white", fontSize: 15, letterSpacing: "-0.3px", lineHeight: 1.1 }}>WariGest</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 500, marginTop: 1 }}>Gestion & Facturation</div>
          </div>
        )}
        {mobile && (
          <button onClick={onClose} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 8px" }}>
        {grouped.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            {(!collapsed || mobile) && (
              <div style={{ padding: "2px 10px 6px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.18)" }}>{label}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map(item => (
                <NavLink key={item.path} to={item.path} end={item.path === "/"}
                  onClick={mobile ? onClose : undefined}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: collapsed && !mobile ? 0 : 10,
                    padding: collapsed && !mobile ? "10px 0" : "9px 12px",
                    justifyContent: collapsed && !mobile ? "center" : "flex-start",
                    borderRadius: 10, textDecoration: "none", transition: "all 0.15s",
                    background: isActive ? B : "transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.42)",
                    boxShadow: isActive ? `0 4px 16px rgba(0,35,255,0.35)` : "none",
                    position: "relative",
                  })}>
                  {({ isActive }) => (<>
                    <span style={{ display: "flex", flexShrink: 0 }}><Icon name={item.icon} size={17} /></span>
                    {(!collapsed || mobile) && (
                      <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{item.label}</span>
                    )}
                    {isActive && !collapsed && !mobile && (
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: Y, flexShrink: 0 }} />
                    )}
                  </>)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        {(!collapsed || mobile) ? (
          <div style={{ padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: B, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 900, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,35,255,0.4)" }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.login}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{user?.categorie}</div>
              </div>
              <button onClick={onLogout} title="Déconnexion"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", display: "flex", padding: 4, borderRadius: 6, flexShrink: 0, transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#ff6b6b"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}>
                <Icon name="logout" size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={onLogout} style={{ width: "100%", padding: "12px 0", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ff6b6b"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}>
            <Icon name="logout" size={16} />
          </button>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ width: "100%", padding: "8px 0", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", color: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}>
            <Icon name={collapsed ? "chevR" : "chevL"} size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

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
  const bottomItems = visibleItems.filter(i => BOTTOM_NAV.includes(i.path));
  const currentItem = visibleItems.find(i =>
    window.location.pathname === i.path ||
    (i.path !== "/" && window.location.pathname.startsWith(i.path))
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#EEF0FF", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Overlay mobile */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} className="bottom-nav-mobile"
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(6,13,46,0.65)", backdropFilter: "blur(6px)", display: "block" }} />
      )}

      {/* Sidebar desktop */}
      <aside style={{ width: collapsed ? 64 : 228, flexShrink: 0, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)" }} className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} visibleItems={visibleItems} user={user} onLogout={handleLogout} />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: 256, zIndex: 50, animation: "slideIn 0.25s ease-out" }} className="md:hidden">
          <Sidebar collapsed={false} setCollapsed={() => {}} visibleItems={visibleItems} mobile onClose={() => setDrawerOpen(false)} user={user} onLogout={handleLogout} />
        </div>
      )}

      {/* Contenu */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Header */}
        <header className="glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 58, flexShrink: 0, borderBottom: "1px solid rgba(0,35,255,0.08)", boxShadow: "0 1px 20px rgba(0,35,255,0.05)" }}>

          <button onClick={() => setDrawerOpen(true)} className="md:hidden"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ba5c9", padding: 6, borderRadius: 8, display: "flex" }}>
            <Icon name="menu" size={20} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 14, fontWeight: 800, color: D, margin: 0, letterSpacing: "-0.2px" }}>
              {currentItem?.label || "WariGest"}
            </h1>
            <p style={{ fontSize: 11, color: "#9ba5c9", margin: 0, textTransform: "capitalize" }} className="hidden sm:block">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* User badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden sm:flex">
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#e8ecff", border: "1.5px solid #c7d0ff", borderRadius: 12, padding: "6px 14px" }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: B, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 900 }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: D }}>{user?.login}</span>
              <span style={{ color: "#c7d0ff" }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: B }}>{user?.categorie}</span>
            </div>
          </div>
        </header>

        {/* Page */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 80px" }} className="md:p-6 md:pb-6 fade-in">
          {children}
        </div>
      </main>

      <BottomNav items={bottomItems} />
    </div>
  );
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#EEF0FF", flexDirection: "column", gap: 20 }}>
      <WiLogo size={52} />
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: B, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.categorie !== "Admin") return <Navigate to="/" replace />;
  return children;
}

function WiLogo({ size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: B, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", boxShadow: `0 4px 14px rgba(0,35,255,0.45)` }}>
      <span style={{ color: "white", fontWeight: 900, fontSize: size * 0.38, letterSpacing: "-0.5px", lineHeight: 1 }}>Wi</span>
      <div style={{ position: "absolute", top: size * 0.1, right: size * 0.12, width: size * 0.17, height: size * 0.17, borderRadius: "50%", background: Y }} />
    </div>
  );
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
          <Route path="/rapports"     element={<PrivateRoute><Layout><Rapports     /></Layout></PrivateRoute>} />
          <Route path="/guide"        element={<PrivateRoute><Layout><Guide        /></Layout></PrivateRoute>} />
          <Route path="/utilisateurs" element={<PrivateRoute adminOnly><Layout><Utilisateurs /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
