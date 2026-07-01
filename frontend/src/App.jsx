// src/App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Icon from "./components/Icon";

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
import { ConfirmModal, Toast } from "./components/UI";
import Parametres   from "./pages/Parametres";
import SuperAdmin   from "./pages/SuperAdmin";
import ForcePasswordChange from "./pages/ForcePassword";

// ── Logo SVG Wi — tracé vectoriel officiel (fichier .svg fourni) ──
const WiLogo = ({ size = 36 }) => (
  <svg viewBox="555 550 1372 1380" width={size} height={size}
       style={{ flexShrink: 0, fillRule: "evenodd", clipRule: "evenodd" }}>
    <path d="M1921.296,898.435l0,683.444c0,189.808 -154.1,343.908 -343.908,343.908l-674.461,0c-189.808,0 -343.908,-154.1 -343.908,-343.908l0,-683.444c0,-189.808 154.1,-343.908 343.908,-343.908l674.461,0c189.808,0 343.908,154.1 343.908,343.908Z" fill="#0023ff"/>
    <ellipse cx="1569.466" cy="974.341" rx="113.239" ry="117.957" fill="#fff900"/>
    <path d="M1121.277,1160.585l0,164.319c-0.337,-2.607 -0.511,-5.264 -0.511,-7.962l0,-156.512l0.511,0.155Z" fill="#fff"/>
    <path d="M1121.277,905.88l0,419.025c-0.337,-2.607 -0.511,-5.264 -0.511,-7.962l0,-403.1c0,-2.698 0.174,-5.356 0.511,-7.962Z" fill="#fff"/>
    <path d="M1448.414,1149.957c10.344,-14.463 27.279,-23.898 46.4,-23.898l129.693,0c31.464,0 57.009,25.545 57.009,57.009l0,111.803c0,10.837 -3.03,20.972 -8.29,29.603c5.406,19.518 8.29,40.031 8.29,61.191c0,130.211 -109.178,235.926 -243.655,235.926c-79.644,0 -150.414,-37.081 -194.886,-94.37c-44.471,57.289 -115.242,94.37 -194.886,94.37c-134.477,0 -243.655,-105.715 -243.655,-235.926c-0,-15.783 1.604,-31.206 4.663,-46.124c-2.768,-6.997 -4.29,-14.622 -4.29,-22.599l0,-403.1c0,-33.956 27.568,-61.525 61.525,-61.525l120.66,0c33.956,0 61.525,27.568 61.525,61.525l0,446.257c0,10.138 8.23,18.368 18.368,18.368l36.023,0c10.138,0 18.368,-8.23 18.368,-18.368l0,-454.219c3.91,-30.201 29.755,-53.562 61.013,-53.562l120.66,0c33.956,0 61.525,27.568 61.525,61.525l0,246.804l0.572,-0.174l0,199.627c0,10.138 8.23,18.368 18.368,18.368l36.023,0c10.138,0 18.368,-8.23 18.368,-18.368l-0,-177.031c0,-12.343 3.931,-23.775 10.608,-33.111Z" fill="#fff"/>
  </svg>
);

// ── Icônes SVG par route ──────────────────────────────────
const ICONS = {
  "/": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  "/articles": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  ),
  "/ventes": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  "/achats": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  "/clients": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  "/factures": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="12" y1="12" x2="12" y2="18"/>
    </svg>
  ),
  "/rapports": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  "/guide": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2H10a3 3 0 0 1 3 3v15.5a2.5 2.5 0 0 0-2.5-2.5H2z"/>
      <path d="M22 4.5A2.5 2.5 0 0 0 19.5 2H14a3 3 0 0 0-3 3v15.5a2.5 2.5 0 0 1 2.5-2.5H22z"/>
    </svg>
  ),
  "/utilisateurs": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
  ),
  "/parametres": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  "/superadmin": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
};

// ── Structure des sections de navigation ──────────────────
const NAV_SECTIONS = [
  {
    items: [
      { path: "/", label: "Tableau de bord", module: null },
    ],
  },
  {
    label: "GESTION",
    items: [
      { path: "/articles",  label: "Articles & Stock",       module: "articles" },
      { path: "/ventes",    label: "Ventes",                 module: "vente" },
      { path: "/achats",    label: "Approvisionnements",     module: "appro" },
      { path: "/clients",   label: "Clients & Fournisseurs", module: "clients" },
      { path: "/factures",  label: "Factures",               module: "facturation" },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { path: "/rapports",  label: "Rapports financiers",    module: null },
    ],
  },
  {
    label: "AIDE",
    items: [
      { path: "/guide",     label: "Guide utilisateur",      module: null },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { path: "/utilisateurs", label: "Utilisateurs",        module: null, adminOnly: true },
      { path: "/parametres",   label: "Paramètres",          module: null, adminOnly: true },
    ],
  },
  {
    label: "PLATEFORME",
    items: [
      { path: "/superadmin", label: "Super-Admin", module: null, superAdminOnly: true },
    ],
  },
];

// Aplatir pour la barre mobile
const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

const BOTTOM_NAV_PATHS = ["/", "/articles", "/ventes", "/achats", "/factures"];

// ── NavItem ───────────────────────────────────────────────
function NavItem({ item, collapsed, onClick }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onClick}
      className={({ isActive }) => `
        group relative flex items-center gap-3 rounded-xl transition-all duration-150 select-none
        ${collapsed ? "justify-center px-0 py-3.5 mx-1" : "px-3 py-2.5 mx-0"}
        ${isActive
          ? "font-bold"
          : "text-slate-400 hover:text-white"
        }
      `}
      style={({ isActive }) => isActive
        ? { backgroundColor: "#FFF900", color: "#000" }
        : undefined
      }
    >
      {({ isActive }) => (
        <>
          {/* Hover bg */}
          {!isActive && (
            <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-all duration-150" />
          )}
          <span className="relative flex-shrink-0">{ICONS[item.path]}</span>
          {!collapsed && (
            <span className="relative text-[13px] font-semibold truncate leading-tight">{item.label}</span>
          )}
          {/* Tooltip collapsed */}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap
              opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50
              shadow-lg border border-white/10">
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Sidebar (desktop) ─────────────────────────────────────
function Sidebar({ collapsed, setCollapsed, user, onLogout, visibleSections }) {
  return (
    <aside className="hidden md:flex flex-col flex-shrink-0 transition-all duration-200"
      style={{ width: collapsed ? 68 : 232, background: "#0F172A" }}>

      {/* Logo */}
      <div className={`flex items-center border-b border-white/5 flex-shrink-0 transition-all
        ${collapsed ? "justify-center p-4 py-5" : "gap-3 px-4 py-4"}`}>
        <WiLogo size={36} />
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <div className="font-black text-[15px] text-white tracking-tight">WariGest</div>
            <div className="text-[10px] font-medium text-white/40">Gestion & Facturation</div>
          </div>
        )}
      </div>

      {/* Navigation avec sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3"
        style={{ scrollbarWidth: "none" }}>
        {visibleSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.label && !collapsed && (
              <div className="px-4 mb-1.5">
                <span className="text-[9px] font-bold tracking-[0.12em] text-slate-600 uppercase select-none">
                  {section.label}
                </span>
              </div>
            )}
            {section.label && collapsed && si > 0 && (
              <div className="mx-3 mb-1.5 border-t border-white/5" />
            )}
            <div className={`space-y-0.5 ${collapsed ? "px-1" : "px-2"}`}>
              {section.items.map(item => (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profil + logout */}
      <div className="border-t border-white/5 flex-shrink-0">
        {!collapsed ? (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0023FF, #0040FF)" }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{user?.login}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.categorie}</div>
              </div>
              <button onClick={onLogout} title="Déconnexion"
                className="text-slate-600 hover:text-red-400 transition flex-shrink-0 p-1 rounded-lg hover:bg-white/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button onClick={onLogout}
            className="w-full py-3.5 flex items-center justify-center text-slate-600 hover:text-red-400 transition group relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg
              whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-lg">
              Déconnexion
            </div>
          </button>
        )}

        {/* Toggle collapse */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full py-2.5 flex items-center justify-center border-t border-white/5 text-slate-600 hover:text-white hover:bg-white/5 transition text-xs">
          {collapsed
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"/></svg>
          }
        </button>
      </div>
    </aside>
  );
}

// ── Drawer mobile ─────────────────────────────────────────
function MobileDrawer({ open, onClose, visibleSections, user, onLogout }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 md:hidden"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col"
        style={{ width: 256, background: "#0F172A" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <WiLogo size={36} />
            <div>
              <div className="font-black text-[15px] text-white">WariGest</div>
              <div className="text-[10px] font-medium text-white/40">Gestion & Facturation</div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && (
                <div className="px-4 mb-1.5">
                  <span className="text-[9px] font-bold tracking-[0.12em] text-slate-600 uppercase">{section.label}</span>
                </div>
              )}
              <div className="px-2 space-y-0.5">
                {section.items.map(item => (
                  <NavItem key={item.path} item={item} collapsed={false} onClick={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0023FF, #0040FF)" }}>
              {user?.login?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.login}</div>
              <div className="text-[10px] text-slate-500">{user?.categorie}</div>
            </div>
            <button onClick={onLogout} className="text-slate-600 hover:text-red-400 transition p-1 rounded-lg hover:bg-white/5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Barre mobile bas ──────────────────────────────────────
function BottomNav({ allItems }) {
  const bottomItems = allItems.filter(i => BOTTOM_NAV_PATHS.includes(i.path));
  if (bottomItems.length === 0) return null;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
      style={{ background: "#0F172A", borderTop: "1px solid rgba(255,255,255,0.07)", minHeight: "4rem", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {bottomItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150
            ${isActive ? "text-[#FFF900]" : "text-slate-500 hover:text-slate-300"}`
          }
        >
          {ICONS[item.path]}
          <span className="text-[9px] font-bold">
            {item.label.split(" ")[0]}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

// ── Layout principal ──────────────────────────────────────
function Layout({ children }) {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [collapsed,     setCollapsed]     = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  // Filtrer par permissions
  // Le SuperAdmin (compte plateforme, sans entreprise rattachée) ne voit QUE
  // sa propre interface de pilotage — les autres pages sont cloisonnées par
  // entreprise et n'auraient aucun sens (ni données) pour lui.
  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(i => {
      if (user?.categorie === "SuperAdmin") return !!i.superAdminOnly;
      if (i.superAdminOnly) return false;
      if (i.adminOnly && user?.categorie !== "Admin") return false;
      return !i.module || canAccess(i.module);
    }),
  })).filter(s => s.items.length > 0);

  const allItems = visibleSections.flatMap(s => s.items);

  const currentItem = allItems.find(i =>
    window.location.pathname === i.path ||
    (i.path !== "/" && window.location.pathname.startsWith(i.path))
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F4F6F9", fontFamily: "'Montserrat', 'Segoe UI', sans-serif" }}>

      {/* Sidebar desktop */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        onLogout={() => setLogoutConfirm(true)}
        visibleSections={visibleSections}
      />

      {/* Drawer mobile */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        visibleSections={visibleSections}
        user={user}
        onLogout={() => setLogoutConfirm(true)}
      />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header top */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 md:px-6 h-14"
          style={{ background: "#fff", borderBottom: "1px solid #E8ECF1" }}>

          {/* Hamburger mobile */}
          <button className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition flex-shrink-0"
            onClick={() => setDrawerOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Breadcrumb / titre */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium hidden sm:flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>WariGest</span>
              <span className="text-gray-200">/</span>
            </div>
            <h1 className="text-sm font-bold text-gray-800 truncate">{currentItem?.label || "WariGest"}</h1>
          </div>

          {/* Droite : date + profil */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="hidden lg:block text-xs text-gray-400 font-medium">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0023FF, #0040FF)" }}>
                {user?.login?.[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-gray-700 leading-tight">{user?.login}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{user?.categorie}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu page */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6"
          style={{ scrollPaddingBottom: "env(safe-area-inset-bottom)" }}>
          {children}
        </div>
      </main>

      {/* Barre mobile bas */}
      <BottomNav allItems={allItems} />

      {/* Confirmation déconnexion */}
      {logoutConfirm && (
        <ConfirmModal
          icon={<Icon name="lock" size={22} />}
          title="Se déconnecter ?"
          message="Voulez-vous vraiment vous déconnecter de votre espace de gestion ?"
          confirmLabel="Déconnexion"
          confirmColor="red"
          onConfirm={handleLogout}
          onCancel={() => setLogoutConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Route privée ──────────────────────────────────────────
function PrivateRoute({ children, adminOnly = false, superAdminOnly = false, module = null }) {
  const { user, loading, canAccess } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#F4F6F9" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
          style={{ borderColor: "#E6EAFF", borderTopColor: "#0023FF" }} />
        <div className="text-xs text-gray-400 font-medium">Chargement…</div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  // Politique de mot de passe renforcée : tant que l'utilisateur n'a pas
  // défini un nouveau mot de passe conforme, on bloque l'accès à toute page
  // (y compris le pilotage SuperAdmin) et on affiche l'écran dédié.
  if (user.must_change_password) return <ForcePasswordChange />;
  // Le SuperAdmin (compte plateforme, entreprise_id = NULL) n'a accès qu'à
  // sa propre interface de pilotage : on le redirige systématiquement vers
  // /superadmin et on lui interdit les pages cloisonnées par entreprise
  // (qui n'auraient ni sens ni données pour lui).
  if (user.categorie === "SuperAdmin") {
    return superAdminOnly ? children : <Navigate to="/superadmin" replace />;
  }
  if (superAdminOnly) return <Navigate to="/" replace />;
  if (adminOnly && user.categorie !== "Admin") return <Navigate to="/" replace />;
  // Protection par permission de module : un Vendeur sans la permission
  // correspondante (ex. perm_articles = false) ne doit pas pouvoir accéder à
  // la page directement via son URL, même si elle est masquée dans le menu.
  if (module && !canAccess(module)) return <Navigate to="/" replace />;
  return children;
}

// ── Notifications globales (ex: session expirée) ──────────
// Affiché au-dessus des routes : reste visible même si l'utilisateur est
// redirigé (ex: vers /login) suite à l'événement.
function AuthNotice() {
  const { authNotice, clearAuthNotice } = useAuth();
  if (!authNotice) return null;
  return <Toast message={authNotice} type="info" onClose={clearAuthNotice} />;
}

// ── Intégration app mobile (Capacitor) ─────────────────────
// Masque le splash screen natif une fois React monté, ajuste la barre de
// statut Android à la couleur de la marque, et fait correspondre le bouton
// "retour" matériel Android à la navigation React Router (recul d'une page,
// ou confirmation de sortie sur les écrans racines). N'a aucun effet sur le
// web (Capacitor.isNativePlatform() === false).
function CapacitorBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {});

    import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) => {
        StatusBar.setBackgroundColor({ color: "#0023FF" }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle;
    import("@capacitor/app").then(({ App: CapApp }) => {
      CapApp.addListener("backButton", () => {
        const ROOT_PATHS = ["/", "/login"];
        if (ROOT_PATHS.includes(location.pathname)) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      }).then((h) => { listenerHandle = h; });
    }).catch(() => {});
    return () => { listenerHandle?.remove(); };
  }, [location.pathname, navigate]);

  return null;
}

// ── App root ──────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"            element={<PrivateRoute><Layout><Dashboard    /></Layout></PrivateRoute>} />
          <Route path="/articles"    element={<PrivateRoute module="articles"><Layout><Articles     /></Layout></PrivateRoute>} />
          <Route path="/ventes"      element={<PrivateRoute module="vente"><Layout><Ventes       /></Layout></PrivateRoute>} />
          <Route path="/achats"      element={<PrivateRoute module="appro"><Layout><Achats       /></Layout></PrivateRoute>} />
          <Route path="/clients"     element={<PrivateRoute module="clients"><Layout><Clients      /></Layout></PrivateRoute>} />
          <Route path="/factures"    element={<PrivateRoute module="facturation"><Layout><Factures     /></Layout></PrivateRoute>} />
          <Route path="/rapports"    element={<PrivateRoute><Layout><Rapports     /></Layout></PrivateRoute>} />
          <Route path="/guide"       element={<PrivateRoute><Layout><Guide        /></Layout></PrivateRoute>} />
          <Route path="/utilisateurs" element={<PrivateRoute adminOnly><Layout><Utilisateurs /></Layout></PrivateRoute>} />
          <Route path="/parametres"   element={<PrivateRoute adminOnly><Layout><Parametres   /></Layout></PrivateRoute>} />
          <Route path="/superadmin"   element={<PrivateRoute superAdminOnly><Layout><SuperAdmin /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AuthNotice />
        <CapacitorBootstrap />
      </BrowserRouter>
    </AuthProvider>
  );
}
