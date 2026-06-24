// src/pages/Achats.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useAchats, useArticles, useClients, useMutation, useSortableData } from "../hooks/useApi";
import { achatsService, clientsService } from "../services";
import {
  fmt, fmtN, fmtDate, today, Spinner, ErrorBox, Badge,
  Modal, Input, Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox, Pagination,
} from "../components/UI";

/* ─── Mini-form création rapide ─────────────────────── */
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone *</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)}
              placeholder="ex: 07 00 00 00 00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
            Annuler
          </button>
          <button disabled={!nom.trim() || !contact.trim() || saving} onClick={() => onSave({ nom: nom.trim(), contact })}
            className="flex-1 py-2 rounded-xl bg-[#0023FF] text-white text-sm font-bold hover:bg-[#0023FF] transition disabled:opacity-40">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Ligne de commande (ancien composant, plus utilisé depuis le catalogue) ─── */
// eslint-disable-next-line no-unused-vars
function LigneCommande({ ligne, index, articles, onUpdate, onRemove }) {
  const [search, setSearch] = useState(ligne.libelle || "");
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  const suggestions = useMemo(() => {
    if (!search.trim() || ligne.article_code) return articles.slice(0, 60);
    const q = search.toLowerCase();
    return articles.filter(
      (a) => a.code.toLowerCase().includes(q) || a.libelle.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [search, articles, ligne.article_code]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectArticle = (a) => {
    setSearch(`${a.code} — ${a.libelle}`);
    setOpen(false);
    onUpdate({ ...ligne, article_code: a.code, libelle: a.libelle, prix_achat: a.prix_achat || "" });
  };

  // Si l'utilisateur tape le nom (ou code) exact d'un article du catalogue puis
  // quitte le champ sans cliquer sur la suggestion, on l'associe quand même —
  // évite une ligne "complète à l'œil" mais non reconnue (article_code vide).
  const handleBlur = () => {
    setTimeout(() => {
      if (ligne.article_code) return;
      const q = search.trim().toLowerCase();
      if (!q) return;
      const exact = articles.find(
        (a) => a.libelle.toLowerCase() === q || a.code.toLowerCase() === q
      );
      if (exact) selectArticle(exact);
      setOpen(false);
    }, 150);
  };

  const total = (+ligne.prix_achat || 0) * (+ligne.quantite || 0);
  const selectedArt = articles.find(a => a.code === ligne.article_code);
  // Texte saisi mais non associé à un article du catalogue : à signaler.
  const nonReconnu = !ligne.article_code && !!search.trim() && !open;

  return (
    <div className="rounded-xl p-3 border bg-gray-50 border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#0023FF] uppercase tracking-wide">Produit {index}</span>
        <button onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 active:scale-95 transition"
          title="Retirer ce produit">✕</button>
      </div>
      <div className="relative" ref={ref}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Article *</label>
          <div className="relative">
            {/* Vignette du produit, intégrée dans le champ */}
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md overflow-hidden bg-white border border-gray-200 flex items-center justify-center pointer-events-none">
              {selectedArt?.image_url
                ? <img src={selectedArt.image_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-base">📦</span>}
            </div>
            <input
              className={`w-full border rounded-lg pl-11 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white ${
                nonReconnu ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-[#B3BFFF]"
              }`}
              placeholder="Rechercher par code ou nom…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); onUpdate({ ...ligne, article_code: "", libelle: e.target.value }); }}
              onFocus={() => setOpen(true)}
              onBlur={handleBlur}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer select-none"
              onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}>▾</span>
          </div>

          {nonReconnu && (
            <p className="text-[11px] text-red-500 font-semibold mt-1">
              ⚠️ Article non reconnu — choisissez-le dans la liste, ou créez-le d'abord dans Articles.
            </p>
          )}

          {open && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
              {suggestions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-400 text-center">Aucun article trouvé</div>
              ) : suggestions.map((a) => (
                <div key={a.code} onMouseDown={() => selectArticle(a)}
                  className="px-3 py-3 cursor-pointer hover:bg-[#E6EAFF] text-sm flex items-center gap-3 border-b border-gray-50 last:border-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 flex items-center justify-center">
                    {a.image_url
                      ? <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black text-[#0023FF] bg-[#E6EAFF] px-1.5 py-0.5 rounded inline-block mb-0.5">{a.code}</div>
                    <div className="text-sm font-semibold text-gray-800 truncate">{a.libelle}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Stock : {a.stock_restant ?? "?"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Quantité *</label>
            <input type="number" min="1" inputMode="numeric"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] bg-white"
              value={ligne.quantite} onChange={(e) => onUpdate({ ...ligne, quantite: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">P.U. (FCFA) *</label>
            <input type="number" min="0" inputMode="numeric"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] bg-white"
              value={ligne.prix_achat} onChange={(e) => onUpdate({ ...ligne, prix_achat: e.target.value })} placeholder="0" />
          </div>
        </div>
        <div className="flex items-center justify-between bg-[#E6EAFF] rounded-lg px-3 py-2 border border-[#B3BFFF]">
          <span className="text-xs text-[#0023FF] font-bold uppercase tracking-wide">Total ligne</span>
          <span className="text-base font-black text-[#0023FF]">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ───────────────────────────────── */
export default function Achats() {
  const { data: articles = [], reload: reloadArticles } = useArticles();
  const { data: fournisseurs = [], reload: reloadFournisseurs } = useClients("Fournisseurs");
  const { mutate: createAchat, loading: saving } = useMutation(achatsService.create);
  const { mutate: payAchat }        = useMutation(achatsService.updatePaiement);

  /* ── État modal ── */
  const [showAdd, setShowAdd]   = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [toast, setToast]       = useState(null);
  const [searchTable, setSearchTable] = useState("");
  const [page, setPage]         = useState(1);

  const filters = useMemo(() => {
    const f = { page, limit: 50 };
    if (searchTable.trim()) f.q = searchTable.trim();
    return f;
  }, [page, searchTable]);

  const { data: result = {}, loading, error, reload } = useAchats(filters);
  const achats      = result.data  || [];
  const total       = result.total || 0;
  const totalPages  = result.totalPages || 1;
  const kpis        = result.kpis  || {};

  // Revenir à la page 1 à chaque changement de recherche
  useEffect(() => { setPage(1); }, [searchTable]);

  /* ── Formulaire multi-lignes ── */
  const emptyLigne = () => ({ id: Date.now() + Math.random(), article_code: "", libelle: "", quantite: "", prix_achat: "" });
  const [lignes, setLignes]     = useState([emptyLigne()]);
  const [fournisseurNom, setFournisseurNom] = useState("");
  const [fournisseurId, setFournisseurId]   = useState("");
  const [fournisseurQ, setFournisseurQ]     = useState("");
  const [fournisseurOpen, setFournisseurOpen] = useState(false);
  const [showNewFournisseur, setShowNewFournisseur] = useState(false);
  const [savingFournisseur, setSavingFournisseur]   = useState(false);
  const [dateAchat, setDateAchat] = useState(today());
  const [montantPaye, setMontantPaye] = useState("");
  const [articleSearch, setArticleSearch] = useState("");

  const fournisseursFiltres = fournisseurQ.trim()
    ? fournisseurs.filter((f) => f.nom.toLowerCase().includes(fournisseurQ.toLowerCase()))
    : fournisseurs;

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const totalCommande = lignes.reduce((s, l) => s + (+l.prix_achat || 0) * (+l.quantite || 0), 0);

  // ── Panier d'approvisionnement (catalogue à toucher + recherche) ──
  const lignesPanier = lignes.filter((l) => l.article_code);
  const catalogueFiltre = articleSearch.trim()
    ? articles.filter((a) =>
        a.libelle.toLowerCase().includes(articleSearch.toLowerCase()) ||
        (a.code || "").toLowerCase().includes(articleSearch.toLowerCase()))
    : articles;
  const updateLigne = (id, key, val) =>
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: val } : l)));
  const removeLigne = (id) => setLignes((prev) => prev.filter((l) => l.id !== id));
  const addArticleToCart = (a) => {
    setLignes((prev) => {
      const existe = prev.find((l) => l.article_code === a.code);
      if (existe)
        return prev.map((l) =>
          l.article_code === a.code ? { ...l, quantite: (+l.quantite || 0) + 1 } : l);
      const nouvelle = {
        id: Date.now() + Math.random(),
        article_code: a.code,
        libelle: a.libelle,
        quantite: 1,
        prix_achat: a.prix_achat ?? "",
        image_url: a.image_url,
      };
      return [...prev.filter((l) => l.article_code), nouvelle];
    });
  };

  // KPIs calculés côté serveur sur l'ensemble des achats filtrés
  const totalDepenses = parseFloat(kpis.total_depenses || 0);
  const totalDettes   = parseFloat(kpis.total_dettes || 0);
  const nbAchats      = total;
  const nbFournisseursActifs = kpis.nb_fournisseurs || 0;

  const resetModal = () => {
    setLignes([emptyLigne()]);
    setFournisseurNom("");
    setFournisseurId("");
    setFournisseurQ("");
    setDateAchat(today());
    setMontantPaye("");
  };

  /* ── Enregistrement multi-produits ── */
  const handleSave = async () => {
    const valides = lignes.filter((l) => l.article_code && l.quantite && l.prix_achat);
    if (valides.length === 0) {
      // Message précis : aide l'utilisateur à comprendre pourquoi rien n'est
      // pris en compte (cas le plus fréquent : article tapé mais non
      // sélectionné dans la liste, donc non lié au catalogue).
      const remplie = lignes.find((l) => (l.libelle?.trim() || l.quantite || l.prix_achat) && !l.article_code);
      if (remplie) {
        return notify(
          remplie.libelle?.trim()
            ? `"${remplie.libelle.trim()}" n'est pas lié à un article du catalogue. Sélectionnez-le dans la liste déroulante (ou créez-le d'abord dans Articles).`
            : "Sélectionnez un article dans la liste déroulante pour chaque ligne.",
          "error"
        );
      }
      const incomplete = lignes.find((l) => l.article_code && (!l.quantite || !l.prix_achat));
      if (incomplete)
        return notify(`Renseignez la quantité et le prix d'achat pour "${incomplete.libelle}".`, "error");
      return notify("Ajoutez au moins un article complet.", "error");
    }
    if (!fournisseurNom)
      return notify("Veuillez sélectionner un fournisseur.", "error");

    const paye = montantPaye === "" ? totalCommande : parseFloat(montantPaye);
    if (paye > totalCommande)
      return notify("Le montant payé ne peut pas dépasser le total.", "error");

    // Répartir le paiement proportionnellement sur chaque ligne.
    // Arrondir chaque ligne indépendamment peut créer un écart cumulatif
    // (ex: 3 lignes à 33,33 → 33+33+33 = 99 au lieu de 100) : on arrondit
    // normalement toutes les lignes sauf la dernière, qui reçoit le
    // reliquat exact (paye - somme des lignes précédentes), garantissant
    // que la somme des montant_paye == paye saisi.
    const results = [];
    let errors = [];
    let payeRestant = paye;
    for (let i = 0; i < valides.length; i++) {
      const l = valides[i];
      const ligneMontant = (+l.prix_achat) * (+l.quantite);
      let lignePaye;
      if (totalCommande <= 0) {
        lignePaye = ligneMontant;
      } else if (i === valides.length - 1) {
        // Dernière ligne : reliquat, borné entre 0 et son propre montant.
        lignePaye = Math.max(0, Math.min(payeRestant, ligneMontant));
      } else {
        lignePaye = Math.round((ligneMontant / totalCommande) * paye);
        payeRestant -= lignePaye;
      }
      try {
        const res = await createAchat({
          article_code: l.article_code,
          fournisseur_nom: fournisseurNom,
          fournisseur_id: fournisseurId,
          prix_achat: l.prix_achat,
          quantite: l.quantite,
          date_achat: dateAchat,
          montant_paye: lignePaye,
        });
        results.push({ libelle: l.libelle, stock: res.nouveau_stock });
      } catch (err) {
        errors.push(`${l.libelle || l.article_code}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      notify(`${results.length} enregistré(s). Erreurs : ${errors.join(" | ")}`, "error");
    } else {
      notify(`✅ ${results.length} produit(s) approvisionné(s) avec succès !`);
    }
    setShowAdd(false);
    resetModal();
    // Recharge à la fois la liste des achats ET celle des articles : le stock
    // affiché (catalogue, suggestions, page Articles si elle est rouverte)
    // doit refléter immédiatement l'approvisionnement qui vient d'être enregistré.
    reload();
    reloadArticles();
  };

  const handlePay = async () => {
    const versement = parseFloat(payAmount);
    if (isNaN(versement) || versement <= 0) return notify("Montant invalide.", "error");
    const resteActuel = parseFloat(payModal.reste);
    if (versement > resteActuel) return notify(`Dépasse le reste à payer (${fmt(resteActuel)}).`, "error");
    const nouveauTotal = parseFloat(payModal.montant_paye) + versement;
    try {
      await payAchat(payModal.id, nouveauTotal);
      notify("Paiement enregistré !");
      setPayModal(null);
      setPayAmount("");
      await reload();
    } catch (err) { notify(err.message, "error"); }
  };

  /* ── Tri du tableau principal (filtrage désormais côté serveur) ── */
  const { sorted: achatsAffichés, sortKey, sortDir, handleSort } = useSortableData(achats, "date_achat", "asc");
  const sortState = { key: sortKey, dir: sortDir };
  const artMap = useMemo(() => new Map(articles.map(a => [a.code, a])), [articles]);

  return (
    <div>
      <PageHeader
        title="Approvisionnements"
        sub={`${total} ligne(s) · Total dépensé : ${fmt(totalDepenses)}`}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Btn onClick={() => { resetModal(); setShowAdd(true); }} className="w-full sm:w-auto">
              + Nouvel Approvisionnement
            </Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total dépensé",        value: fmt(totalDepenses),        color: "text-[#0023FF]",   bg: "bg-[#E6EAFF] border-[#B3BFFF]" },
          { label: "Dettes en cours",      value: totalDettes > 0 ? fmt(totalDettes) : "—", color: totalDettes > 0 ? "text-red-600" : "text-gray-400", bg: totalDettes > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100" },
          { label: "Approvisionnements",   value: fmtN(nbAchats),            color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Fournisseurs actifs",  value: fmtN(nbFournisseursActifs),color: "text-amber-600",   bg: "bg-amber-50 border-amber-100" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-3 md:p-4 ${k.bg}`}>
            <div className={`text-sm font-black ${k.color} break-normal leading-tight`}>{k.value}</div>
            <div className="text-xs font-semibold text-gray-500 mt-1 leading-tight">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Barre de recherche sur le tableau */}
      <div className="mb-4 max-w-sm">
        <SearchBox
          value={searchTable}
          onChange={setSearchTable}
          placeholder="Rechercher un article ou fournisseur…"
          suggestions={[
            ...new Map(achats.map(a => [a.fournisseur_nom, { label: a.fournisseur_nom, sub: "Fournisseur" }])).values(),
            ...new Map(achats.map(a => [a.libelle, { label: a.libelle, sub: `Code : ${a.article_code}` }])).values(),
          ]}
        />
      </div>

      {/* Tableau des achats */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <DataTable
            headers={[
              { label: "Date",        sortKey: "date_achat",      w: "9%" },
              { label: "Article",     sortKey: "libelle",         w: "16%" },
              { label: "Fournisseur", sortKey: "fournisseur_nom", w: "12%" },
              { label: "Qté",   sortKey: "quantite",      right: true, w: "8%" },
              { label: "P.U.",  sortKey: "prix_achat",    right: true, w: "8%" },
              { label: "Total", sortKey: "montant_total", right: true, w: "13%" },
              { label: "Payé",  sortKey: "montant_paye",  right: true, w: "13%" },
              { label: "Reste", sortKey: "reste",         right: true, w: "10%" },
              { label: "Statut", sortKey: "statut",       w: "7%" },
              { label: "", w: "4%" },
            ]}
            sort={sortState} onSort={handleSort}
            empty="Aucun approvisionnement."
          >
            {achatsAffichés.map((a) => (
              <TR key={a.id}>
                <TD>{fmtDate(a.date_achat)}</TD>
                <TD bold>
                  <div className="flex items-center gap-2">
                    {(() => { const art = artMap.get(a.article_code); return art?.image_url
                      ? <img src={art.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                      : <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-base flex-shrink-0">📦</div>; })()}
                    <span className="truncate">{a.libelle}</span>
                  </div>
                </TD>
                <TD>{a.fournisseur_nom || <span className="text-gray-300">—</span>}</TD>
                <TD right>{fmtN(a.quantite)}</TD>
                <TD right>{fmtN(a.prix_achat)}</TD>
                <TD right bold>{fmt(a.montant_total)}</TD>
                <TD right><span className="text-emerald-600 font-semibold">{fmt(a.montant_paye)}</span></TD>
                <TD right>
                  <span className={parseFloat(a.reste) > 0 ? "text-red-600 font-bold" : "text-gray-300"}>
                    {parseFloat(a.reste) > 0 ? fmt(a.reste) : "—"}
                  </span>
                </TD>
                <TD>
                  {(() => {
                    const total = parseFloat(a.montant_total);
                    const paye  = parseFloat(a.montant_paye);
                    if (paye >= total && total > 0) return <Badge color="emerald">Payé</Badge>;
                    if (paye === 0)                 return <Badge color="red">Crédit</Badge>;
                    return <Badge color="amber">Partiel</Badge>;
                  })()}
                </TD>
                <TD>
                  {parseFloat(a.reste) > 0 && (
                    <Btn sm color="orange" onClick={() => { setPayModal(a); setPayAmount(String(a.reste)); }}>
                      Payer
                    </Btn>
                  )}
                </TD>
              </TR>
            ))}
          </DataTable>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} limit={result.limit || 50} onChange={setPage} />
      </div>

      {/* ── Modal Nouvel Approvisionnement ── */}
      {showAdd && (
        <Modal
          title="🚚 Nouvel Approvisionnement"
          onClose={() => { setShowAdd(false); resetModal(); }}
          wide
        >
          {/* Infos communes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fournisseur *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={fournisseurOpen ? fournisseurQ : fournisseurNom}
                  onChange={(e) => { setFournisseurQ(e.target.value); setFournisseurOpen(true); setFournisseurNom(""); setFournisseurId(""); }}
                  onFocus={() => { setFournisseurOpen(true); setFournisseurQ(""); }}
                  onBlur={() => setTimeout(() => setFournisseurOpen(false), 150)}
                  placeholder="Rechercher un fournisseur…"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] transition
                    ${fournisseurNom ? "border-[#B3BFFF] bg-[#E6EAFF] text-[#0023FF] font-semibold" : "border-gray-200 bg-white text-gray-800"}`}
                />
                {fournisseurNom && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setFournisseurNom(""); setFournisseurId(""); setFournisseurQ(""); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs"
                  >✕</button>
                )}
              </div>
              {fournisseurOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                  {/* Bouton nouveau fournisseur */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setFournisseurOpen(false); setShowNewFournisseur(true); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#0023FF] hover:bg-[#E6EAFF] transition flex items-center gap-2 border-b border-[#B3BFFF]"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#0023FF] text-white text-xs font-black flex items-center justify-center flex-shrink-0">+</span>
                    Nouveau fournisseur
                  </button>
                  {fournisseursFiltres.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400 text-center">Aucun fournisseur trouvé</div>
                  ) : (
                    fournisseursFiltres.map((f) => (
                      <button
                        key={f.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setFournisseurNom(f.nom); setFournisseurId(f.id); setFournisseurQ(f.nom); setFournisseurOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#E6EAFF] hover:text-[#0023FF] transition flex items-center gap-2
                          ${fournisseurNom === f.nom ? "bg-[#E6EAFF] text-[#0023FF] font-semibold" : "text-gray-700"}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-[#E6EAFF] text-[#0023FF] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {f.nom[0].toUpperCase()}
                        </span>
                        {f.nom}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Mini-form nouveau fournisseur */}
              {showNewFournisseur && (
                <MiniForm
                  title="Nouveau Fournisseur"
                  icon="🏭"
                  saving={savingFournisseur}
                  onCancel={() => setShowNewFournisseur(false)}
                  onSave={async ({ nom, contact }) => {
                    setSavingFournisseur(true);
                    try {
                      const created = await clientsService.create({ nom, contact, type: "Fournisseurs" });
                      await reloadFournisseurs();
                      // Le backend enregistre le nom en MAJUSCULES (clients_fournisseurs.nom) :
                      // on réutilise created.nom pour que fournisseur_nom (achat) soit affiché
                      // avec la même casse que dans la liste Clients/Fournisseurs.
                      const nomAffiche = created?.nom || nom.toUpperCase();
                      setFournisseurNom(nomAffiche);
                      setFournisseurId(created?.id || "");
                      setFournisseurQ(nomAffiche);
                      setShowNewFournisseur(false);
                    } finally { setSavingFournisseur(false); }
                  }}
                />
              )}
            </div>
            <Input
              label="Date *"
              type="date"
              value={dateAchat}
              onChange={(e) => setDateAchat(e.target.value)}
            />
          </div>

          {/* Catalogue : toucher un produit pour l'ajouter */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Produits à approvisionner</span>
              <span className="text-xs text-gray-400">{lignesPanier.length} produit(s)</span>
            </div>

            {/* Recherche */}
            <div className="relative mb-2.5">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)}
                placeholder="Rechercher un produit…"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0023FF]/10 focus:border-[#0023FF] focus:bg-white transition" />
              {articleSearch && (
                <button type="button" onClick={() => setArticleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 text-xs">✕</button>
              )}
            </div>

            {/* Grille de produits */}
            {catalogueFiltre.length === 0 ? (
              <div className="py-7 text-center text-sm text-gray-400">Aucun produit trouvé</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pb-0.5">
                {catalogueFiltre.map((a) => {
                  const inCart = lignes.find((l) => l.article_code === a.code)?.quantite || 0;
                  return (
                    <button key={a.code} type="button" onClick={() => addArticleToCart(a)}
                      className={`relative rounded-xl border p-2.5 text-left transition-all duration-150 flex flex-col
                        ${inCart > 0 ? "border-[#0023FF] bg-[#F0F3FF] shadow-sm" : "border-gray-100 bg-white hover:border-[#B3BFFF] hover:bg-[#F7F8FF]"}`}>
                      {inCart > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0023FF] text-white text-[10px] font-black flex items-center justify-center shadow">{inCart}</span>
                      )}
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-1.5 flex items-center justify-center">
                        {a.image_url
                          ? <img src={a.image_url} alt={a.libelle} className="w-full h-full object-cover" />
                          : <span className="text-2xl">📦</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">{a.code}</div>
                      <div className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{a.libelle}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Stock : {a.stock_restant ?? "?"}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panier d'approvisionnement */}
          {lignesPanier.length === 0 ? (
            <div className="mb-4 py-7 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 text-gray-400">
              <div className="text-2xl mb-1">📥</div>
              <span className="text-xs">Touchez un produit ci-dessus pour l'ajouter</span>
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Panier — {lignesPanier.length} produit(s)</span>
                <button type="button" onClick={() => setLignes([])} className="text-[11px] text-red-400 hover:text-red-600 font-semibold">Vider</button>
              </div>
              {lignesPanier.map((l) => (
                <div key={l.id} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      {l.image_url
                        ? <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-base">📦</span>}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{l.libelle}</span>
                    <button type="button" onClick={() => removeLigne(l.id)}
                      className="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 active:scale-95 transition flex items-center justify-center text-xs shrink-0">✕</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                      <button type="button" onClick={() => updateLigne(l.id, "quantite", Math.max(1, (+l.quantite || 0) - 1))}
                        className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 font-bold text-lg active:scale-95 transition flex items-center justify-center">−</button>
                      <input type="number" min="1" inputMode="numeric" value={l.quantite}
                        onChange={(e) => updateLigne(l.id, "quantite", e.target.value)}
                        className="w-10 text-center text-base font-bold bg-transparent border-0 focus:outline-none" />
                      <button type="button" onClick={() => updateLigne(l.id, "quantite", (+l.quantite || 0) + 1)}
                        className="w-8 h-8 rounded-lg bg-[#0023FF] text-white font-bold text-lg active:scale-95 transition flex items-center justify-center">+</button>
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold pointer-events-none">P.A.</span>
                      <input type="number" min="0" inputMode="numeric" value={l.prix_achat}
                        onChange={(e) => updateLigne(l.id, "prix_achat", e.target.value)} placeholder="0"
                        className="w-full text-right text-sm border border-gray-200 rounded-lg pl-10 pr-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#B3BFFF]" />
                    </div>
                    <span className="text-sm font-black text-[#0023FF] w-20 text-right shrink-0">{fmt((+l.prix_achat || 0) * (+l.quantite || 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total & Paiement */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-600">Montant total de la commande</span>
              <span className="text-xl font-black text-[#0023FF]">{fmt(totalCommande)}</span>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Mode de paiement</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setMontantPaye(String(totalCommande))}
                className="text-[13px] px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-bold hover:bg-emerald-200 active:scale-95 transition"
              >
                ✅ Comptant
              </button>
              <button
                type="button"
                onClick={() => setMontantPaye("0")}
                className="text-[13px] px-4 py-2 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200 active:scale-95 transition"
              >
                📋 Crédit total
              </button>
            </div>
            {(() => {
              const saisi = montantPaye === "" ? totalCommande : (parseFloat(montantPaye) || 0);
              const reste = Math.max(0, totalCommande - Math.min(saisi, totalCommande));
              return (
                <Input
                  label={`Montant payé (FCFA) — Reste dû : ${fmt(reste)}`}
                  type="number"
                  min="0"
                  max={totalCommande}
                  value={montantPaye}
                  onChange={(e) => setMontantPaye(e.target.value)}
                  placeholder="Laisser vide = paiement comptant intégral"
                />
              );
            })()}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setShowAdd(false); resetModal(); }}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>
              Enregistrer ({lignes.filter((l) => l.article_code).length} produit{lignes.filter((l) => l.article_code).length > 1 ? "s" : ""})
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal paiement dette ── */}
      {payModal && (
        <Modal title="Payer une dette fournisseur" onClose={() => { setPayModal(null); setPayAmount(""); }}>
          <div className="text-sm text-gray-600 space-y-1 mb-4">
            <p>Article : <strong>{payModal.libelle}</strong> — Fourn. : <strong>{payModal.fournisseur_nom}</strong></p>
            <p>
              Total : <strong>{fmt(payModal.montant_total)}</strong> ·
              Payé : <strong className="text-emerald-600">{fmt(payModal.montant_paye)}</strong> ·
              Reste : <strong className="text-red-600">{fmt(payModal.reste)}</strong>
            </p>
          </div>
          <Input
            label="Montant à payer maintenant (FCFA)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <button
            onClick={() => setPayAmount(String(payModal.reste))}
            className="text-xs text-[#0023FF] underline mt-1"
          >
            Solder la dette ({fmt(payModal.reste)})
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
