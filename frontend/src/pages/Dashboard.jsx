// src/pages/Dashboard.jsx — WariGest
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { useDashboard } from "../hooks/useApi";
import { fmt, fmtN, Spinner, ErrorBox, SectionLabel } from "../components/UI";

const BLUE   = "#0023FF";
const YELLOW = "#FFF900";
const DARK   = "#060d2e";

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const GraphTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: DARK, color: "white", borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,35,255,0.2)" }}>
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: YELLOW, fontWeight: 700 }}>
          {p.name} : {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

function KpiCard({ label, value, icon, sub, color = BLUE, bg = "#e8ecff" }) {
  return (
    <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e8ecff", padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 2px 12px rgba(0,35,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 11, color: "#9ba5c9", fontWeight: 600, marginTop: 2 }}>{label}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: "#9ba5c9", borderTop: "1px solid #f0f2ff", paddingTop: 8 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <SectionLabel>{children}</SectionLabel>;
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e8ecff", padding: 20, boxShadow: "0 2px 12px rgba(0,35,255,0.05)", ...style }}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useDashboard();
  const annee = new Date().getFullYear();

  if (loading) return <Spinner />;
  if (error)   return <ErrorBox message={error} onRetry={reload} />;
  if (!data)   return null;

  const { kpis, alertes_stock = [], ca_par_mois = [], top_clients = [], recent_factures = [] } = data;

  const tauxRec = kpis.ca_facture > 0 ? Math.round((kpis.encaisse / kpis.ca_facture) * 100) : 0;
  const graphData = MOIS_LABELS.map((label, i) => {
    const moisKey = `${annee}-${String(i + 1).padStart(2, "0")}`;
    const curr = ca_par_mois.find((r) => r.mois === moisKey);
    return { label, ca: curr ? parseInt(curr.ca) : 0 };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: DARK, margin: 0 }}>Tableau de Bord</h2>
          <p style={{ fontSize: 12, color: "#9ba5c9", margin: "2px 0 0", textTransform: "capitalize" }}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={reload}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: BLUE, background: "#e8ecff", border: "1.5px solid #c7d0ff", padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Actualiser
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="lg:grid-cols-4">
        <KpiCard icon="📈" label={`CA ${annee}`}       value={fmt(kpis.ca_total)}        sub={`Dépenses : ${fmt(kpis.depenses_total)}`} color={BLUE}      bg="#e8ecff" />
        <KpiCard icon="💰" label="Bénéfice Net"         value={fmt(kpis.benefice)}         sub={`Marge : ${kpis.ca_total > 0 ? Math.round((kpis.benefice/kpis.ca_total)*100) : 0}%`} color={kpis.benefice >= 0 ? "#059669" : "#dc2626"} bg={kpis.benefice >= 0 ? "#ecfdf5" : "#fef2f2"} />
        <KpiCard icon="💸" label="Dépenses Totales"    value={fmt(kpis.depenses_total)}   sub={`${kpis.nb_articles} articles`}          color="#dc2626"   bg="#fef2f2" />
        <KpiCard icon="🧾" label="Factures Émises"      value={fmtN(kpis.nb_factures)}     sub={`${kpis.factures_impayees} impayée(s)`}  color="#7c3aed"   bg="#f3e8ff" />
      </div>

      {/* ── Taux recouvrement ── */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionTitle>Taux de Recouvrement</SectionTitle>
          <span style={{ fontSize: 16, fontWeight: 900, color: tauxRec >= 80 ? "#059669" : tauxRec >= 50 ? "#d97706" : "#dc2626" }}>{tauxRec}%</span>
        </div>
        <div style={{ height: 8, background: "#f0f2ff", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 999, width: `${tauxRec}%`, background: tauxRec >= 80 ? "#059669" : tauxRec >= 50 ? "#d97706" : "#dc2626", transition: "width 0.7s" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 11, color: "#9ba5c9", marginTop: 8 }}>
          <span>Encaissé : <strong style={{ color: DARK }}>{fmt(kpis.encaisse)}</strong></span>
          <span>Créances : <strong style={{ color: "#dc2626" }}>{fmt(kpis.montant_a_recouvrer)}</strong></span>
          <span>Clients : <strong style={{ color: DARK }}>{fmtN(kpis.nb_clients)}</strong></span>
        </div>
      </Card>

      {/* ── Graphique ── */}
      <Card>
        <SectionTitle>Évolution des Ventes — {annee}</SectionTitle>
        {!graphData.some(d => d.ca > 0) ? (
          <p style={{ textAlign: "center", color: "#9ba5c9", padding: "32px 0", fontSize: 13 }}>Aucune vente enregistrée.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={graphData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2ff" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ba5c9" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ba5c9" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v} />
              <Tooltip content={<GraphTooltip />} />
              <Line type="monotone" dataKey="ca" name="CA" stroke={BLUE} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: BLUE }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── 3 colonnes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }} className="md:grid-cols-3">

        {/* Top clients */}
        <Card>
          <SectionTitle>Top Clients</SectionTitle>
          {top_clients.length === 0 ? <p style={{ fontSize: 12, color: "#9ba5c9" }}>Aucune vente cette année.</p>
            : top_clients.map((c, i) => (
              <div key={c.client_nom} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    <span style={{ color: "#9ba5c9", marginRight: 4 }}>{i+1}.</span>{c.client_nom}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: DARK }}>{fmt(c.ca)}</span>
                </div>
                <div style={{ height: 5, background: "#f0f2ff", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: BLUE, borderRadius: 999, width: `${Math.round((c.ca / top_clients[0].ca) * 100)}%`, opacity: 1 - i * 0.15 }} />
                </div>
              </div>
            ))
          }
        </Card>

        {/* Dernières factures */}
        <Card>
          <SectionTitle>Dernières Factures</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent_factures.length === 0 && <p style={{ fontSize: 12, color: "#9ba5c9" }}>Aucune facture.</p>}
            {recent_factures.map((f) => (
              <div key={f.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, fontFamily: "monospace" }}>{f.code}</div>
                  <div style={{ fontSize: 11, color: "#9ba5c9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.client_nom}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{fmt(f.montant)}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: f.statut ? "#ecfdf5" : "#fef2f2", color: f.statut ? "#059669" : "#dc2626" }}>
                    {f.statut ? "Réglée" : "Impayée"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alertes stock */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <SectionTitle>Alertes Stock</SectionTitle>
            {alertes_stock.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, background: "#dc2626", color: "white", padding: "2px 8px", borderRadius: 999 }}>
                {alertes_stock.length}
              </span>
            )}
          </div>
          {alertes_stock.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#059669", fontWeight: 600, background: "#ecfdf5", borderRadius: 10, padding: "10px 14px" }}>
              ✅ Tous les stocks sont OK
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alertes_stock.map((a) => (
                <div key={a.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e8ecff" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{a.libelle}</div>
                    <div style={{ fontSize: 10, color: "#9ba5c9", fontFamily: "monospace" }}>{a.code}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: a.stock_restant <= 0 ? "#dc2626" : "#d97706" }}>
                      {a.stock_restant <= 0 ? "Rupture" : a.stock_restant + " u."}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ba5c9" }}>min. {a.stock_min}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Bar chart ── */}
      {top_clients.length > 0 && (
        <Card>
          <SectionTitle>CA par Client — {annee}</SectionTitle>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={top_clients} barSize={24} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="client_nom" tick={{ fontSize: 9, fill: "#9ba5c9" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 9, fill: "#9ba5c9" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v} />
              <Tooltip content={<GraphTooltip />} />
              <Bar dataKey="ca" name="CA" fill={BLUE} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
