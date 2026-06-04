// src/pages/Articles.jsx
import { useState, useEffect, useRef } from "react";
import { useArticles, useGammes, useMutation, useSortableData } from "../hooks/useApi";
import { articlesService, gammesService } from "../services";
import {
  fmt, fmtN, Spinner, ErrorBox, Badge, Modal,
  Input, Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox,
} from "../components/UI";

export default function Articles() {
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [editForm, setEditForm]   = useState({ libelle: "", prix_achat: "", prix_vente: "", stock_min: "", gamme_code: "", unite_par_base: "1" });
  const [showGammes, setShowGammes] = useState(false);
  const [showAddGamme, setShowAddGamme] = useState(false);
  const [gammeForm, setGammeForm] = useState({ code: "", nom: "" });
  const [renameGamme, setRenameGamme] = useState(null); // { code, nom }
  const [renameVal, setRenameVal]     = useState("");
  const [toast, setToast]         = useState(null);
  const [form, setForm]           = useState({ code: "", libelle: "", prix_achat: "", prix_vente: "", stock_min: "5", gamme_code: "", unite_par_base: "1" });
  const [formErr, setFormErr]     = useState({});
  const [codeAuto, setCodeAuto]   = useState(true);
  const [loadingCode, setLoadingCode] = useState(false);
  const debounceRef = useRef(null);

  const { data: articles = [], loading, error, reload }   = useArticles(search);
  const { data: gammes = [],   reload: reloadGammes }     = useGammes();
  const { sorted: articlesTries, sortKey, sortDir, handleSort } = useSortableData(articles, "libelle", "asc");
  const { mutate: createArticle, loading: saving }        = useMutation(articlesService.create);
  const { mutate: updateArticle, loading: updating }      = useMutation(articlesService.update);
  const { mutate: deleteArticle }                         = useMutation(articlesService.delete);
  const { mutate: createGamme,  loading: savingGamme }   = useMutation(gammesService.create);
  const { mutate: renameGammeMut, loading: renamingGamme } = useMutation((code, nom) => gammesService.rename(code, nom));
  const { mutate: deleteGamme }                           = useMutation(gammesService.delete);

  /* ── Auto-génération code gamme depuis le nom ── */
  useEffect(() => {
    if (!gammeForm.nom.trim()) return;
    const auto = gammeForm.nom.replace(/[^a-zA-ZÀ-ÿ]/g, "").toUpperCase().slice(0, 4).padEnd(2, "X");
    setGammeForm((f) => ({ ...f, code: auto }));
  }, [gammeForm.nom]); // eslint-disable-line

  /* ── Auto-génération du code ── */
  useEffect(() => {
    if (!codeAuto || !form.libelle.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingCode(true);
      try {
        const { code } = await articlesService.generateCode(form.libelle);
        setForm((f) => ({ ...f, code }));
      } catch { /* silencieux */ }
      finally { setLoadingCode(false); }
    }, 400);
  }, [form.libelle]);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const errs = {};
    if (!form.code.trim())    errs.code    = "Code requis";
    if (!form.libelle.trim()) errs.libelle = "Libellé requis";
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await createArticle({
        ...form,
        gamme_code:     form.gamme_code     || null,
        unite_par_base: form.gamme_code ? parseInt(form.unite_par_base) || 1 : 1,
      });
      notify("Article créé avec succès !");
      setShowAdd(false);
      setForm({ code: "", libelle: "", prix_achat: "", prix_vente: "", stock_min: "5", gamme_code: "", unite_par_base: "1" });
      setCodeAuto(true);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const openEdit = (a) => {
    setEditArticle(a);
    setEditForm({
      libelle:        a.libelle,
      prix_achat:     a.prix_achat,
      prix_vente:     a.prix_vente,
      stock_min:      a.stock_min,
      gamme_code:     a.gamme_code || "",
      unite_par_base: String(a.unite_par_base || 1),
    });
  };

  const handleUpdate = async () => {
    if (!editForm.libelle.trim()) return notify("Le libellé est requis.", "error");
    try {
      await updateArticle(editArticle.code, {
        ...editForm,
        gamme_code:     editForm.gamme_code     || null,
        unite_par_base: editForm.gamme_code ? parseInt(editForm.unite_par_base) || 1 : 1,
      });
      notify("Article mis à jour !");
      setEditArticle(null);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Supprimer l'article ${code} ?`)) return;
    try {
      await deleteArticle(code);
      notify("Article supprimé.");
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleSaveGamme = async () => {
    if (!gammeForm.code.trim() || !gammeForm.nom.trim())
      return notify("Code et nom sont requis.", "error");
    try {
      await createGamme(gammeForm);
      notify("Gamme créée !");
      setShowAddGamme(false);
      setGammeForm({ code: "", nom: "" });
      reloadGammes();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleDeleteGamme = async (code) => {
    if (!window.confirm(`Supprimer la gamme ${code} ?`)) return;
    try {
      await deleteGamme(code);
      notify("Gamme supprimée.");
      reloadGammes();
    } catch (err) { notify(err.message, "error"); }
  };

  const openRename = (g) => { setRenameGamme(g); setRenameVal(g.nom); };

  const handleRenameGamme = async () => {
    if (!renameVal.trim()) return notify("Nom requis.", "error");
    try {
      await renameGammeMut(renameGamme.code, renameVal);
      notify("Gamme renommée !");
      setRenameGamme(null);
      reloadGammes();
    } catch (err) { notify(err.message, "error"); }
  };

  const totalValeur = articles.reduce((s, a) => s + (parseFloat(a.valeur_stock) || 0), 0);
  const sortState   = { key: sortKey, dir: sortDir };

  /* ── Couleurs par gamme ── */
  const GAMME_COLORS = ["blue","purple","teal","orange","pink","indigo","green","amber"];
  const gammeColorMap = Object.fromEntries(
    gammes.map((g, i) => [g.code, GAMME_COLORS[i % GAMME_COLORS.length]])
  );

  return (
    <div>
      <PageHeader
        title="Articles & Stock"
        sub={`${articles.length} article(s) — Valeur totale du stock : ${fmt(totalValeur)}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowGammes(v => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition
                ${showGammes ? "bg-purple-500 text-white border-purple-500" : "bg-white border-gray-200 text-gray-600 hover:border-purple-300"}`}
            >
              🗂 Gammes {gammes.length > 0 && <span className="ml-1 opacity-70">({gammes.length})</span>}
            </button>
            <Btn onClick={() => setShowAdd(true)}>+ Nouvel Article</Btn>
          </div>
        }
      />

      {/* ── Panneau Gammes ── */}
      {showGammes && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm mb-5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-800">Gammes de produits</h3>
            <button
              onClick={() => setShowAddGamme(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition"
            >+ Nouvelle gamme</button>
          </div>
          {gammes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              Aucune gamme. Créez-en une pour regrouper des variantes (ex : Rondelle 15L / 5L / 2,5L).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {gammes.map((g) => {
                const artsDansGamme = articles.filter(a => a.gamme_code === g.code);
                return (
                  <div key={g.code} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100">
                    <div>
                      <span className="text-xs font-black text-purple-700">{g.nom}</span>
                      <span className="ml-2 text-[10px] font-mono text-purple-400">{g.code}</span>
                      <span className="ml-2 text-[10px] text-gray-400">{artsDansGamme.length} variante(s)</span>
                    </div>
                      <button
                      onClick={() => openRename(g)}
                      className="text-gray-300 hover:text-purple-500 text-xs ml-1"
                      title="Renommer"
                    >✎</button>
                    <button
                      onClick={() => handleDeleteGamme(g.code)}
                      className="text-gray-300 hover:text-red-400 text-xs ml-1"
                      title="Supprimer"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-700">
            <strong>Comment ça marche :</strong> Créez une gamme (ex : "RONDELLE"), puis assignez vos variantes (15L, 5L, 2,5L) à cette gamme.
            Définissez pour chaque variante combien d'unités de cette variante équivaut à 1 unité de base.
            Le stock est automatiquement partagé entre toutes les variantes.
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="mb-4">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par code ou libellé…"
          suggestions={articles.map(a => ({ label: a.libelle, sub: `Code : ${a.code} — Stock : ${a.stock_restant}` }))}
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <DataTable
            headers={[
              { label: "Code",         sortKey: "code",          w: "7%" },
              { label: "Libellé",      sortKey: "libelle",       w: "20%" },
              { label: "Gamme",        sortKey: "gamme_code",    w: "8%" },
              { label: "Prix Achat",   sortKey: "prix_achat",    right: true, w: "8%" },
              { label: "Prix Vente",   sortKey: "prix_vente",    right: true, w: "8%" },
              { label: "Entrées",      sortKey: "entree",        right: true, w: "7%" },
              { label: "Sorties",      sortKey: "sortie",        right: true, w: "7%" },
              { label: "Stock",        sortKey: "stock_restant", right: true, w: "7%" },
              { label: "Statut",       sortKey: "statut",        w: "9%" },
              { label: "Valeur Stock", sortKey: "valeur_stock",  right: true, w: "12%" },
              { label: "", w: "7%" },
            ]}
            sort={sortState} onSort={handleSort}
            empty="Aucun article trouvé."
          >
            {articlesTries.map((a) => {
              const stock = parseInt(a.stock_restant) || 0;
              const color = a.gamme_code ? gammeColorMap[a.gamme_code] : null;
              return (
                <TR key={a.code}>
                  <TD><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{a.code}</span></TD>
                  <TD bold>{a.libelle}</TD>
                  <TD>
                    {a.gamme_code ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${color === "blue"   ? "bg-blue-100 text-blue-700"     :
                          color === "purple" ? "bg-purple-100 text-purple-700" :
                          color === "teal"   ? "bg-teal-100 text-teal-700"     :
                          color === "orange" ? "bg-orange-100 text-orange-700" :
                                              "bg-gray-100 text-gray-600"}`}>
                        🗂 {a.gamme_code}
                        <span className="opacity-60 font-normal">×{a.unite_par_base}</span>
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </TD>
                  <TD right>{fmt(a.prix_achat)}</TD>
                  <TD right>{fmt(a.prix_vente)}</TD>
                  <TD right>{fmtN(a.entree)}</TD>
                  <TD right>{fmtN(a.sortie)}</TD>
                  <TD right>
                    <span className={`font-bold ${stock <= 0 ? "text-red-600" : stock <= parseInt(a.stock_min) ? "text-amber-600" : "text-emerald-600"}`}>
                      {fmtN(stock)}
                    </span>
                  </TD>
                  <TD>
                    <Badge color={stock > 0 ? (stock <= parseInt(a.stock_min) ? "orange" : "emerald") : "red"}>
                      {a.statut}
                    </Badge>
                  </TD>
                  <TD right bold>{fmt(a.valeur_stock)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-[#0023FF] transition" title="Modifier">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(a.code)} className="text-red-400 hover:text-red-600 text-xs font-bold" title="Supprimer">✕</button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </DataTable>
        )}
      </div>

      {/* ── Modal Nouvel Article ── */}
      {showAdd && (
        <Modal title="Nouvel Article" onClose={() => { setShowAdd(false); setCodeAuto(true); }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Libellé *" value={form.libelle}
                onChange={(e) => { setForm({ ...form, libelle: e.target.value }); setCodeAuto(true); }}
                placeholder="Nom du produit" error={formErr.libelle} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Code Article *
                {codeAuto && <span className="ml-2 text-[#0023FF] font-normal">{loadingCode ? "⏳ génération…" : "✦ auto-généré"}</span>}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#B3BFFF]
                    ${codeAuto ? "bg-[#E6EAFF] border-[#B3BFFF] text-[#0023FF]" : "bg-white border-gray-200 text-gray-900"}
                    ${formErr.code ? "border-red-400" : ""}`}
                  value={form.code}
                  onChange={(e) => { setCodeAuto(false); setForm({ ...form, code: e.target.value.toUpperCase() }); }}
                  placeholder="BIS001"
                />
                <button type="button" title="Regénérer"
                  onClick={async () => {
                    if (!form.libelle.trim()) return;
                    setLoadingCode(true); setCodeAuto(true);
                    try { const { code } = await articlesService.generateCode(form.libelle); setForm((f) => ({ ...f, code })); }
                    catch { /* silencieux */ } finally { setLoadingCode(false); }
                  }}
                  className="px-2 py-2 rounded-lg bg-[#E6EAFF] text-[#0023FF] hover:bg-[#D0D6FF] text-sm"
                >↺</button>
              </div>
              {formErr.code && <p className="text-xs text-red-500 mt-1">{formErr.code}</p>}
            </div>
            <Input label="Stock Minimum (alerte)" type="number" value={form.stock_min}
              onChange={(e) => setForm({ ...form, stock_min: e.target.value })} />
            <Input label="Prix d'Achat (FCFA)" type="number" value={form.prix_achat}
              onChange={(e) => setForm({ ...form, prix_achat: e.target.value })} />
            <Input label="Prix de Vente (FCFA)" type="number" value={form.prix_vente}
              onChange={(e) => setForm({ ...form, prix_vente: e.target.value })} />

            {/* Section gamme */}
            <div className="col-span-full border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Gamme (optionnel)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Gamme</label>
                  <select
                    value={form.gamme_code}
                    onChange={(e) => setForm({ ...form, gamme_code: e.target.value, unite_par_base: "1" })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="">— Aucune gamme —</option>
                    {gammes.map((g) => <option key={g.code} value={g.code}>{g.nom} ({g.code})</option>)}
                  </select>
                </div>
                {form.gamme_code && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      1 unité de base = combien de cet article ?
                    </label>
                    <input type="number" min="1" step="1"
                      value={form.unite_par_base}
                      onChange={(e) => setForm({ ...form, unite_par_base: e.target.value })}
                      className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-purple-50"
                      placeholder="ex: 3"
                    />
                    <p className="text-[10px] text-purple-500 mt-1">
                      Ex : si la base est 15L et ceci est un 5L → saisir 3
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setShowAdd(false); setCodeAuto(true); }}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Modifier Article ── */}
      {editArticle && (
        <Modal title={`Modifier — ${editArticle.code}`} onClose={() => setEditArticle(null)}>
          <div className="mb-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 font-mono">
            Code : <strong className="text-gray-800">{editArticle.code}</strong>
            <span className="ml-3 text-gray-400">(non modifiable)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Libellé *" value={editForm.libelle}
                onChange={(e) => setEditForm({ ...editForm, libelle: e.target.value.toUpperCase() })} />
            </div>
            <Input label="Prix d'Achat (FCFA)" type="number" value={editForm.prix_achat}
              onChange={(e) => setEditForm({ ...editForm, prix_achat: e.target.value })} />
            <Input label="Prix de Vente (FCFA)" type="number" value={editForm.prix_vente}
              onChange={(e) => setEditForm({ ...editForm, prix_vente: e.target.value })} />
            <div className="col-span-2">
              <Input label="Stock Minimum (seuil alerte)" type="number" value={editForm.stock_min}
                onChange={(e) => setEditForm({ ...editForm, stock_min: e.target.value })} />
            </div>

            {/* Gamme */}
            <div className="col-span-full border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Gamme</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Gamme</label>
                  <select
                    value={editForm.gamme_code}
                    onChange={(e) => setEditForm({ ...editForm, gamme_code: e.target.value, unite_par_base: "1" })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="">— Aucune gamme —</option>
                    {gammes.map((g) => <option key={g.code} value={g.code}>{g.nom} ({g.code})</option>)}
                  </select>
                </div>
                {editForm.gamme_code && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      1 unité de base = combien de cet article ?
                    </label>
                    <input type="number" min="1" step="1"
                      value={editForm.unite_par_base}
                      onChange={(e) => setEditForm({ ...editForm, unite_par_base: e.target.value })}
                      className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-purple-50"
                    />
                    <p className="text-[10px] text-purple-500 mt-1">
                      Ex : si la base est 15L et ceci est un 5L → saisir 3
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setEditArticle(null)}>Annuler</Btn>
            <Btn onClick={handleUpdate} loading={updating}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Nouvelle Gamme ── */}
      {showAddGamme && (
        <Modal title="Nouvelle Gamme" onClose={() => { setShowAddGamme(false); setGammeForm({ code: "", nom: "" }); }}>
          <div className="space-y-3">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-700">
              Une gamme regroupe des variantes du même produit (ex : Rondelle 15L, 5L, 2,5L).
              Le stock est partagé entre toutes les variantes.
            </div>
            <Input label="Nom de la gamme *" value={gammeForm.nom}
              onChange={(e) => setGammeForm({ ...gammeForm, nom: e.target.value.toUpperCase() })}
              placeholder="ex: RONDELLE" />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Code gamme * <span className="text-purple-500 font-normal">✦ auto-généré</span>
              </label>
              <input
                className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm font-mono bg-purple-50 text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={gammeForm.code}
                onChange={(e) => setGammeForm({ ...gammeForm, code: e.target.value.toUpperCase() })}
                placeholder="ex: ROND"
              />
              <p className="text-[10px] text-gray-400 mt-1">Modifiable si nécessaire.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setShowAddGamme(false); setGammeForm({ code: "", nom: "" }); }}>Annuler</Btn>
            <Btn onClick={handleSaveGamme} loading={savingGamme}>Créer la gamme</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Renommer Gamme ── */}
      {renameGamme && (
        <Modal title={`Renommer — ${renameGamme.code}`} onClose={() => setRenameGamme(null)}>
          <div className="space-y-3">
            <Input label="Nouveau nom *" value={renameVal}
              onChange={(e) => setRenameVal(e.target.value.toUpperCase())}
              placeholder="ex: RONDELLE BONDUELLE" />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setRenameGamme(null)}>Annuler</Btn>
            <Btn onClick={handleRenameGamme} loading={renamingGamme}>Renommer</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
