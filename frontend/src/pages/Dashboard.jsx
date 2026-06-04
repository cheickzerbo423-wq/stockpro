// src/pages/Dashboard.jsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { useDashboard } from "../hooks/useApi";
import { fmt, fmtN, Spinner, ErrorBox } from "../components/UI";

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

/* ── KPI Card ── */
function KpiCard({ label, value, icon, sub, trend, accentBg, accentText, borderColor }) {
  const trendUp = trend > 0;
  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-2 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${accentBg}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trendUp ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className={`text-lg font-black leading-tight ${accentText}`}>{value}</div>
        <div className="text-xs text-gray-400 font-medium mt-0.5">{label}</div>
      </div>
      {sub && <div className="text-xs text-gray-400 border-t border-gray-50 pt-1.5">{sub}</div>}
    </div>
  );
}

/* ── Section titre ── */
function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3.5 w-1 bg-[#0023FF] rounded-full" />
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

/* ── Tooltip graph ── */
const GraphTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-lg">
      <div className="font-bold text-gray-300 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name} : <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════ */
export default function Dashboard() {
  const { data, loading, error, reload } = useDashboard();
  const annee = new Date().getFullYear();

  if (loading) return <Spinner />;
  if (error)   return <ErrorBox message={error} onRetry={reload} />;
  if (!data)   return null;

  const {
    kpis,
    alertes_stock   = [],
    alertes_gammes  = [],
    ca_par_mois     = [],
    top_clients     = [],
    recent_factures = [],
  } = data;

  /* Taux de recouvrement */
  const tauxRec = kpis.ca_facture > 0
    ? Math.round((kpis.encaisse / kpis.ca_facture) * 100)
    : 0;

  /* Fusion graphique annee + annee-1 par mois */
  const graphData = MOIS_LABELS.map((label, i) => {
    const moisKey = `${annee}-${String(i + 1).padStart(2, "0")}`;
    const curr = ca_par_mois.find((r) => r.mois === moisKey);
    return { label, ca: curr ? parseInt(curr.ca) : 0 };
  });
  const hasAnyData = graphData.some((d) => d.ca > 0);

  return (
    <div className="space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Tableau de Bord</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={reload}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#0023FF] transition bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="📈" label={`Chiffre d'Affaires ${annee}`}
          value={fmt(kpis.ca_total)}
          sub={`Dépenses : ${fmt(kpis.depenses_total)}`}
          accentBg="bg-[#E6EAFF]" accentText="text-[#0023FF]" borderColor="border-[#B3BFFF]"
        />
        <KpiCard
          icon="💰" label="Bénéfice Net"
          value={fmt(kpis.benefice)}
          sub={`Marge : ${kpis.ca_total > 0 ? Math.round((kpis.benefice / kpis.ca_total) * 100) : 0}%`}
          accentBg={kpis.benefice >= 0 ? "bg-emerald-50" : "bg-red-50"}
          accentText={kpis.benefice >= 0 ? "text-emerald-600" : "text-red-600"}
          borderColor={kpis.benefice >= 0 ? "border-emerald-100" : "border-red-100"}
        />
        <KpiCard
          icon="💸" label="Dépenses Totales"
          value={fmt(kpis.depenses_total)}
          sub={`${kpis.nb_articles} articles en stock`}
          accentBg="bg-red-50" accentText="text-red-600" borderColor="border-red-100"
        />
        <KpiCard
          icon="🧾" label="Factures Émises"
          value={fmtN(kpis.nb_factures)}
          sub={`${kpis.factures_impayees} impayée(s) · ${fmt(kpis.montant_a_recouvrer)}`}
          accentBg="bg-blue-50" accentText="text-blue-600" borderColor="border-blue-100"
        />
      </div>

      {/* ── Taux recouvrement ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <SectionTitle>Taux de Recouvrement</SectionTitle>
          <span className={`text-sm font-black ${tauxRec >= 80 ? "text-emerald-600" : tauxRec >= 50 ? "text-amber-500" : "text-red-500"}`}>
            {tauxRec}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${tauxRec >= 80 ? "bg-emerald-500" : tauxRec >= 50 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${tauxRec}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1.5">
          <span>Encaissé : <strong className="text-gray-700">{fmt(kpis.encaisse)}</strong></span>
          <span>Créances : <strong className="text-red-500">{fmt(kpis.montant_a_recouvrer)}</strong></span>
          <span>Clients actifs : <strong className="text-gray-700">{fmtN(kpis.nb_clients)}</strong></span>
        </div>
      </div>

      {/* ── Graphique évolution ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <SectionTitle>Évolution des Ventes — {annee}</SectionTitle>
        {!hasAnyData ? (
          <p className="text-sm text-gray-400 text-center py-10">Aucune vente enregistrée.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={graphData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v} />
              <Tooltip content={<GraphTooltip />} />
              <Line type="monotone" dataKey="ca" name="CA" stroke="#0023FF" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 3 colonnes bas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Top clients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Top Clients</SectionTitle>
          {top_clients.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune vente cette année.</p>
          ) : top_clients.map((c, i) => {
            const maxCa = top_clients[0].ca;
            return (
              <div key={c.client_nom} className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium truncate max-w-[65%]">
                    <span className="text-gray-400 mr-1">{i + 1}.</span>{c.client_nom}
                  </span>
                  <span className="font-bold text-gray-800">{fmt(c.ca)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((c.ca / maxCa) * 100)}%`, opacity: 1 - i * 0.15 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dernières factures */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Dernières Factures</SectionTitle>
          <div className="space-y-2">
            {recent_factures.length === 0 && <p className="text-xs text-gray-400">Aucune facture.</p>}
            {recent_factures.map((f) => (
              <div key={f.code} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#0023FF] font-mono">{f.code}</div>
                  <div className="text-xs text-gray-500 truncate">{f.client_nom}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-gray-800">{fmt(f.montant)}</div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${(f.statut || parseFloat(f.reste || 0) <= 0) ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                    {(f.statut || parseFloat(f.reste || 0) <= 0) ? "Réglée" : "Impayée"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes stock */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Alertes Stock</SectionTitle>
            {(alertes_stock.length + alertes_gammes.length) > 0 && (
              <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                {alertes_stock.length + alertes_gammes.length}
              </span>
            )}
          </div>

          {alertes_stock.length === 0 && alertes_gammes.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold bg-emerald-50 rounded-xl px-3 py-2.5">
              <span className="text-base">✅</span> Tous les stocks sont OK
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Alertes gammes */}
              {alertes_gammes.map((g) => (
                <div key={g.gamme_code} className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-md">GAMME</span>
                      <span className="text-xs font-bold text-purple-800 truncate">{g.gamme_nom}</span>
                    </div>
                    <div className="text-[10px] text-purple-400 mt-0.5">
                      {g.nb_rupture > 0 && <span className="text-red-500 font-semibold">{g.nb_rupture} rupture{g.nb_rupture > 1 ? "s" : ""}</span>}
                      {g.nb_rupture > 0 && g.nb_faible > 0 && <span className="text-purple-300"> · </span>}
                      {g.nb_faible > 0 && <span className="text-amber-500 font-semibold">{g.nb_faible} faible{g.nb_faible > 1 ? "s" : ""}</span>}
                      <span className="text-purple-300"> · {g.nb_variantes} variante{g.nb_variantes > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className={`text-xs font-black shrink-0 ml-2 ${g.statut === "Rupture stock" ? "text-red-600" : "text-amber-500"}`}>
                    {g.statut === "Rupture stock" ? "Rupture" : "Stock bas"}
                  </div>
                </div>
              ))}

              {/* Alertes articles standalone */}
              {alertes_stock.map((a) => (
                <div key={a.code} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">{a.libelle}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{a.code}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className={`text-xs font-black ${a.stock_restant <= 0 ? "text-red-600" : "text-amber-500"}`}>
                      {a.stock_restant <= 0 ? "Rupture" : a.stock_restant + " u."}
                    </div>
                    <div className="text-[10px] text-gray-400">min. {a.stock_min}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bar chart top clients ── */}
      {top_clients.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>CA par Client — {annee}</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={top_clients} barSize={28} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="client_nom" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v} />
              <Tooltip content={<GraphTooltip />} />
              <Bar dataKey="ca" name="CA" fill="#0023FF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
