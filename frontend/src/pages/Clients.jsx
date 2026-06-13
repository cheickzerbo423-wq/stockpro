// src/pages/Clients.jsx
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useClients, useMutation, useSortableData } from "../hooks/useApi";
import { clientsService, achatsService } from "../services";
import {
  fmt, fmtN, fmtDate, Spinner, ErrorBox, Modal, Input, Btn,
  PageHeader, DataTable, TR, TD, Toast, Badge, SearchBox, ConfirmModal,
  isFactureReglee,
} from "../components/UI";

// ── Helpers ──────────────────────────────────────────────────────────
const MOIS_COURTS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const moisLabel = (m) => {
  if (!m) return m;
  const parts = m.split("-");
  if (parts.length === 2) return MOIS_COURTS[parseInt(parts[1]) - 1] + " " + parts[0].slice(2);
  return m;
};

// ── Composants ───────────────────────────────────────────────────────
function BilanCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 border text-center ${color}`}>
      <div className="text-sm font-black break-normal leading-tight">{value}</div>
      <div className="text-xs font-bold uppercase mt-1 opacity-70">{label}</div>
    </div>
  );
}

function KpiBox({ label, value, sub, icon, bg, text }) {
  return (
    <div className={`rounded-2xl p-4 ${bg} flex items-center gap-3`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <div className={`text-lg font-black leading-tight ${text}`}>{value}</div>
        <div className="text-xs text-gray-500 font-semibold mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

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

// ── Panneau fiche client/fournisseur ─────────────────────────────────
function FichePanel({ bilan, onClose, onPay }) {
  const isClient = bilan.type === "Clients";
  const kpi = bilan.kpi || {};
  const evolution = (bilan.evolution || []).map((e) => ({ ...e, mois: moisLabel(e.mois) }));
  const topMax = bilan.top_articles?.[0]?.ca || bilan.top_articles?.[0]?.total || 1;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panneau */}
      <div className="w-full max-w-3xl bg-white flex flex-col shadow-2xl overflow-hidden">

        {/* En-tête sombre */}
        <div className="bg-gray-900 text-white px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-3xl">{isClient ? "👤" : "🏭"}</span>
                <h2 className="text-xl font-black truncate">{bilan.nom}</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  isClient ? "bg-[#0023FF] text-white" : "bg-[#FFF900] text-black"
                }`}>
                  {isClient ? "Client" : "Fournisseur"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                {bilan.contact && <span>📞 {bilan.contact}</span>}
                {bilan.email   && <span>✉ {bilan.email}</span>}
                {bilan.ville   && <span>📍 {bilan.ville}</span>}
                {bilan.adresse && <span>🏠 {bilan.adresse}</span>}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                {isClient ? (
                  <>
                    <span>1ère facture : <strong className="text-gray-300">{fmtDate(kpi.premiere_facture)}</strong></span>
                    <span>Dernière : <strong className="text-gray-300">{fmtDate(kpi.derniere_facture)}</strong></span>
                  </>
                ) : (
                  <>
                    <span>1er achat : <strong className="text-gray-300">{fmtDate(kpi.premier_achat)}</strong></span>
                    <span>Dernier : <strong className="text-gray-300">{fmtDate(kpi.dernier_achat)}</strong></span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl flex-shrink-0 leading-none">✕</button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 space-y-5">

          {/* ── KPIs ── */}
          {isClient ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiBox icon="📊" label="Factures" value={fmtN(kpi.nb_factures)} bg="bg-white border border-gray-100 shadow-sm" text="text-gray-800" />
              <KpiBox icon="📈" label="CA Total" value={fmt(kpi.ca_total)} bg="bg-blue-50 border border-blue-100" text="text-blue-700" />
              <KpiBox icon="✅" label="Encaissé" value={fmt(kpi.encaisse)}
                sub={`${kpi.nb_reglees} réglée(s)`} bg="bg-emerald-50 border border-emerald-100" text="text-emerald-700" />
              <KpiBox icon="⏳" label="Créances" value={fmt(kpi.creances)}
                sub={`${kpi.nb_impayees} impayée(s)`} bg="bg-red-50 border border-red-100" text="text-red-700" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiBox icon="🛒" label="Achats" value={fmtN(kpi.nb_achats)} bg="bg-white border border-gray-100 shadow-sm" text="text-gray-800" />
              <KpiBox icon="💸" label="Total Achats" value={fmt(kpi.total_achats)} bg="bg-blue-50 border border-blue-100" text="text-blue-700" />
              <KpiBox icon="✅" label="Total Payé" value={fmt(kpi.total_paye)} bg="bg-emerald-50 border border-emerald-100" text="text-emerald-700" />
              <KpiBox icon="🔴" label="Dettes" value={fmt(kpi.total_dettes)} bg="bg-red-50 border border-red-100" text="text-red-700" />
            </div>
          )}

          {/* ── Graphiques ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Évolution mensuelle */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-1 bg-[#0023FF] rounded-full" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {isClient ? "CA par mois" : "Achats par mois"}
                </h3>
              </div>
              {evolution.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Aucune donnée.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={evolution} barSize={14} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mois" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v} />
                    <Tooltip content={<GraphTooltip />} />
                    {isClient ? (
                      <>
                        <Bar dataKey="ca"       name="CA"       fill="#3b82f6" radius={[4,4,0,0]} />
                        <Bar dataKey="encaisse" name="Encaissé" fill="#10b981" radius={[4,4,0,0]} />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="total" name="Achats" fill="#0023FF" radius={[4,4,0,0]} />
                        <Bar dataKey="paye"  name="Payé"   fill="#10b981" radius={[4,4,0,0]} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top articles */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-1 bg-[#0023FF] rounded-full" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Top articles {isClient ? "achetés" : "fournis"}
                </h3>
              </div>
              {!bilan.top_articles?.length ? (
                <p className="text-xs text-gray-400 py-6 text-center">Aucun article.</p>
              ) : (
                <div className="space-y-3">
                  {bilan.top_articles.map((a, i) => {
                    const val = isClient ? a.ca : a.total;
                    return (
                      <div key={a.article_code}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 font-medium truncate max-w-[65%]">
                            <span className="text-gray-400 mr-1">{i+1}.</span>{a.libelle}
                          </span>
                          <span className="font-bold text-gray-800">{fmt(val)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#0023FF]"
                              style={{ width: `${Math.round((val / topMax) * 100)}%`, opacity: 1 - i * 0.15 }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{fmtN(a.qte_totale)} u.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Historique des transactions ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
              <div className="h-4 w-1 bg-[#0023FF] rounded-full" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {isClient ? `Factures (${bilan.transactions?.length || 0})` : `Achats (${bilan.transactions?.length || 0})`}
              </h3>
            </div>
            <div className="overflow-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {isClient
                      ? ["N° Facture", "Date", "Montant", "Encaissé", "Reste", "Statut"].map(h =>
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)
                      : ["Article", "Date", "Qté", "P.U.", "Total", "Payé", "Reste", "Statut", ""].map(h =>
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)
                    }
                  </tr>
                </thead>
                <tbody>
                  {!bilan.transactions?.length && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">Aucune transaction.</td></tr>
                  )}
                  {isClient
                    ? bilan.transactions.map((t) => (
                        <tr key={t.code} className="border-t border-gray-50 hover:bg-[#E6EAFF]/40 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-blue-600">{t.code}</td>
                          <td className="px-3 py-2.5 text-gray-500">{fmtDate(t.date_facture)}</td>
                          <td className="px-3 py-2.5 font-bold text-gray-800">{fmt(t.montant)}</td>
                          <td className="px-3 py-2.5 text-emerald-600 font-semibold">{fmt(t.montant_paye)}</td>
                          <td className="px-3 py-2.5 text-red-600 font-semibold">{parseFloat(t.reste) > 0 ? fmt(t.reste) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5">
                            {isFactureReglee(t.statut, t.reste)
                              ? <Badge color="emerald">Réglée</Badge>
                              : <Badge color="orange">En cours</Badge>}
                          </td>
                        </tr>
                      ))
                    : bilan.transactions.map((t) => (
                        <tr key={t.id} className="border-t border-gray-50 hover:bg-[#E6EAFF]/40 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-gray-700 max-w-[120px] truncate">{t.libelle}</td>
                          <td className="px-3 py-2.5 text-gray-500">{fmtDate(t.date_achat)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-700">{fmtN(t.quantite)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{fmt(t.prix_achat)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-gray-800">{fmt(t.montant_total)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold">{fmt(t.montant_paye)}</td>
                          <td className="px-3 py-2.5 text-right text-red-600 font-semibold">
                            {parseFloat(t.reste) > 0 ? fmt(t.reste) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {isFactureReglee(t.statut, t.reste)
                              ? <Badge color="emerald">Payé</Badge>
                              : <Badge color="orange">Crédit</Badge>}
                          </td>
                          <td className="px-3 py-2.5">
                            {!isFactureReglee(t.statut, t.reste) && (
                              <button
                                onClick={() => onPay(t)}
                                className="text-xs text-white px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap"
                                style={{ backgroundColor: "#0023FF" }}
                              >
                                Payer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Synthèse financière ── */}
          <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${
            isClient
              ? parseFloat(kpi.creances) > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
              : parseFloat(kpi.total_dettes) > 0
                ? "bg-red-50 border-red-200"
                : "bg-emerald-50 border-emerald-200"
          }`}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Situation financière</div>
              {isClient ? (
                <>
                  <div className="text-xl font-black text-gray-800">{fmt(kpi.ca_total)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Encaissé <strong className="text-emerald-600">{fmt(kpi.encaisse)}</strong>
                    {parseFloat(kpi.creances) > 0 && <> · Créances <strong className="text-red-600">{fmt(kpi.creances)}</strong></>}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-black text-gray-800">{fmt(kpi.total_achats)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Payé <strong className="text-emerald-600">{fmt(kpi.total_paye)}</strong>
                    {parseFloat(kpi.total_dettes) > 0 && <> · Dette <strong className="text-red-600">{fmt(kpi.total_dettes)}</strong></>}
                  </div>
                </>
              )}
            </div>
            <div className="text-4xl select-none">
              {isClient
                ? parseFloat(kpi.creances) > 0 ? "⏳" : "🏆"
                : parseFloat(kpi.total_dettes) > 0 ? "⚠️" : "✅"}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 bg-white border-t border-gray-100 flex justify-end">
          <Btn color="gray" onClick={onClose}>Fermer</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
export default function Clients() {
  const [tab, setTab]             = useState("Clients");
  const [search, setSearch]       = useState("");
  const { data: all = [], loading, error, reload } = useClients();
  const { mutate: create, loading: saving }   = useMutation(clientsService.create);
  const { mutate: update, loading: updating } = useMutation(clientsService.update);
  const { mutate: del }           = useMutation(clientsService.delete);
  const { mutate: payAchat }      = useMutation(achatsService.updatePaiement);

  const [showAdd, setShowAdd]       = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [editForm, setEditForm]     = useState({ nom: "", contact: "", email: "", ville: "", adresse: "" });
  const [bilan, setBilan]           = useState(null);
  const [bilanLoading, setBilanLoading] = useState(false);
  const [payModal, setPayModal]     = useState(null);
  const [payAmount, setPayAmount]   = useState("");
  const [delConfirm, setDelConfirm] = useState(null); // { id, nom }
  const [form, setForm]             = useState({ nom: "", contact: "", email: "", ville: "", adresse: "" });
  const [toast, setToast]           = useState(null);
  const notify = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const filtered  = all.filter((c) => c.type === tab && (!search || c.nom.toLowerCase().includes(search.toLowerCase())));
  const isClient  = tab === "Clients";

  const { sorted: clientsAffichés, sortKey, sortDir, handleSort } = useSortableData(filtered, "nom", "asc");
  const sortState = { key: sortKey, dir: sortDir };

  const totaux = filtered.reduce((acc, c) => {
    if (isClient) {
      acc.ca       += parseFloat(c.total_ca       || 0);
      acc.encaisse += parseFloat(c.total_encaisse || 0);
      acc.creances += parseFloat(c.total_creances || 0);
    } else {
      acc.achats += parseFloat(c.total_achats || 0);
      acc.paye   += parseFloat(c.total_paye   || 0);
      acc.dettes += parseFloat(c.total_dettes || 0);
    }
    return acc;
  }, { ca: 0, encaisse: 0, creances: 0, achats: 0, paye: 0, dettes: 0 });

  const openBilan = async (c) => {
    setBilanLoading(true);
    try { setBilan(await clientsService.getBilan(c.id)); }
    catch { notify("Erreur chargement fiche.", "error"); }
    finally { setBilanLoading(false); }
  };

  const handleSave = async () => {
    if (!form.nom.trim())     return notify("Le nom est requis.", "error");
    if (!form.contact.trim()) return notify("Le numéro de téléphone est requis.", "error");
    if (isClient && !form.adresse.trim()) return notify("L'adresse est requise.", "error");
    try {
      await create({ ...form, type: tab });
      notify(`${isClient ? "Client" : "Fournisseur"} ajouté !`);
      setShowAdd(false);
      setForm({ nom: "", contact: "", email: "", ville: "", adresse: "" });
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const openEdit = (c) => {
    setEditContact(c);
    setEditForm({ nom: c.nom, contact: c.contact || "", email: c.email || "", ville: c.ville || "", adresse: c.adresse || "" });
  };

  const handleUpdate = async () => {
    if (!editForm.nom.trim())     return notify("Le nom est requis.", "error");
    if (!editForm.contact.trim()) return notify("Le numéro de téléphone est requis.", "error");
    if (editContact.type === "Clients" && !editForm.adresse.trim()) return notify("L'adresse est requise.", "error");
    try {
      await update(editContact.id, editForm);
      notify("Informations mises à jour !");
      setEditContact(null);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleDel = (id, nom) => setDelConfirm({ id, nom });
  const confirmDel = async () => {
    try { await del(delConfirm.id); notify("Supprimé."); setDelConfirm(null); reload(); }
    catch (err) { notify(err.message, "error"); setDelConfirm(null); }
  };

  const handlePay = async () => {
    const versement = parseFloat(payAmount);
    if (!payAmount || isNaN(versement) || versement <= 0) return notify("Montant invalide.", "error");
    const resteActuel = parseFloat(payModal.reste);
    if (versement > resteActuel) return notify(`Dépasse le reste à payer (${fmt(resteActuel)}).`, "error");
    const nouveauTotal = parseFloat(payModal.montant_paye) + versement;
    try {
      await payAchat(payModal.id, nouveauTotal);
      notify("Paiement enregistré !");
      setPayModal(null);
      setPayAmount("");
      if (bilan) setBilan(await clientsService.getBilan(bilan.id));
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  return (
    <div>
      <PageHeader
        title="Clients et Fournisseurs"
        action={<Btn onClick={() => setShowAdd(true)}>+ Ajouter</Btn>}
      />

      {/* Barre de recherche */}
      <div className="mb-4 max-w-sm">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un client ou fournisseur…"
          suggestions={all.filter(c => c.type === tab).map(c => ({ label: c.nom, sub: c.contact || c.ville || c.type }))}
        />
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-5">
        {["Clients", "Fournisseurs"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={tab === t ? { backgroundColor: "#0023FF" } : undefined}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition border ${tab === t ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-[#B3BFFF]"}`}>
            {t === "Clients" ? "👤" : "🏭"} {t}
            <span className="ml-1 opacity-60">({all.filter(c => c.type === t).length})</span>
          </button>
        ))}
      </div>

      {/* Cartes bilan globales */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {isClient ? <>
            <BilanCard label="CA Total"     value={fmt(totaux.ca)}       color="bg-blue-50 border-blue-100 text-blue-700" />
            <BilanCard label="Encaissé"     value={fmt(totaux.encaisse)} color="bg-emerald-50 border-emerald-100 text-emerald-700" />
            <BilanCard label="Créances"     value={fmt(totaux.creances)} color="bg-red-50 border-red-100 text-red-700" />
          </> : <>
            <BilanCard label="Total Achats" value={fmt(totaux.achats)}  color="bg-blue-50 border-blue-100 text-blue-700" />
            <BilanCard label="Payé"         value={fmt(totaux.paye)}    color="bg-emerald-50 border-emerald-100 text-emerald-700" />
            <BilanCard label="Dettes"       value={fmt(totaux.dettes)}  color="bg-red-50 border-red-100 text-red-700" />
          </>}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <DataTable
            headers={isClient
              ? [
                  { label: "Nom",      sortKey: "nom",              w: "28%" },
                  { label: "Contact",  sortKey: "contact",          w: "18%" },
                  { label: "Factures", sortKey: "nb_transactions", right: true, w: "10%" },
                  { label: "CA",       sortKey: "total_ca",        right: true, w: "15%" },
                  { label: "Encaissé", sortKey: "total_encaisse",  right: true, w: "15%" },
                  { label: "Créances", sortKey: "total_creances",  right: true, w: "10%" },
                  { label: "", w: "4%" },
                ]
              : [
                  { label: "Nom",          sortKey: "nom",              w: "28%" },
                  { label: "Contact",      sortKey: "contact",          w: "18%" },
                  { label: "Achats",       sortKey: "nb_achats",        right: true, w: "10%" },
                  { label: "Total Achats", sortKey: "total_achats",     right: true, w: "14%" },
                  { label: "Payé",         sortKey: "total_paye",       right: true, w: "14%" },
                  { label: "Dettes",       sortKey: "total_dettes",     right: true, w: "12%" },
                  { label: "", w: "4%" },
                ]}
            sort={sortState} onSort={handleSort}
            empty={`Aucun ${isClient ? "client" : "fournisseur"}.`}
          >
            {clientsAffichés.map((c) => (
              <TR key={c.id} onClick={() => openBilan(c)}>
                <TD bold>
                  <div className="flex items-center gap-2">
                    {bilanLoading && <span className="w-3 h-3 border-2 border-[#0023FF] border-t-transparent rounded-full animate-spin inline-block" />}
                    {c.nom}
                  </div>
                </TD>
                <TD>{c.contact || <span className="text-gray-300">—</span>}</TD>
                <TD right>{fmtN(isClient ? (c.nb_transactions || 0) : (c.nb_achats || 0))}</TD>
                {isClient ? <>
                  <TD right>{fmt(c.total_ca || 0)}</TD>
                  <TD right><span className="text-emerald-600 font-semibold">{fmt(c.total_encaisse || 0)}</span></TD>
                  <TD right><span className={parseFloat(c.total_creances)>0?"text-red-600 font-bold":"text-gray-300"}>{fmt(c.total_creances||0)}</span></TD>
                </> : <>
                  <TD right>{fmt(c.total_achats || 0)}</TD>
                  <TD right><span className="text-emerald-600 font-semibold">{fmt(c.total_paye || 0)}</span></TD>
                  <TD right><span className={parseFloat(c.total_dettes)>0?"text-red-600 font-bold":"text-gray-300"}>{fmt(c.total_dettes||0)}</span></TD>
                </>}
                <TD>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="text-gray-400 hover:text-[#0023FF] transition"
                      title="Modifier"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDel(c.id, c.nom); }}
                      className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                  </div>
                </TD>
              </TR>
            ))}
          </DataTable>
        )}
      </div>

      {/* ── Fiche panneau latéral ── */}
      {bilan && (
        <FichePanel
          bilan={bilan}
          onClose={() => setBilan(null)}
          onPay={(t) => { setPayModal(t); setPayAmount(""); }}
        />
      )}

      {/* ── Modal paiement dette fournisseur ── */}
      {payModal && (
        <Modal title="Payer une dette fournisseur" onClose={() => { setPayModal(null); setPayAmount(""); }}>
          <div className="text-sm text-gray-600 space-y-1 mb-4">
            <p>Article : <strong>{payModal.libelle}</strong></p>
            <p>
              Total : <strong>{fmt(payModal.montant_total)}</strong> ·
              Déjà payé : <strong className="text-emerald-600">{fmt(payModal.montant_paye)}</strong> ·
              Reste : <strong className="text-red-600">{fmt(payModal.reste)}</strong>
            </p>
          </div>
          <Input
            label="Montant à verser maintenant (FCFA)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder={`Max : ${fmt(payModal.reste)}`}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setPayAmount(String(payModal.reste))}
              className="text-xs text-[#0023FF] underline">
              Solder la dette ({fmt(payModal.reste)})
            </button>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setPayModal(null); setPayAmount(""); }}>Annuler</Btn>
            <Btn color="orange" onClick={handlePay}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal modification ── */}
      {editContact && (
        <Modal
          title={`Modifier — ${editContact.nom}`}
          onClose={() => setEditContact(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nom & Prénom *" value={editForm.nom}
                onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} />
            </div>
            <Input label="Contact (téléphone) *" value={editForm.contact}
              onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
              placeholder="07 00 00 00 00" />
            <Input label="Email" type="email" value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Ville" value={editForm.ville}
              onChange={(e) => setEditForm({ ...editForm, ville: e.target.value })} />
            <Input label={editContact.type === "Clients" ? "Adresse *" : "Adresse"} value={editForm.adresse}
              onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setEditContact(null)}>Annuler</Btn>
            <Btn onClick={handleUpdate} loading={updating}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal ajout ── */}
      {showAdd && (
        <Modal title={`Nouveau ${isClient ? "Client" : "Fournisseur"}`} onClose={() => setShowAdd(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nom & Prénom *" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <Input label="Contact (téléphone) *" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="225 00 00 00 00" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Ville" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            <Input label={isClient ? "Adresse *" : "Adresse"} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {delConfirm && (
        <ConfirmModal
          icon="🗑️"
          title={`Supprimer ${delConfirm.nom} ?`}
          message="Cette action est irréversible. Toutes les données associées seront perdues."
          confirmLabel="Supprimer"
          confirmColor="red"
          onConfirm={confirmDel}
          onCancel={() => setDelConfirm(null)}
        />
      )}
    </div>
  );
}
