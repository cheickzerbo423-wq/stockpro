// src/components/UI.jsx — WariGest Design System
import React from "react";

const BLUE   = "#0023FF";
const YELLOW = "#FFF900";
const DARK   = "#060d2e";

export const fmt   = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
export const fmtN  = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
export const today = ()  => new Date().toISOString().split("T")[0];

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ sm }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: sm ? "16px" : "64px" }}>
      <div style={{ width: sm ? 20 : 28, height: sm ? 20 : 28, border: `3px solid #c7d0ff`, borderTopColor: BLUE, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      {!sm && <p style={{ fontSize: 12, color: "#9ba5c9", fontWeight: 500, margin: 0 }}>Chargement...</p>}
    </div>
  );
}

// ── Erreur ────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ margin: 16, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: "#FEE2E2", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <span style={{ color: "#DC2626", fontSize: 13, fontWeight: 600 }}>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, padding: "6px 12px", background: "#FEE2E2", border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }}>
          Réessayer
        </button>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, color = "blue" }) {
  const styles = {
    blue:    { background: "#e8ecff", color: BLUE,     border: "1px solid #c7d0ff" },
    emerald: { background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" },
    red:     { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
    amber:   { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" },
    orange:  { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    purple:  { background: "#f3e8ff", color: "#6b21a8", border: "1px solid #d8b4fe" },
    gray:    { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
  };
  const s = styles[color] || styles.gray;
  return (
    <span style={{ ...s, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
      {children}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0, background: "rgba(6,13,46,0.65)", backdropFilter: "blur(8px)" }}
      className="sm:items-center sm:p-4">
      <div style={{ background: "white", width: "100%", maxWidth: wide ? 640 : 520, borderRadius: "16px 16px 0 0", boxShadow: "0 25px 60px rgba(0,35,255,0.15)", maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        className="sm:rounded-2xl">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f0f2ff", flexShrink: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: DARK, margin: 0 }}>{title}</h3>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: "#f0f2ff", border: "none", cursor: "pointer", color: "#9ba5c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 300 }}>
            ×
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</label>}
      <input {...props}
        style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: DARK, background: error ? "#FEF2F2" : "white", border: `1.5px solid ${error ? "#FECACA" : "#e0e5ff"}`, outline: "none", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(0,35,255,0.05)", transition: "border-color 0.15s", fontFamily: "inherit" }}
        onFocus={e => !error && (e.target.style.borderColor = BLUE)}
        onBlur={e => !error && (e.target.style.borderColor = "#e0e5ff")}
      />
      {error && <p style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</label>}
      <select {...props}
        style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: DARK, background: "white", border: "1.5px solid #e0e5ff", outline: "none", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(0,35,255,0.05)", cursor: "pointer", fontFamily: "inherit" }}>
        {children}
      </select>
    </div>
  );
}

// ── Bouton ────────────────────────────────────────────────
export function Btn({ children, onClick, color = "blue", sm, loading, type = "button" }) {
  const variants = {
    blue:   { background: BLUE,      color: "white",  boxShadow: "0 4px 14px rgba(0,35,255,0.3)" },
    yellow: { background: YELLOW,    color: DARK,     boxShadow: "0 4px 14px rgba(255,249,0,0.4)" },
    green:  { background: "#10b981", color: "white",  boxShadow: "0 4px 14px rgba(16,185,129,0.3)" },
    red:    { background: "#ef4444", color: "white",  boxShadow: "0 4px 14px rgba(239,68,68,0.3)" },
    purple: { background: "#8b5cf6", color: "white",  boxShadow: "0 4px 14px rgba(139,92,246,0.3)" },
    gray:   { background: "white",   color: "#475569", boxShadow: "none", border: "1.5px solid #e0e5ff" },
    orange: { background: BLUE,      color: "white",  boxShadow: "0 4px 14px rgba(0,35,255,0.3)" },
  };
  const v = variants[color] || variants.gray;
  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{
        ...v, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        fontWeight: 700, borderRadius: 10, border: v.border || "none", cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1, transition: "opacity 0.15s, transform 0.1s",
        padding: sm ? "6px 12px" : "10px 18px", fontSize: sm ? 12 : 13,
        fontFamily: "inherit",
      }}
      onMouseDown={e => !loading && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
      {loading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "currentColor", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
      {children}
    </button>
  );
}

// ── SearchBox ─────────────────────────────────────────────
export function SearchBox({ value, onChange, onSelect, suggestions = [], placeholder = "Rechercher…", className = "" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const visible = suggestions.filter(s => !value || s.label.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  return (
    <div ref={ref} style={{ position: "relative" }} className={className}>
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#c7d0ff", pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ width: "100%", paddingLeft: 36, paddingRight: 32, paddingTop: 9, paddingBottom: 9, border: "1.5px solid #e0e5ff", borderRadius: 10, fontSize: 13, background: "white", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: DARK }}
          onFocus={e => { e.target.style.borderColor = BLUE; setOpen(true); }}
          onBlur={e => e.target.style.borderColor = "#e0e5ff"} />
        {value && <button onClick={() => { onChange(""); onSelect?.(""); setOpen(false); }}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: "50%", background: "#e0e5ff", border: "none", cursor: "pointer", color: "#9ba5c9", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
      </div>
      {open && visible.length > 0 && (
        <div style={{ position: "absolute", zIndex: 50, width: "100%", marginTop: 4, background: "white", border: "1.5px solid #e0e5ff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,35,255,0.1)", overflow: "hidden" }}>
          {visible.map((s, i) => (
            <button key={i} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(s.label); onSelect?.(s.label); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f0f2ff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f0f2ff"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLUE, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: 11, color: "#9ba5c9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: DARK, margin: 0, lineHeight: 1.2 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: "#9ba5c9", marginTop: 2, fontWeight: 500, margin: "2px 0 0" }}>{sub}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────
export function DataTable({ headers, children, empty = "Aucune donnée", sort, onSort }) {
  const hasRows = children && (Array.isArray(children) ? children.length > 0 : true);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 640, fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h, i) => {
              const label  = typeof h === "object" ? h.label : h;
              const right  = typeof h === "object" ? h.right : false;
              const sk     = typeof h === "object" ? h.sortKey : null;
              const active = sort && sk && sort.key === sk;
              const canSort = !!onSort && !!sk;
              return (
                <th key={i} onClick={canSort ? () => onSort(sk) : undefined}
                  style={{ padding: "12px 16px", fontSize: 10, fontWeight: 800, color: "#9ba5c9", textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap", textAlign: right ? "right" : "left", background: "#F7F8FF", borderBottom: "1.5px solid #e8ecff", cursor: canSort ? "pointer" : "default" }}>
                  {label}{canSort && <span style={{ marginLeft: 4, color: active ? BLUE : "#c7d0ff", fontSize: 9 }}>{active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hasRows ? children : (
            <tr><td colSpan={headers.length}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0f2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>📭</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#9ba5c9", margin: 0 }}>{empty}</p>
              </div>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TR({ children, onClick }) {
  return (
    <tr onClick={onClick} style={{ borderBottom: "1px solid #f0f2ff", cursor: onClick ? "pointer" : "default", transition: "background 0.1s" }}
      onMouseEnter={e => e.currentTarget.style.background = onClick ? "#f7f8ff" : "transparent"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </tr>
  );
}

export function TD({ children, right, bold, muted, truncate }) {
  return (
    <td style={{ padding: "12px 16px", whiteSpace: "nowrap", textAlign: right ? "right" : "left", fontSize: muted ? 11 : 13, fontWeight: bold ? 700 : 400, color: muted ? "#9ba5c9" : bold ? DARK : "#475569", overflow: truncate ? "hidden" : "visible", textOverflow: truncate ? "ellipsis" : "clip", maxWidth: truncate ? 0 : "none" }}>
      {children}
    </td>
  );
}

// ── StatCard ──────────────────────────────────────────────
export function StatCard({ label, value, icon, gradient, sub }) {
  return (
    <div style={{ background: gradient || BLUE, borderRadius: 16, padding: 20, color: "white", position: "relative", overflow: "hidden", boxShadow: "0 8px 25px rgba(0,35,255,0.2)" }}>
      <div style={{ position: "absolute", right: -16, top: -16, fontSize: 64, opacity: 0.07, pointerEvents: "none" }}>{icon}</div>
      <div style={{ position: "relative" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.65, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const configs = {
    success: { bg: DARK,      icon: "✓" },
    error:   { bg: "#EF4444", icon: "✕" },
    info:    { bg: BLUE,      icon: "ℹ" },
  };
  const c = configs[type] || configs.success;
  return (
    <div style={{ position: "fixed", bottom: 96, right: 16, zIndex: 100, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, maxWidth: 320, minWidth: 220, background: c.bg, color: "white", boxShadow: "0 10px 40px rgba(0,35,255,0.25)", fontFamily: "inherit" }}
      className="md:bottom-6 md:right-6">
      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700 }}>{c.icon}</div>
      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ opacity: 0.4, background: "none", border: "none", cursor: "pointer", color: "white", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className = "" }) {
  return (
    <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e8ecff", boxShadow: "0 2px 12px rgba(0,35,255,0.05)" }} className={className}>
      {children}
    </div>
  );
}
