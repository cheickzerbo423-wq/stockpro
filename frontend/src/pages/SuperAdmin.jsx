// src/pages/SuperAdmin.jsx
// Pilotage de la plateforme multi-entreprises — réservé au compte SuperAdmin
// (categorie = 'SuperAdmin', entreprise_id = NULL). Permet de créer, renommer,
// suspendre/réactiver et supprimer les entreprises clientes (espaces cloisonnés
// avec leurs propres utilisateurs, articles, ventes, clients et factures), avec
// une vue d'ensemble de l'activité de chacune.
import { useState } from "react";
import { useSuperadminEntreprises, useMutation } from "../hooks/useApi";
import { superadminService } from "../services";
import { Spinner, ErrorBox, Badge, Modal, Input, Btn, PageHeader, Toast } from "../components/UI";

const fmtNombre = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0));
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateHeure = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Jamais connecté";

export default function SuperAdmin() {
  const { data: entreprises = [], loading, error, reload } = useSuperadminEntreprises();
  const { mutate: create, loading: creating } = useMutation(superadminService.create);
  const { mutate: rename } = useMutation(superadminService.update);
  const { mutate: toggle } = useMutation(superadminService.toggleStatut);
  const { mutate: del }    = useMutation(superadminService.delete);

  const [showCreate,   setShowCreate]   = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ nom: "", admin_login: "", admin_mdp: "" });
  const [toast, setToast] = useState(null);
  const notify = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const resetForm = () => setForm({ nom: "", admin_login: "", admin_mdp: "" });

  const handleCreate = async () => {
    if (!form.nom.trim() || !form.admin_login.trim() || !form.admin_mdp)
      return notify("Nom, login et mot de passe sont obligatoires.", "error");
    if (form.admin_mdp.length < 4)
      return notify("Mot de passe trop court (4 caractères minimum).", "error");
    try {
      await create(form);
      notify(`Entreprise « ${form.nom.trim()} » créée — premier compte administrateur prêt.`);
      setShowCreate(false);
      resetForm();
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleToggle = async (ent) => {
    const verbe = ent.actif ? "suspendre" : "réactiver";
    const consequence = ent.actif
      ? "Tous ses utilisateurs perdront immédiatement l'accès à l'application."
      : "Ses utilisateurs retrouveront l'accès à l'application.";
    if (!window.confirm(`Voulez-vous vraiment ${verbe} l'entreprise « ${ent.nom} » ?\n\n${consequence}`)) return;
    try {
      await toggle(ent.id, !ent.actif);
      notify(`Entreprise « ${ent.nom} » ${ent.actif ? "suspendue" : "réactivée"}.`);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const nbActives = entreprises.filter(e => e.actif).length;
  const nbTotal   = entreprises.length;
  const caGlobal  = entreprises.reduce((s, e) => s + Number(e.ca_total || 0), 0);

  return (
    <div>
      <PageHeader
        title="Pilotage de la plateforme"
        sub={`${nbTotal} entreprise${nbTotal > 1 ? "s" : ""} cliente${nbTotal > 1 ? "s" : ""} — ${nbActives} active${nbActives > 1 ? "s" : ""} — CA cumulé ${fmtNombre(caGlobal)}`}
        action={<Btn onClick={() => setShowCreate(true)}>+ Nouvelle entreprise</Btn>}
      />

      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entreprises.map((ent) => (
            <EntrepriseCard
              key={ent.id}
              ent={ent}
              onRename={() => setRenameTarget(ent)}
              onToggle={() => handleToggle(ent)}
              onDelete={() => setDeleteTarget(ent)}
            />
          ))}

          <button onClick={() => setShowCreate(true)}
            className="rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#B3BFFF] hover:text-[#0023FF] transition min-h-[160px]">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center text-xl font-light">+</div>
            <span className="text-sm font-semibold">Ajouter une entreprise cliente</span>
          </button>
        </div>
      )}

      {/* ── Modal création ── */}
      {showCreate && (
        <Modal title="Nouvelle entreprise cliente" onClose={() => { setShowCreate(false); resetForm(); }}>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Crée un nouvel espace entièrement cloisonné (données, utilisateurs, articles,
            ventes, clients, factures… séparés des autres entreprises) avec son premier
            compte <strong className="text-gray-600">Administrateur</strong>.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Input label="Nom de l'entreprise *" value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex: Boutique Awa" />
            <Input label="Login du premier administrateur *" value={form.admin_login}
              onChange={(e) => setForm({ ...form, admin_login: e.target.value })} placeholder="ex: awa.admin" />
            <Input label="Mot de passe *" type="password" value={form.admin_mdp}
              onChange={(e) => setForm({ ...form, admin_mdp: e.target.value })} placeholder="4 caractères minimum" />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Btn>
            <Btn onClick={handleCreate} loading={creating}>Créer l'entreprise</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal renommage ── */}
      {renameTarget && (
        <RenameModal ent={renameTarget} onClose={() => setRenameTarget(null)} mutate={rename} notify={notify} reload={reload} />
      )}

      {/* ── Modal suppression ── */}
      {deleteTarget && (
        <DeleteModal ent={deleteTarget} onClose={() => setDeleteTarget(null)} mutate={del} notify={notify} reload={reload} />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Carte entreprise ──────────────────────────────────────────────
function EntrepriseCard({ ent, onRename, onToggle, onDelete }) {
  const isDefault = ent.id === 1;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base truncate">{ent.nom}</span>
            <Badge color={ent.actif ? "emerald" : "red"} dot>{ent.actif ? "Active" : "Suspendue"}</Badge>
            {isDefault && <Badge color="gray">Par défaut</Badge>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 font-mono">/{ent.slug}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onRename} title="Renommer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-[#E6EAFF] hover:text-[#0023FF] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {!isDefault && (
            <button onClick={onDelete} title="Supprimer définitivement"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Utilisateurs" value={ent.nb_utilisateurs} />
        <Stat label="Articles"     value={ent.nb_articles} />
        <Stat label="Contacts"     value={ent.nb_contacts} />
        <Stat label="Factures"     value={ent.nb_factures} />
        <Stat label="CA total"     value={fmtNombre(ent.ca_total)} />
        <Stat label="Créances"     value={fmtNombre(ent.creances)} accent={Number(ent.creances) > 0} />
      </div>

      <div className="pt-3 border-t border-gray-50 flex items-center justify-between gap-3 text-xs text-gray-400">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="truncate">Créée le {fmtDate(ent.created_at)}</span>
          <span className="truncate">Dernière connexion : {fmtDateHeure(ent.derniere_connexion)}</span>
        </div>
        {!isDefault && (
          <button onClick={onToggle}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex-shrink-0 ${
              ent.actif
                ? "border-red-200 text-red-500 hover:bg-red-50"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            }`}>
            {ent.actif ? "Suspendre" : "Réactiver"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-gray-50 rounded-xl px-2.5 py-2 text-center">
      <div className={`text-sm font-black ${accent ? "text-red-500" : "text-gray-800"}`}>{value ?? 0}</div>
      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide truncate">{label}</div>
    </div>
  );
}

// ── Modal renommage ───────────────────────────────────────────────
function RenameModal({ ent, onClose, mutate, notify, reload }) {
  const [nom, setNom] = useState(ent.nom);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nom.trim()) return notify("Le nom est obligatoire.", "error");
    setLoading(true);
    try {
      await mutate(ent.id, { nom: nom.trim() });
      notify("Entreprise renommée.");
      onClose();
      reload();
    } catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Renommer l'entreprise" onClose={onClose}>
      <Input label="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} />
      <div className="flex justify-end gap-2 mt-5">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <Btn onClick={handleSave} loading={loading}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

// ── Modal suppression (confirmation par saisie du nom) ────────────
function DeleteModal({ ent, onClose, mutate, notify, reload }) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const match = confirm.trim() === ent.nom;

  const handleDelete = async () => {
    if (!match) return;
    setLoading(true);
    try {
      const res = await mutate(ent.id);
      notify(res?.message || `Entreprise « ${ent.nom} » supprimée.`);
      onClose();
      reload();
    } catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="" onClose={onClose}>
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-red-100">
        <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-6 h-6">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <div className="font-black text-gray-900 text-base">Supprimer « {ent.nom} »</div>
          <div className="text-xs text-red-500 font-semibold">
            Action définitive — supprime aussi tous ses utilisateurs, articles, ventes, achats, clients et factures
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-xs text-red-700 leading-relaxed">
        Cette opération est <strong>irréversible</strong>. Toutes les données de cette
        entreprise seront effacées définitivement de la plateforme et ne pourront pas
        être récupérées.
      </div>

      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Tapez <span className="text-red-600 font-black font-mono">{ent.nom}</span> pour confirmer
        </label>
        <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder={ent.nom}
          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition ${
            match ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 focus:border-red-300"
          }`} />
      </div>

      <div className="flex justify-end gap-2">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <button onClick={handleDelete} disabled={!match || loading}
          className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2">
          {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10"/></svg>}
          Supprimer définitivement
        </button>
      </div>
    </Modal>
  );
}
