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

// ── Logo SVG Wi ───────────────────────────────────────────
const WiLogo = ({ size = 36 }) => (
  <svg viewBox="0 0 52 52" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    {/* Fond bleu arrondi */}
    <rect width="52" height="52" rx="12" fill="#0023FF"/>
    {/* Arche gauche du W — trait blanc */}
    <path d="M8 13 L8 31 C8 42 21 42 21 31 L21 13"
          stroke="white" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Arche droite du W (aussi le corps du "i") — trait blanc */}
    <path d="M19 13 L19 31 C19 42 32 42 32 31 L32 13"
          stroke="white" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Point jaune — le point du "i" */}
    <circle cx="40" cy="12" r="5.5" fill="#FFF900"/>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  "/utilisateurs": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16"
      style={{ background: "#0F172A", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
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
  const [collapsed,  setCollapsed]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  // Filtrer par permissions
  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(i => {
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#F4F6F9", fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Sidebar desktop */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        onLogout={handleLogout}
        visibleSections={visibleSections}
      />

      {/* Drawer mobile */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        visibleSections={visibleSections}
        user={user}
        onLogout={handleLogout}
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      {/* Barre mobile bas */}
      <BottomNav allItems={allItems} />
    </div>
  );
}

// ── Route privée ──────────────────────────────────────────
function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
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
  if (adminOnly && user.categorie !== "Admin") return <Navigate to="/" replace />;
  return children;
}

// ── App root ──────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"            element={<PrivateRoute><Layout><Dashboard    /></Layout></PrivateRoute>} />
          <Route path="/articles"    element={<PrivateRoute><Layout><Articles     /></Layout></PrivateRoute>} />
          <Route path="/ventes"      element={<PrivateRoute><Layout><Ventes       /></Layout></PrivateRoute>} />
          <Route path="/achats"      element={<PrivateRoute><Layout><Achats       /></Layout></PrivateRoute>} />
          <Route path="/clients"     element={<PrivateRoute><Layout><Clients      /></Layout></PrivateRoute>} />
          <Route path="/factures"    element={<PrivateRoute><Layout><Factures     /></Layout></PrivateRoute>} />
          <Route path="/rapports"    element={<PrivateRoute><Layout><Rapports     /></Layout></PrivateRoute>} />
          <Route path="/guide"       element={<PrivateRoute><Layout><Guide        /></Layout></PrivateRoute>} />
          <Route path="/utilisateurs" element={<PrivateRoute adminOnly><Layout><Utilisateurs /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
