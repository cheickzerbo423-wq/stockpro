// src/pages/Articles.jsx — WariGest (sans gammes)
import { useState, useEffect, useRef } from "react";
import { useArticles, useMutation, useSortableData } from "../hooks/useApi";
import { articlesService } from "../services";
import {
  fmt, fmtN, Spinner, ErrorBox, Badge, Modal,
  Input, Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox,
} from "../components/UI";

export default function Articles() {
  const [search, setSearch]           = useState("");
  const [showAdd, setShowAdd]         = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [editForm, setEditForm]       = useState({ libelle: "", prix_achat: "", prix_vente: "", stock_min: "" });
  const [toast, setToast]             = useState(null);
  const [form, setForm]               = useState({ code: "", libelle: "", prix_achat: "", prix_vente: "", stock_min: "5" });
  const [formErr, setFormErr]         = useState({});
  const [codeAuto, setCodeAuto]       = useState(true);
  const [loadingCode, setLoadingCode] = useState(false);
  const debounceRef = useRef(null);

  const { data: articles = [], loading, error, reload } = useArticles(search);
  const { sorted: articlesTries, sortKey, sortDir, handleSort } = useSortableData(articles, "libelle", "asc");
  const { mutate: createArticle, loading: saving }   = useMutation(articlesService.create);
  const { mutate: updateArticle, loading: updating } = useMutation(articlesService.update);
  const { mutate: deleteArticle }                    = useMutation(articlesService.delete);

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
      await createArticle({ ...form, gamme_code: null, unite_par_base: 1 });
      notify("Article créé avec succès !");
      setShowAdd(false);
      setForm({ code: "", libelle: "", prix_achat: "", prix_vente: "", stock_min: "5" });
      setCodeAuto(true);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const openEdit = (a) => {
    setEditArticle(a);
    setEditForm({ libelle: a.libelle, prix_achat: a.prix_achat, prix_vente: a.prix_vente, stock_min: a.stock_min });
  };

  const handleUpdate = async () => {
    if (!editForm.libelle.trim()) return notify("Le libellé est requis.", "error");
    try {
      await updateArticle(editArticle.code, { ...editForm, gamme_code: null });
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

  const totalValeur = articles.reduce((s, a) => s + (parseFloat(a.valeur_stock) || 0), 0);
  const sortState   = { key: sortKey, dir: sortDir };

  return (
    <div>
      <PageHeader
        title="Articles & Stock"
        sub={`${articles.length} article(s) — Valeur totale : ${fmt(totalValeur)}`}
        action={<Btn onClick={() => setShowAdd(true)}>+ Nouvel Article</Btn>}
      />

      <div style={{ marginBottom: 16 }}>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par code ou libellé…"
          suggestions={articles.map(a => ({ label: a.libelle, sub: `Code : ${a.code} — Stock : ${a.stock_restant}` }))}
        />
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e8ecff", boxShadow: "0 2px 12px rgba(0,35,255,0.05)" }}>
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <DataTable
            headers={[
              { label: "Code",         sortKey: "code",          w: "8%" },
              { label: "Libellé",      sortKey: "libelle",       w: "24%" },
              { label: "Prix Achat",   sortKey: "prix_achat",    right: true, w: "10%" },
              { label: "Prix Vente",   sortKey: "prix_vente",    right: true, w: "10%" },
              { label: "Entrées",      sortKey: "entrees",       right: true, w: "8%" },
              { label: "Sorties",      sortKey: "sorties",       right: true, w: "8%" },
              { label: "Stock",        sortKey: "stock_restant", right: true, w: "8%" },
              { label: "Statut",       sortKey: "statut",        w: "10%" },
              { label: "Valeur Stock", sortKey: "valeur_stock",  right: true, w: "12%" },
              { label: "",             w: "6%" },
            ]}
            sort={sortState} onSort={handleSort}
            empty="Aucun article trouvé."
          >
            {articlesTries.map((a) => {
              const stock = parseInt(a.stock_restant) || 0;
              return (
                <TR key={a.code}>
                  <TD><span style={{ fontFamily: "monospace", fontSize: 11, background: "#f0f2ff", padding: "2px 8px", borderRadius: 6, color: "#0023FF" }}>{a.code}</span></TD>
                  <TD bold>{a.libelle}</TD>
                  <TD right>{fmt(a.prix_achat)}</TD>
                  <TD right>{fmt(a.prix_vente)}</TD>
                  <TD right>{fmtN(a.entrees)}</TD>
                  <TD right>{fmtN(a.sorties)}</TD>
                  <TD right>
                    <span style={{ fontWeight: 800, color: stock <= 0 ? "#dc2626" : stock <= parseInt(a.stock_min) ? "#d97706" : "#059669" }}>
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(a)} style={{ color: "#9ba5c9", background: "none", border: "none", cursor: "pointer", padding: 2 }} title="Modifier">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(a.code)} style={{ color: "#fca5a5", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }} title="Supprimer">✕</button>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="Libellé *" value={form.libelle}
                onChange={(e) => { setForm({ ...form, libelle: e.target.value }); setCodeAuto(true); }}
                placeholder="Nom du produit" error={formErr.libelle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Code Article * {codeAuto && <span style={{ color: "#0023FF", fontWeight: 500, textTransform: "none" }}>{loadingCode ? "⏳ génération…" : "✦ auto"}</span>}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1, border: `1.5px solid ${codeAuto ? "#c7d0ff" : "#e0e5ff"}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "monospace", background: codeAuto ? "#f0f2ff" : "white", color: "#0023FF", outline: "none", boxSizing: "border-box" }}
                  value={form.code}
                  onChange={(e) => { setCodeAuto(false); setForm({ ...form, code: e.target.value.toUpperCase() }); }}
                  placeholder="BIS001"
                />
                <button type="button"
                  onClick={async () => {
                    if (!form.libelle.trim()) return;
                    setLoadingCode(true); setCodeAuto(true);
                    try { const { code } = await articlesService.generateCode(form.libelle); setForm((f) => ({ ...f, code })); }
                    catch { } finally { setLoadingCode(false); }
                  }}
                  style={{ padding: "8px 12px", borderRadius: 10, background: "#e8ecff", color: "#0023FF", border: "none", cursor: "pointer", fontWeight: 700 }}>↺</button>
              </div>
              {formErr.code && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{formErr.code}</p>}
            </div>
            <Input label="Stock Minimum" type="number" value={form.stock_min}
              onChange={(e) => setForm({ ...form, stock_min: e.target.value })} />
            <Input label="Prix d'Achat (FCFA)" type="number" value={form.prix_achat}
              onChange={(e) => setForm({ ...form, prix_achat: e.target.value })} />
            <Input label="Prix de Vente (FCFA)" type="number" value={form.prix_vente}
              onChange={(e) => setForm({ ...form, prix_vente: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Btn color="gray" onClick={() => { setShowAdd(false); setCodeAuto(true); }}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Modifier Article ── */}
      {editArticle && (
        <Modal title={`Modifier — ${editArticle.code}`} onClose={() => setEditArticle(null)}>
          <div style={{ background: "#f7f8ff", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#9ba5c9", marginBottom: 12, fontFamily: "monospace" }}>
            Code : <strong style={{ color: "#0023FF" }}>{editArticle.code}</strong> <span style={{ color: "#c7d0ff" }}>(non modifiable)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="Libellé *" value={editForm.libelle}
                onChange={(e) => setEditForm({ ...editForm, libelle: e.target.value.toUpperCase() })} />
            </div>
            <Input label="Prix d'Achat (FCFA)" type="number" value={editForm.prix_achat}
              onChange={(e) => setEditForm({ ...editForm, prix_achat: e.target.value })} />
            <Input label="Prix de Vente (FCFA)" type="number" value={editForm.prix_vente}
              onChange={(e) => setEditForm({ ...editForm, prix_vente: e.target.value })} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="Stock Minimum (seuil alerte)" type="number" value={editForm.stock_min}
                onChange={(e) => setEditForm({ ...editForm, stock_min: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Btn color="gray" onClick={() => setEditArticle(null)}>Annuler</Btn>
            <Btn onClick={handleUpdate} loading={updating}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
