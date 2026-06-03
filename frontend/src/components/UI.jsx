// src/components/UI.jsx — WariGest Design System v3
import React from "react";

const B = "#0023FF";
const Y = "#FFF900";
const D = "#060d2e";

export const fmt   = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
export const fmtN  = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
export const today = ()  => new Date().toISOString().split("T")[0];

// ── Skeleton ──────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid #f0f2ff" }}>
      <div className="skeleton" style={{ width: 60, height: 16 }} />
      <div className="skeleton" style={{ flex: 1, height: 16 }} />
      <div className="skeleton" style={{ width: 80, height: 16 }} />
      <div className="skeleton" style={{ width: 80, height: 16 }} />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ sm }) {
  if (sm) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 20, height: 20, border: "2.5px solid #e8ecff", borderTopColor: B, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
  return (
    <div style={{ padding: "32px 0" }}>
      {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
    </div>
  );
}

// ── Erreur ────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ margin: 16, background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: "#FEE2E2", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <span style={{ color: "#DC2626", fontSize: 13, fontWeight: 600 }}>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, padding: "6px 14px", background: "#FEE2E2", border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
          Réessayer
        </button>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, color = "blue" }) {
  const styles = {
    blue:    { background: "#e8ecff", color: B,        border: "1.5px solid #c7d0ff" },
    emerald: { background: "#d1fae5", color: "#065f46", border: "1.5px solid #a7f3d0" },
    red:     { background: "#fee2e2", color: "#991b1b", border: "1.5px solid #fca5a5" },
    amber:   { background: "#fef3c7", color: "#92400e", border: "1.5px solid #fcd34d" },
    orange:  { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fed7aa" },
    purple:  { background: "#f3e8ff", color: "#6b21a8", border: "1.5px solid #d8b4fe" },
    gray:    { background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" },
  };
  const s = styles[color] || styles.gray;
  return (
    <span style={{ ...s, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
      {children}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(6,13,46,0.7)", backdropFilter: "blur(10px)", animation: "fadeIn 0.15s" }}
      className="sm:items-center sm:p-4">
      <div style={{ background: "white", width: "100%", maxWidth: wide ? 640 : 520, borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,35,255,0.15), 0 0 0 1px rgba(0,35,255,0.06)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeUp 0.2s ease-out" }}
        className="sm:rounded-2xl">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f0f2ff", flexShrink: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: D, margin: 0, letterSpacing: "-0.2px" }}>{title}</h3>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: "#f0f2ff", border: "none", cursor: "pointer", color: "#9ba5c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 300, transition: "all 0.15s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e8ecff"; e.currentTarget.style.color = D; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f0f2ff"; e.currentTarget.style.color = "#9ba5c9"; }}>
            ×
          </button>
        </div>
        <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8492b4", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
      <input {...props}
        style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: D, background: error ? "#FEF2F2" : "white", border: `1.5px solid ${error ? "#FECACA" : "#e8ecff"}`, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
      />
      {error && <p style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8492b4", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
      <select {...props}
        style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: D, background: "white", border: "1.5px solid #e8ecff", outline: "none", boxSizing: "border-box", cursor: "pointer", fontFamily: "inherit" }}>
        {children}
      </select>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────
export function Btn({ children, onClick, color = "blue", sm, loading, type = "button" }) {
  const v = {
    blue:   { bg: B,        text: "white",   shadow: "rgba(0,35,255,0.3)" },
    yellow: { bg: Y,        text: D,         shadow: "rgba(255,249,0,0.3)" },
    green:  { bg: "#059669", text: "white",  shadow: "rgba(5,150,105,0.3)" },
    red:    { bg: "#dc2626", text: "white",  shadow: "rgba(220,38,38,0.3)" },
    purple: { bg: "#7c3aed", text: "white",  shadow: "rgba(124,58,237,0.3)" },
    orange: { bg: B,        text: "white",   shadow: "rgba(0,35,255,0.3)" },
    gray:   { bg: "white",  text: "#475569", shadow: "transparent", border: "1.5px solid #e8ecff" },
  }[color] || { bg: B, text: "white", shadow: "rgba(0,35,255,0.3)" };

  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{ background: v.bg, color: v.text, border: v.border || "none", borderRadius: 10, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.65 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: sm ? 12 : 13, padding: sm ? "6px 12px" : "10px 18px", fontFamily: "inherit", letterSpacing: "0.01em", boxShadow: `0 4px 12px ${v.shadow}`, transition: "all 0.15s" }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 18px ${v.shadow}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 12px ${v.shadow}`; }}>
      {loading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "currentColor", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
      {children}
    </button>
  );
}

// ── SearchBox ─────────────────────────────────────────────
export function SearchBox({ value, onChange, onSelect, suggestions = [], placeholder = "Rechercher…", className = "" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const visible = suggestions.filter(s => !value || s.label?.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  return (
    <div ref={ref} style={{ position: "relative" }} className={className}>
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ba5c9", pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ width: "100%", paddingLeft: 36, paddingRight: value ? 32 : 12, paddingTop: 9, paddingBottom: 9, border: "1.5px solid #e8ecff", borderRadius: 10, fontSize: 13, background: "white", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: D, transition: "border-color 0.15s" }} />
        {value && (
          <button onClick={() => { onChange(""); onSelect?.(""); setOpen(false); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: "#e8ecff", border: "none", cursor: "pointer", color: "#9ba5c9", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>✕</button>
        )}
      </div>
      {open && visible.length > 0 && (
        <div style={{ position: "absolute", zIndex: 50, width: "100%", marginTop: 4, background: "white", border: "1.5px solid #e8ecff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,35,255,0.1)", overflow: "hidden", animation: "fadeUp 0.15s" }}>
          {visible.map((s, i) => (
            <button key={i} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(s.label); onSelect?.(s.label); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f0f2ff", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f0f2ff"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: B, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: D }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: 11, color: "#9ba5c9" }}>{s.sub}</div>}
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
        <h2 style={{ fontSize: 22, fontWeight: 900, color: D, margin: 0, letterSpacing: "-0.4px", lineHeight: 1.2 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: "#8492b4", margin: "3px 0 0", fontWeight: 500 }}>{sub}</p>}
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
      <table style={{ width: "100%", minWidth: 600, fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h, i) => {
              const label = typeof h === "object" ? h.label : h;
              const right = typeof h === "object" ? h.right : false;
              const sk    = typeof h === "object" ? h.sortKey : null;
              const active = sort && sk && sort.key === sk;
              const canSort = !!onSort && !!sk;
              return (
                <th key={i} onClick={canSort ? () => onSort(sk) : undefined}
                  style={{ padding: "12px 16px", fontSize: 10, fontWeight: 800, color: "#8492b4", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", textAlign: right ? "right" : "left", background: "#f7f8ff", borderBottom: "2px solid #eef0ff", cursor: canSort ? "pointer" : "default", userSelect: "none", transition: "color 0.15s", width: typeof h === "object" && h.w ? h.w : "auto" }}
                  onMouseEnter={e => canSort && (e.currentTarget.style.color = B)}
                  onMouseLeave={e => canSort && (e.currentTarget.style.color = "#8492b4")}>
                  {label}
                  {canSort && <span style={{ marginLeft: 4, fontSize: 9, color: active ? B : "rgba(132,146,180,0.3)" }}>{active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hasRows ? children : (
            <tr><td colSpan={headers.length}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "#f0f2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 14 }}>📭</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#8492b4", margin: 0 }}>{empty}</p>
                <p style={{ fontSize: 12, color: "#c7d0ff", marginTop: 4 }}>Les données apparaîtront ici</p>
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
    <tr onClick={onClick}
      style={{ borderBottom: "1px solid #f0f2ff", cursor: onClick ? "pointer" : "default", transition: "background 0.1s" }}
      onMouseEnter={e => e.currentTarget.style.background = onClick ? "#f7f8ff" : "transparent"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </tr>
  );
}

export function TD({ children, right, bold, muted, truncate }) {
  return (
    <td style={{ padding: "13px 16px", whiteSpace: "nowrap", textAlign: right ? "right" : "left", fontSize: muted ? 11 : 13, fontWeight: bold ? 700 : 400, color: muted ? "#9ba5c9" : bold ? D : "#3d4f6e", overflow: truncate ? "hidden" : "visible", textOverflow: truncate ? "ellipsis" : "clip", maxWidth: truncate ? 0 : "none" }}>
      {children}
    </td>
  );
}

// ── StatCard ──────────────────────────────────────────────
export function StatCard({ label, value, icon, gradient, sub }) {
  return (
    <div className="card-hover" style={{ background: gradient || B, borderRadius: 18, padding: 20, color: "white", position: "relative", overflow: "hidden", boxShadow: "0 8px 28px rgba(0,35,255,0.18)" }}>
      <div style={{ position: "absolute", right: -20, top: -20, fontSize: 80, opacity: 0.06, pointerEvents: "none" }}>{icon}</div>
      <div style={{ position: "relative" }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{icon}</div>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.6, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 5, fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const c = { success: { bg: D, icon: "✓", accent: "#059669" }, error: { bg: "#EF4444", icon: "✕", accent: "#fca5a5" }, info: { bg: B, icon: "ℹ", accent: Y } }[type] || {};
  return (
    <div style={{ position: "fixed", bottom: 88, right: 16, zIndex: 100, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, maxWidth: 340, minWidth: 230, background: c.bg, color: "white", boxShadow: "0 10px 40px rgba(0,0,0,0.25)", animation: "toastIn 0.25s ease-out", fontFamily: "inherit" }}
      className="md:bottom-6 md:right-6">
      <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800 }}>{c.icon}</div>
      <span style={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 20, lineHeight: 1, flexShrink: 0, fontFamily: "inherit", transition: "color 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.color = "white"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>×</button>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className = "", style = {} }) {
  return (
    <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #eef0ff", boxShadow: "0 2px 16px rgba(0,35,255,0.05)", ...style }} className={className}>
      {children}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 16, background: B, borderRadius: 4 }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: "#8492b4", textTransform: "uppercase", letterSpacing: "0.1em" }}>{children}</span>
    </div>
  );
}
