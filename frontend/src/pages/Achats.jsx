// src/pages/Achats.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useAchats, useArticles, useClients, useGammes, useMutation, useSortableData } from "../hooks/useApi";
import { achatsService, clientsService } from "../services";
import {
  fmt, fmtN, fmtDate, today, Spinner, ErrorBox, Badge,
  Modal, Input, Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox,
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
          <button disabled={!nom.trim() || saving} onClick={() => onSave({ nom: nom.trim(), contact })}
            className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition disabled:opacity-40">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const GAMME_COLORS = ["purple","teal","blue","orange","pink","indigo"];

/* ─── Ligne de commande ─────────────────────────────── */
function LigneCommande({ ligne, articles, gammes = [], onUpdate, onRemove }) {
  const [search, setSearch]       = useState(ligne.libelle || "");
  const [open, setOpen]           = useState(false);
  const [gammeFilter, setGammeFilter] = useState(""); // "" = tous
  const ref                       = useRef(null);

  // Couleur par gamme
  const gammeColorMap = Object.fromEntries(
    gammes.map((g, i) => [g.code, GAMME_COLORS[i % GAMME_COLORS.length]])
  );

  const suggestions = useMemo(() => {
    let pool = articles;
    if (gammeFilter) pool = pool.filter((a) => a.gamme_code === gammeFilter);
    if (!search.trim() || ligne.article_code) return pool.slice(0, 60);
    const q = search.toLowerCase();
    return pool.filter(
      (a) => a.code.toLowerCase().includes(q) || a.libelle.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [search, articles, gammeFilter, ligne.article_code]);

  // Groupement : gammes en premier, puis standalone
  const grouped = useMemo(() => {
    if (gammeFilter) return [{ type: "list", items: suggestions }];
    const withGamme    = suggestions.filter((a) => a.gamme_code);
    const withoutGamme = suggestions.filter((a) => !a.gamme_code);
    const gammeGroups  = gammes
      .map((g) => ({ type: "gamme", gamme: g, items: withGamme.filter((a) => a.gamme_code === g.code) }))
      .filter((g) => g.items.length > 0);
    const result = [...gammeGroups];
    if (withoutGamme.length > 0) result.push({ type: "standalone", items: withoutGamme });
    return result.length > 0 ? result : [{ type: "list", items: suggestions }];
  }, [suggestions, gammes, gammeFilter]);

  // Infos gamme de l'article sélectionné
  const selectedArticle = ligne.article_code ? articles.find((a) => a.code === ligne.article_code) : null;
  const selectedGamme   = selectedArticle?.gamme_code ? gammes.find((g) => g.code === selectedArticle.gamme_code) : null;

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

  const total = (+ligne.prix_achat || 0) * (+ligne.quantite || 0);
  const color = gammeFilter ? gammeColorMap[gammeFilter] : null;

  return (
    <div className={`rounded-xl p-3 border space-y-2 ${gammeFilter
      ? color === "purple" ? "bg-purple-50 border-purple-200"
      : color === "teal"   ? "bg-teal-50 border-teal-200"
      : color === "blue"   ? "bg-blue-50 border-blue-200"
      : "bg-orange-50 border-orange-200"
      : "bg-gray-50 border-gray-200"}`}>

      {/* Filtre par gamme */}
      {gammes.length > 0 && (
        <div className="flex flex-wrap gap-1 pb-1">
          <button
            type="button"
            onClick={() => setGammeFilter("")}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition
              ${!gammeFilter ? "bg-gray-700 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"}`}
          >Tous</button>
          {gammes.map((g, i) => {
            const c = GAMME_COLORS[i % GAMME_COLORS.length];
            const active = gammeFilter === g.code;
            return (
              <button key={g.code} type="button"
                onClick={() => setGammeFilter(active ? "" : g.code)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition
                  ${active
                    ? c === "purple" ? "bg-purple-500 text-white" : c === "teal" ? "bg-teal-500 text-white" : c === "blue" ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                    : c === "purple" ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : c === "teal" ? "bg-teal-100 text-teal-700 hover:bg-teal-200" : c === "blue" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
              >🗂 {g.nom}</button>
            );
          })}
        </div>
      )}

      {/* Ligne 1 : Article + supprimer */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative" ref={ref}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Article *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white pr-8"
            placeholder="Rechercher par code ou nom…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); onUpdate({ ...ligne, article_code: "", libelle: "" }); }}
            onFocus={() => setOpen(true)}
          />
          <span
            className="absolute right-3 top-8 text-gray-400 cursor-pointer select-none"
            onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
          >▾</span>

          {open && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  {/* En-tête de groupe gamme */}
                  {group.type === "gamme" && (
                    <div className="sticky top-0 px-3 py-1.5 bg-purple-50 border-b border-purple-100 flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">🗂 {group.gamme.nom}</span>
                      <span className="text-[10px] text-purple-400">— stock partagé</span>
                    </div>
                  )}
                  {group.type === "standalone" && grouped.some((g) => g.type === "gamme") && (
                    <div className="sticky top-0 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Articles individuels</span>
                    </div>
                  )}
                  {group.items.length === 0 && group.type !== "list" ? null : group.items.map((a) => (
                    <div
                      key={a.code}
                      onMouseDown={() => selectArticle(a)}
                      className="px-3 py-2 cursor-pointer hover:bg-orange-50 text-sm flex justify-between items-center gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-orange-600 shrink-0">{a.code}</span>
                        <span className="text-gray-700 truncate">{a.libelle}</span>
                        {a.gamme_code && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 shrink-0">
                            ×{a.unite_par_base}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">Stock: {a.stock_restant ?? "?"}</span>
                    </div>
                  ))}
                </div>
              ))}
              {grouped.every((g) => g.items.length === 0) && (
                <div className="px-3 py-3 text-xs text-gray-400 text-center">Aucun article trouvé</div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="w-8 h-8 mb-0.5 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition shrink-0"
          title="Supprimer cette ligne"
        >✕</button>
      </div>

      {/* Info gamme si article sélectionné appartient à une gamme */}
      {selectedGamme && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-purple-50 rounded-lg border border-purple-100 text-xs text-purple-700">
          <span className="font-bold">🗂 {selectedGamme.nom}</span>
          <span className="text-purple-400">·</span>
          <span>×{selectedArticle.unite_par_base} unité(s) de base par article</span>
          <span className="text-purple-400">·</span>
          <span>Stock actuel : {selectedArticle.stock_restant}</span>
        </div>
      )}

      {/* Ligne 2 : Quantité + Prix unitaire + Total */}
      <div className="grid grid-cols-3 gap-2 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Quantité *</label>
          <input
            type="number" min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            value={ligne.quantite}
            onChange={(e) => onUpdate({ ...ligne, quantite: e.target.value })}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">P.U. (FCFA) *</label>
          <input
            type="number" min="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            value={ligne.prix_achat}
            onChange={(e) => onUpdate({ ...ligne, prix_achat: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg py-2 px-1 border border-orange-100">
          <span className="text-xs text-orange-500 font-bold uppercase">Total</span>
          <span className="text-sm font-black text-orange-700">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ───────────────────────────────── */
export default function Achats() {
  const { data: achats = [], loading, error, reload } = useAchats();
  const { data: articles = [] }     = useArticles();
  const { data: gammes = [] }       = useGammes();
  const { data: fournisseurs = [], reload: reloadFournisseurs } = useClients("Fournisseurs");
  const { mutate: createAchat, loading: saving } = useMutation(achatsService.create);
  const { mutate: payAchat }        = useMutation(achatsService.updatePaiement);

  /* ── État modal ── */
  const [showAdd, setShowAdd]   = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [toast, setToast]       = useState(null);
  const [searchTable, setSearchTable] = useState("");
  const [showGammePanel,  setShowGammePanel]  = useState(false);
  const [gammeSelectee,   setGammeSelectee]   = useState(null);
  const [gammeQteBase,    setGammeQteBase]    = useState("");
  const [gammePrixBase,   setGammePrixBase]   = useState("");

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

  const fournisseursFiltres = fournisseurQ.trim()
    ? fournisseurs.filter((f) => f.nom.toLowerCase().includes(fournisseurQ.toLowerCase()))
    : fournisseurs;

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const totalCommande = lignes.reduce((s, l) => s + (+l.prix_achat || 0) * (+l.quantite || 0), 0);
  const totalDepenses = achats.reduce((s, a) => s + parseFloat(a.montant_total || 0), 0);
  const totalDettes   = achats.reduce((s, a) => s + parseFloat(a.reste || 0), 0);

  const resetModal = () => {
    setLignes([emptyLigne()]);
    setFournisseurNom("");
    setFournisseurId("");
    setFournisseurQ("");
    setDateAchat(today());
    setMontantPaye("");
    setShowGammePanel(false);
    setGammeSelectee(null);
    setGammeQteBase("");
    setGammePrixBase("");
  };

  /* ── Ravitaillement rapide : 1 ligne pour l'article de référence ── */
  const addGammeRapide = () => {
    if (!gammeSelectee || !gammeQteBase) return;
    // Article de référence = celui avec le plus petit unite_par_base (idéalement 1)
    const ref = articles
      .filter((a) => a.gamme_code === gammeSelectee.code)
      .sort((a, b) => (a.unite_par_base || 1) - (b.unite_par_base || 1))[0];
    if (!ref) return;
    const upb      = ref.unite_par_base || 1;
    const qteBase  = parseFloat(gammeQteBase)  || 0;
    const prixBase = parseFloat(gammePrixBase) || 0;
    const quantite   = Math.round(qteBase * upb);
    const prix_achat = upb > 0 ? Math.round(prixBase / upb) : prixBase;
    const lignesNonVides = lignes.filter((l) => l.article_code);
    setLignes([...lignesNonVides, {
      id: Date.now() + Math.random(),
      article_code: ref.code,
      libelle: ref.libelle,
      quantite: String(quantite),
      prix_achat: String(prix_achat),
    }]);
    setShowGammePanel(false);
    setGammeSelectee(null);
    setGammeQteBase("");
    setGammePrixBase("");
  };

  /* ── Enregistrement multi-produits ── */
  const handleSave = async () => {
    const valides = lignes.filter((l) => l.article_code && l.quantite && l.prix_achat);
    if (valides.length === 0)
      return notify("Ajoutez au moins un article complet.", "error");
    if (!fournisseurNom)
      return notify("Veuillez sélectionner un fournisseur.", "error");

    const paye = montantPaye === "" ? totalCommande : parseFloat(montantPaye);
    if (paye > totalCommande)
      return notify("Le montant payé ne peut pas dépasser le total.", "error");

    // Répartir le paiement proportionnellement sur chaque ligne
    const results = [];
    let errors = [];
    for (let i = 0; i < valides.length; i++) {
      const l = valides[i];
      const ligneMontant = (+l.prix_achat) * (+l.quantite);
      const lignePaye = totalCommande > 0
        ? Math.round((ligneMontant / totalCommande) * paye)
        : ligneMontant;
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
    reload();
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
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  /* ── Filtrage + tri du tableau principal ── */
  const achatsFiltres = useMemo(() => {
    if (!searchTable.trim()) return achats;
    const q = searchTable.toLowerCase();
    return achats.filter(
      (a) =>
        (a.libelle || "").toLowerCase().includes(q) ||
        (a.fournisseur_nom || "").toLowerCase().includes(q) ||
        (a.article_code || "").toLowerCase().includes(q)
    );
  }, [achats, searchTable]);

  const { sorted: achatsAffichés, sortKey, sortDir, handleSort } = useSortableData(achatsFiltres, "date_achat", "asc");
  const sortState = { key: sortKey, dir: sortDir };

  return (
    <div>
      <PageHeader
        title="Approvisionnements"
        sub={`Total dépensé : ${fmt(totalDepenses)}${totalDettes > 0 ? ` · Dettes : ${fmt(totalDettes)}` : ""}`}
        action={<Btn onClick={() => { resetModal(); setShowAdd(true); }}>+ Nouvel Approvisionnement</Btn>}
      />

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
              { label: "Article",     sortKey: "libelle",         w: "22%" },
              { label: "Fournisseur", sortKey: "fournisseur_nom", w: "13%" },
              { label: "Qté",   sortKey: "quantite",      right: true, w: "6%" },
              { label: "P.U.",  sortKey: "prix_achat",    right: true, w: "9%" },
              { label: "Total", sortKey: "montant_total", right: true, w: "10%" },
              { label: "Payé",  sortKey: "montant_paye",  right: true, w: "10%" },
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
                <TD bold>{a.libelle}</TD>
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
                <TD><Badge color={a.statut ? "emerald" : "orange"}>{a.statut ? "Payé" : "Crédit"}</Badge></TD>
                <TD>
                  {!a.statut && parseFloat(a.reste) > 0 && (
                    <Btn sm color="orange" onClick={() => { setPayModal(a); setPayAmount(String(a.reste)); }}>
                      Payer
                    </Btn>
                  )}
                </TD>
              </TR>
            ))}
          </DataTable>
        )}
      </div>

      {/* ── Modal Nouvel Approvisionnement ── */}
      {showAdd && (
        <Modal
          title="🚚 Nouvel Approvisionnement"
          onClose={() => { setShowAdd(false); resetModal(); }}
          wide
        >
          {/* Infos communes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2 relative">
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
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition
                    ${fournisseurNom ? "border-orange-300 bg-orange-50 text-orange-700 font-semibold" : "border-gray-200 bg-white text-gray-800"}`}
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
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50 transition flex items-center gap-2 border-b border-orange-100"
                  >
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0">+</span>
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
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-orange-700 transition flex items-center gap-2
                          ${fournisseurNom === f.nom ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-700"}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
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
                      setFournisseurNom(nom);
                      setFournisseurId(created?.id || "");
                      setFournisseurQ(nom);
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

          {/* Lignes de produits */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500 uppercase">Produits à approvisionner</span>
              <span className="text-xs text-gray-400">{lignes.length} ligne(s)</span>
            </div>
            {lignes.map((ligne) => (
              <LigneCommande
                key={ligne.id}
                ligne={ligne}
                articles={articles}
                gammes={gammes}
                onUpdate={(updated) => setLignes(lignes.map((l) => l.id === ligne.id ? updated : l))}
                onRemove={() => lignes.length > 1 && setLignes(lignes.filter((l) => l.id !== ligne.id))}
              />
            ))}
          </div>

          {/* Boutons ajouter */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLignes([...lignes, emptyLigne()])}
              className="flex-1 py-2 border-2 border-dashed border-orange-200 rounded-xl text-orange-500 text-sm font-bold hover:bg-orange-50 transition"
            >
              + Ajouter un produit
            </button>
            {gammes.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowGammePanel((v) => !v); setGammeSelectee(null); setGammeQteBase(""); setGammePrixBase(""); }}
                  className={`py-2 px-4 border-2 rounded-xl text-sm font-bold transition
                    ${showGammePanel
                      ? "border-purple-400 bg-purple-500 text-white"
                      : "border-dashed border-purple-300 text-purple-600 hover:bg-purple-50"}`}
                >
                  🗂 Gamme rapide
                </button>

                {showGammePanel && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-purple-200 rounded-xl shadow-lg overflow-hidden"
                    style={{ width: 280 }}>

                    {/* Étape 1 — choisir la gamme */}
                    {!gammeSelectee && (<>
                      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
                        <p className="text-xs font-black text-purple-700">Choisir une gamme</p>
                        <p className="text-[10px] text-purple-400">1 seule opération pour toute la famille</p>
                      </div>
                      {gammes.map((g) => {
                        const variantes = articles.filter((a) => a.gamme_code === g.code);
                        return (
                          <button key={g.code}
                            onClick={() => { setGammeSelectee(g); setGammePrixBase(""); setGammeQteBase(""); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-purple-50 transition flex items-center justify-between border-b border-gray-50 last:border-0">
                            <span className="text-sm font-bold text-gray-800">{g.nom}</span>
                            <span className="text-xs text-purple-400 font-semibold">{variantes.length} variante{variantes.length > 1 ? "s" : ""} →</span>
                          </button>
                        );
                      })}
                    </>)}

                    {/* Étape 2 — saisir qté et prix en base */}
                    {gammeSelectee && (() => {
                      const ref = articles
                        .filter((a) => a.gamme_code === gammeSelectee.code)
                        .sort((a, b) => (a.unite_par_base || 1) - (b.unite_par_base || 1))[0];
                      const upb = ref?.unite_par_base || 1;
                      const qte = parseFloat(gammeQteBase) || 0;
                      const px  = parseFloat(gammePrixBase) || 0;
                      const total = qte * px;
                      return (
                        <div className="p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setGammeSelectee(null)}
                              className="text-purple-400 hover:text-purple-600 text-lg leading-none">‹</button>
                            <div>
                              <p className="text-xs font-black text-purple-800">{gammeSelectee.nom}</p>
                              <p className="text-[10px] text-purple-400">Réf. : {ref?.libelle} (×{upb})</p>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Quantité reçue (unités de base)</label>
                            <input autoFocus type="number" min="1" value={gammeQteBase}
                              onChange={(e) => setGammeQteBase(e.target.value)}
                              placeholder="ex: 10"
                              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Prix par unité de base (FCFA)</label>
                            <input type="number" min="0" value={gammePrixBase}
                              onChange={(e) => setGammePrixBase(e.target.value)}
                              placeholder="ex: 5000"
                              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                          {total > 0 && (
                            <div className="text-center py-1 bg-purple-50 rounded-lg text-xs font-black text-purple-700">
                              Total : {fmt(total)}
                            </div>
                          )}
                          <button
                            onClick={addGammeRapide}
                            disabled={!gammeQteBase || parseFloat(gammeQteBase) <= 0}
                            className="w-full py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-40 transition">
                            Ajouter cette gamme
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total & Paiement */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-600">Montant total de la commande</span>
              <span className="text-2xl font-black text-orange-700">{fmt(totalCommande)}</span>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Mode de paiement</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setMontantPaye(String(totalCommande))}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold hover:bg-emerald-200"
              >
                ✅ Comptant
              </button>
              <button
                type="button"
                onClick={() => setMontantPaye("0")}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200"
              >
                📋 Crédit total
              </button>
            </div>
            <Input
              label={`Montant payé (FCFA) — Reste : ${fmt(totalCommande - Math.min(+(montantPaye) || totalCommande, totalCommande))}`}
              type="number"
              value={montantPaye}
              onChange={(e) => setMontantPaye(e.target.value)}
              placeholder={`${totalCommande} (comptant par défaut)`}
            />
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
            className="text-xs text-orange-600 underline mt-1"
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
