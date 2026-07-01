// src/pages/Articles.jsx
import { useState, useEffect, useRef } from "react";

/* ── Compression d'image côté client (Canvas) ───────────────────────────────
   Réduit l'image à maxSize×maxSize px max, encode en JPEG à `quality` (0-1).
   Résultat : data-URI base64 ~15-30 Ko selon le contenu, stocké en TEXT en DB.
─────────────────────────────────────────────────────────────────────────────*/
function resizeImage(file, maxSize = 300, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Sélecteur d'image (upload + drag-and-drop + aperçu + suppression) ─────*/
function ImagePicker({ value, onChange }) {
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await resizeImage(file);
    onChange(dataUrl);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#0023FF] hover:bg-[#F0F3FF] transition-colors overflow-hidden relative"
      >
        {value ? (
          <>
            <img src={value} alt="Aperçu" className="h-full w-full object-contain" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 shadow-sm"
            ><Icon name="x" size={12} /></button>
          </>
        ) : (
          <div className="text-center text-gray-400 pointer-events-none">
            <div className="text-gray-400 mb-1 flex justify-center"><Icon name="camera" size={28} /></div>
            <div className="text-xs font-semibold">Cliquer ou déposer une photo</div>
            <div className="text-[10px] mt-0.5 text-gray-300">JPG, PNG, WebP</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}
import { useArticles, useMutation, useSortableData } from "../hooks/useApi";
import { articlesService } from "../services";
import {
  fmt, fmtN, Spinner, ErrorBox, Badge, Modal,
  Input, Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox,
} from "../components/UI";
import Icon from "../components/Icon";

/* ── Vignette d'article cliquable : changer l'image directement depuis la liste ── */
function ArticleThumb({ a, onUpdate, notify }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImage(file);
      await onUpdate(a, dataUrl);
    } catch (e) {
      notify("Impossible de traiter cette image.", "error");
    } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={() => inputRef.current && inputRef.current.click()}
      disabled={busy} title="Cliquer pour changer l'image"
      className="relative group/th w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100 shadow-sm cursor-pointer">
      {a.image_url
        ? <img src={a.image_url} alt="" className="w-full h-full object-cover" />
        : <span className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400"><Icon name="box" size={22} /></span>}
      <span className="absolute inset-0 bg-black/45 text-white flex items-center justify-center opacity-0 group-hover/th:opacity-100 transition">
        {busy ? <Icon name="refresh" size={16} className="animate-spin" /> : <Icon name="camera" size={16} />}
      </span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files[0]) pick(e.target.files[0]); e.target.value = ""; }} />
    </button>
  );
}

export default function Articles() {
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [editForm, setEditForm]   = useState({ libelle: "", prix_achat: "", prix_vente: "", stock_min: "", image_url: "" });
  const [toast, setToast]         = useState(null);
  const [delConfirm, setDelConfirm] = useState(null); // { code, libelle }
  const [form, setForm]           = useState({ code: "", libelle: "", prix_achat: "", prix_vente: "", stock_min: "5", stock_initial: "", image_url: "" });
  const [formErr, setFormErr]     = useState({});
  const [codeAuto, setCodeAuto]   = useState(true);
  const [loadingCode, setLoadingCode] = useState(false);
  const debounceRef   = useRef(null);
  const searchDebRef  = useRef(null);

  // Debounce la recherche côté API : on n'envoie la requête qu'après 350 ms
  // sans frappe, ce qui évite une requête par touche et les course conditions.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    clearTimeout(searchDebRef.current);
    searchDebRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(searchDebRef.current);
  }, [search]);

  const { data: articles = [], loading, error, reload } = useArticles(debouncedSearch);
  const { sorted: articlesTries, sortKey, sortDir, handleSort } = useSortableData(articles, "libelle", "asc");
  const { mutate: createArticle, loading: saving }  = useMutation(articlesService.create);
  const { mutate: updateArticle, loading: updating } = useMutation(articlesService.update);
  const { mutate: deleteArticle }                    = useMutation(articlesService.delete);

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
    // Annule le timer en attente si le composant est démonté ou si le
    // libellé change avant son exécution (évite un setForm sur un
    // composant démonté et une requête generate-code obsolète/concurrente).
    return () => clearTimeout(debounceRef.current);
  }, [form.libelle]);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = (codeOverride) => {
    const errs = {};
    const codeVal = codeOverride !== undefined ? codeOverride : form.code;
    if (!codeVal.trim())     errs.code    = "Code requis";
    if (!form.libelle.trim()) errs.libelle = "Libellé requis";
    setFormErr(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    // Le code auto-généré arrive après un court débounce (400ms) suivi d'un
    // appel réseau : si l'utilisateur clique sur "Enregistrer" juste après
    // avoir saisi le libellé, form.code peut encore être vide à ce moment-là.
    // On le génère ici de façon synchrone (avant validation) pour éviter le
    // faux message "Code requis" alors que l'enregistrement va réussir.
    let codeToUse = form.code;
    if (!codeToUse.trim() && form.libelle.trim()) {
      setLoadingCode(true);
      try {
        const { code } = await articlesService.generateCode(form.libelle);
        codeToUse = code;
        setForm((f) => ({ ...f, code }));
      } catch { /* silencieux : la validation détectera le code manquant */ }
      finally { setLoadingCode(false); }
    }
    if (!validate(codeToUse)) return;
    try {
      await createArticle({ ...form, code: codeToUse });
      notify("Article créé avec succès !");
      setShowAdd(false);
      setForm({ code: "", libelle: "", prix_achat: "", prix_vente: "", stock_min: "5", stock_initial: "", image_url: "" });
      setCodeAuto(true);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const openEdit = (a) => {
    setEditArticle(a);
    setEditForm({
      libelle:    a.libelle,
      prix_achat: a.prix_achat,
      prix_vente: a.prix_vente,
      stock_min:  a.stock_min,
      image_url:  a.image_url || "",
    });
  };

  const handleUpdate = async () => {
    if (!editForm.libelle.trim()) return notify("Le libellé est requis.", "error");
    try {
      await updateArticle(editArticle.code, { ...editForm });
      notify("Article mis à jour !");
      setEditArticle(null);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  // Changement rapide de l'image depuis la liste (clic sur la vignette).
  const handleImageChange = async (a, dataUrl) => {
    try {
      await updateArticle(a.code, {
        libelle:    a.libelle,
        prix_achat: a.prix_achat,
        prix_vente: a.prix_vente,
        stock_min:  a.stock_min,
        image_url:  dataUrl,
      });
      notify("Image du produit mise à jour.");
      reload();
    } catch (err) { notify(err.message || "Échec de la mise à jour de l'image.", "error"); }
  };

  const handleDelete = async (code) => {
    try {
      await deleteArticle(code);
      notify("Article archivé.");
      setDelConfirm(null);
      reload();
    } catch (err) {
      notify(err.message || "Erreur lors de la suppression.", "error");
      setDelConfirm(null);
    }
  };

  const totalValeur = articles.reduce((s, a) => s + (parseFloat(a.valeur_stock) || 0), 0);
  const sortState = { key: sortKey, dir: sortDir };

  return (
    <div>
      <PageHeader
        title="Articles & Stock"
        sub={`${articles.length} article(s) — Valeur totale du stock : ${fmt(totalValeur)}`}
        action={<Btn onClick={() => setShowAdd(true)}>+ Nouvel Article</Btn>}
      />

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
              { label: "Code",         sortKey: "code",          w: "8%" },
              { label: "Libellé",      sortKey: "libelle",       w: "25%" },
              { label: "Prix Achat",   sortKey: "prix_achat",    right: true, w: "10%" },
              { label: "Prix Vente",   sortKey: "prix_vente",    right: true, w: "10%" },
              { label: "Entrées",      sortKey: "entree",        right: true, w: "8%" },
              { label: "Sorties",      sortKey: "sortie",        right: true, w: "8%" },
              { label: "Stock",        sortKey: "stock_restant", right: true, w: "8%" },
              { label: "Statut",       sortKey: "statut",        w: "10%" },
              { label: "Valeur Stock", sortKey: "valeur_stock",  right: true, w: "13%" },
              { label: "", w: "8%" },
            ]}
            sort={sortState} onSort={handleSort}
            empty="Aucun article trouvé."
          >
            {articlesTries.map((a) => {
              const stock = parseInt(a.stock_restant) || 0;
              return (
                <TR key={a.code}>
                  <TD><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{a.code}</span></TD>
                  <TD bold>
                    <div className="flex items-center gap-2">
                      <ArticleThumb a={a} onUpdate={handleImageChange} notify={notify} />
                      <span className="truncate">{a.libelle}</span>
                    </div>
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
                    <Badge color={stock > 0 ? (stock <= parseInt(a.stock_min) ? "amber" : "emerald") : "red"}>
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
                      <button onClick={() => setDelConfirm({ code: a.code, libelle: a.libelle })} className="text-red-400 hover:text-red-600 text-xs font-bold" title="Supprimer"><Icon name="x" size={13} /></button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Input label="Libellé *" value={form.libelle}
                onChange={(e) => { setForm({ ...form, libelle: e.target.value }); setCodeAuto(true); }}
                placeholder="Nom du produit" error={formErr.libelle} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Code Article *
                {codeAuto && <span className="ml-2 text-[#0023FF] font-normal">{loadingCode ? <><Icon name="clock" size={11} className="inline align-text-bottom" /> génération…</> : <><Icon name="sparkles" size={11} className="inline align-text-bottom" /> auto-généré</>}</span>}
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
                ><Icon name="refresh" size={14} /></button>
              </div>
              {formErr.code && <p className="text-xs text-red-500 mt-1">{formErr.code}</p>}
            </div>
            <Input label="Stock Minimum (alerte)" type="number" value={form.stock_min}
              onChange={(e) => setForm({ ...form, stock_min: e.target.value })} />
            <div>
              <Input label="Stock de départ" type="number" min="0" value={form.stock_initial}
                placeholder="0"
                onChange={(e) => setForm({ ...form, stock_initial: e.target.value })} />
              <p className="text-[11px] text-gray-400 mt-1">Quantité déjà en stock à enregistrer à la création (optionnel).</p>
            </div>
            <Input label="Prix d'Achat (FCFA)" type="number" value={form.prix_achat}
              onChange={(e) => setForm({ ...form, prix_achat: e.target.value })} />
            <Input label="Prix de Vente (FCFA)" type="number" value={form.prix_vente}
              onChange={(e) => setForm({ ...form, prix_vente: e.target.value })} />
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Photo du produit <span className="font-normal text-gray-400">(optionnel)</span></label>
              <ImagePicker value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Input label="Libellé *" value={editForm.libelle}
                onChange={(e) => setEditForm({ ...editForm, libelle: e.target.value.toUpperCase() })} />
            </div>
            <Input label="Prix d'Achat (FCFA)" type="number" value={editForm.prix_achat}
              onChange={(e) => setEditForm({ ...editForm, prix_achat: e.target.value })} />
            <Input label="Prix de Vente (FCFA)" type="number" value={editForm.prix_vente}
              onChange={(e) => setEditForm({ ...editForm, prix_vente: e.target.value })} />
            <div className="md:col-span-2">
              <Input label="Stock Minimum (seuil alerte)" type="number" value={editForm.stock_min}
                onChange={(e) => setEditForm({ ...editForm, stock_min: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Photo du produit <span className="font-normal text-gray-400">(optionnel)</span></label>
              <ImagePicker value={editForm.image_url} onChange={(v) => setEditForm({ ...editForm, image_url: v })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setEditArticle(null)}>Annuler</Btn>
            <Btn onClick={handleUpdate} loading={updating}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal confirmation suppression ── */}
      {delConfirm && (
        <Modal title="Supprimer l'article" onClose={() => setDelConfirm(null)}>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 text-red-500"><Icon name="trash" size={22} /></div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Supprimer <span className="font-mono text-red-600 font-bold">{delConfirm.code}</span> ?
              </p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {delConfirm.libelle}
              </p>
              <p className="text-xs text-gray-400 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <Icon name="alert" size={13} className="inline align-text-bottom mr-1" /> L'article sera archivé : il disparaîtra du catalogue, des ventes
                et des approvisionnements, mais son historique (ventes, achats,
                rapports) restera intact et inchangé.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn color="gray" onClick={() => setDelConfirm(null)}>Annuler</Btn>
            <Btn color="red" onClick={() => handleDelete(delConfirm.code)}>Supprimer</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
