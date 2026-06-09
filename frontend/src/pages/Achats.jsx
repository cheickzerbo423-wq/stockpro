// src/pages/Achats.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useAchats, useArticles, useClients, useMutation, useSortableData } from "../hooks/useApi";
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone</label>
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
          <button disabled={!nom.trim() || saving} onClick={() => onSave({ nom: nom.trim(), contact })}
            className="flex-1 py-2 rounded-xl bg-[#0023FF] text-white text-sm font-bold hover:bg-[#0023FF] transition disabled:opacity-40">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Ligne de commande ─────────────────────────────── */
function LigneCommande({ ligne, articles, onUpdate, onRemove }) {
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

  const total = (+ligne.prix_achat || 0) * (+ligne.quantite || 0);

  return (
    <div className="rounded-xl p-3 border bg-gray-50 border-gray-200 space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative" ref={ref}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Article *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] bg-white pr-8"
            placeholder="Rechercher par code ou nom…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); onUpdate({ ...ligne, article_code: "", libelle: "" }); }}
            onFocus={() => setOpen(true)}
          />
          <span className="absolute right-3 top-8 text-gray-400 cursor-pointer select-none"
            onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}>▾</span>

          {open && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {suggestions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-400 text-center">Aucun article trouvé</div>
              ) : suggestions.map((a) => (
                <div key={a.code} onMouseDown={() => selectArticle(a)}
                  className="px-3 py-2 cursor-pointer hover:bg-[#E6EAFF] text-sm flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[#0023FF] shrink-0">{a.code}</span>
                    <span className="text-gray-700 truncate">{a.libelle}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">Stock: {a.stock_restant ?? "?"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onRemove}
          className="w-8 h-8 mb-0.5 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition shrink-0"
          title="Supprimer">✕</button>
      </div>

      <div className="grid grid-cols-3 gap-2 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Quantité *</label>
          <input type="number" min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] bg-white"
            value={ligne.quantite} onChange={(e) => onUpdate({ ...ligne, quantite: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">P.U. (FCFA) *</label>
          <input type="number" min="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B3BFFF] bg-white"
            value={ligne.prix_achat} onChange={(e) => onUpdate({ ...ligne, prix_achat: e.target.value })} placeholder="0" />
        </div>
        <div className="flex flex-col items-center justify-center bg-[#E6EAFF] rounded-lg py-2 px-1 border border-[#B3BFFF]">
          <span className="text-xs text-[#0023FF] font-bold uppercase">Total</span>
          <span className="text-sm font-black text-[#0023FF]">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ───────────────────────────────── */
export default function Achats() {
  const { data: achats = [], loading, error, reload } = useAchats();
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
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

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
  const nbAchats      = achats.length;
  const nbFournisseursActifs = new Set(achats.map((a) => a.fournisseur_nom).filter(Boolean)).size;

  const resetModal = () => {
    setLignes([emptyLigne()]);
    setFournisseurNom("");
    setFournisseurId("");
    setFournisseurQ("");
    setDateAchat(today());
    setMontantPaye("");
  };

  /* ── Scan de facture (OCR) : photo → texte → proposition de remplissage ──
     L'image est redimensionnée/compressée côté client (le serveur reste léger
     et rapide), puis analysée par le backend (Tesseract OCR). Le résultat
     PRÉ-REMPLIT le formulaire ci-dessous pour vérification — rien n'est jamais
     enregistré automatiquement, l'utilisateur garde la main sur "Enregistrer". */
  const resizeImageBase64 = (file, maxDim = 1600, quality = 0.82) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Image illisible."));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  const handleScanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de reprendre la même photo si besoin
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return notify("Sélectionnez une photo de la facture (image).", "error");

    setScanning(true);
    try {
      const base64 = await resizeImageBase64(file);
      const r = await achatsService.scanFacture(base64);

      resetModal();
      if (r.fournisseur_nom) {
        setFournisseurNom(r.fournisseur_nom);
        setFournisseurQ(r.fournisseur_nom);
        const connu = fournisseurs.find((f) => f.nom.toLowerCase() === r.fournisseur_nom.toLowerCase());
        if (connu) setFournisseurId(connu.id);
      }
      if (r.date_achat) setDateAchat(r.date_achat);
      if (r.lignes?.length > 0) {
        setLignes(r.lignes.map((l) => ({
          id: Date.now() + Math.random(),
          article_code: "",
          libelle: l.libelle || "",
          quantite: l.quantite ? String(l.quantite) : "",
          prix_achat: l.prix_achat ? String(l.prix_achat) : "",
        })));
      }
      setShowAdd(true);
      notify(
        `📷 ${r.message || "Facture analysée."} Chaque article doit être associé à un produit du catalogue.`,
        r.lignes?.length > 0 ? "success" : "info"
      );
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Erreur lors de l'analyse de la facture.", "error");
    } finally {
      setScanning(false);
    }
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
        sub={`${nbAchats} ligne(s) · Total dépensé : ${fmt(totalDepenses)}`}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Btn color="orange-light" icon="📷" loading={scanning} onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto">
              {scanning ? "Analyse en cours…" : "Scanner une facture"}
            </Btn>
            <Btn onClick={() => { resetModal(); setShowAdd(true); }} className="w-full sm:w-auto">
              + Nouvel Approvisionnement
            </Btn>
          </div>
        }
      />
      {/* Capture photo masquée — déclenchée par le bouton "Scanner une facture" */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleScanFile}
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
            <div className={`text-base md:text-xl font-black ${k.color} truncate`}>{k.value}</div>
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
                onUpdate={(updated) => setLignes(lignes.map((l) => l.id === ligne.id ? updated : l))}
                onRemove={() => lignes.length > 1 && setLignes(lignes.filter((l) => l.id !== ligne.id))}
              />
            ))}
          </div>

          {/* Boutons ajouter */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLignes([...lignes, emptyLigne()])}
              className="flex-1 py-2 border-2 border-dashed border-[#B3BFFF] rounded-xl text-[#0023FF] text-sm font-bold hover:bg-[#E6EAFF] transition"
            >
              + Ajouter un produit
            </button>
          </div>

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
