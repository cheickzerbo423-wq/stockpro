// src/pages/Devis.jsx
import { useState } from "react";
import { useDevis, useClients, useMutation, useSortableData } from "../hooks/useApi";
import { devisService } from "../services";
import {
  fmt, fmtDate, today, Spinner, ErrorBox, Badge, Modal,
  Select, Input, Btn, PageHeader, DataTable, TR, TD, Toast,
} from "../components/UI";

const STATUTS = {
  "En attente": { color: "amber",   icon: "⏳" },
  "Valide":     { color: "emerald", icon: "✓" },
  "Refuse":     { color: "red",     icon: "✕" },
  "Facture":    { color: "blue",    icon: "🧾" },
};

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 border text-center ${color}`}>
      <div className="text-sm font-black break-words leading-tight">{value}</div>
      <div className="text-xs font-bold uppercase mt-1 opacity-70">{label}</div>
    </div>
  );
}

export default function Devis() {
  const { data: devis = [], loading, error, reload } = useDevis();
  const { data: clients = [] } = useClients("Clients");
  const { mutate: create,       loading: saving }  = useMutation(devisService.create);
  const { mutate: updateStatut, loading: updating } = useMutation(devisService.updateStatut);

  const [showAdd,      setShowAdd]      = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [filterStatut, setFilterStatut] = useState("tous");
  const [form, setForm] = useState({
    montant: "", date_emission: today(), client_nom: "", commentaire: "", num_commande: "",
  });
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async () => {
    if (!form.montant || !form.client_nom) return notify("Client et montant requis.", "error");
    try {
      await create(form);
      notify("Devis créé avec succès !");
      setShowAdd(false);
      setForm({ montant: "", date_emission: today(), client_nom: "", commentaire: "", num_commande: "" });
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleStatut = async (id, statut) => {
    try {
      await updateStatut(id, statut);
      notify("Statut mis à jour.");
      if (selected?.id === id) setSelected(s => ({ ...s, statut }));
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const devisFiltres = filterStatut === "tous" ? devis : devis.filter(d => d.statut === filterStatut);
  const { sorted: devisAffichés, sortKey, sortDir, handleSort } = useSortableData(devisFiltres, "date_emission", "desc");
  const sortState = { key: sortKey, dir: sortDir };

  const stats = {
    total:         devis.length,
    attente:       devis.filter(d => d.statut === "En attente").length,
    valides:       devis.filter(d => d.statut === "Valide").length,
    refuses:       devis.filter(d => d.statut === "Refuse").length,
    montantTotal:  devis.reduce((s, d) => s + parseFloat(d.montant || 0), 0),
    montantValide: devis.filter(d => d.statut === "Valide").reduce((s, d) => s + parseFloat(d.montant || 0), 0),
  };

  return (
    <div>
      <PageHeader
        title="Devis"
        sub={`${devis.length} devis · Total : ${fmt(stats.montantTotal)} · Validé : ${fmt(stats.montantValide)}`}
        action={<Btn onClick={() => setShowAdd(true)}>+ Nouveau Devis</Btn>}
      />

      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total"      value={stats.total}   color="bg-gray-50 border-gray-200 text-gray-700" />
          <StatCard label="En attente" value={stats.attente} color="bg-amber-50 border-amber-100 text-amber-700" />
          <StatCard label="Validés"    value={stats.valides} color="bg-emerald-50 border-emerald-100 text-emerald-700" />
          <StatCard label="Refusés"    value={stats.refuses} color="bg-red-50 border-red-100 text-red-700" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: "tous",       label: "Tous" },
          { key: "En attente", label: "⏳ En attente" },
          { key: "Valide",     label: "✓ Validés" },
          { key: "Refuse",     label: "✕ Refusés" },
          { key: "Facture",    label: "🧾 Facturés" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatut(f.key)}
            style={filterStatut === f.key ? { backgroundColor: "#0023FF" } : undefined}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterStatut === f.key
                ? "text-white border-transparent"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#B3BFFF]"
            }`}>
            {f.label}
            <span className="ml-1 opacity-60">({f.key === "tous" ? devis.length : devis.filter(d => d.statut === f.key).length})</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <DataTable
            headers={[
              { label: "N° Devis", sortKey: "numero" },
              { label: "Date",     sortKey: "date_emission" },
              { label: "Client",   sortKey: "client_nom" },
              { label: "Montant",  sortKey: "montant", right: true },
              { label: "Statut",   sortKey: "statut" },
              "Actions",
            ]}
            sort={sortState} onSort={handleSort}
            empty="Aucun devis."
          >
            {devisAffichés.map((d) => (
              <TR key={d.id} onClick={() => setSelected(d)}>
                <TD><span className="font-mono text-xs text-purple-600">{d.numero}</span></TD>
                <TD>{fmtDate(d.date_emission)}</TD>
                <TD bold>{d.client_nom}</TD>
                <TD right bold>{fmt(d.montant)}</TD>
                <TD><Badge color={STATUTS[d.statut]?.color || "gray"}>{STATUTS[d.statut]?.icon} {d.statut}</Badge></TD>
                <TD>
                  {d.statut === "En attente" && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Btn sm color="green" onClick={() => handleStatut(d.id, "Valide")} loading={updating}>✓ Valider</Btn>
                      <Btn sm color="red"   onClick={() => handleStatut(d.id, "Refuse")} loading={updating}>✕ Refuser</Btn>
                    </div>
                  )}
                  {d.statut === "Valide" && (
                    <div onClick={e => e.stopPropagation()}>
                      <Btn sm color="blue" onClick={() => handleStatut(d.id, "Facture")} loading={updating}>🧾 Facturer</Btn>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </DataTable>
        )}
      </div>

      {selected && (
        <Modal title={`Devis — ${selected.numero}`} onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide mb-1">Client</p>
                <p className="font-bold text-gray-800 text-lg">{selected.client_nom}</p>
              </div>
              <Badge color={STATUTS[selected.statut]?.color || "gray"}>{STATUTS[selected.statut]?.icon} {selected.statut}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-bold mb-1">DATE D'ÉMISSION</p>
                <p className="font-semibold text-sm">{fmtDate(selected.date_emission)}</p>
              </div>
              <div className="bg-[#E6EAFF] rounded-xl p-3 border border-[#B3BFFF]">
                <p className="text-xs text-[#0023FF] font-bold mb-1">MONTANT</p>
                <p className="font-black text-[#0023FF] text-lg">{fmt(selected.montant)}</p>
              </div>
            </div>
            {selected.num_commande && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-bold mb-1">N° COMMANDE LIÉ</p>
                <p className="font-semibold text-sm">{selected.num_commande}</p>
              </div>
            )}
            {selected.commentaire && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-bold mb-1">COMMENTAIRE</p>
                <p className="text-gray-700 text-sm">{selected.commentaire}</p>
              </div>
            )}
            {selected.statut === "En attente" && (
              <div className="flex gap-2 pt-2">
                <Btn color="green" onClick={() => handleStatut(selected.id, "Valide")} loading={updating}>✓ Valider</Btn>
                <Btn color="red"   onClick={() => handleStatut(selected.id, "Refuse")} loading={updating}>✕ Refuser</Btn>
              </div>
            )}
            {selected.statut === "Valide" && (
              <Btn color="blue" onClick={() => handleStatut(selected.id, "Facture")} loading={updating}>🧾 Marquer comme Facturé</Btn>
            )}
          </div>
          <div className="flex justify-end mt-5">
            <Btn color="gray" onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="📋 Nouveau Devis" onClose={() => setShowAdd(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Client *" value={form.client_nom} onChange={e => setForm({ ...form, client_nom: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {clients.map(c => <option key={c.id}>{c.nom}</option>)}
            </Select>
            <Input label="Date d'émission" type="date" value={form.date_emission} onChange={e => setForm({ ...form, date_emission: e.target.value })} />
            <Input label="Montant (FCFA) *" type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} placeholder="0" />
            <Input label="N° Commande lié" value={form.num_commande} onChange={e => setForm({ ...form, num_commande: e.target.value })} placeholder="Optionnel" />
            <div className="col-span-2">
              <Input label="Commentaire" value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} placeholder="Description, conditions particulières..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>Enregistrer le Devis</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
