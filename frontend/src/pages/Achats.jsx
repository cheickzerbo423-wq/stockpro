// src/pages/Achats.jsx — WariGest
import { useState, useMemo, useRef, useEffect } from "react";
import { useAchats, useArticles, useClients, useMutation, useSortableData } from "../hooks/useApi";
import { achatsService, clientsService } from "../services";
import ScanFacture from "../components/ScanFacture";
import {
  fmt, fmtN, today, Spinner, ErrorBox, Badge,
  Modal, Input, Btn, PageHeader, DataTable, TR, TD, Toast, SearchBox,
} from "../components/UI";

function MiniForm({ title, icon, onSave, onCancel, saving }) {
  const [nom, setNom]         = useState("");
  const [contact, setContact] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,13,46,0.6)" }}>
      <div style={{ background: "white", borderRadius: 16, boxShadow: "0 25px 60px rgba(0,35,255,0.15)", width: "100%", maxWidth: 360, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: "#060d2e", margin: 0 }}>{title}</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom complet…" />
          <Input label="Téléphone" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ex: 07 00 00 00 00" />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Btn color="gray" onClick={onCancel}>Annuler</Btn>
          <Btn onClick={() => onSave({ nom: nom.trim(), contact })} loading={saving}>Enregistrer</Btn>
        </div>
      </div>
    </div>
  );
}

function LigneCommande({ ligne, articles, onUpdate, onRemove }) {
  const [search, setSearch] = useState(ligne.libelle || "");
  const [open, setOpen]     = useState(false);
  const ref = useRef(null);

  const suggestions = useMemo(() => {
    if (!search.trim() || ligne.article_code) return articles.slice(0, 40);
    const q = search.toLowerCase();
    return articles.filter(a => a.code.toLowerCase().includes(q) || a.libelle.toLowerCase().includes(q)).slice(0, 40);
  }, [search, articles, ligne.article_code]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selectArticle = (a) => {
    setSearch(`${a.code} — ${a.libelle}`);
    setOpen(false);
    onUpdate({ ...ligne, article_code: a.code, libelle: a.libelle, prix_achat: a.prix_achat || "" });
  };

  const total = (+ligne.prix_achat || 0) * (+ligne.quantite || 0);

  return (
    <div style={{ background: "#f7f8ff", borderRadius: 12, border: "1.5px solid #e8ecff", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1, position: "relative" }} ref={ref}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Article *</label>
          <input
            style={{ width: "100%", border: "1.5px solid #e0e5ff", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "white", color: "#060d2e", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            placeholder="Rechercher par code ou nom…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); onUpdate({ ...ligne, article_code: "", libelle: "" }); }}
            onFocus={() => setOpen(true)}
          />
          {open && suggestions.length > 0 && (
            <div style={{ position: "absolute", zIndex: 50, left: 0, right: 0, top: "100%", marginTop: 4, background: "white", border: "1.5px solid #e0e5ff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,35,255,0.1)", maxHeight: 200, overflowY: "auto" }}>
              {suggestions.map((a) => (
                <div key={a.code} onMouseDown={() => selectArticle(a)}
                  style={{ padding: "9px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f2ff", fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f2ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span><strong style={{ color: "#0023FF" }}>{a.code}</strong> — {a.libelle}</span>
                  <span style={{ color: "#9ba5c9", fontSize: 11 }}>Stock: {a.stock_restant}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onRemove}
          style={{ width: 34, height: 34, borderRadius: "50%", background: "#fee2e2", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          ✕
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 4, textTransform: "uppercase" }}>Quantité *</label>
          <input type="number" min="1"
            style={{ width: "100%", border: "1.5px solid #e0e5ff", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "white", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            value={ligne.quantite} onChange={(e) => onUpdate({ ...ligne, quantite: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 4, textTransform: "uppercase" }}>P.U. (FCFA) *</label>
          <input type="number" min="0"
            style={{ width: "100%", border: "1.5px solid #e0e5ff", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "white", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            value={ligne.prix_achat} onChange={(e) => onUpdate({ ...ligne, prix_achat: e.target.value })} placeholder="0" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#e8ecff", borderRadius: 10, padding: "8px 4px", border: "1.5px solid #c7d0ff" }}>
          <span style={{ fontSize: 10, color: "#0023FF", fontWeight: 700, textTransform: "uppercase" }}>Total</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#0023FF" }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Achats() {
  const { data: achats = [], loading, error, reload } = useAchats();
  const { data: articles = [] }     = useArticles();
  const { data: fournisseurs = [], reload: reloadFournisseurs } = useClients("Fournisseurs");
  const { mutate: createAchat, loading: saving } = useMutation(achatsService.create);
  const { mutate: payAchat }        = useMutation(achatsService.updatePaiement);

  const [showAdd, setShowAdd]   = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [toast, setToast]       = useState(null);
  const [searchTable, setSearchTable] = useState("");

  const emptyLigne = () => ({ id: Date.now() + Math.random(), article_code: "", libelle: "", quantite: "", prix_achat: "" });
  const [lignes, setLignes]     = useState([emptyLigne()]);
  const [fournisseurNom, setFournisseurNom] = useState("");
  const [fournisseurId,  setFournisseurId]  = useState("");
  const [fournisseurQ,   setFournisseurQ]   = useState("");
  const [fournisseurOpen, setFournisseurOpen] = useState(false);
  const [showNewFournisseur, setShowNewFournisseur] = useState(false);
  const [savingFournisseur,  setSavingFournisseur]  = useState(false);
  const [dateAchat,   setDateAchat]   = useState(today());
  const [montantPaye, setMontantPaye] = useState("");

  const fournisseursFiltres = fournisseurQ.trim()
    ? fournisseurs.filter(f => f.nom.toLowerCase().includes(fournisseurQ.toLowerCase()))
    : fournisseurs;

  const notify = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 4000); };
  const totalCommande = lignes.reduce((s, l) => s + (+l.prix_achat || 0) * (+l.quantite || 0), 0);
  const totalDepenses = achats.reduce((s, a) => s + parseFloat(a.montant_total || 0), 0);
  const totalDettes   = achats.reduce((s, a) => s + parseFloat(a.reste || 0), 0);

  const resetModal = () => {
    setLignes([emptyLigne()]); setFournisseurNom(""); setFournisseurId("");
    setFournisseurQ(""); setDateAchat(today()); setMontantPaye("");
  };

  // Réception des données du scan OCR
  const handleScanResult = (data) => {
    if (data.fournisseur) {
      setFournisseurNom(data.fournisseur);
      setFournisseurQ(data.fournisseur);
    }
    if (data.date) setDateAchat(data.date);
    if (data.articles && data.articles.length > 0) {
      setLignes(data.articles.map(a => ({
        id: Date.now() + Math.random(),
        article_code: "",
        libelle: a.libelle,
        quantite: String(a.quantite),
        prix_achat: String(a.prix_achat),
      })));
    }
    setShowScan(false);
    setShowAdd(true);
    notify(`📷 ${data.articles?.length || 0} article(s) importé(s) depuis la facture scannée !`);
  };

  const handleSave = async () => {
    const valides = lignes.filter(l => l.article_code && l.quantite && l.prix_achat);
    if (valides.length === 0) return notify("Ajoutez au moins un article complet.", "error");
    if (!fournisseurNom) return notify("Veuillez sélectionner un fournisseur.", "error");
    const paye = montantPaye === "" ? totalCommande : parseFloat(montantPaye);
    if (paye > totalCommande) return notify("Le montant payé ne peut pas dépasser le total.", "error");

    let errors = [], results = [];
    for (const l of valides) {
      const ligneMontant = (+l.prix_achat) * (+l.quantite);
      const lignePaye = totalCommande > 0 ? Math.round((ligneMontant / totalCommande) * paye) : ligneMontant;
      try {
        const res = await createAchat({ article_code: l.article_code, fournisseur_nom: fournisseurNom, fournisseur_id: fournisseurId, prix_achat: l.prix_achat, quantite: l.quantite, date_achat: dateAchat, montant_paye: lignePaye });
        results.push(res);
      } catch (err) { errors.push(`${l.libelle}: ${err.message}`); }
    }
    if (errors.length > 0) notify(`${results.length} enregistré(s). Erreurs : ${errors.join(" | ")}`, "error");
    else notify(`✅ ${results.length} produit(s) approvisionné(s) avec succès !`);
    setShowAdd(false); resetModal(); reload();
  };

  const handlePay = async () => {
    const versement = parseFloat(payAmount);
    if (isNaN(versement) || versement <= 0) return notify("Montant invalide.", "error");
    if (versement > parseFloat(payModal.reste)) return notify(`Dépasse le reste à payer (${fmt(payModal.reste)}).`, "error");
    try {
      await payAchat(payModal.id, parseFloat(payModal.montant_paye) + versement);
      notify("Paiement enregistré !"); setPayModal(null); setPayAmount(""); reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const achatsFiltres = useMemo(() => {
    if (!searchTable.trim()) return achats;
    const q = searchTable.toLowerCase();
    return achats.filter(a => (a.libelle || "").toLowerCase().includes(q) || (a.fournisseur_nom || "").toLowerCase().includes(q) || (a.article_code || "").toLowerCase().includes(q));
  }, [achats, searchTable]);

  const { sorted: achatsAffichés, sortKey, sortDir, handleSort } = useSortableData(achatsFiltres, "date_achat", "asc");
  const sortState = { key: sortKey, dir: sortDir };

  return (
    <div>
      <PageHeader
        title="Approvisionnements"
        sub={`Total dépensé : ${fmt(totalDepenses)}${totalDettes > 0 ? ` · Dettes : ${fmt(totalDettes)}` : ""}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowScan(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "white", color: "#0023FF", border: "1.5px solid #c7d0ff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,35,255,0.08)" }}>
              📷 Scanner facture
            </button>
            <Btn onClick={() => { resetModal(); setShowAdd(true); }}>+ Nouvel Approvisionnement</Btn>
          </div>
        }
      />

      <div style={{ marginBottom: 16, maxWidth: 400 }}>
        <SearchBox value={searchTable} onChange={setSearchTable} placeholder="Rechercher un article ou fournisseur…"
          suggestions={[...new Map(achats.map(a => [a.fournisseur_nom, { label: a.fournisseur_nom, sub: "Fournisseur" }])).values()]} />
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e8ecff", boxShadow: "0 2px 12px rgba(0,35,255,0.05)" }}>
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
            sort={sortState} onSort={handleSort} empty="Aucun approvisionnement.">
            {achatsAffichés.map((a) => (
              <TR key={a.id}>
                <TD>{a.date_achat?.split("T")[0]}</TD>
                <TD bold>{a.libelle}</TD>
                <TD>{a.fournisseur_nom || <span style={{ color: "#c7d0ff" }}>—</span>}</TD>
                <TD right>{fmtN(a.quantite)}</TD>
                <TD right>{fmtN(a.prix_achat)}</TD>
                <TD right bold>{fmt(a.montant_total)}</TD>
                <TD right><span style={{ color: "#059669", fontWeight: 600 }}>{fmt(a.montant_paye)}</span></TD>
                <TD right><span style={{ color: parseFloat(a.reste) > 0 ? "#dc2626" : "#c7d0ff", fontWeight: parseFloat(a.reste) > 0 ? 700 : 400 }}>{parseFloat(a.reste) > 0 ? fmt(a.reste) : "—"}</span></TD>
                <TD><Badge color={a.statut ? "emerald" : "amber"}>{a.statut ? "Payé" : "Crédit"}</Badge></TD>
                <TD>{!a.statut && <Btn sm color="blue" onClick={() => { setPayModal(a); setPayAmount(String(a.reste)); }}>Payer</Btn>}</TD>
              </TR>
            ))}
          </DataTable>
        )}
      </div>

      {showAdd && (
        <Modal title="Nouvel Approvisionnement" onClose={() => { setShowAdd(false); resetModal(); }} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ gridColumn: "1 / 3", position: "relative" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ba5c9", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fournisseur *</label>
              <input type="text"
                value={fournisseurOpen ? fournisseurQ : fournisseurNom}
                onChange={(e) => { setFournisseurQ(e.target.value); setFournisseurOpen(true); setFournisseurNom(""); setFournisseurId(""); }}
                onFocus={() => { setFournisseurOpen(true); setFournisseurQ(""); }}
                onBlur={() => setTimeout(() => setFournisseurOpen(false), 150)}
                placeholder="Rechercher un fournisseur…"
                style={{ width: "100%", border: `1.5px solid ${fournisseurNom ? "#0023FF" : "#e0e5ff"}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, background: fournisseurNom ? "#f0f2ff" : "white", color: "#060d2e", outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontWeight: fournisseurNom ? 700 : 400 }} />
              {fournisseurOpen && (
                <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0, marginTop: 4, background: "white", border: "1.5px solid #e0e5ff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,35,255,0.1)", maxHeight: 220, overflowY: "auto" }}>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => { setFournisseurOpen(false); setShowNewFournisseur(true); }}
                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#0023FF", background: "none", border: "none", borderBottom: "1px solid #e8ecff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0023FF", color: "white", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</span>
                    Nouveau fournisseur
                  </button>
                  {fournisseursFiltres.map(f => (
                    <button key={f.id} onMouseDown={e => e.preventDefault()} onClick={() => { setFournisseurNom(f.nom); setFournisseurId(f.id); setFournisseurQ(f.nom); setFournisseurOpen(false); }}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, background: fournisseurNom === f.nom ? "#f0f2ff" : "none", color: "#060d2e", border: "none", borderBottom: "1px solid #f0f2ff", cursor: "pointer", fontFamily: "inherit" }}>
                      {f.nom}
                    </button>
                  ))}
                </div>
              )}
              {showNewFournisseur && (
                <MiniForm title="Nouveau Fournisseur" icon="🏭" saving={savingFournisseur} onCancel={() => setShowNewFournisseur(false)}
                  onSave={async ({ nom, contact }) => {
                    setSavingFournisseur(true);
                    try {
                      const created = await clientsService.create({ nom, contact, type: "Fournisseurs" });
                      await reloadFournisseurs();
                      setFournisseurNom(nom); setFournisseurId(created?.id || ""); setFournisseurQ(nom); setShowNewFournisseur(false);
                    } finally { setSavingFournisseur(false); }
                  }} />
              )}
            </div>
            <Input label="Date *" type="date" value={dateAchat} onChange={(e) => setDateAchat(e.target.value)} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9ba5c9", textTransform: "uppercase" }}>Produits à approvisionner</span>
              <span style={{ fontSize: 11, color: "#9ba5c9" }}>{lignes.length} ligne(s)</span>
            </div>
            {lignes.map(ligne => (
              <LigneCommande key={ligne.id} ligne={ligne} articles={articles}
                onUpdate={(u) => setLignes(lignes.map(l => l.id === ligne.id ? u : l))}
                onRemove={() => lignes.length > 1 && setLignes(lignes.filter(l => l.id !== ligne.id))} />
            ))}
          </div>

          <button onClick={() => setLignes([...lignes, emptyLigne()])}
            style={{ width: "100%", padding: "10px", border: "2px dashed #c7d0ff", borderRadius: 12, color: "#0023FF", fontSize: 13, fontWeight: 700, background: "none", cursor: "pointer", marginBottom: 16 }}>
            + Ajouter un produit
          </button>

          <div style={{ borderTop: "1px solid #f0f2ff", paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Total de la commande</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#0023FF" }}>{fmt(totalCommande)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setMontantPaye(String(totalCommande))}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "#ecfdf5", color: "#059669", border: "none", cursor: "pointer", fontWeight: 700 }}>✅ Comptant</button>
              <button onClick={() => setMontantPaye("0")}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", border: "none", cursor: "pointer", fontWeight: 700 }}>📋 Crédit total</button>
            </div>
            <Input label={`Montant payé (FCFA) — Reste : ${fmt(totalCommande - Math.min(+(montantPaye) || totalCommande, totalCommande))}`}
              type="number" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} placeholder={`${totalCommande} (comptant par défaut)`} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Btn color="gray" onClick={() => { setShowAdd(false); resetModal(); }}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>Enregistrer ({lignes.filter(l => l.article_code).length} produit(s))</Btn>
          </div>
        </Modal>
      )}

      {payModal && (
        <Modal title="Payer une dette fournisseur" onClose={() => { setPayModal(null); setPayAmount(""); }}>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
            <p>Article : <strong>{payModal.libelle}</strong> — Fourn. : <strong>{payModal.fournisseur_nom}</strong></p>
            <p>Total : <strong>{fmt(payModal.montant_total)}</strong> · Payé : <strong style={{ color: "#059669" }}>{fmt(payModal.montant_paye)}</strong> · Reste : <strong style={{ color: "#dc2626" }}>{fmt(payModal.reste)}</strong></p>
          </div>
          <Input label="Montant à payer (FCFA)" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          <button onClick={() => setPayAmount(String(payModal.reste))}
            style={{ fontSize: 12, color: "#0023FF", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>
            Solder la dette ({fmt(payModal.reste)})
          </button>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Btn color="gray" onClick={() => { setPayModal(null); setPayAmount(""); }}>Annuler</Btn>
            <Btn onClick={handlePay}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {showScan && (
        <ScanFacture
          onResult={handleScanResult}
          onClose={() => setShowScan(false)}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
