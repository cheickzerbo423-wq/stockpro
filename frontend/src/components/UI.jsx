// src/components/UI.jsx — Design system WariGest Premium
import React from "react";

// ── Formatage ─────────────────────────────────────────────
// Séparateur de milliers : espace insécable ordinaire (U+00A0).
// Évite le thin no-break space (U+202F) produit par Intl.NumberFormat("fr-FR")
// qui s'affiche parfois comme une virgule ou n'apparaît pas sur certains
// navigateurs/systèmes, donnant "1,000" au lieu de "1 000".
const _sep = (n) => String(Math.round(parseFloat(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const fmtN    = (n) => _sep(n);
export const fmt     = (n) => _sep(n) + " FCFA";
export const today   = ()  => new Date().toISOString().split("T")[0];
export const fmtDate = (d) => {
  if (!d) return "—";
  const s = typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ sm, label }) {
  if (sm) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "#E6EAFF", borderTopColor: "#0023FF" }} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-[3px] rounded-full animate-spin"
          style={{ borderColor: "#E6EAFF", borderTopColor: "#0023FF" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "transparent", borderTopColor: "#0023FF", animationDirection: "reverse" }} />
        </div>
      </div>
      {label && <p className="text-sm text-gray-400 font-medium">{label}</p>}
    </div>
  );
}

// ── Erreur ────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="mx-auto max-w-md my-6 bg-red-50 border border-red-100 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" className="w-6 h-6">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <p className="text-red-700 text-sm font-semibold">{message}</p>
        <p className="text-red-400 text-xs mt-0.5">Vérifiez votre connexion et réessayez</p>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="text-xs text-red-600 font-bold px-4 py-2 bg-red-100 hover:bg-red-200 rounded-xl transition">
          ↺ Réessayer
        </button>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, color = "emerald", dot }) {
  const styles = {
    emerald: "bg-emerald-50  text-emerald-700 ring-1 ring-emerald-200",
    red:     "bg-red-50      text-red-700     ring-1 ring-red-200",
    amber:   "bg-amber-50    text-amber-700   ring-1 ring-amber-200",
    orange:  "bg-[#E6EAFF]  text-[#0023FF]  ring-1 ring-[#B3BFFF]",
    blue:    "bg-[#E6EAFF]  text-[#0023FF]  ring-1 ring-[#B3BFFF]",
    purple:  "bg-purple-50   text-purple-700  ring-1 ring-purple-200",
    gray:    "bg-gray-100    text-gray-600    ring-1 ring-gray-200",
    yellow:  "bg-yellow-50   text-yellow-700  ring-1 ring-yellow-200",
  };
  const dotColors = {
    emerald: "bg-emerald-500", red: "bg-red-500", amber: "bg-amber-500",
    orange: "bg-[#0023FF]",   blue: "bg-[#0023FF]", purple: "bg-purple-500",
    gray: "bg-gray-400",      yellow: "bg-yellow-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[color] || styles.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[color] || "bg-gray-400"}`} />}
      {children}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)" }}>
      <div className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden`}
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition text-lg leading-none">
            ×
          </button>
        </div>
        {/* Contenu */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, icon, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full rounded-xl text-[13px] text-gray-800 placeholder-gray-300
            transition-all duration-150 outline-none bg-white
            border ${error ? "border-red-300 bg-red-50/50" : "border-gray-200 hover:border-gray-300"}
            focus:border-[#0023FF] focus:ring-4 focus:ring-[#0023FF]/8
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${icon ? "pl-9 pr-3 py-2.5" : "px-3 py-2.5"}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        {...props}
        className="w-full rounded-xl px-3 py-2.5 text-[13px] text-gray-800
          border border-gray-200 bg-white hover:border-gray-300
          focus:border-[#0023FF] focus:ring-4 focus:ring-[#0023FF]/8
          transition-all duration-150 outline-none cursor-pointer"
      >
        {children}
      </select>
    </div>
  );
}

// ── Bouton ────────────────────────────────────────────────
export function Btn({ children, onClick, color = "blue", sm, loading, type = "button", icon, className = "" }) {
  const variants = {
    green:  { bg: "#10B981", hover: "#059669", shadow: "rgba(16,185,129,0.25)", text: "white" },
    blue:   { bg: "#0023FF", hover: "#0019CC", shadow: "rgba(0,35,255,0.25)",   text: "white" },
    orange: { bg: "#0023FF", hover: "#0019CC", shadow: "rgba(0,35,255,0.25)",   text: "white" },
    red:    { bg: "#EF4444", hover: "#DC2626", shadow: "rgba(239,68,68,0.25)",  text: "white" },
    amber:  { bg: "#F59E0B", hover: "#D97706", shadow: "rgba(245,158,11,0.25)", text: "white" },
    purple: { bg: "#8B5CF6", hover: "#7C3AED", shadow: "rgba(139,92,246,0.25)", text: "white" },
    gray:   { bg: "#F3F4F6", hover: "#E5E7EB", shadow: "transparent",           text: "#374151", border: "#E5E7EB" },
    "orange-light": { bg: "#E6EAFF", hover: "#D1D9FF", shadow: "transparent", text: "#0023FF" },
  };
  const v = variants[color] || variants.gray;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        backgroundColor: v.bg,
        color: v.text,
        boxShadow: v.shadow !== "transparent" ? `0 2px 8px ${v.shadow}` : undefined,
        border: v.border ? `1px solid ${v.border}` : undefined,
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.backgroundColor = v.hover; e.currentTarget.style.transform = "translateY(-1px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = v.bg; e.currentTarget.style.transform = "translateY(0)"; }}
      className={`
        inline-flex items-center justify-center gap-1.5 font-bold rounded-xl
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${sm ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[13px]"}
        ${className}
      `}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />
        : icon && <span className="flex-shrink-0">{icon}</span>
      }
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
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
            focus:outline-none focus:ring-2 focus:ring-[#0023FF]/10 focus:border-[#0023FF]
            hover:border-gray-300 transition-all"
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
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {visible.map((s, i) => (
            <button key={i} onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(s.label); onSelect && onSelect(s.label); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F0F3FF] transition-colors text-left">
              <div className="w-7 h-7 rounded-lg bg-[#E6EAFF] flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0023FF" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800 truncate">{s.label}</div>
                {s.sub && <div className="text-xs text-gray-400 truncate">{s.sub}</div>}
              </div>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-gray-50 bg-gray-50/50">
            <span className="text-[10px] text-gray-400 font-medium">{visible.length} résultat(s)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── En-tête de page ───────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5 md:mb-6">
      <div className="min-w-0">
        <h2 className="text-lg font-black text-gray-900 leading-tight">{title}</h2>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 font-medium break-words">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}

// ── Tableau générique ─────────────────────────────────────
export function DataTable({ headers, children, empty = "Aucune donnée", sort, onSort }) {
  const hasRows = children && (Array.isArray(children) ? children.filter(Boolean).length > 0 : true);
  const hasWidths = headers.some((h) => typeof h === "object" && h.w);
  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-2xl border border-gray-100"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                  className={`px-3.5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap bg-gray-50/60
                    ${right ? "text-right" : "text-left"}
                    ${canSort ? "cursor-pointer hover:text-[#0023FF] select-none transition-colors" : ""}
                    ${i === 0 ? "rounded-tl-xl" : ""} ${i === headers.length - 1 ? "rounded-tr-xl" : ""}`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {canSort && (
                      <span className={`text-[9px] ${active ? "text-[#0023FF]" : "opacity-30"}`}>
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
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl">
                    📭
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-400">{empty}</p>
                    <p className="text-xs text-gray-300 mt-0.5">Aucun élément à afficher</p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      {/* Indice de défilement horizontal — visible uniquement sur petits écrans */}
      {hasRows && (
        <>
          <div className="md:hidden pointer-events-none absolute top-0 right-0 bottom-0 w-10 rounded-r-2xl"
            style={{ background: "linear-gradient(to left, rgba(244,246,249,0.95), transparent)" }} />
          <p className="md:hidden mt-2 text-center text-[10px] text-gray-400 font-medium">
            ↔ Faites glisser le tableau pour voir toutes les colonnes
          </p>
        </>
      )}
    </div>
  );
}

export function TR({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-50 last:border-0 transition-all duration-100
        ${onClick ? "cursor-pointer hover:bg-[#F0F3FF]" : "hover:bg-gray-50/60"}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, right, bold, muted, truncate, mono }) {
  return (
    <td title={typeof children === "string" || typeof children === "number" ? String(children) : undefined}
      className={`px-3.5 py-3 whitespace-nowrap overflow-hidden text-ellipsis
      ${truncate ? "max-w-0" : ""}
      ${right ? "text-right" : ""}
      ${bold  ? "font-bold text-gray-800" : ""}
      ${muted ? "text-gray-400 text-[11px]" : "text-gray-600 text-[13px]"}
      ${mono ? "font-mono text-[11px]" : ""}`}>
      {children}
    </td>
  );
}

// ── KPI Card ──────────────────────────────────────────────
export function KpiCard({ label, value, sub, icon, color = "blue", trend }) {
  const colors = {
    blue:    { bg: "#E6EAFF", icon: "#0023FF", text: "#0023FF", border: "#B3BFFF" },
    green:   { bg: "#ECFDF5", icon: "#10B981", text: "#059669", border: "#A7F3D0" },
    red:     { bg: "#FEF2F2", icon: "#EF4444", text: "#DC2626", border: "#FECACA" },
    amber:   { bg: "#FFFBEB", icon: "#F59E0B", text: "#D97706", border: "#FDE68A" },
    purple:  { bg: "#F5F3FF", icon: "#8B5CF6", text: "#7C3AED", border: "#DDD6FE" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderColor: "#E8ECF1", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: c.bg }}>
          <span style={{ color: c.icon }} className="text-lg">{icon}</span>
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-base font-black text-gray-900 leading-tight">{value}</div>
      <div className="text-[11px] text-gray-400 font-medium mt-1">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-50">{sub}</div>}
    </div>
  );
}

// ── Carte statistique (legacy) ────────────────────────────
export function StatCard({ label, value, icon, gradient }) {
  return (
    <div className={`${gradient} rounded-2xl p-5 text-white shadow-lg shadow-black/10 overflow-hidden relative`}>
      <div className="absolute -right-3 -top-3 text-6xl opacity-10 select-none pointer-events-none">{icon}</div>
      <div className="text-2xl mb-3 relative">{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-widest opacity-75 mb-1">{label}</div>
      <div className="text-base font-black leading-tight">{value}</div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const config = {
    success: { bg: "#111827", icon: "✓", dot: "#34D399" },
    error:   { bg: "#DC2626", icon: "!", dot: "#FCA5A5" },
    info:    { bg: "#0023FF", icon: "i", dot: "#93C5FD" },
  };
  const c = config[type] || config.success;
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100]
      px-4 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm min-w-[220px]
      border border-white/10"
      style={{ background: c.bg, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{ background: c.dot + "40", color: c.dot }}>
        {c.icon}
      </div>
      <span className="text-sm font-semibold text-white flex-1">{message}</span>
      <button onClick={onClose}
        className="opacity-50 hover:opacity-100 transition text-white text-lg leading-none flex-shrink-0">×</button>
    </div>
  );
}

// ── Modal de confirmation ─────────────────────────────────
export function ConfirmModal({
  title,
  message,
  sub,
  icon = "⚠️",
  confirmLabel = "Confirmer",
  confirmColor = "red",
  onConfirm,
  onCancel,
  loading = false,
}) {
  const iconBg = {
    red:    "bg-red-50 border border-red-100",
    amber:  "bg-amber-50 border border-amber-100",
    green:  "bg-emerald-50 border border-emerald-100",
    blue:   "bg-[#E6EAFF] border border-[#B3BFFF]",
    gray:   "bg-gray-50 border border-gray-200",
    purple: "bg-purple-50 border border-purple-100",
  };
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl ${iconBg[confirmColor] || iconBg.red}`}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 leading-snug">{title}</p>
              {message && (
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{message}</p>
              )}
              {sub && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2.5 leading-relaxed">
                  ⚠️ {sub}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Btn color="gray" onClick={onCancel} sm>Annuler</Btn>
            <Btn color={confirmColor} onClick={onConfirm} loading={loading} sm>
              {confirmLabel}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────
export function Card({ children, className = "", padding = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 ${padding ? "p-5" : ""} ${className}`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}

// ── Section title ─────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#0023FF" }} />
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.08em]">{children}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Checklist de complexité du mot de passe ──────────────
// Affiche en temps réel les règles imposées (8 car. min, majuscule,
// minuscule, chiffre, caractère spécial) avec une coche verte/croix grise
// selon que la règle est respectée par la valeur saisie.
export function PasswordRules({ value }) {
  const v = value || "";
  const rules = [
    { ok: v.length >= 8,                 label: "8 caractères minimum" },
    { ok: /[A-Z]/.test(v),                label: "Une majuscule (A-Z)" },
    { ok: /[a-z]/.test(v),                label: "Une minuscule (a-z)" },
    { ok: /\d/.test(v),                   label: "Un chiffre (0-9)" },
    { ok: /[^A-Za-z0-9\s]/.test(v),       label: "Un caractère spécial (! @ # $ % ...)" },
  ];
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 bg-gray-50 border border-gray-100 rounded-xl p-3">
      {rules.map((r, i) => (
        <div key={i} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${r.ok ? "text-emerald-600" : "text-gray-400"}`}>
          <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold
            ${r.ok ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-400"}`}>
            {r.ok ? "✓" : "✕"}
          </span>
          {r.label}
        </div>
      ))}
    </div>
  );
}
