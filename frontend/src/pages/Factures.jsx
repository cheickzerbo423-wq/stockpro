// src/pages/Factures.jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFactures, useMutation, useSortableData } from "../hooks/useApi";
import { facturesService } from "../services";
import {
  fmt, fmtDate, Spinner, ErrorBox, Badge, Modal, Input,
  Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox,
} from "../components/UI";

export default function Factures() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const { data: factures = [], loading, error, reload } = useFactures();
  const { mutate: payFacture } = useMutation(facturesService.updatePaiement);

  const [selected,     setSelected]     = useState(null);
  const [detail,       setDetail]       = useState(null);
  const [payModal,     setPayModal]     = useState(null);
  const [payAmount,    setPayAmount]    = useState("");
  const [toast,        setToast]        = useState(null);
  const [loadingPDF,   setLoadingPDF]   = useState(null);
  const [loadingRecu,  setLoadingRecu]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatut, setFilterStatut] = useState("all"); // all | paid | unpaid

  // Pré-filtrer si on arrive depuis la page Ventes
  useEffect(() => {
    const fs = location.state?.factureSearch; // eslint-disable-line
    if (fs) { setSearch(fs); window.history.replaceState({}, document.title); }
  }, []); // eslint-disable-line

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const viewFacture = async (facture) => {
    try {
      const data = await facturesService.getOne(facture.code);
      setSelected(facture);
      setDetail(data);
    } catch { notify("Erreur lors du chargement.", "error"); }
  };

  const handlePDF = async (code, download = false) => {
    setLoadingPDF(code);
    try {
      if (download) await facturesService.downloadPDF(code);
      else          await facturesService.openPDF(code);
    } catch { notify("Erreur génération PDF.", "error"); }
    finally { setLoadingPDF(null); }
  };

  const handleRecu = async (code) => {
    setLoadingRecu(code);
    try { await facturesService.openRecu(code); }
    catch { notify("Erreur génération reçu.", "error"); }
    finally { setLoadingRecu(null); }
  };

  const handlePay = async () => {
    const versement = parseFloat(payAmount);
    if (isNaN(versement) || versement <= 0) return notify("Montant invalide.", "error");
    const resteActuel = parseFloat(payModal.reste);
    if (versement > resteActuel) return notify(`Dépasse le reste à payer (${fmt(resteActuel)}).`, "error");
    const nouveauTotal = parseFloat(payModal.montant_paye) + versement;
    try {
      await payFacture(payModal.code, nouveauTotal);
      notify("Paiement enregistré !");
      setPayModal(null); setPayAmount("");
      await reload();
    } catch (err) { notify(err.message, "error"); }
  };

  // KPIs
  const totalCA    = factures.reduce((s, f) => s + parseFloat(f.montant || 0), 0);
  // Source de vérité : reste = 0 → réglée (même si statut DB pas encore mis à jour)
  const isReglée = (f) => f.statut || parseFloat(f.reste || 0) <= 0;

  const totalReste = factures.reduce((s, f) => s + parseFloat(f.reste || 0), 0);
  const nbReglees  = factures.filter(isReglée).length;
  const nbImpayees = factures.filter((f) => !isReglée(f)).length;
  const tauxRegl   = factures.length ? Math.round((nbReglees / factures.length) * 100) : 0;

  // Forcer le marquage réglée (pour factures bloquées : reste=0 mais statut=false)
  const handleMarquerReglee = async (f) => {
    try {
      await payFacture(f.code, parseFloat(f.montant_paye));
      notify("Facture marquée comme réglée !");
      await reload();
    } catch (err) { notify(err.message || "Erreur", "error"); }
  };

  // Filtres
  const facturesFiltrees = useMemo(() => {
    let list = factures;
    if (filterStatut === "paid")   list = list.filter(isReglée);
    if (filterStatut === "unpaid") list = list.filter((f) => !isReglée(f));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          (f.code || "").toLowerCase().includes(q) ||
          (f.client_nom || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [factures, search, filterStatut]);

  const { sorted: facturesAffichées, sortKey, sortDir, handleSort } = useSortableData(facturesFiltrees, "code", "asc");
  const sortState = { key: sortKey, dir: sortDir };

  return (
    <div>
      <PageHeader
        title="Factures"
        sub={`${factures.length} factures · CA total : ${fmt(totalCA)}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: "CA Total",          value: fmt(totalCA),     color: "text-gray-800",    bg: "bg-white",            border: "border-gray-200" },
          { label: "Factures réglées",  value: nbReglees,        color: "text-emerald-600", bg: "bg-emerald-50",       border: "border-emerald-100" },
          { label: "Factures impayées", value: nbImpayees,       color: "text-red-600",     bg: "bg-red-50",           border: "border-red-100" },
          { label: "Reste à recouvrer", value: fmt(totalReste),  color: "text-orange-600",  bg: "bg-orange-50",        border: "border-orange-100" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.bg} ${k.border} p-4`}>
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-xs font-semibold text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Taux de recouvrement */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Taux de recouvrement</span>
          <span className="text-sm font-black text-gray-800">{tauxRegl}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${tauxRegl}%`,
              background: tauxRegl >= 80 ? "#16A34A" : tauxRegl >= 50 ? "#F97316" : "#DC2626",
            }}
          />
        </div>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex-1 min-w-0">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Rechercher N° facture ou client…"
            suggestions={[
              ...new Map(factures.map(f => [f.client_nom, { label: f.client_nom, sub: "Client" }])).values(),
              ...factures.map(f => ({ label: f.code, sub: `${f.client_nom} — ${fmt(f.montant)}` })),
            ]}
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: "all",    label: "Toutes" },
            { key: "paid",   label: "Réglées" },
            { key: "unpaid", label: "Impayées" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatut(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition
                ${filterStatut === f.key
                  ? "bg-orange-500 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"}`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <DataTable
            headers={[
              { label: "N° Facture", sortKey: "code",          w: "11%" },
              { label: "Date",       sortKey: "date_facture",   w: "10%" },
              { label: "Client",     sortKey: "client_nom",     w: "27%" },
              { label: "Montant", sortKey: "montant",      right: true, w: "12%" },
              { label: "Payé",    sortKey: "montant_paye", right: true, w: "12%" },
              { label: "Reste",   sortKey: "reste",        right: true, w: "10%" },
              { label: "Statut",  sortKey: "statut",             w: "10%" },
              { label: "Actions",                                 w: "8%" },
            ]}
            sort={sortState} onSort={handleSort}
            empty="Aucune facture."
          >
            {facturesAffichées.map((f) => (
              <TR key={f.code}>
                <TD>
                  <button
                    onClick={() => viewFacture(f)}
                    className="font-mono text-xs text-orange-600 hover:text-orange-800 hover:underline font-bold"
                  >{f.code}</button>
                </TD>
                <TD>{fmtDate(f.date_facture)}</TD>
                <TD bold>{f.client_nom}</TD>
                <TD right bold>{fmt(f.montant)}</TD>
                <TD right>
                  <span className="text-emerald-600 font-semibold">{fmt(f.montant_paye)}</span>
                </TD>
                <TD right>
                  <span className={parseFloat(f.reste) > 0 ? "text-red-600 font-bold" : "text-gray-300"}>
                    {parseFloat(f.reste) > 0 ? fmt(f.reste) : "—"}
                  </span>
                </TD>
                <TD>
                  <Badge color={isReglée(f) ? "emerald" : "red"}>
                    {isReglée(f) ? "Réglée" : "Impayée"}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex gap-1 flex-wrap">
                    <Btn sm color="gray"  onClick={() => handlePDF(f.code)}  loading={loadingPDF  === f.code}>🖨</Btn>
                    <Btn sm color="green" onClick={() => handleRecu(f.code)} loading={loadingRecu === f.code}>🎫</Btn>
                    {!isReglée(f) && parseFloat(f.reste) > 0 && (
                      <Btn sm color="orange" onClick={() => { setPayModal(f); setPayAmount(String(f.reste)); }}>
                        Payer
                      </Btn>
                    )}
                    {!f.statut && parseFloat(f.reste) <= 0 && (
                      <Btn sm color="emerald" onClick={() => handleMarquerReglee(f)}>✓</Btn>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </DataTable>
        )}
      </div>

      {/* ── Modal détail facture ── */}
      {selected && detail && (
        <Modal title={`Facture ${selected.code}`} onClose={() => { setSelected(null); setDetail(null); }} wide>
          {/* En-tête */}
          <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Client</div>
              <div className="text-lg font-black text-gray-900">{selected.client_nom}</div>
              <div className="text-sm text-gray-500 mt-0.5">{fmtDate(selected.date_facture)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Référence</div>
              <div className="font-mono text-sm font-bold text-orange-600">{selected.code}</div>
              <div className="mt-2">
                <Badge color={isReglée(selected) ? "emerald" : "red"}>
                  {isReglée(selected) ? "✓ Réglée" : "⏳ Impayée"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Tableau articles */}
          <div className="rounded-xl overflow-hidden border border-gray-200 mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Désignation</th>
                  <th className="text-center px-3 py-3 font-semibold w-16">Qté</th>
                  <th className="text-right px-4 py-3 font-semibold">Prix Unit.</th>
                  <th className="text-right px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {(detail.lignes || []).map((l, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{l.libelle}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{l.quantite}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(l.prix_vente)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(l.montant_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span className="font-semibold text-gray-900">{fmt(selected.montant)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Montant payé</span>
                <span className="font-bold text-emerald-600">{fmt(selected.montant_paye)}</span>
              </div>
              {parseFloat(selected.reste) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reste à payer</span>
                  <span className="font-bold text-red-600">{fmt(selected.reste)}</span>
                </div>
              )}
              <div className="border-t-2 border-orange-500 pt-2 flex justify-between">
                <span className="font-black text-gray-900">TOTAL</span>
                <span className="font-black text-orange-600 text-lg">{fmt(selected.montant)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-5 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {!selected.statut && (
                <Btn color="orange" onClick={() => { setPayModal(selected); setPayAmount(String(selected.reste)); setSelected(null); setDetail(null); }}>
                  Enregistrer paiement
                </Btn>
              )}
              <Btn color="blue" onClick={() => {
                setSelected(null); setDetail(null);
                navigate("/ventes", { state: { factureSearch: selected.code } });
              }}>
                ↗ Voir dans Ventes
              </Btn>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn color="gray"   onClick={() => handlePDF(selected.code, true)} loading={loadingPDF === selected.code}>⬇ Télécharger</Btn>
              <Btn color="gray"   onClick={() => handlePDF(selected.code)}       loading={loadingPDF === selected.code}>🖨 Facture PDF</Btn>
              <Btn color="green"  onClick={() => handleRecu(selected.code)}      loading={loadingRecu === selected.code}>🎫 Ticket</Btn>
              <Btn color="gray"   onClick={() => { setSelected(null); setDetail(null); }}>Fermer</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal paiement ── */}
      {payModal && (
        <Modal title="Enregistrer un paiement" onClose={() => { setPayModal(null); setPayAmount(""); }}>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1">
            <div className="text-sm"><span className="text-gray-500">Facture :</span> <strong className="font-mono text-orange-600">{payModal.code}</strong></div>
            <div className="text-sm"><span className="text-gray-500">Client :</span> <strong>{payModal.client_nom}</strong></div>
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
              <span>Total : <strong>{fmt(payModal.montant)}</strong></span>
              <span>Déjà payé : <strong className="text-emerald-600">{fmt(payModal.montant_paye)}</strong></span>
              <span>Reste : <strong className="text-red-600">{fmt(payModal.reste)}</strong></span>
            </div>
          </div>
          <Input
            label="Montant à payer maintenant (FCFA)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <button
            onClick={() => setPayAmount(String(payModal.reste))}
            className="text-xs text-orange-600 underline mt-1 hover:text-orange-800"
          >
            Solder entièrement ({fmt(payModal.reste)})
          </button>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setPayModal(null); setPayAmount(""); }}>Annuler</Btn>
            <Btn color="orange" onClick={handlePay}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
