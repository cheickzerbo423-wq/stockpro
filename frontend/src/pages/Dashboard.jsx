// src/pages/Dashboard.jsx — Tableau de bord Premium v2
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useDashboard } from "../hooks/useApi";
import { fmt, fmtN, Spinner, ErrorBox } from "../components/UI";

const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const BRAND = "#0023FF";

/* ─── Tooltip graphique ─────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-white/10">
      <div className="text-gray-400 font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name} :</span>
          <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ──────────────────────────────────────────────── */
const PALETTES = {
  blue:   { bg: "#EEF0FF", bar: "#0023FF" },
  green:  { bg: "#ECFDF5", bar: "#059669" },
  red:    { bg: "#FEF2F2", bar: "#DC2626" },
  amber:  { bg: "#FFFBEB", bar: "#D97706" },
  purple: { bg: "#F5F3FF", bar: "#7C3AED" },
};

function KpiCard({ icon, label, value, sub, color = "blue" }) {
  const p = PALETTES[color] || PALETTES.blue;
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-default"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div className="h-1" style={{ background: p.bar }} />
      <div className="p-4 sm:p-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
          style={{ background: p.bg }}>
          {icon}
        </div>
        <div className="text-xl sm:text-2xl font-black text-gray-900 leading-tight tracking-tight break-words">
          {value}
        </div>
        <div className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">{label}</div>
        {sub && (
          <div className="mt-3 pt-2.5 border-t border-gray-50 text-[10px] text-gray-400 font-medium">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Mini stat chip ────────────────────────────────────────── */
function StatChip({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 sm:px-6 flex-1">
      <div className="text-sm sm:text-base font-black whitespace-nowrap" style={{ color }}>{value}</div>
      <div className="text-[10px] font-semibold text-blue-200 uppercase tracking-wide text-center leading-tight">{label}</div>
    </div>
  );
}

/* ─── Barre de progression ──────────────────────────────────── */
function ProgBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─── Composant principal ───────────────────────────────────── */
export default function Dashboard() {
  const { data, loading, error, reload } = useDashboard();
  const annee = new Date().getFullYear();

  if (loading) return <Spinner label="Chargement du tableau de bord…" />;
  if (error)   return <ErrorBox message={error} onRetry={reload} />;
  if (!data)   return null;

  const { kpis, alertes_stock = [], ca_par_mois = [], top_clients = [], recent_factures = [] } = data;

  const tauxRec = kpis.ca_facture > 0 ? Math.round((kpis.encaisse / kpis.ca_facture) * 100) : 0;
  const beneficeColor = parseFloat(kpis.benefice) >= 0 ? "#059669" : "#DC2626";
  const marge = kpis.ca_total > 0 ? Math.round((kpis.benefice / kpis.ca_total) * 100) : 0;

  const graphData = MOIS.map((label, i) => {
    const key = `${annee}-${String(i + 1).padStart(2, "0")}`;
    const m = ca_par_mois.find((r) => r.mois === key);
    return { label, ca: m ? parseInt(m.ca) : 0 };
  });
  const hasGraph = graphData.some((d) => d.ca > 0);
  const fmtK = (v) => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">

      {/* ── En-tête gradient ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0023FF 0%,#4B6BFF 100%)" }}>
        <div className="px-5 py-5 sm:px-7 sm:py-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">Tableau de Bord</h2>
            <p className="text-blue-200 text-xs sm:text-sm mt-0.5 font-medium">
              {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <button onClick={reload}
            className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 rounded-xl transition-all duration-150 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
        {/* Stats band — 2×2 mobile, 4 en ligne desktop */}
        <div className="bg-white/10 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 divide-white/10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          {/* séparateurs CSS via bordures droites */}
          <div className="border-r border-b sm:border-b-0 border-white/10"><StatChip label="CA encaissé" value={fmt(kpis.encaisse)} color="#fff" /></div>
          <div className="border-b sm:border-b-0 sm:border-r border-white/10"><StatChip label="Créances" value={fmt(kpis.montant_a_recouvrer)} color="#FCA5A5" /></div>
          <div className="border-r border-white/10"><StatChip label="Clients actifs" value={fmtN(kpis.nb_clients)} color="#A5F3FC" /></div>
          <div><StatChip label="Recouvrement"
            value={`${tauxRec}%`}
            color={tauxRec >= 80 ? "#6EE7B7" : tauxRec >= 50 ? "#FDE68A" : "#FCA5A5"} /></div>
        </div>
      </div>

      {/* ── KPIs — 2 colonnes mobile, 4 desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon="📈" label={`CA ${annee}`}
          value={fmt(kpis.ca_total)}
          sub={`Achats stock : ${fmt(kpis.depenses_total)}`}
          color="blue" />
        <KpiCard icon="💰" label="Marge brute"
          value={fmt(kpis.benefice)}
          sub={`Marge : ${marge}%`}
          color={parseFloat(kpis.benefice) >= 0 ? "green" : "red"} />
        <KpiCard icon="📦" label="Valeur du stock"
          value={fmt(kpis.valeur_stock || 0)}
          sub={`${fmtN(kpis.nb_articles)} articles actifs`}
          color="purple" />
        <KpiCard icon="🧾" label="Factures émises"
          value={fmtN(kpis.nb_factures)}
          sub={`${kpis.factures_impayees} impayée(s) · ${fmt(kpis.montant_a_recouvrer)}`}
          color={parseInt(kpis.factures_impayees) > 0 ? "amber" : "green"} />
      </div>

      {/* ── Taux de recouvrement ── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 sm:px-6 sm:py-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: BRAND }} />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Taux de Recouvrement</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400">Encaissé : <strong className="text-gray-700">{fmt(kpis.encaisse)}</strong></span>
            <span className="text-xs text-gray-400">Créances : <strong className="text-red-500">{fmt(kpis.montant_a_recouvrer)}</strong></span>
            <span className={`text-base font-black ${tauxRec >= 80 ? "text-emerald-600" : tauxRec >= 50 ? "text-amber-500" : "text-red-500"}`}>
              {tauxRec}%
            </span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${tauxRec}%`,
              background: tauxRec >= 80
                ? "linear-gradient(90deg,#10B981,#34D399)"
                : tauxRec >= 50
                ? "linear-gradient(90deg,#F59E0B,#FCD34D)"
                : "linear-gradient(90deg,#EF4444,#F87171)"
            }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-300 font-medium select-none">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* ── Graphiques côte à côte ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Évolution CA — 3/5 */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: BRAND }} />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Évolution du CA — {annee}</h3>
          </div>
          {!hasGraph ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">📊</div>
              <p className="text-sm text-gray-400 font-medium">Aucune vente enregistrée cette année</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={graphData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.18}/>
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill:"#94a3b8", fontWeight:600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill:"#94a3b8", fontWeight:600 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="ca" name="CA" stroke={BRAND} strokeWidth={2.5}
                  fill="url(#caGrad)" dot={false}
                  activeDot={{ r:5, fill:BRAND, stroke:"#fff", strokeWidth:2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top clients bar — 2/5 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-purple-600" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">CA Clients — {annee}</h3>
          </div>
          {top_clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <span className="text-3xl">👥</span>
              <p className="text-xs text-gray-400 font-medium">Aucune vente cette année</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={top_clients} barSize={22} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <XAxis dataKey="client_nom" tick={{ fontSize:9, fill:"#94a3b8", fontWeight:600 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v.split(" ")[0].slice(0, 8)} />
                <YAxis tick={{ fontSize:9, fill:"#94a3b8", fontWeight:600 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="ca" name="CA" fill="#7C3AED" radius={[6,6,0,0]} activeBar={{ fill:"#6D28D9" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Ligne du bas : 3 colonnes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Meilleurs clients liste */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-purple-600" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Meilleurs Clients</h3>
          </div>
          {top_clients.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <span className="text-2xl">👥</span>
              <p className="text-xs text-gray-400 font-medium">Aucune vente cette année</p>
            </div>
          ) : (
            <div className="space-y-3">
              {top_clients.map((c, i) => {
                const medals = ["🥇","🥈","🥉"];
                return (
                  <div key={c.client_nom}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm flex-shrink-0">{medals[i] ?? `${i+1}.`}</span>
                        <span className="font-semibold text-gray-700 truncate">{c.client_nom}</span>
                      </div>
                      <span className="font-bold text-gray-900 flex-shrink-0">{fmt(c.ca)}</span>
                    </div>
                    <ProgBar value={c.ca} max={top_clients[0].ca} color="#7C3AED" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dernières factures */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: BRAND }} />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dernières Factures</h3>
          </div>
          {recent_factures.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <span className="text-2xl">🧾</span>
              <p className="text-xs text-gray-400 font-medium">Aucune facture</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recent_factures.map((f) => {
                const paid = f.statut || parseFloat(f.reste || 0) <= 0;
                const dateStr = f.date_facture
                  ? new Date(f.date_facture).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })
                  : "";
                return (
                  <div key={f.code} className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${paid ? "bg-emerald-400" : "bg-red-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-gray-800 font-mono leading-tight truncate">{f.code}</div>
                      <div className="text-xs text-gray-400 truncate">{f.client_nom}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-gray-800">{fmt(f.montant)}</div>
                      <div className="text-xs text-gray-400">{dateStr}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      paid ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                    }`}>
                      {paid ? "✓" : "⏳"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertes stock */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:col-span-2 lg:col-span-1"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-red-500" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Alertes Stock</h3>
            </div>
            {alertes_stock.length > 0 && (
              <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                {alertes_stock.length}
              </span>
            )}
          </div>
          {alertes_stock.length === 0 ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5">
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-700">Stocks en ordre</div>
                <div className="text-[10px] text-emerald-500">Aucune rupture détectée</div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {alertes_stock.map((a) => {
                const rupture = a.stock_restant <= 0;
                return (
                  <div key={a.code}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                    style={{
                      borderColor: rupture ? "#FECACA" : "#FDE68A",
                      background:  rupture ? "#FEF2F2" : "#FFFBEB",
                    }}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rupture ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-800 truncate">{a.libelle}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{a.code}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-black ${rupture ? "text-red-600" : "text-amber-600"}`}>
                        {rupture ? "Rupture" : `${a.stock_restant} u.`}
                      </div>
                      <div className="text-[9px] text-gray-400">min. {a.stock_min}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Résumé bénéfice ── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{
          background: parseFloat(kpis.benefice) >= 0
            ? "linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)"
            : "linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%)",
          borderColor: parseFloat(kpis.benefice) >= 0 ? "#A7F3D0" : "#FECACA",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)"
        }}>
        <div className="px-6 py-5 sm:px-8 sm:py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: beneficeColor + "99" }}>
              Marge brute — {annee}
            </div>
            <div className="text-3xl sm:text-4xl font-black leading-tight" style={{ color: beneficeColor }}>
              {fmt(kpis.benefice)}
            </div>
            <div className="text-xs mt-2 flex flex-wrap gap-x-4 gap-y-1" style={{ color: beneficeColor + "99" }}>
              <span>CA : <strong style={{ color: beneficeColor }}>{fmt(kpis.ca_total)}</strong></span>
              <span>Coût des ventes : <strong style={{ color: beneficeColor }}>{fmt(kpis.cogs || 0)}</strong></span>
              <span>Marge : <strong style={{ color: beneficeColor }}>{marge}%</strong></span>
            </div>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0"
            style={{ background: beneficeColor + "15" }}>
            {parseFloat(kpis.benefice) >= 0 ? "🚀" : "📉"}
          </div>
        </div>
      </div>

    </div>
  );
}
