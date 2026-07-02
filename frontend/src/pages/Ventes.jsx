// src/pages/Ventes.jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVentes, useArticles, useClients, useMutation, useSortableData } from "../hooks/useApi";
import { ventesService, facturesService, clientsService } from "../services";
import {
  fmt, fmtN, fmtDate, today, Spinner, ErrorBox,
  Input, Btn, Modal, Badge, PageHeader, DataTable, TR, TD, Toast, SearchBox, Pagination,
  isFactureReglee,
} from "../components/UI";
import Icon from "../components/Icon";

/* ─── Mini-form création rapide ─────────────────────────── */
function MiniForm({ title, icon, onSave, onCancel, saving }) {
  const [nom, setNom]         = useState("");
  const [contact, setContact] = useState("");
  const [adresse, setAdresse] = useState("");
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone *</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)}
              placeholder="ex: 07 00 00 00 00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Adresse *</label>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)}
              placeholder="Adresse du client…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
            Annuler
          </button>
          <button
            disabled={!nom.trim() || !contact.trim() || !adresse.trim() || saving}
            onClick={() => onSave({ nom: nom.trim(), contact, adresse: adresse.trim() })}
            className="flex-1 py-2 rounded-xl bg-[#0023FF] text-white text-sm font-bold hover:bg-[#0023FF] transition disabled:opacity-40">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Nouvelle Vente ─────────────────────────────── */
function VenteModal({ articles, clients, onSave, saving, onClose, onCreateClient }) {
  const [articleQ, setArticleQ]   = useState("");
  const [client, setClient]       = useState("");
  const [clientId, setClientId]   = useState("");
  const [clientQ, setClientQ]     = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [savingClient, setSavingClient]   = useState(false);
  const [datev, setDatev]         = useState(today());
  const [panier, setPanier]       = useState([]);
  const [paye, setPaye]           = useState("");

  const clientsFiltres = clientQ.trim()
    ? clients.filter((c) => c.nom.toLowerCase().includes(clientQ.toLowerCase()))
    : clients;

  const totalPanier = panier.reduce((s, p) => s + p.prix_vente * p.quantite, 0);
  const monnaie     = paye !== "" ? (+paye - totalPanier) : null;

  /* Articles filtrés pour le catalogue */
  const filteredArticles = useMemo(() => {
    const s = articleQ.trim().toLowerCase();
    return s
      ? articles.filter((a) => a.code.toLowerCase().includes(s) || a.libelle.toLowerCase().includes(s))
      : articles;
  }, [articleQ, articles]);

  // Stock disponible par code article — sert à plafonner les quantités du
  // panier afin d'empêcher toute survente (vente au-delà du stock réel).
  const stockMap = useMemo(
    () => new Map(articles.map((a) => [a.code, parseInt(a.stock_restant) || 0])),
    [articles]
  );

  const addToCart = (art) => {
    const stock = parseInt(art.stock_restant) || 0;
    if (stock <= 0) return;
    setPanier((prev) => {
      const ex = prev.find((p) => p.code === art.code);
      if (ex) {
        if (ex.quantite >= stock) return prev; // stock maximum déjà atteint
        return prev.map((p) => p.code === art.code ? { ...p, quantite: p.quantite + 1 } : p);
      }
      return [...prev, { code: art.code, libelle: art.libelle, prix_vente: parseInt(art.prix_vente) || 0, quantite: 1, image_url: art.image_url || "" }];
    });
  };

  const setQty = (code, val) => {
    const stock = stockMap.has(code) ? stockMap.get(code) : Infinity;
    const n = Math.min(Math.max(1, parseInt(val) || 1), Math.max(stock, 1));
    setPanier((prev) => prev.map((p) => p.code === code ? { ...p, quantite: n } : p));
  };

  const setPrice = (code, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setPanier((prev) => prev.map((p) => p.code === code ? { ...p, prix_vente: n } : p));
  };

  const remove = (code) => setPanier((prev) => prev.filter((p) => p.code !== code));

  // Garde-fou final : si le stock a changé pendant que le panier était
  // rempli (autre vente entre-temps), on bloque la validation plutôt que
  // de laisser passer une survente.
  const hasOverstock = panier.some((p) => p.quantite > (stockMap.get(p.code) ?? Infinity));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(3px)" }}>

      <div className="flex flex-col w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "96vh" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#0023FF 0%,#4B6BFF 100%)" }}>
          <div>
            <h2 className="text-base font-black text-white">Nouvelle Vente</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              {panier.length > 0
                ? <><span className="font-bold text-white">{panier.length}</span> article(s) · <span className="font-bold text-white">{fmt(totalPanier)}</span></>
                : "Sélectionnez un client et ajoutez des articles"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold transition"><Icon name="x" size={15} /></button>
        </div>

        {/* ── Formulaire (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Client + Date */}
          <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-2">
            {/* Combobox client */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Client *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" size={14} /></span>
                <input
                  type="text"
                  value={clientOpen ? clientQ : client}
                  onChange={(e) => { setClientQ(e.target.value); setClientOpen(true); setClient(""); setClientId(""); }}
                  onFocus={() => { setClientOpen(true); setClientQ(""); }}
                  onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                  placeholder="Chercher client…"
                  className={`w-full pl-8 pr-7 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] transition
                    ${client ? "border-[#B3BFFF] bg-[#E6EAFF] text-[#0019CC] font-semibold" : "border-gray-200 bg-white"}`}
                />
                {client && (
                  <button onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setClient(""); setClientId(""); setClientQ(""); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><Icon name="x" size={13} /></button>
                )}
              </div>
              {clientOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  <button onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setClientOpen(false); setShowNewClient(true); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#0023FF] hover:bg-[#E6EAFF] transition flex items-center gap-2 border-b border-[#B3BFFF]">
                    <span className="w-6 h-6 rounded-full bg-[#0023FF] text-white text-xs font-black flex items-center justify-center flex-shrink-0">+</span>
                    Nouveau client
                  </button>
                  {clientsFiltres.length === 0
                    ? <div className="px-4 py-3 text-xs text-gray-400 text-center">Aucun client trouvé</div>
                    : clientsFiltres.map((c) => (
                      <button key={c.id} onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setClient(c.nom); setClientId(c.id); setClientQ(c.nom); setClientOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#E6EAFF] hover:text-[#0019CC] transition flex items-center gap-2
                          ${client === c.nom ? "bg-[#E6EAFF] text-[#0019CC] font-semibold" : "text-gray-700"}`}>
                        <span className="w-6 h-6 rounded-full bg-[#E6EAFF] text-[#0023FF] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {c.nom[0].toUpperCase()}
                        </span>
                        {c.nom}
                      </button>
                    ))}
                </div>
              )}
              {showNewClient && (
                <MiniForm title="Nouveau Client" icon={<Icon name="user" size={22} />} saving={savingClient}
                  onCancel={() => setShowNewClient(false)}
                  onSave={async ({ nom, contact, adresse: adresseClient }) => {
                    setSavingClient(true);
                    try {
                      const created = await onCreateClient({ nom, contact, adresse: adresseClient });
                      // Le backend enregistre le nom en MAJUSCULES (clients_fournisseurs.nom) :
                      // on réutilise created.nom pour que client_nom (facture/vente) soit
                      // affiché avec la même casse que dans la liste Clients, plutôt que
                      // la saisie brute de l'utilisateur.
                      const nomAffiche = created?.nom || nom.toUpperCase();
                      setClient(nomAffiche); setClientId(created?.id || ""); setClientQ(nomAffiche);
                      setShowNewClient(false);
                    } finally { setSavingClient(false); }
                  }} />
              )}
            </div>
            <Input label="Date *" type="date" value={datev} onChange={(e) => setDatev(e.target.value)} />
          </div>

          {/* ── Catalogue articles ── */}
          <div className="px-4 pb-3">
            {/* En-tête section */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Catalogue</span>
              {articleQ.trim()
                ? <span className="text-[11px] text-[#0023FF] font-semibold">{filteredArticles.length} résultat(s)</span>
                : <span className="text-[11px] text-gray-400">{articles.length} article(s)</span>}
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={articleQ}
                onChange={(e) => setArticleQ(e.target.value)}
                placeholder="Rechercher par nom ou code…"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0023FF]/10 focus:border-[#0023FF] focus:bg-white transition"
                autoComplete="off"
              />
              {articleQ && (
                <button onClick={() => setArticleQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 transition"><Icon name="x" size={12} /></button>
              )}
            </div>

            {/* Grille catalogue — 2 colonnes */}
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-gray-300 mb-2 flex justify-center"><Icon name="search" size={28} /></div>
                <p className="text-sm text-gray-400 font-medium">Aucun article trouvé</p>
                <p className="text-xs text-gray-300 mt-0.5">Essayez un autre mot-clé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pb-0.5">
                {filteredArticles.map((a) => {
                  const stock   = parseInt(a.stock_restant) || 0;
                  const rupture = stock <= 0;
                  const stockLow = !rupture && stock <= (parseInt(a.stock_min) || 5);
                  const inCart  = panier.find((p) => p.code === a.code)?.quantite || 0;
                  // Stock maximum déjà placé dans le panier : on bloque l'ajout
                  // pour ne jamais dépasser le stock disponible (anti-survente).
                  const atMax   = !rupture && inCart >= stock;
                  return (
                    <button
                      key={a.code}
                      onClick={() => !rupture && !atMax && addToCart(a)}
                      disabled={rupture || atMax}
                      title={atMax ? `Stock maximum atteint (${stock})` : undefined}
                      className={`relative rounded-2xl border p-2.5 text-left transition-all duration-150 flex flex-col
                        ${rupture
                          ? "opacity-35 cursor-not-allowed border-gray-100 bg-white"
                          : atMax
                            ? "opacity-60 cursor-not-allowed border-[#0023FF] bg-[#F0F3FF] shadow-md"
                            : inCart > 0
                              ? "border-[#0023FF] bg-[#F0F3FF] shadow-md"
                              : "border-gray-100 bg-white hover:border-[#B3BFFF] hover:bg-[#F7F8FF] hover:shadow-sm"}`}
                    >
                      {/* Badge quantité panier */}
                      {inCart > 0 && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0023FF] text-white text-[10px] font-black flex items-center justify-center shadow">
                          {inCart}
                        </span>
                      )}
                      {/* Image produit */}
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2 flex items-center justify-center">
                        {a.image_url
                          ? <img src={a.image_url} alt={a.libelle} className="w-full h-full object-cover" />
                          : <span className="text-gray-400"><Icon name="box" size={28} /></span>}
                      </div>
                      {/* Infos */}
                      <div className="flex flex-col flex-1">
                        <div className="text-[10px] text-gray-400 font-mono mb-0.5">{a.code}</div>
                        <div className="text-xs font-bold text-gray-800 leading-tight mb-1.5 line-clamp-2">{a.libelle}</div>
                        <div className="mt-auto">
                          <div className="text-sm font-black text-[#0023FF]">{fmtN(a.prix_vente)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">F</span></div>
                          <div className={`text-[10px] font-bold mt-0.5 ${rupture ? "text-red-500" : atMax ? "text-amber-600" : stockLow ? "text-amber-500" : "text-emerald-500"}`}>
                            {rupture ? "Rupture" : atMax ? `Stock max atteint (${stock})` : `Stock : ${stock}`}
                          </div>
                        </div>
                      </div>
                      {/* Bouton + */}
                      {!rupture && (
                        <div className={`absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition
                          ${atMax ? "bg-gray-200 text-gray-400" : inCart > 0 ? "bg-[#0023FF] text-white" : "bg-gray-100 text-gray-500"}`}>
                          {atMax ? <Icon name="check" size={12} /> : "+"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Panier ── */}
          <div className="px-4 pb-2">
            {panier.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-300 text-sm text-center rounded-2xl border-2 border-dashed border-gray-100">
                <div className="text-gray-300 mb-2 flex justify-center"><Icon name="cart" size={28} /></div>
                <span className="text-xs text-gray-400">Aucun article ajouté</span>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                {/* En-tête panier */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Panier — {panier.length} article(s)</span>
                  <button onClick={() => setPanier([])} className="text-[11px] text-red-400 hover:text-red-600 font-semibold">Vider</button>
                </div>
                {panier.map((p) => (
                  <div key={p.code} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 flex items-center justify-center">
                          {p.image_url
                            ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-gray-400"><Icon name="box" size={16} /></span>}
                        </div>
                        <div className="min-w-0">
                          <div><span className="text-[11px] font-black text-[#0023FF] font-mono bg-[#E6EAFF] px-1.5 py-0.5 rounded">{p.code}</span></div>
                          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">{p.libelle}</div>
                        </div>
                      </div>
                      <button onClick={() => remove(p.code)}
                        className="ml-2 w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-100 active:bg-red-200 flex items-center justify-center shrink-0"><Icon name="x" size={14} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* − qty + */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <button onClick={() => setQty(p.code, p.quantite - 1)}
                          className="w-9 h-9 rounded-lg bg-white shadow-sm text-gray-600 font-bold text-lg hover:text-[#0023FF] active:scale-95 transition flex items-center justify-center">−</button>
                        <input type="number" min="1" max={stockMap.get(p.code) ?? undefined} value={p.quantite}
                          onChange={(e) => setQty(p.code, e.target.value)}
                          inputMode="numeric"
                          className="w-11 text-center text-base font-bold bg-transparent border-0 focus:outline-none" />
                        <button onClick={() => setQty(p.code, p.quantite + 1)}
                          disabled={p.quantite >= (stockMap.get(p.code) ?? Infinity)}
                          className="w-9 h-9 rounded-lg bg-[#0023FF] text-white font-bold text-lg active:scale-95 transition flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">+</button>
                      </div>
                      {/* Prix unitaire */}
                      <input type="number" min="0" value={p.prix_vente}
                        onChange={(e) => setPrice(p.code, e.target.value)}
                        inputMode="numeric"
                        className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#B3BFFF] min-w-0"
                        title="Prix unitaire" />
                      <span className="text-sm font-black text-[#0023FF] shrink-0 w-20 text-right">{fmt(p.prix_vente * p.quantite)}</span>
                    </div>
                    {p.quantite >= (stockMap.get(p.code) ?? Infinity) && (
                      <div className="text-[10px] font-bold text-amber-600 mt-1">
                        <Icon name="alert" size={12} className="inline align-text-bottom mr-1" /> Stock maximum disponible atteint ({stockMap.get(p.code) ?? 0})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Paiement ── */}
          {panier.length > 0 && (
            <div className="mx-4 mb-4 rounded-2xl border border-gray-200 px-4 py-3 space-y-3 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">Total</span>
                <span className="text-xl font-black text-[#0023FF]">{fmt(totalPanier)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPaye(String(totalPanier))}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-[13px] font-bold hover:bg-emerald-200 active:scale-95 transition"><Icon name="check" size={14} className="inline align-text-bottom mr-1" /> Comptant</button>
                <button onClick={() => setPaye("0")}
                  className="flex-1 py-2.5 rounded-xl bg-red-100 text-red-600 text-[13px] font-bold hover:bg-red-200 active:scale-95 transition"><Icon name="clipboard" size={14} className="inline align-text-bottom mr-1" /> Crédit</button>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Montant encaissé (FCFA)</label>
                <input type="number" value={paye} onChange={(e) => setPaye(e.target.value)}
                  placeholder={`${totalPanier}`}
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] bg-white" />
              </div>
              {monnaie !== null && (
                <div className={`flex justify-between items-center px-3 py-2 rounded-xl text-sm font-bold
                  ${monnaie >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                  <span>{monnaie >= 0 ? "Monnaie à rendre" : "Reste à payer"}</span>
                  <span>{fmt(Math.abs(monnaie))}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-white"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <Btn color="gray" onClick={onClose} className="flex-1">Annuler</Btn>
          <button
            disabled={saving || panier.length === 0 || !client || hasOverstock}
            onClick={() => onSave({ client, clientId, datev, paye, panier })}
            title={hasOverstock ? "Quantité supérieure au stock disponible — corrigez le panier." : undefined}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition shadow-sm active:scale-[0.98]
              ${panier.length === 0 || !client || hasOverstock
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
          >
            {saving
              ? "Enregistrement…"
              : hasOverstock
                ? "Stock insuffisant"
                : panier.length > 0
                  ? `Valider (${panier.length} art.)`
                  : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ──────────────────────────────────── */
export default function Ventes() {
  const { data: articles = [], reload: reloadArticles } = useArticles();
  const { data: clients  = [], reload: reloadClients } = useClients("Clients");
  const { mutate: createVente, loading: saving } = useMutation(ventesService.create);

  const navigate = useNavigate();
  const location = useLocation();

  const [showAdd, setShowAdd]   = useState(false);
  const [toast,   setToast]     = useState(null);
  const [search,  setSearch]    = useState("");
  const [page,    setPage]      = useState(1);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const { mutate: payFacture }  = useMutation(facturesService.updatePaiement);
  const [factureDetail, setFactureDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(null);

  const filters = useMemo(() => {
    const f = { page, limit: 50 };
    if (search.trim()) f.q = search.trim();
    return f;
  }, [page, search]);

  const { data: result = {}, loading, error, reload } = useVentes(filters);
  const ventes      = result.data  || [];
  const total       = result.total || 0;
  const totalPages  = result.totalPages || 1;
  const kpis        = result.kpis  || {};

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Pré-filtrer si on arrive depuis la page Factures
  useEffect(() => {
    const fs = location.state?.factureSearch; // eslint-disable-line
    if (fs) { setSearch(fs); setPage(1); window.history.replaceState({}, document.title); }
  }, []); // eslint-disable-line

  // Revenir à la page 1 à chaque changement de recherche
  useEffect(() => { setPage(1); }, [search]);

  const viewFacture = async (code) => {
    if (loadingDetail === code) return;
    setLoadingDetail(code);
    try {
      const data = await facturesService.getOne(code);
      setFactureDetail(data);
    } catch { notify("Erreur lors du chargement de la facture.", "error"); }
    finally { setLoadingDetail(null); }
  };

  // KPIs (calculés côté serveur sur l'ensemble des ventes filtrées)
  const totalCA   = parseFloat(kpis.total_ca || 0);
  const nbClients = kpis.nb_clients || 0;
  const nbFactures = kpis.nb_factures || 0;
  const moyPanier = nbFactures ? totalCA / nbFactures : 0;

  const artMap = useMemo(() => new Map(articles.map(a => [a.code, a])), [articles]);

  // Regroupe les lignes de vente par facture : une seule rangée par facture,
  // avec le nombre d'articles et le total. Les lignes étant triées par date,
  // celles d'une même facture sont consécutives.
  const facturesGroupees = useMemo(() => {
    const map = new Map();
    for (const v of ventes) {
      let f = map.get(v.facture_code);
      if (!f) {
        f = {
          facture_code: v.facture_code,
          date_vente: v.date_vente,
          date_facture: v.date_facture,
          client_nom: v.client_nom,
          facture_montant: parseFloat(v.facture_montant) || 0,
          montant_paye: v.montant_paye,
          reste: v.reste,
          facture_statut: v.facture_statut,
          nb_articles: 0,
          premier_libelle: v.libelle,
          premier_code: v.article_code,
        };
        map.set(v.facture_code, f);
      }
      f.nb_articles += 1;
    }
    return [...map.values()];
  }, [ventes]);

  const { sorted: facturesAffichées, sortKey, sortDir, handleSort } = useSortableData(facturesGroupees, "facture_code", "asc");
  const sortState = { key: sortKey, dir: sortDir };

  const handleSave = async ({ client, clientId, datev, paye, panier }) => {
    if (!client)              { notify("Sélectionnez un client.", "error"); return; }
    if (panier.length === 0)  { notify("Le panier est vide.", "error"); return; }
    // Garde-fou final anti-survente : revérifie le stock disponible (données
    // les plus récentes connues du frontend) avant d'envoyer la vente.
    for (const p of panier) {
      const art = artMap.get(p.code);
      const stockDispo = art ? (parseInt(art.stock_restant) || 0) : 0;
      if (p.quantite > stockDispo) {
        notify(`Stock insuffisant pour "${p.libelle}" (disponible : ${stockDispo}).`, "error");
        return;
      }
    }
    try {
      const result = await createVente({
        client_id:      clientId || null,
        client_nom:     client,
        date_vente:   datev,
        montant_paye: paye !== "" ? +paye : panier.reduce((s, p) => s + p.prix_vente * p.quantite, 0),
        articles:     panier.map((p) => ({ code: p.code, quantite: p.quantite, prix_vente: p.prix_vente })),
      });
      setShowAdd(false);
      // Recharge à la fois l'historique des ventes ET la liste des articles :
      // le stock affiché (catalogue de vente, page Articles) doit refléter
      // immédiatement la sortie de stock qui vient d'être enregistrée.
      reload();
      reloadArticles();
      // Ouverture automatique du ticket de caisse
      try {
        await facturesService.openRecu(result.facture.code);
      } catch {
        notify(`Vente enregistrée — Facture : ${result.facture.code}`, "success");
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

  return (
    <div>
      <PageHeader
        title="Ventes"
        sub={`${total} ligne(s) · CA : ${fmt(totalCA)}`}
        action={<Btn onClick={() => setShowAdd(true)}>+ Nouvelle Vente</Btn>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Chiffre d'Affaires",  value: fmt(totalCA),   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Clients actifs",       value: fmtN(nbClients),color: "text-blue-600",    bg: "bg-blue-50 border-blue-100" },
          { label: "Panier moyen",         value: fmt(moyPanier), color: "text-[#0023FF]",  bg: "bg-[#E6EAFF] border-[#B3BFFF]", full: true },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-3 md:p-4 ${k.bg} ${k.full ? "col-span-2 sm:col-span-1" : ""}`}>
            <div className={`text-sm font-black ${k.color} break-normal leading-tight`}>{k.value}</div>
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
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : ventes.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Aucune vente enregistrée.</p>
        ) : (
          <>
            {/* ── Mobile : cards ── */}
            <div className="md:hidden divide-y divide-gray-50">
              {facturesAffichées.map((f) => {
                const paid = isFactureReglee(f.facture_statut, f.reste);
                const art = artMap.get(f.premier_code);
                return (
                  <div key={f.facture_code} role="button" tabIndex={0}
                    onClick={() => viewFacture(f.facture_code)}
                    className="px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold bg-[#E6EAFF] text-[#0023FF] px-2 py-0.5 rounded-lg border border-[#B3BFFF]">
                        {loadingDetail === f.facture_code ? "…" : f.facture_code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                          {paid ? "Payé" : "Crédit"}
                        </span>
                        <span className="text-xs text-gray-400">{fmtDate(f.date_vente)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {art?.image_url
                        ? <img src={art.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                        : <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Icon name="box" size={16} /></div>}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">{f.client_nom}</div>
                        <div className="text-xs text-gray-500">{f.nb_articles} article{f.nb_articles > 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-[#0023FF] font-semibold inline-flex items-center gap-1">
                        <Icon name="eye" size={12} /> Voir le détail
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#0023FF]">{fmt(f.facture_montant)}</span>
                        {!paid && parseFloat(f.reste) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPayModal({ facture_code: f.facture_code, montant_paye: f.montant_paye, reste: f.reste }); setPayAmount(""); }}
                            className="text-xs bg-[#0023FF] text-white px-2 py-1 rounded-lg font-bold"
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
                  { label: "N° Facture", sortKey: "facture_code",    w: "14%" },
                  { label: "Date",       sortKey: "date_vente",      w: "12%" },
                  { label: "Client",     sortKey: "client_nom",      w: "26%" },
                  { label: "Articles",   sortKey: "nb_articles",     right: true, w: "12%" },
                  { label: "Montant",    sortKey: "facture_montant", right: true, w: "16%" },
                  { label: "Statut",     sortKey: "facture_statut",  w: "12%" },
                  { label: "",           w: "8%" },
                ]}
                sort={sortState} onSort={handleSort}
                empty="Aucune vente enregistrée."
              >
                {facturesAffichées.map((f) => {
                  const paid = isFactureReglee(f.facture_statut, f.reste);
                  const art = artMap.get(f.premier_code);
                  return (
                    <TR key={f.facture_code} onClick={() => viewFacture(f.facture_code)} className="cursor-pointer hover:bg-gray-50">
                      <TD>
                        <span className="font-mono text-xs bg-[#E6EAFF] text-[#0023FF] px-2 py-0.5 rounded-lg border border-[#B3BFFF]">
                          {loadingDetail === f.facture_code ? "…" : f.facture_code}
                        </span>
                      </TD>
                      <TD>{fmtDate(f.date_vente)}</TD>
                      <TD bold>
                        <div className="flex items-center gap-2">
                          {art?.image_url
                            ? <img src={art.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                            : <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Icon name="box" size={18} /></div>}
                          <span className="truncate">{f.client_nom}</span>
                        </div>
                      </TD>
                      <TD right>{f.nb_articles}</TD>
                      <TD right bold>{fmt(f.facture_montant)}</TD>
                      <TD>
                        <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg border
                          ${paid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"}`}>
                          {paid ? "Payé" : "Crédit"}
                        </span>
                      </TD>
                      <TD>
                        {!paid && parseFloat(f.reste) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPayModal({ facture_code: f.facture_code, montant_paye: f.montant_paye, reste: f.reste }); setPayAmount(""); }}
                            className="text-xs bg-[#0023FF] text-white px-2.5 py-1 rounded-lg font-bold hover:bg-[#0023FF] transition whitespace-nowrap"
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
        <Pagination page={page} totalPages={totalPages} total={total} limit={result.limit || 50} onChange={setPage} />
      </div>

      {/* Modal */}
      {showAdd && (
        <VenteModal
          articles={articles}
          clients={clients}
          onSave={handleSave}
          saving={saving}
          onClose={() => setShowAdd(false)}
          onCreateClient={async ({ nom, contact, adresse }) => {
            const created = await clientsService.create({ nom, contact, adresse, type: "Clients" });
            await reloadClients();
            return created;
          }}
        />
      )}

      {/* Modal paiement crédit */}
      {payModal && (
        <Modal title="Solder une créance client" onClose={() => { setPayModal(null); setPayAmount(""); }}>
          <div className="text-sm text-gray-600 space-y-1 mb-4">
            <p>Facture : <strong className="font-mono text-[#0023FF]">{payModal.facture_code}</strong></p>
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
            className="text-xs text-[#0023FF] underline mt-1"
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
              <div className="text-sm text-gray-500 mt-0.5">{fmtDate(factureDetail.date_facture)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase font-bold mb-1">Référence</div>
              <div className="font-mono text-sm font-bold text-[#0023FF]">{factureDetail.code}</div>
              <div className="mt-2">
                <Badge color={isFactureReglee(factureDetail.statut, factureDetail.reste) ? "emerald" : "red"}>
                  {isFactureReglee(factureDetail.statut, factureDetail.reste)
                    ? <span className="inline-flex items-center gap-1"><Icon name="check" size={12} /> Réglée</span>
                    : <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} /> Impayée</span>}
                </Badge>
              </div>
            </div>
          </div>

          {/* Mobile : cartes empilées (évite le débordement de la table) */}
          <div className="md:hidden space-y-2 mb-5">
            {(factureDetail.lignes || []).map((l, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-bold text-gray-800 text-sm leading-tight">{l.libelle}</span>
                  <span className="font-black text-[#0023FF] text-sm whitespace-nowrap">{fmt(l.montant_total)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 rounded-lg px-2 py-0.5 font-semibold text-gray-700">Qté {Number(l.quantite)}</span>
                  <span>×</span>
                  <span>{fmt(l.prix_vente)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop : tableau */}
          <div className="hidden md:block rounded-xl overflow-hidden border border-gray-200 mb-5">
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
                    <td className="px-3 py-3 text-center text-gray-600">{Number(l.quantite)}</td>
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
              <div className="border-t-2 border-[#0023FF] pt-2 flex justify-between">
                <span className="font-black text-gray-900">TOTAL</span>
                <span className="font-black text-[#0023FF] text-lg">{fmt(factureDetail.montant)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-5 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {!isFactureReglee(factureDetail.statut, factureDetail.reste) && (
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
                <span className="inline-flex items-center gap-1.5"><Icon name="arrowUpRight" size={14} /> Voir dans Factures</span>
              </Btn>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn color="gray"  onClick={() => facturesService.openPDF(factureDetail.code)}><span className="inline-flex items-center gap-1.5"><Icon name="printer" size={14} /> Facture PDF</span></Btn>
              <Btn color="green" onClick={() => facturesService.openRecu(factureDetail.code)}><span className="inline-flex items-center gap-1.5"><Icon name="ticket" size={14} /> Ticket</span></Btn>
              <Btn color="gray"  onClick={() => setFactureDetail(null)}>Fermer</Btn>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
