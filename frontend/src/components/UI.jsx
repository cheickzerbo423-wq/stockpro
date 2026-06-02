// src/components/UI.jsx — Design system StockPro v2
import React from "react";

// ── Formatage ─────────────────────────────────────────────
export const fmt   = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
export const fmtN  = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
export const today = ()  => new Date().toISOString().split("T")[0];

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ sm }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${sm ? "py-4" : "py-20"}`}>
      <div className={`${sm ? "w-5 h-5 border-2" : "w-8 h-8 border-[3px]"} border-orange-100 border-t-orange-500 rounded-full animate-spin`} />
      {!sm && <p className="text-xs text-gray-400 font-medium">Chargement...</p>}
    </div>
  );
}

// ── Erreur ────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="m-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <span className="text-red-700 text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="text-xs text-red-600 font-bold px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-xl transition flex-shrink-0">
          Réessayer
        </button>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, color = "emerald" }) {
  const styles = {
    emerald: "bg-emerald-50  text-emerald-700 ring-1 ring-emerald-200",
    red:     "bg-red-50      text-red-700     ring-1 ring-red-200",
    amber:   "bg-amber-50    text-amber-700   ring-1 ring-amber-200",
    orange:  "bg-orange-50   text-orange-700  ring-1 ring-orange-200",
    blue:    "bg-blue-50     text-blue-700    ring-1 ring-blue-200",
    purple:  "bg-purple-50   text-purple-700  ring-1 ring-purple-200",
    gray:    "bg-gray-100    text-gray-600    ring-1 ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${styles[color] || styles.gray}`}>
      {children}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)" }}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden`}
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition text-lg leading-none font-light">
            ×
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300
          transition duration-150 outline-none bg-white
          border ${error ? "border-red-300 bg-red-50/50" : "border-gray-200 hover:border-gray-300"}
          focus:border-orange-400 focus:ring-4 focus:ring-orange-100
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          shadow-sm`}
      />
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
          {label}
        </label>
      )}
      <select
        {...props}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-800
          border border-gray-200 bg-white hover:border-gray-300
          focus:border-orange-400 focus:ring-4 focus:ring-orange-100
          transition duration-150 outline-none cursor-pointer shadow-sm"
      >
        {children}
      </select>
    </div>
  );
}

// ── Bouton ────────────────────────────────────────────────
export function Btn({ children, onClick, color = "orange", sm, loading, type = "button" }) {
  const variants = {
    orange: "text-white shadow-md shadow-orange-200/60",
    green:  "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md shadow-emerald-200",
    blue:   "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md shadow-blue-200",
    red:    "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-md shadow-red-200",
    purple: "bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white shadow-md shadow-purple-200",
    gray:   "bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm",
  };
  const orangeStyle = color === "orange" ? {
    background: "linear-gradient(135deg, #f97316, #ea580c)",
  } : {};
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={orangeStyle}
      className={`
        inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${sm ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}
        ${variants[color] || variants.gray}
        ${color === "orange" ? "hover:opacity-90 active:opacity-80" : ""}
      `}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />}
      {children}
    </button>
  );
}

// ── SearchBox ─────────────────────────────────────────────
export function SearchBox({ value, onChange, onSelect, suggestions = [], placeholder = "Rechercher…", className = "" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visible = suggestions.filter(s =>
    !value || s.label.toLowerCase().includes(value.toLowerCase()) || (s.sub || "").toLowerCase().includes(value.toLowerCase())
  ).slice(0, 8);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm
            focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-400 transition placeholder-gray-300"
        />
        {value
          ? <button onClick={() => { onChange(""); onSelect && onSelect(""); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs transition">✕</button>
          : <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-200 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
        }
      </div>
      {open && visible.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
          style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
          {visible.map((s, i) => (
            <button key={i} onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(s.label); onSelect && onSelect(s.label); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition text-left border-b border-gray-50 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800 truncate">{s.label}</div>
                {s.sub && <div className="text-xs text-gray-400 truncate">{s.sub}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── En-tête de page ───────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h2 className="text-xl font-black text-gray-900 leading-tight">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5 font-medium">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Tableau générique ─────────────────────────────────────
export function DataTable({ headers, children, empty = "Aucune donnée", sort, onSort }) {
  const hasRows = children && (Array.isArray(children) ? children.length > 0 : true);
  const hasWidths = headers.some((h) => typeof h === "object" && h.w);
  return (
    <div className="overflow-x-auto">
      <table className={`text-sm min-w-[640px] ${hasWidths ? "md:table-fixed md:w-full md:min-w-full" : "w-full"}`}>
        {hasWidths && (
          <colgroup>
            {headers.map((h, i) => (
              <col key={i} style={{ width: typeof h === "object" && h.w ? h.w : "auto" }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {headers.map((h, i) => {
              const label   = typeof h === "object" ? h.label   : h;
              const right   = typeof h === "object" ? h.right   : false;
              const sk      = typeof h === "object" ? h.sortKey : null;
              const active  = sort && sk && sort.key === sk;
              const canSort = !!onSort && !!sk;
              return (
                <th key={i}
                  onClick={canSort ? () => onSort(sk) : undefined}
                  className={`px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap
                    ${right ? "text-right" : "text-left"}
                    ${canSort ? "cursor-pointer hover:text-orange-500 select-none" : ""}`}
                  style={{ background: "#F8FAFC", borderBottom: "1px solid #EEF2F7" }}>
                  <span className="flex items-center gap-1 w-full" style={{ justifyContent: right ? "flex-end" : "flex-start" }}>
                    {label}
                    {canSort && (
                      <span className={`text-[10px] ${active ? "text-orange-500" : "opacity-20"}`}>
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hasRows ? children : (
            <tr>
              <td colSpan={headers.length}>
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-3xl">📭</div>
                  <p className="text-sm font-semibold text-gray-400">{empty}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TR({ children, onClick }) {
  return (
    <tr onClick={onClick}
      className={`transition-colors duration-100 border-b border-gray-50 last:border-0
        ${onClick ? "cursor-pointer hover:bg-orange-50/50" : "hover:bg-gray-50/50"}`}>
      {children}
    </tr>
  );
}

export function TD({ children, right, bold, muted, truncate }) {
  return (
    <td className={`px-4 py-3.5 whitespace-nowrap
      ${truncate ? "overflow-hidden text-ellipsis max-w-0" : ""}
      ${right ? "text-right" : ""}
      ${bold  ? "font-bold text-gray-900" : ""}
      ${muted ? "text-gray-400 text-xs" : "text-gray-600 text-sm"}`}>
      {children}
    </td>
  );
}

// ── Carte statistique ─────────────────────────────────────
export function StatCard({ label, value, icon, gradient, sub }) {
  return (
    <div className={`${gradient} rounded-2xl p-5 text-white relative overflow-hidden`}
      style={{ boxShadow: "0 8px 25px rgba(0,0,0,0.12)" }}>
      <div className="absolute -right-4 -top-4 text-7xl opacity-[0.07] select-none pointer-events-none">{icon}</div>
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl mb-4">{icon}</div>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</div>
        <div className="text-lg font-black leading-tight">{value}</div>
        {sub && <div className="text-[11px] opacity-60 mt-1 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const configs = {
    success: { bg: "#0F172A", icon: "✓", dot: "#34D399" },
    error:   { bg: "#EF4444", icon: "✕", dot: "#FCA5A5" },
    info:    { bg: "#3B82F6", icon: "ℹ", dot: "#93C5FD" },
  };
  const c = configs[type] || configs.success;
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl max-w-sm min-w-[220px]"
      style={{ background: c.bg, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", color: "white" }}>
      <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 text-sm font-bold">
        {c.icon}
      </div>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="opacity-40 hover:opacity-80 transition text-lg leading-none flex-shrink-0">×</button>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────
export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 ${className}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      {children}
    </div>
  );
}
