// src/pages/Rapports.jsx
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { rapportsService } from "../services";
import { fmt, fmtN, Spinner, ErrorBox, Btn, PageHeader, Toast } from "../components/UI";

// ── Utilitaires date ────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

function getPeriode(type) {
  const now = new Date();
  switch (type) {
    case "today":
      return { debut: today(), fin: today() };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + 1);
      return { debut: d.toISOString().split("T")[0], fin: today() };
    }
    case "month":
      return {
        debut: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
        fin: today(),
      };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        debut: new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0],
        fin: today(),
      };
    }
    case "year":
      return { debut: `${now.getFullYear()}-01-01`, fin: today() };
    default:
      return { debut: today(), fin: today() };
  }
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";

// ── Composants UI ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent, dark }) {
  return (
    <div className={`rounded-2xl p-5 border ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {sub && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accent.badge}`}>{sub}</span>
        )}
      </div>
      <div className={`text-sm font-black leading-tight break-normal ${dark ? "text-white" : accent.text}`}>{value}</div>
      <div className={`text-xs font-semibold mt-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-4 w-1 bg-[#0023FF] rounded-full" />
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${color || "text-gray-800"}`}>{value}</span>
    </div>
  );
}

function ProgressBar({ label, value, max, color, pct: forcedPct }) {
  const pct = forcedPct !== undefined ? forcedPct : max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 font-medium truncate max-w-[60%]">{label}</span>
        <span className="font-bold text-gray-800">{typeof value === "number" ? fmt(value) : value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

// ── Tooltip graph ────────────────────────────────────────────────────
const GraphTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-lg">
      <div className="font-bold mb-1 text-gray-300">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name} : <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
export default function Rapports() {
  const [periode,       setPeriode]       = useState("month");
  const [custom,        setCustom]        = useState({ debut: "", fin: "" });
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [toast,         setToast]         = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const charger = async (p = periode, c = custom) => {
    setLoading(true); setError(null);
    try {
      const bornes = p === "custom" ? c : getPeriode(p);
      if (p === "custom" && (!bornes.debut || !bornes.fin)) return setLoading(false);
      const result = await rapportsService.getRapport(bornes.debut, bornes.fin);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur chargement rapport.");
    } finally { setLoading(false); }
  };

  // Chargement automatique au montage (mois en cours)
  useEffect(() => { charger("month"); }, []); 

  const handleExport = async () => {
    if (!data) return;
    setExportLoading(true);
    try {
      const bornes = periode === "custom" ? custom : getPeriode(periode);
      await rapportsService.exportPDF(bornes.debut, bornes.fin);
    } catch { notify("Erreur export PDF.", "error"); }
    finally { setExportLoading(false); }
  };

  // Données graphique CA vs Dépenses
  const graphData = (() => {
    if (!data) return [];
    const map = {};
    data.graphique.ventes.forEach((r) => { map[r.jour] = { jour: r.jour, ca: r.ca, achats: 0 }; });
    data.graphique.achats.forEach((r) => {
      if (map[r.jour]) map[r.jour].achats = r.total;
      else map[r.jour] = { jour: r.jour, ca: 0, achats: r.total };
    });
    return Object.values(map).sort((a, b) => a.jour.localeCompare(b.jour));
  })();

  // Données camembert factures
  const pieData = data ? [
    { name: "Encaissé",  value: data.factures.montant_encaisse,  color: "#10b981" },
    { name: "Créances",  value: data.factures.montant_creances,  color: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  // Cohérent avec le KPI "Bénéfice Net" (data.benefice = CA - COGS), et non
  // CA - total achats stock (qui mélange achats de période et ventes de stock
  // ancien, et donnait un % incohérent avec le montant affiché juste au-dessus).
  const tauxMarge = data && data.ventes.ca_total > 0
    ? Math.round((data.benefice / data.ventes.ca_total) * 100)
    : 0;
  const tauxRecouvrement = data && data.factures.montant_total > 0
    ? Math.round((data.factures.montant_encaisse / data.factures.montant_total) * 100)
    : 0;

  const PERIODES = [
    { key: "today",   label: "Aujourd'hui" },
    { key: "week",    label: "Cette semaine" },
    { key: "month",   label: "Ce mois" },
    { key: "quarter", label: "Ce trimestre" },
    { key: "year",    label: "Cette année" },
    { key: "custom",  label: "Personnalisé" },
  ];

  return (
    <div>
      <PageHeader
        title="Rapports Financiers"
        sub={
          data
            ? `${fmtDate(data.periode.debut)} — ${fmtDate(data.periode.fin)}`
            : "Chargement en cours…"
        }
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {data && (
              <Btn color="gray" onClick={handleExport} loading={exportLoading} className="w-full sm:w-auto">
                ⬇ Exporter PDF
              </Btn>
            )}
            <Btn onClick={() => charger()} loading={loading} className="w-full sm:w-auto">🔄 Actualiser</Btn>
          </div>
        }
      />

      {/* ── Sélecteur de période ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-2">
          {PERIODES.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPeriode(p.key);
                if (p.key !== "custom") charger(p.key, custom);
              }}
              style={periode === p.key ? { backgroundColor: "#0023FF" } : undefined}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition border ${
                periode === p.key
                  ? "text-white border-transparent shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#B3BFFF] hover:text-[#0023FF]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periode === "custom" && (
          <div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Du</label>
              <input
                type="date"
                value={custom.debut}
                onChange={(e) => setCustom((c) => ({ ...c, debut: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Au</label>
              <input
                type="date"
                value={custom.fin}
                onChange={(e) => setCustom((c) => ({ ...c, fin: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]"
              />
            </div>
            <Btn onClick={() => charger("custom", custom)} loading={loading}>
              Appliquer
            </Btn>
          </div>
        )}
      </div>

      {/* ── États ── */}
      {loading && <Spinner />}
      {error   && <ErrorBox message={error} onRetry={() => charger()} />}

      {!loading && data && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard
              icon="📈" label="Chiffre d'Affaires"
              value={fmt(data.ventes.ca_total)}
              accent={{ text: "text-[#0023FF]", badge: "bg-[#E6EAFF] text-[#0023FF]" }}
            />
            <KpiCard
              icon="💸" label="Total Dépenses"
              value={fmt(data.achats.total_achats)}
              accent={{ text: "text-red-600", badge: "bg-red-100 text-red-700" }}
            />
            <KpiCard
              icon="💰" label="Bénéfice Net"
              value={fmt(data.benefice)}
              sub={`Marge ${tauxMarge}%`}
              accent={{
                text: data.benefice >= 0 ? "text-emerald-600" : "text-red-600",
                badge: data.benefice >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
              }}
            />
            <KpiCard
              icon="🧾" label="Factures Émises"
              value={fmtN(data.factures.nb_total)}
              sub={`${data.factures.nb_impayees} impayée(s)`}
              accent={{ text: "text-blue-600", badge: "bg-red-100 text-red-600" }}
            />
          </div>

          {/* ── Graphique évolution ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <SectionTitle>Évolution CA vs Dépenses</SectionTitle>
            {graphData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée graphique pour cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={graphData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="jour" tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(d) => d?.slice(5)} axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}
                  />
                  <Tooltip content={<GraphTooltip />} />
                  <Legend
                    formatter={(n) => (
                      <span className="text-xs text-gray-600 font-medium">
                        {n === "ca" ? "Chiffre d'Affaires" : "Dépenses"}
                      </span>
                    )}
                  />
                  <Line type="monotone" dataKey="ca"     name="ca"     stroke="#0023FF" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="achats" name="achats" stroke="#ef4444" strokeWidth={2}   dot={false} strokeDasharray="5 3" activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── 3 blocs détail ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

            {/* Ventes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle>Ventes</SectionTitle>
              <StatRow label="Nombre de factures"  value={fmtN(data.ventes.nb_factures)} />
              <StatRow label="Lignes de vente"      value={fmtN(data.ventes.nb_lignes)} />
              <StatRow label="Quantités vendues"    value={fmtN(data.ventes.qte_totale) + " unités"} />
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">CA Total</span>
                <span className="text-base font-black text-[#0023FF]">{fmt(data.ventes.ca_total)}</span>
              </div>
            </div>

            {/* Approvisionnements */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle>Approvisionnements</SectionTitle>
              <StatRow label="Nombre d'achats"     value={fmtN(data.achats.nb_achats)} />
              <StatRow label="Montant payé"         value={fmt(data.achats.total_paye)}    color="text-emerald-600" />
              <StatRow label="Dettes fournisseurs"  value={fmt(data.achats.total_dettes)}  color={data.achats.total_dettes > 0 ? "text-red-500" : "text-gray-400"} />
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Total Dépenses</span>
                <span className="text-base font-black text-red-600">{fmt(data.achats.total_achats)}</span>
              </div>
            </div>

            {/* Marge & Rentabilité */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle>Marge & Rentabilité</SectionTitle>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Taux de marge brute</span>
                  <span className={`font-bold ${tauxMarge >= 0 ? "text-emerald-600" : "text-red-600"}`}>{tauxMarge}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${tauxMarge >= 30 ? "bg-emerald-500" : tauxMarge >= 10 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${Math.max(0, Math.min(100, tauxMarge))}%` }}
                  />
                </div>
              </div>
              <StatRow label="CA brut"              value={fmt(data.ventes.ca_total)} color="text-[#0023FF]" />
              {/* Coût des ventes (COGS) : seule valeur dont CA brut - ce coût = Marge nette ;
                  ne pas confondre avec "Total Dépenses" (achats de stock de la période,
                  affiché plus haut) qui peut différer si le stock acheté n'est pas
                  entièrement revendu sur la période. */}
              <StatRow label="Coût des ventes"      value={fmt(data.cogs)}            color="text-red-500" />
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Marge nette</span>
                <span className={`text-base font-black ${data.benefice >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(data.benefice)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Factures : camembert + détail ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <SectionTitle>Recouvrement Factures</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Donut */}
              <div className="flex flex-col items-center">
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                          paddingAngle={3} dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-1">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-gray-500 font-medium">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 py-8">Aucune facture sur la période.</div>
                )}
              </div>

              {/* Stats */}
              <div>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                    <div className="text-xl font-black text-emerald-700">{data.factures.nb_reglees}</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">Réglées</div>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-xl p-3 text-center border border-red-100">
                    <div className="text-xl font-black text-red-700">{data.factures.nb_impayees}</div>
                    <div className="text-xs text-red-600 font-semibold mt-0.5">Impayées</div>
                  </div>
                </div>
                <ProgressBar label="Encaissé"  value={data.factures.montant_encaisse}  max={data.factures.montant_total} color="bg-emerald-500" />
                <ProgressBar label="Créances"  value={data.factures.montant_creances}  max={data.factures.montant_total} color="bg-red-400" />
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-400">Taux de recouvrement</span>
                  <span className={`font-bold ${tauxRecouvrement >= 80 ? "text-emerald-600" : tauxRecouvrement >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {tauxRecouvrement}%
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Total Facturé</span>
                  <span className="text-base font-black text-gray-800">{fmt(data.factures.montant_total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Top articles ── */}
          {data.top_articles.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <SectionTitle>Top 5 Articles Vendus</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {data.top_articles.map((a, i) => (
                    <div key={a.code} className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-600 font-medium truncate max-w-[65%]">
                          <span className="text-gray-400 mr-1">{i + 1}.</span>{a.libelle}
                        </span>
                        <span className="font-bold text-gray-800">{fmt(a.ca)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0023FF] rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.round((a.ca / data.top_articles[0].ca) * 100)}%`,
                            opacity: 1 - i * 0.15,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.top_articles} layout="vertical" barSize={12}>
                    <XAxis
                      type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}
                    />
                    <YAxis
                      type="category" dataKey="libelle" tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={false} tickLine={false} width={80}
                      tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                    />
                    <Tooltip formatter={(v) => [fmt(v), "CA"]} />
                    <Bar dataKey="ca" fill="#0023FF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Clients à recouvrer ── */}
          {data.creances_clients && data.creances_clients.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Clients à Recouvrer (période)</SectionTitle>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {data.creances_clients.length} client{data.creances_clients.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.creances_clients.map((c) => (
                  <div key={c.client_nom} className="rounded-xl border border-red-100 bg-red-50 p-3">
                    <div className="text-sm font-bold text-gray-800 truncate">{c.client_nom}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.nb_factures} facture{c.nb_factures > 1 ? "s" : ""} impayée{c.nb_factures > 1 ? "s" : ""}
                    </div>
                    <div className="text-base font-black text-red-600 mt-1.5">{fmt(c.total_du)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Synthèse bénéfice ── */}
          <div className={`rounded-2xl border p-6 flex items-center justify-between gap-4 ${
            data.benefice >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
          }`}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Bénéfice net de la période
              </div>
              <div className={`text-3xl font-black ${data.benefice >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmt(data.benefice)}
              </div>
              <div className="text-xs text-gray-500 mt-1.5">
                CA <strong>{fmt(data.ventes.ca_total)}</strong> — Coût des ventes <strong>{fmt(data.cogs)}</strong>
              </div>
            </div>
            <div className="text-5xl select-none">{data.benefice >= 0 ? "📈" : "📉"}</div>
          </div>
        </>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
