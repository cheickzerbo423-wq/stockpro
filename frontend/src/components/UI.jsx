// src/components/UI.jsx — Design system WariGest
import React from "react";

// ── Formatage ─────────────────────────────────────────────
export const fmt     = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
export const fmtN    = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
export const today   = ()  => new Date().toISOString().split("T")[0];
export const fmtDate = (d) => {
  if (!d) return "—";
  const s = typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ sm }) {
  return (
    <div className={`flex items-center justify-center ${sm ? "py-4" : "py-20"}`}>
      <div className={`${sm ? "w-5 h-5 border-2" : "w-9 h-9 border-[3px]"} rounded-full animate-spin`}
        style={{ borderColor: "#E6EAFF", borderTopColor: "#0023FF" }} />
    </div>
  );
}

// ── Erreur ────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="m-4 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-red-500 text-sm">⚠</span>
        </div>
        <span className="text-red-700 text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="text-xs text-red-600 font-semibold px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition flex-shrink-0">
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
    orange:  "bg-[#E6EAFF]  text-[#0023FF]  ring-1 ring-[#B3BFFF]",
    blue:    "bg-[#E6EAFF]  text-[#0023FF]  ring-1 ring-[#B3BFFF]",
    purple:  "bg-purple-50   text-purple-700  ring-1 ring-purple-200",
    gray:    "bg-gray-100    text-gray-600    ring-1 ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[color] || styles.gray}`}>
      {children}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition text-base leading-none">
            ×
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300
          transition duration-150 outline-none
          border ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"}
          focus:border-[#0023FF] focus:ring-4 focus:ring-[#E6EAFF]
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
          {label}
        </label>
      )}
      <select
        {...props}
        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800
          border border-gray-200 bg-white hover:border-gray-300
          focus:border-[#0023FF] focus:ring-4 focus:ring-[#E6EAFF]
          transition duration-150 outline-none cursor-pointer"
      >
        {children}
      </select>
    </div>
  );
}

// ── Bouton ────────────────────────────────────────────────
export function Btn({ children, onClick, color = "blue", sm, loading, type = "button" }) {
  const variants = {
    orange: "text-white shadow-sm",
    green:  "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm shadow-emerald-200",
    blue:   "text-white shadow-sm",
    red:    "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm shadow-red-200",
    purple: "bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white shadow-sm shadow-purple-200",
    gray:   "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border border-gray-200",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={(color === "orange" || color === "blue") ? { backgroundColor: "#0023FF" } : (color === "orange-light") ? { backgroundColor: "#E6EAFF", color: "#0023FF" } : undefined}
      className={`
        inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl
        transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${sm ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}
        ${variants[color] || variants.gray}
      `}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />}
      {children}
    </button>
  );
}

// ── SearchBox (input + dropdown combinés) ─────────────────
// suggestions : [{ label, sub }] — label = texte principal, sub = texte secondaire
export function SearchBox({ value, onChange, onSelect, suggestions = [], placeholder = "Rechercher…", className = "" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  // Ferme le dropdown si clic dehors
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
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] focus:border-[#0023FF]"
        />
        {value
          ? <button onClick={() => { onChange(""); onSelect && onSelect(""); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 text-xs transition">✕</button>
          : <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
        }
      </div>

      {open && visible.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {visible.map((s, i) => (
            <button key={i} onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(s.label); onSelect && onSelect(s.label); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#E6EAFF] transition text-left">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#0023FF" }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800 truncate">{s.label}</div>
                {s.sub && <div className="text-xs text-gray-400 truncate">{s.sub}</div>}
              </div>
            </button>
          ))}
          {value && (
            <div className="px-3 py-2 border-t border-gray-50 text-xs text-gray-400 text-center">
              {visible.length} résultat(s) — Appuyez Entrée pour tout afficher
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── En-tête de page ───────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
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
    <div className="overflow-x-auto rounded-2xl">
      {/* Sur mobile : min-w-[640px] force le défilement horizontal (colonnes lisibles).
          Sur desktop (md+) : table-fixed + w-full répartit proprement les % de largeur. */}
      <table className={`text-sm min-w-[640px] ${hasWidths ? "md:table-fixed md:w-full md:min-w-full" : "w-full"}`}>
        {hasWidths && (
          <colgroup>
            {headers.map((h, i) => (
              <col key={i} style={{ width: typeof h === "object" && h.w ? h.w : "auto" }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h, i) => {
              const label   = typeof h === "object" ? h.label   : h;
              const right   = typeof h === "object" ? h.right   : false;
              const sk      = typeof h === "object" ? h.sortKey : null;
              const active  = sort && sk && sort.key === sk;
              const canSort = !!onSort && !!sk;
              return (
                <th key={i}
                  onClick={canSort ? () => onSort(sk) : undefined}
                  className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50/80
                    ${right ? "text-right" : "text-left"}
                    ${canSort ? "cursor-pointer hover:text-[#0023FF] select-none" : ""}`}>
                  {label}
                  {canSort && (
                    <span className={`ml-1 text-[10px] ${active ? "text-[#0023FF]" : "opacity-25"}`}>
                      {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hasRows ? children : (
            <tr>
              <td colSpan={headers.length}>
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm font-medium text-gray-400">{empty}</p>
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
    <tr
      onClick={onClick}
      className={`border-b border-gray-50 last:border-0 transition-colors duration-100
        ${onClick ? "cursor-pointer hover:bg-[#E6EAFF]" : "hover:bg-gray-50/40"}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, right, bold, muted, truncate }) {
  return (
    <td className={`px-4 py-3 whitespace-nowrap
      ${truncate ? "overflow-hidden text-ellipsis max-w-0" : ""}
      ${right ? "text-right" : ""}
      ${bold  ? "font-semibold text-gray-800" : ""}
      ${muted ? "text-gray-400 text-xs" : "text-gray-600 text-sm"}`}>
      {children}
    </td>
  );
}

// ── Carte statistique ─────────────────────────────────────
export function StatCard({ label, value, icon, gradient }) {
  return (
    <div className={`${gradient} rounded-2xl p-5 text-white shadow-lg shadow-black/10 overflow-hidden relative`}>
      <div className="absolute -right-3 -top-3 text-6xl opacity-10 select-none pointer-events-none">{icon}</div>
      <div className="text-2xl mb-3 relative">{icon}</div>
      <div className="text-[11px] font-semibold uppercase tracking-widest opacity-75 mb-1">{label}</div>
      <div className="text-base font-black leading-tight">{value}</div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const styles = {
    success: "bg-gray-900 text-white",
    error:   "bg-red-600   text-white",
    info:    "bg-blue-600  text-white",
  };
  const dotColors = { success: "bg-emerald-400", error: "bg-red-300", info: "bg-blue-300" };
  return (
    <div className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100]
      ${styles[type]} px-4 py-3 rounded-2xl shadow-2xl
      flex items-center gap-3 max-w-sm min-w-[200px]`}>
      <div className={`w-2 h-2 rounded-full ${dotColors[type]} flex-shrink-0`} />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose}
        className="opacity-50 hover:opacity-100 transition text-lg leading-none flex-shrink-0 ml-1">×</button>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────
export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
