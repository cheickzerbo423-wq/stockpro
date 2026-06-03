// src/pages/Ventes.jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVentes, useArticles, useClients, useMutation, useSortableData } from "../hooks/useApi";
import { ventesService, facturesService, clientsService } from "../services";
import {
  fmt, fmtN, today, Spinner, ErrorBox,
  Input, Btn, Modal, Badge, PageHeader, DataTable, TR, TD, Toast, SearchBox,
} from "../components/UI";

/* ─── Mini-form création rapide ─────────────────────────── */
function MiniForm({ title, icon, onSave, onCancel, saving }) {
  const [nom, setNom]         = useState("");
  const [contact, setContact] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-base font-black text-gray-900">{title}</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nom *</label>
            <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)}
              placeholder="Nom complet…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)}
              placeholder="ex: 07 00 00 00 00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
            Annuler
          </button>
          <button
            disabled={!nom.trim() || saving}
            onClick={() => onSave({ nom: nom.trim(), contact })}
            className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition disabled:opacity-40">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Nouvelle Vente ─────────────────────────────── */
function VenteModal({ articles, clients, onSave, saving, onClose, onCreateClient }) {
  const [q, setQ]               = useState("");
  const [client, setClient]     = useState("");
  const [clientId, setClientId] = useState("");
  const [clientQ, setClientQ]   = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [showNewClient, setShowNewClient]   = useState(false);
  const [savingClient, setSavingClient]     = useState(false);
  const [datev, setDatev]       = useState(today());
  const [panier, setPanier]     = useState([]);
  const [paye, setPaye]         = useState("");
  const [mobileTab, setMobileTab] = useState("catalogue"); // "catalogue" | "panier"

  const clientsFiltres = clientQ.trim()
    ? clients.filter((c) => c.nom.toLowerCase().includes(clientQ.toLowerCase()))
    : clients;

  const totalPanier = panier.reduce((s, p) => s + p.prix_vente * p.quantite, 0);
  const monnaie     = paye !== "" ? (+paye - totalPanier) : null;

  const filtered = useMemo(() => {
    if (!q.trim()) return articles;
    const s = q.toLowerCase();
    return articles.filter(
      (a) => a.code.toLowerCase().includes(s) || a.libelle.toLowerCase().includes(s)
    );
  }, [q, articles]);

  const addToCart = (art) => {
    const stock = parseInt(art.stock_restant) || 0;
    if (stock <= 0) return;
    setPanier((prev) => {
      const ex = prev.find((p) => p.code === art.code);
      if (ex) return prev.map((p) => p.code === art.code ? { ...p, quantite: p.quantite + 1 } : p);
      return [...prev, { code: art.code, libelle: art.libelle, prix_vente: parseInt(art.prix_vente) || 0, quantite: 1 }];
    });
  };

  const setQty = (code, val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setPanier((prev) => prev.map((p) => p.code === code ? { ...p, quantite: n } : p));
  };

  const setPrice = (code, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setPanier((prev) => prev.map((p) => p.code === code ? { ...p, prix_vente: n } : p));
  };

  const remove = (code) => setPanier((prev) => prev.filter((p) => p.code !== code));

  const qteInCart = (code) => {
    const item = panier.find((p) => p.code === code);
    return item ? item.quantite : 0;
  };

  return (
    /* Overlay plein écran */
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}>
      {/* Fenêtre */}
      <div className="flex flex-col m-auto w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "92vh", background: "#fff" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900">Nouvelle Vente</h2>
            <p className="text-xs text-gray-400 mt-0.5">{panier.length} article(s) · <span className="font-bold text-orange-500">{fmt(totalPanier)}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">✕</button>
        </div>

        {/* ── Client + Date ── */}
        <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {/* Combobox client avec recherche */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Client *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input
                type="text"
                value={clientOpen ? clientQ : client}
                onChange={(e) => { setClientQ(e.target.value); setClientOpen(true); setClient(""); setClientId(""); }}
                onFocus={() => { setClientOpen(true); setClientQ(""); }}
                onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                placeholder="Rechercher un client…"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition
                  ${client ? "border-orange-300 bg-orange-50 text-orange-700 font-semibold" : "border-gray-200 bg-white text-gray-800"}`}
              />
              {client && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setClient(""); setClientId(""); setClientQ(""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs"
                >✕</button>
              )}
            </div>
            {clientOpen && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {/* Bouton nouveau client toujours visible en tête */}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setClientOpen(false); setShowNewClient(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50 transition flex items-center gap-2 border-b border-orange-100"
                >
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0">+</span>
                  Nouveau client
                </button>
                {clientsFiltres.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400 text-center">Aucun client trouvé</div>
                ) : (
                  clientsFiltres.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setClient(c.nom); setClientId(c.id); setClientQ(c.nom); setClientOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-orange-700 transition flex items-center gap-2
                        ${client === c.nom ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-700"}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {c.nom[0].toUpperCase()}
                      </span>
                      {c.nom}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Mini-form nouveau client */}
            {showNewClient && (
              <MiniForm
                title="Nouveau Client"
                icon="👤"
                saving={savingClient}
                onCancel={() => setShowNewClient(false)}
                onSave={async ({ nom, contact }) => {
                  setSavingClient(true);
                  try {
                    const created = await onCreateClient({ nom, contact });
                    setClient(nom); setClientId(created?.id || ""); setClientQ(nom);
                    setShowNewClient(false);
                  } finally { setSavingClient(false); }
                }}
              />
            )}
          </div>
          <Input label="Date *" type="date" value={datev} onChange={(e) => setDatev(e.target.value)} />
        </div>

        {/* ── Onglets mobile ── */}
        <div className="flex md:hidden border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setMobileTab("catalogue")}
            className={`flex-1 py-2.5 text-xs font-bold transition ${mobileTab === "catalogue" ? "border-b-2 border-orange-500 text-orange-600 bg-orange-50" : "text-gray-500"}`}
          >
            🛍️ Catalogue
          </button>
          <button
            onClick={() => setMobileTab("panier")}
            className={`flex-1 py-2.5 text-xs font-bold transition relative ${mobileTab === "panier" ? "border-b-2 border-orange-500 text-orange-600 bg-orange-50" : "text-gray-500"}`}
          >
            🛒 Panier
            {panier.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{panier.length}</span>
            )}
          </button>
        </div>

        {/* ── Corps : deux colonnes desktop / onglets mobile ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ═══ COLONNE GAUCHE : Catalogue ═══ */}
          <div className={`flex flex-col w-full md:w-3/5 border-r border-gray-100 min-h-0 ${mobileTab === "panier" ? "hidden md:flex" : "flex"}`}>
            {/* Barre de recherche */}
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white"
                  placeholder="Rechercher par code ou nom…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
              </div>
            </div>
            {/* Liste produits */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-400">Aucun article trouvé</div>
              )}
              {filtered.map((a) => {
                const stock = parseInt(a.stock_restant) || 0;
                const inCart = qteInCart(a.code);
                const rupture = stock <= 0;
                return (
                  <div
                    key={a.code}
                    onClick={() => !rupture && addToCart(a)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 transition-colors
                      ${rupture ? "opacity-40 cursor-not-allowed bg-white" : "cursor-pointer hover:bg-orange-50 active:bg-orange-100"}
                      ${inCart > 0 ? "bg-orange-50" : ""}`}
                  >
                    {/* Code + Libellé */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded font-mono">{a.code}</span>
                        {inCart > 0 && (
                          <span className="text-xs bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full">{inCart}</span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">{a.libelle}</div>
                    </div>
                    {/* Prix + Stock */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gray-900">{fmtN(a.prix_vente)} <span className="text-xs font-normal text-gray-400">FCFA</span></div>
                      <div className={`text-xs font-semibold mt-0.5 ${rupture ? "text-red-500" : stock <= (parseInt(a.stock_min) || 5) ? "text-amber-500" : "text-emerald-500"}`}>
                        Stock : {stock}
                      </div>
                    </div>
                    {/* Bouton + */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!rupture) addToCart(a); }}
                      disabled={rupture}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shrink-0 transition
                        ${rupture ? "bg-gray-100 text-gray-300" : inCart > 0 ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-gray-100 text-gray-600 hover:bg-orange-500 hover:text-white"}`}
                    >+</button>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
              <span className="text-xs text-gray-400">{filtered.length} produit(s)</span>
              {panier.length > 0 && (
                <button
                  onClick={() => setMobileTab("panier")}
                  className="md:hidden text-xs font-bold text-white bg-orange-500 px-3 py-1.5 rounded-xl"
                >
                  Voir panier ({panier.length}) →
                </button>
              )}
            </div>
          </div>

          {/* ═══ COLONNE DROITE : Panier + Paiement ═══ */}
          <div className={`flex-col w-full md:w-2/5 min-h-0 ${mobileTab === "catalogue" ? "hidden md:flex" : "flex"}`}>

            {/* Titre panier */}
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Panier</span>
              {panier.length > 0 && (
                <button onClick={() => setPanier([])} className="text-xs text-red-400 hover:text-red-600">Vider</button>
              )}
            </div>

            {/* Lignes panier */}
            <div className="flex-1 overflow-y-auto">
              {panier.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 text-sm p-6 text-center">
                  <div className="text-4xl mb-2">🛒</div>
                  Cliquez sur un produit<br/>pour l'ajouter
                </div>
              )}
              {panier.map((p) => (
                <div key={p.code} className="px-4 py-3 border-b border-gray-50">
                  {/* Nom + Supprimer */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-orange-500 font-mono">{p.code}</div>
                      <div className="text-sm font-semibold text-gray-800 truncate">{p.libelle}</div>
                    </div>
                    <button onClick={() => remove(p.code)} className="ml-2 w-5 h-5 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-xs shrink-0">✕</button>
                  </div>
                  {/* Quantité + Prix + Total */}
                  <div className="flex items-center gap-2">
                    {/* − qty + */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                      <button onClick={() => setQty(p.code, p.quantite - 1)} className="w-6 h-6 rounded-md bg-white shadow-sm text-gray-600 font-bold text-sm hover:text-orange-500 flex items-center justify-center">−</button>
                      <input
                        type="number" min="1"
                        value={p.quantite}
                        onChange={(e) => setQty(p.code, e.target.value)}
                        className="w-9 text-center text-sm font-bold bg-transparent border-0 focus:outline-none"
                      />
                      <button onClick={() => setQty(p.code, p.quantite + 1)} className="w-6 h-6 rounded-md bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 flex items-center justify-center">+</button>
                    </div>
                    {/* Prix unitaire */}
                    <input
                      type="number" min="0"
                      value={p.prix_vente}
                      onChange={(e) => setPrice(p.code, e.target.value)}
                      className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300 min-w-0"
                      title="Prix unitaire"
                    />
                    {/* Total ligne */}
                    <span className="text-sm font-black text-orange-600 shrink-0 w-20 text-right">{fmt(p.prix_vente * p.quantite)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Paiement ── */}
            {panier.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-4 flex-shrink-0 space-y-3">
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-600">Total</span>
                  <span className="text-xl font-black text-orange-600">{fmt(totalPanier)}</span>
                </div>
                {/* Raccourcis */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaye(String(totalPanier))}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition"
                  >✅ Comptant</button>
                  <button
                    onClick={() => setPaye("0")}
                    className="flex-1 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition"
                  >📋 Crédit</button>
                </div>
                {/* Champ montant */}
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Montant encaissé (FCFA)</label>
                  <input
                    type="number"
                    value={paye}
                    onChange={(e) => setPaye(e.target.value)}
                    placeholder={`${totalPanier}`}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                {/* Monnaie / Reste */}
                {monnaie !== null && (
                  <div className={`flex justify-between items-center px-3 py-2 rounded-xl text-sm font-bold
                    ${monnaie >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    <span>{monnaie >= 0 ? "Monnaie à rendre" : "Reste à payer"}</span>
                    <span>{fmt(Math.abs(monnaie))}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Footer boutons ── */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
              {/* Mobile: bouton retour catalogue */}
              <button
                onClick={() => setMobileTab("catalogue")}
                className="md:hidden px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 shrink-0"
              >← Catalogue</button>
              {/* Desktop: annuler */}
              <Btn color="gray" onClick={onClose} className="hidden md:block flex-1">Annuler</Btn>
              <button
                disabled={saving || panier.length === 0 || !client}
                onClick={() => onSave({ client, clientId, datev, paye, panier })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition
                  ${panier.length === 0 || !client
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"}`}
              >
                {saving ? "Enregistrement…" : `Valider${panier.length > 0 ? ` (${panier.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ──────────────────────────────────── */
export default function Ventes() {
  const { data: ventes  = [], loading, error, reload } = useVentes();
  const { data: articles = [] } = useArticles();
  const { data: clients  = [], reload: reloadClients } = useClients("Clients");
  const { mutate: createVente, loading: saving } = useMutation(ventesService.create);

  const navigate = useNavigate();
  const location = useLocation();

  const [showAdd, setShowAdd]   = useState(false);
  const [toast,   setToast]     = useState(null);
  const [search,  setSearch]    = useState("");
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const { mutate: payFacture }  = useMutation(facturesService.updatePaiement);
  const [factureDetail, setFactureDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(null);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Pré-filtrer si on arrive depuis la page Factures
  useEffect(() => {
    if (location.state?.factureSearch) {
      setSearch(location.state.factureSearch);
      window.history.replaceState({}, document.title);
    }
  }, []);

  const viewFacture = async (code) => {
    if (loadingDetail === code) return;
    setLoadingDetail(code);
    try {
      const data = await facturesService.getOne(code);
      setFactureDetail(data);
    } catch { notify("Erreur lors du chargement de la facture.", "error"); }
    finally { setLoadingDetail(null); }
  };

  const totalCA   = ventes.reduce((s, v) => s + parseFloat(v.montant_total || 0), 0);
  const nbClients = new Set(ventes.map((v) => v.client_nom)).size;
  const moyPanier = ventes.length
    ? totalCA / new Set(ventes.map((v) => v.facture_code)).size
    : 0;

  const ventesFiltrees = useMemo(() => {
    if (!search.trim()) return ventes;
    const q = search.toLowerCase();
    return ventes.filter(
      (v) =>
        (v.libelle || "").toLowerCase().includes(q) ||
        (v.client_nom || "").toLowerCase().includes(q) ||
        (v.facture_code || "").toLowerCase().includes(q)
    );
  }, [ventes, search]);

  const { sorted: ventesAffichées, sortKey, sortDir, handleSort } = useSortableData(ventesFiltrees, "facture_code", "asc");
  const sortState = { key: sortKey, dir: sortDir };

  const handleSave = async ({ client, clientId, datev, paye, panier }) => {
    if (!client)              { notify("Sélectionnez un client.", "error"); return; }
    if (panier.length === 0)  { notify("Le panier est vide.", "error"); return; }
    try {
      const result = await createVente({
        client_id:    clientId || null,
        client_nom:   client,
        date_vente:   datev,
        montant_paye: paye !== "" ? +paye : panier.reduce((s, p) => s + p.prix_vente * p.quantite, 0),
        articles:     panier.map((p) => ({ code: p.code, quantite: p.quantite, prix_vente: p.prix_vente })),
      });
      setShowAdd(false);
      reload();
      // Ouverture automatique du ticket de caisse
      try {
        await facturesService.openRecu(result.facture.code);
      } catch {
        notify(`✅ Vente enregistrée — Facture : ${result.facture.code}`, "success");
      }
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const handlePay = async () => {
    const versement = parseFloat(payAmount);
    if (!payAmount || isNaN(versement) || versement <= 0)
      return notify("Montant invalide.", "error");
    const resteActuel = parseFloat(payModal.reste);
    if (versement > resteActuel)
      return notify(`Dépasse le reste à payer (${fmt(resteActuel)}).`, "error");
    const nouveauTotal = parseFloat(payModal.montant_paye) + versement;
    try {
      await payFacture(payModal.facture_code, nouveauTotal);
      notify("Paiement enregistré !");
      setPayModal(null);
      setPayAmount("");
      await reload();
    } catch (err) { notify(err.message, "error"); }
  };

  // Pour n'afficher le bouton Payer qu'une fois par facture (première occurrence)
  const seenFactures = new Set();

  return (
    <div>
      <PageHeader
        title="Ventes"
        sub={`${ventes.length} ligne(s) · CA : ${fmt(totalCA)}`}
        action={<Btn onClick={() => setShowAdd(true)}>+ Nouvelle Vente</Btn>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Chiffre d'Affaires",  value: fmt(totalCA),   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Clients actifs",       value: fmtN(nbClients),color: "text-blue-600",    bg: "bg-blue-50 border-blue-100" },
          { label: "Panier moyen",         value: fmt(moyPanier), color: "text-orange-600",  bg: "bg-orange-50 border-orange-100", full: true },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-3 md:p-4 ${k.bg} ${k.full ? "col-span-2 sm:col-span-1" : ""}`}>
            <div className={`text-base md:text-xl font-black ${k.color} truncate`}>{k.value}</div>
            <div className="text-xs font-semibold text-gray-500 mt-1 leading-tight">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Barre de recherche */}
      <div className="mb-4 max-w-sm">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Rechercher article, client, facture…"
          suggestions={[
            ...new Map(ventes.map(v => [v.client_nom, { label: v.client_nom, sub: "Client" }])).values(),
            ...new Map(ventes.map(v => [v.libelle, { label: v.libelle, sub: "Article" }])).values(),
            ...new Map(ventes.map(v => [v.facture_code, { label: v.facture_code, sub: "N° Facture" }])).values(),
          ]}
        />
      </div>

      {/* Tableau / Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : ventesFiltrees.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Aucune vente enregistrée.</p>
        ) : (
          <>
            {/* ── Mobile : cards ── */}
            <div className="md:hidden divide-y divide-gray-50">
              {ventesAffichées.map((v, i) => {
                const paid = v.facture_statut === true || v.facture_statut === "true";
                return (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <button
                        onClick={() => viewFacture(v.facture_code)}
                        className="font-mono text-xs font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg border border-orange-100 hover:bg-orange-100 hover:border-orange-300 transition"
                      >
                        {loadingDetail === v.facture_code ? "…" : v.facture_code}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                          {paid ? "Payé" : "Crédit"}
                        </span>
                        <span className="text-xs text-gray-400">{v.date_vente?.split("T")[0]}</span>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-800 truncate">{v.libelle}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{v.client_nom}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                        {fmtN(v.quantite)} × {fmtN(v.prix_vente)} FCFA
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-orange-600">{fmt(v.montant_total)}</span>
                        {!paid && (
                          <button
                            onClick={() => { setPayModal({ facture_code: v.facture_code, montant_paye: v.montant_paye, reste: v.reste }); setPayAmount(""); }}
                            className="text-xs bg-orange-500 text-white px-2 py-1 rounded-lg font-bold hover:bg-orange-600 transition"
                          >Payer</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop : tableau ── */}
            <div className="hidden md:block">
              <DataTable
                headers={[
                  { label: "N° Facture", sortKey: "facture_code",  w: "11%" },
                  { label: "Date",       sortKey: "date_vente",    w: "9%" },
                  { label: "Article",    sortKey: "libelle",       w: "22%" },
                  { label: "Client",     sortKey: "client_nom",    w: "18%" },
                  { label: "Qté",     sortKey: "quantite",      right: true, w: "6%" },
                  { label: "Prix U.", sortKey: "prix_vente",    right: true, w: "9%" },
                  { label: "Montant", sortKey: "montant_total", right: true, w: "11%" },
                  { label: "Statut",  sortKey: "facture_statut", w: "8%" },
                  { label: "",        w: "6%" },
                ]}
                sort={sortState} onSort={handleSort}
                empty="Aucune vente enregistrée."
              >
                {ventesAffichées.map((v, i) => {
                  const isFirst = !seenFactures.has(v.facture_code);
                  if (isFirst) seenFactures.add(v.facture_code);
                  const paid = v.facture_statut === true || v.facture_statut === "true";
                  return (
                    <TR key={i}>
                      <TD>
                        <button
                          onClick={() => viewFacture(v.facture_code)}
                          className="font-mono text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg border border-orange-100 hover:bg-orange-100 hover:border-orange-300 hover:underline transition"
                        >
                          {loadingDetail === v.facture_code ? "…" : v.facture_code}
                        </button>
                      </TD>
                      <TD>{v.date_vente?.split("T")[0]}</TD>
                      <TD bold>{v.libelle}</TD>
                      <TD>{v.client_nom}</TD>
                      <TD right>{fmtN(v.quantite)}</TD>
                      <TD right>{fmtN(v.prix_vente)}</TD>
                      <TD right bold>{fmt(v.montant_total)}</TD>
                      <TD>
                        {isFirst && (
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg border
                            ${paid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-600 border-red-200"}`}>
                            {paid ? "Payé" : "Crédit"}
                          </span>
                        )}
                      </TD>
                      <TD>
                        {isFirst && !paid && (
                          <button
                            onClick={() => { setPayModal({ facture_code: v.facture_code, montant_paye: v.montant_paye, reste: v.reste }); setPayAmount(""); }}
                            className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-orange-600 transition whitespace-nowrap"
                          >
                            Payer
                          </button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </DataTable>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showAdd && (
        <VenteModal
          articles={articles}
          clients={clients}
          onSave={handleSave}
          saving={saving}
          onClose={() => setShowAdd(false)}
          onCreateClient={async ({ nom, contact }) => {
            const created = await clientsService.create({ nom, contact, type: "Clients" });
            await reloadClients();
            return created;
          }}
        />
      )}

      {/* Modal paiement crédit */}
      {payModal && (
        <Modal title="Solder une créance client" onClose={() => { setPayModal(null); setPayAmount(""); }}>
          <div className="text-sm text-gray-600 space-y-1 mb-4">
            <p>Facture : <strong className="font-mono text-orange-600">{payModal.facture_code}</strong></p>
            <p>
              Déjà encaissé : <strong className="text-emerald-600">{fmt(payModal.montant_paye)}</strong> ·
              Reste à payer : <strong className="text-red-600">{fmt(payModal.reste)}</strong>
            </p>
          </div>
          <Input
            label="Montant encaissé maintenant (FCFA)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder={`Max : ${fmt(payModal.reste)}`}
          />
          <button
            onClick={() => setPayAmount(String(payModal.reste))}
            className="text-xs text-orange-600 underline mt-1"
          >
            Encaisser tout le reste ({fmt(payModal.reste)})
          </button>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setPayModal(null); setPayAmount(""); }}>Annuler</Btn>
            <Btn onClick={handlePay}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal détail facture (depuis Ventes) ── */}
      {factureDetail && (
        <Modal title={`Facture ${factureDetail.code}`} onClose={() => setFactureDetail(null)} wide>
          <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Client</div>
              <div className="text-lg font-black text-gray-900">{factureDetail.client_nom}</div>
              <div className="text-sm text-gray-500 mt-0.5">{factureDetail.date_facture?.split("T")[0]}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Référence</div>
              <div className="font-mono text-sm font-bold text-orange-600">{factureDetail.code}</div>
              <div className="mt-2">
                <Badge color={factureDetail.statut ? "emerald" : "red"}>
                  {factureDetail.statut ? "✓ Réglée" : "⏳ Impayée"}
                </Badge>
              </div>
            </div>
          </div>

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
                {(factureDetail.lignes || []).map((l, i) => (
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

          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span className="font-semibold text-gray-900">{fmt(factureDetail.montant)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Montant payé</span>
                <span className="font-bold text-emerald-600">{fmt(factureDetail.montant_paye)}</span>
              </div>
              {parseFloat(factureDetail.reste) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reste à payer</span>
                  <span className="font-bold text-red-600">{fmt(factureDetail.reste)}</span>
                </div>
              )}
              <div className="border-t-2 border-orange-500 pt-2 flex justify-between">
                <span className="font-black text-gray-900">TOTAL</span>
                <span className="font-black text-orange-600 text-lg">{fmt(factureDetail.montant)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-5 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {!factureDetail.statut && (
                <Btn color="orange" onClick={() => {
                  setPayModal({ facture_code: factureDetail.code, montant_paye: factureDetail.montant_paye, reste: factureDetail.reste });
                  setPayAmount(String(factureDetail.reste));
                  setFactureDetail(null);
                }}>
                  Enregistrer paiement
                </Btn>
              )}
              <Btn color="blue" onClick={() => {
                setFactureDetail(null);
                navigate("/factures", { state: { factureSearch: factureDetail.code } });
              }}>
                ↗ Voir dans Factures
              </Btn>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn color="gray"  onClick={() => facturesService.openPDF(factureDetail.code)}>🖨 Facture PDF</Btn>
              <Btn color="green" onClick={() => facturesService.openRecu(factureDetail.code)}>🎫 Ticket</Btn>
              <Btn color="gray"  onClick={() => setFactureDetail(null)}>Fermer</Btn>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
