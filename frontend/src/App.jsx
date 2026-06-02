// src/App.jsx — WariGest
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

const BLUE   = "#0023FF";
const YELLOW = "#FFF900";
const DARK   = "#060d2e";

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

const NAV_GROUPS = [
  { label: "Principal", paths: ["/", "/articles"] },
  { label: "Commerce",  paths: ["/ventes", "/achats", "/clients", "/factures", "/devis"] },
  { label: "Gestion",   paths: ["/rapports", "/guide", "/utilisateurs"] },
];

function Icon({ name, size = 18 }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: "1.8", width: size, height: size };
  const icons = {
    dashboard: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    articles:  <svg viewBox="0 0 24 24" {...s}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
    ventes:    <svg viewBox="0 0 24 24" {...s}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    achats:    <svg viewBox="0 0 24 24" {...s}><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    clients:   <svg viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    factures:  <svg viewBox="0 0 24 24" {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
    devis:     <svg viewBox="0 0 24 24" {...s}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    rapports:  <svg viewBox="0 0 24 24" {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    guide:     <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    users:     <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
    logout:    <svg viewBox="0 0 24 24" {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    menu:      <svg viewBox="0 0 24 24" {...s}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    chevL:     <svg viewBox="0 0 24 24" {...s}><polyline points="15 18 9 12 15 6"/></svg>,
    chevR:     <svg viewBox="0 0 24 24" {...s}><polyline points="9 18 15 12 9 6"/></svg>,
  };
  return icons[name] || null;
}

function WariGestLogo({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: BLUE, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0, position: "relative",
      boxShadow: `0 2px 10px rgba(0,35,255,0.4)`
    }}>
      <span style={{ color: "white", fontWeight: 900, fontSize: size * 0.38, letterSpacing: "-0.5px", lineHeight: 1 }}>Wi</span>
      <div style={{ position: "absolute", top: size * 0.12, right: size * 0.14, width: size * 0.16, height: size * 0.16, borderRadius: "50%", background: YELLOW }} />
    </div>
  );
}

function BottomNav({ visibleItems }) {
  const items = visibleItems.filter(i => BOTTOM_NAV.includes(i.path));
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, background: "white", borderTop: "1px solid #e8ecff", display: "flex", height: 64, boxShadow: "0 -4px 20px rgba(0,35,255,0.08)" }}
      className="md:hidden">
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} end={item.path === "/"}
          style={({ isActive }) => ({
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, textDecoration: "none",
            color: isActive ? BLUE : "#9ba5c9", transition: "color 0.15s",
          })}>
          {({ isActive }) => (
            <>
              <div style={{ padding: "4px 8px", borderRadius: 8, background: isActive ? "#e8ecff" : "transparent", transition: "background 0.15s" }}>
                <Icon name={item.icon} size={18} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? BLUE : "#9ba5c9" }}>
                {item.label.split(" ")[0]}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
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
  const currentItem = visibleItems.find(i =>
    window.location.pathname === i.path ||
    (i.path !== "/" && window.location.pathname.startsWith(i.path))
  );

  const SidebarContent = ({ mobile = false }) => (
    <>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", padding: collapsed && !mobile ? "16px 0" : "16px 20px",
        justifyContent: collapsed && !mobile ? "center" : "flex-start",
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, gap: 12,
      }}>
        <WariGestLogo size={36} />
        {(!collapsed || mobile) && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: 900, color: "white", fontSize: 16, letterSpacing: "-0.3px" }}>WariGest</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>Gestion & Facturation</div>
          </div>
        )}
        {mobile && (
          <button onClick={() => setDrawerOpen(false)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 6, borderRadius: 8, display: "flex" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 20 }}>
        {NAV_GROUPS.map((group) => {
          const groupItems = visibleItems.filter(i => group.paths.includes(i.path));
          if (!groupItems.length) return null;
          return (
            <div key={group.label}>
              {(!collapsed || mobile) && (
                <div style={{ padding: "0 12px", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" }}>{group.label}</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {groupItems.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.path === "/"}
                    onClick={() => setDrawerOpen(false)}
                    style={({ isActive }) => ({
                      display: "flex", alignItems: "center",
                      gap: collapsed && !mobile ? 0 : 10,
                      padding: collapsed && !mobile ? "10px 0" : "10px 12px",
                      justifyContent: collapsed && !mobile ? "center" : "flex-start",
                      borderRadius: 10, textDecoration: "none", transition: "all 0.15s",
                      background: isActive ? BLUE : "transparent",
                      color: isActive ? "white" : "rgba(255,255,255,0.45)",
                      boxShadow: isActive ? `0 4px 15px rgba(0,35,255,0.4)` : "none",
                      position: "relative",
                    })}>
                    {({ isActive }) => (
                      <>
                        <span style={{ flexShrink: 0, display: "flex" }}><Icon name={item.icon} size={17} /></span>
                        {(!collapsed || mobile) && (
                          <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                        )}
                        {/* Indicateur jaune sur item actif */}
                        {isActive && !collapsed && (
                          <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: YELLOW, flexShrink: 0 }} />
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
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        {(!collapsed || mobile) ? (
          <div style={{ padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 900, flexShrink: 0, boxShadow: `0 2px 8px rgba(0,35,255,0.4)` }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.login}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{user?.categorie}</div>
              </div>
              <button onClick={handleLogout} title="Déconnexion"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4, borderRadius: 6, display: "flex", flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = "#ff6b6b"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}>
                <Icon name="logout" size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleLogout}
            style={{ width: "100%", padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ff6b6b"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}>
            <Icon name="logout" size={16} />
          </button>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ width: "100%", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", color: "rgba(255,255,255,0.2)" }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>
            <Icon name={collapsed ? "chevR" : "chevL"} size={14} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F0F2FF", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Overlay mobile */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(6,13,46,0.6)", backdropFilter: "blur(4px)" }}
          className="md:hidden" />
      )}

      {/* Sidebar desktop */}
      <aside style={{ width: collapsed ? 68 : 232, background: DARK, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.25s" }}
        className="hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: 252, background: DARK, zIndex: 50, display: "flex", flexDirection: "column" }}
          className="md:hidden">
          <SidebarContent mobile />
        </div>
      )}

      {/* Contenu */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", gap: 16, padding: "0 16px", height: 60, flexShrink: 0,
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,35,255,0.08)",
          boxShadow: "0 1px 12px rgba(0,35,255,0.06)",
        }}>
          <button onClick={() => setDrawerOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ba5c9", padding: 6, borderRadius: 8, display: "flex" }}
            className="md:hidden">
            <Icon name="menu" size={20} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 14, fontWeight: 800, color: DARK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentItem?.label || "WariGest"}
            </h1>
            <p style={{ fontSize: 11, color: "#9ba5c9", margin: 0, display: "none" }} className="sm:block">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#e8ecff", border: "1px solid #c7d0ff", borderRadius: 10, padding: "6px 12px" }}
              className="hidden sm:flex">
              <div style={{ width: 22, height: 22, borderRadius: 7, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 900 }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{user?.login}</span>
              <span style={{ color: "#c7d0ff", fontSize: 10 }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>{user?.categorie}</span>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: 80 }} className="md:p-6 md:pb-6">
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F0F2FF", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: "#0023FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: 16, position: "relative" }}>
        Wi
        <div style={{ position: "absolute", top: 6, right: 7, width: 7, height: 7, borderRadius: "50%", background: "#FFF900" }} />
      </div>
      <div style={{ width: 28, height: 28, border: "3px solid #c7d0ff", borderTopColor: "#0023FF", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
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
