// src/pages/SuperAdmin.jsx
// Pilotage de la plateforme multi-entreprises — réservé au compte SuperAdmin.
// Interface complète : KPI header, tableau des entreprises avec gestion
// abonnement, suspension/réactivation, suppression sécurisée.
import { useState } from "react";
import { useSuperadminEntreprises, useMutation } from "../hooks/useApi";
import { superadminService, authService } from "../services";
import { Spinner, ErrorBox, Badge, Modal, Input, Btn, Toast } from "../components/UI";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNombre = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0));
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateHeure = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Jamais";

// Statut abonnement calculé côté client
function statutAbonnement(ent) {
  if (!ent.abonnement_fin) return { label: "Illimité", color: "blue" };
  const fin = new Date(ent.abonnement_fin);
  const now = new Date();
  const diffDays = Math.ceil((fin - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: "Expiré",        color: "red",    days: diffDays };
  if (diffDays <= 7) return { label: `J-${diffDays}`, color: "orange", days: diffDays };
  return { label: `J-${diffDays}`, color: "emerald", days: diffDays };
}

const TYPE_LABELS = { essai: "Essai", mensuel: "Mensuel", annuel: "Annuel", illimite: "Illimité" };

// ── Composant principal ───────────────────────────────────────────────────────
export default function SuperAdmin() {
  const { data: entreprises = [], loading, error, reload } = useSuperadminEntreprises();
  const { mutate: create,  loading: creating }  = useMutation(superadminService.create);
  const { mutate: rename }                       = useMutation(superadminService.update);
  const { mutate: toggle }                       = useMutation(superadminService.toggleStatut);
  const { mutate: saveAbo }                      = useMutation(superadminService.updateAbonnement);
  const { mutate: del }                          = useMutation(superadminService.delete);

  const [showCreate,    setShowCreate]    = useState(false);
  const [showPassword,  setShowPassword]  = useState(false);
  const [renameTarget,  setRenameTarget]  = useState(null);
  const [aboTarget,     setAboTarget]     = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [search,        setSearch]        = useState("");
  const [form, setForm] = useState({ nom: "", admin_login: "", admin_mdp: "",
    abonnement_type: "mensuel", abonnement_debut: "", abonnement_fin: "" });
  const [toast, setToast] = useState(null);
  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  const resetForm = () => setForm({ nom: "", admin_login: "", admin_mdp: "",
    abonnement_type: "mensuel", abonnement_debut: "", abonnement_fin: "" });

  const handleCreate = async () => {
    if (!form.nom.trim() || !form.admin_login.trim() || !form.admin_mdp)
      return notify("Nom, login et mot de passe sont obligatoires.", "error");
    if (form.admin_mdp.length < 4)
      return notify("Mot de passe trop court (4 caractères minimum).", "error");
    try {
      await create(form);
      notify(`Entreprise « ${form.nom.trim()} » créée avec succès.`);
      setShowCreate(false);
      resetForm();
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleToggle = async (ent) => {
    const action = ent.actif ? "suspendre" : "réactiver";
    const detail = ent.actif
      ? "Tous ses utilisateurs perdront immédiatement l'accès."
      : "Ses utilisateurs retrouveront l'accès à l'application.";
    if (!window.confirm(`Voulez-vous ${action} « ${ent.nom} » ?\n\n${detail}`)) return;
    try {
      await toggle(ent.id, !ent.actif);
      notify(`« ${ent.nom} » ${ent.actif ? "suspendue" : "réactivée"}.`);
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  // KPIs
  const nbTotal    = entreprises.length;
  const nbActives  = entreprises.filter(e => e.actif).length;
  const nbSuspend  = nbTotal - nbActives;
  const nbExpiring = entreprises.filter(e => {
    if (!e.abonnement_fin) return false;
    const diff = Math.ceil((new Date(e.abonnement_fin) - new Date()) / 86400000);
    return diff >= 0 && diff <= 7;
  }).length;
  const caGlobal   = entreprises.reduce((s, e) => s + Number(e.ca_total || 0), 0);

  const filtered = entreprises.filter(e =>
    !search || e.nom.toLowerCase().includes(search.toLowerCase()) || e.slug?.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="bg-gradient-to-br from-[#0023FF] to-[#3B5BFF] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <h1 className="text-lg font-black tracking-tight">Pilotage de la plateforme</h1>
            </div>
            <p className="text-white/70 text-sm">WariGest · Console Super-Admin</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowPassword(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-semibold transition text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Mot de passe
            </button>
            <button onClick={() => { resetForm(); setShowCreate(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#0023FF] text-sm font-black hover:bg-blue-50 transition shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouvelle entreprise
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <KpiCard label="Total" value={nbTotal} icon="🏢" />
          <KpiCard label="Actives" value={nbActives} icon="✅" accent="emerald" />
          <KpiCard label="Suspendues" value={nbSuspend} icon="⏸️" accent={nbSuspend > 0 ? "red" : null} />
          <KpiCard label="Expirent bientôt" value={nbExpiring} icon="⏰" accent={nbExpiring > 0 ? "orange" : null} />
        </div>
      </div>

      {/* ── Tableau des entreprises ── */}
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Barre de recherche + CA global */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 flex-wrap">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Rechercher une entreprise…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0023FF] w-56 transition" />
            </div>
            <div className="text-sm text-gray-400 font-semibold">
              CA cumulé :&nbsp;
              <span className="text-gray-700 font-black">{fmtNombre(caGlobal)} FCFA</span>
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Entreprise</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Abonnement</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">Activité</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Connexion</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-300 text-sm">
                      {search ? "Aucune entreprise ne correspond à la recherche." : "Aucune entreprise cliente."}
                    </td>
                  </tr>
                ) : filtered.map(ent => (
                  <EntrepriseRow
                    key={ent.id}
                    ent={ent}
                    onRename={() => setRenameTarget(ent)}
                    onToggle={() => handleToggle(ent)}
                    onAbonnement={() => setAboTarget(ent)}
                    onDelete={() => setDeleteTarget(ent)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pied de tableau + bouton ajouter */}
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {filtered.length} entreprise{filtered.length > 1 ? "s" : ""}
              {search && ` sur ${nbTotal}`}
            </span>
            <button onClick={() => { resetForm(); setShowCreate(true); }}
              className="flex items-center gap-1.5 text-sm font-bold text-[#0023FF] hover:text-[#0023FF]/70 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter une entreprise
            </button>
          </div>
        </div>
      )}

      {/* ── Modal création ── */}
      {showCreate && (
        <CreateModal
          form={form} setForm={setForm}
          onClose={() => { setShowCreate(false); resetForm(); }}
          onSubmit={handleCreate} loading={creating}
        />
      )}

      {/* ── Modal abonnement ── */}
      {aboTarget && (
        <AbonnementModal
          ent={aboTarget}
          onClose={() => setAboTarget(null)}
          mutate={saveAbo} notify={notify} reload={reload}
        />
      )}

      {/* ── Modal mot de passe ── */}
      {showPassword && (
        <PasswordModal onClose={() => setShowPassword(false)} notify={notify} />
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

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accent }) {
  const colors = { emerald: "text-emerald-300", red: "text-red-300", orange: "text-orange-300" };
  return (
    <div className="bg-white/15 rounded-xl px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/60 text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-2xl font-black ${accent && colors[accent] ? colors[accent] : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

// ── Ligne du tableau ──────────────────────────────────────────────────────────
function EntrepriseRow({ ent, onRename, onToggle, onAbonnement, onDelete }) {
  const isDefault = ent.id === 1;
  const abo = statutAbonnement(ent);
  const aboColors = {
    blue:    "bg-blue-50 text-blue-600 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange:  "bg-orange-50 text-orange-700 border-orange-200",
    red:     "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <tr className="hover:bg-gray-50/60 transition group">
      {/* Entreprise */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0
            ${ent.actif ? "bg-gradient-to-br from-[#0023FF] to-[#3B5BFF]" : "bg-gray-300"}`}>
            {ent.nom.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate max-w-[160px]">{ent.nom}</div>
            <div className="text-[11px] text-gray-400 font-mono mt-0.5">/{ent.slug}</div>
          </div>
        </div>
      </td>

      {/* Statut */}
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
          ${ent.actif
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-600 border-red-200"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ent.actif ? "bg-emerald-500" : "bg-red-500"}`}/>
          {ent.actif ? "Active" : "Suspendue"}
        </span>
      </td>

      {/* Abonnement */}
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600">
            {TYPE_LABELS[ent.abonnement_type] || "—"}
          </span>
          {ent.abonnement_fin ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${aboColors[abo.color]}`}>
              {abo.label} · {fmtDate(ent.abonnement_fin)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-600 border-blue-200">
              Pas de date d'expiration
            </span>
          )}
        </div>
      </td>

      {/* Activité */}
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="flex flex-col gap-0.5 text-xs text-gray-500">
          <span><span className="font-bold text-gray-700">{ent.nb_utilisateurs}</span> utilisateur{ent.nb_utilisateurs > 1 ? "s" : ""}</span>
          <span><span className="font-bold text-gray-700">{ent.nb_factures}</span> facture{ent.nb_factures > 1 ? "s" : ""}</span>
          <span className={Number(ent.creances) > 0 ? "text-red-500 font-semibold" : ""}>
            {fmtNombre(ent.ca_total)} FCFA CA
          </span>
        </div>
      </td>

      {/* Dernière connexion */}
      <td className="px-4 py-4 hidden lg:table-cell">
        <span className="text-xs text-gray-400">{fmtDateHeure(ent.derniere_connexion)}</span>
      </td>

      {/* Actions */}
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
          {/* Renommer */}
          <ActionBtn onClick={onRename} title="Renommer" color="blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </ActionBtn>

          {/* Abonnement */}
          <ActionBtn onClick={onAbonnement} title="Gérer l'abonnement" color="purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </ActionBtn>

          {/* Suspendre / Réactiver */}
          {!isDefault && (
            <ActionBtn onClick={onToggle} title={ent.actif ? "Suspendre" : "Réactiver"} color={ent.actif ? "orange" : "emerald"}>
              {ent.actif ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10"/><polyline points="10 8 16 12 10 16 10 8"/>
                </svg>
              )}
            </ActionBtn>
          )}

          {/* Supprimer */}
          {!isDefault && (
            <ActionBtn onClick={onDelete} title="Supprimer définitivement" color="red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </ActionBtn>
          )}
        </div>

        {/* Version compacte toujours visible sur mobile */}
        <div className="flex items-center justify-end gap-1 sm:hidden">
          <ActionBtn onClick={onRename} title="Renommer" color="blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </ActionBtn>
          {!isDefault && (
            <ActionBtn onClick={onDelete} title="Supprimer" color="red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              </svg>
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ children, onClick, title, color }) {
  const colors = {
    blue:   "hover:bg-blue-50 hover:text-[#0023FF]",
    purple: "hover:bg-purple-50 hover:text-purple-600",
    orange: "hover:bg-orange-50 hover:text-orange-600",
    emerald:"hover:bg-emerald-50 hover:text-emerald-600",
    red:    "hover:bg-red-50 hover:text-red-500",
  };
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 transition ${colors[color] || ""}`}>
      {children}
    </button>
  );
}

// ── Modal : créer une entreprise ──────────────────────────────────────────────
const TYPE_DUREES = { essai: 30, mensuel: 30, annuel: 365, illimite: null };

function CreateModal({ form, setForm, onClose, onSubmit, loading }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  };
  const today = () => new Date().toISOString().split("T")[0];

  // Quand on choisit un type, préremplit automatiquement les dates
  const setType = (t) => {
    const duree = TYPE_DUREES[t];
    if (duree) {
      setForm(p => ({ ...p, abonnement_type: t, abonnement_debut: today(), abonnement_fin: addDays(duree) }));
    } else {
      setForm(p => ({ ...p, abonnement_type: t, abonnement_debut: "", abonnement_fin: "" }));
    }
  };

  // Raccourcis manuels
  const setPreset = (days) => {
    setForm(p => ({ ...p, abonnement_debut: today(), abonnement_fin: addDays(days) }));
  };

  return (
    <Modal title="Nouvelle entreprise cliente" onClose={onClose}>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Crée un espace entièrement cloisonné (données, utilisateurs, articles, ventes, factures…
        séparés des autres entreprises) avec son premier compte <strong className="text-gray-600">Administrateur</strong>.
      </p>

      <div className="space-y-4">
        {/* Bloc entreprise */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Entreprise</p>
          <Input label="Nom de l'entreprise *" value={form.nom}
            onChange={e => f("nom", e.target.value)} placeholder="ex: Boutique Awa" />
        </div>

        {/* Bloc admin */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Premier administrateur</p>
          <Input label="Login *" value={form.admin_login}
            onChange={e => f("admin_login", e.target.value)} placeholder="ex: awa.admin" />
          <Input label="Mot de passe *" type="password" value={form.admin_mdp}
            onChange={e => f("admin_mdp", e.target.value)} placeholder="4 caractères minimum" />
        </div>

        {/* Bloc abonnement */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Abonnement</p>

          {/* Type — clique = préremplit les dates automatiquement */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              Type <span className="normal-case text-gray-300 font-normal">(préremplit les dates)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["essai","mensuel","annuel","illimite"].map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                    form.abonnement_type === t
                      ? "bg-[#0023FF] text-white border-[#0023FF]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#0023FF]/40"
                  }`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Raccourcis */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Raccourcis</label>
            <div className="flex flex-wrap gap-2">
              {[[7,"7 jours"],[30,"1 mois"],[90,"3 mois"],[180,"6 mois"],[365,"1 an"]].map(([d, l]) => (
                <button key={d} type="button" onClick={() => setPreset(d)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-bold hover:bg-[#E6EAFF] hover:text-[#0023FF] hover:border-[#0023FF]/30 transition">
                  +{l}
                </button>
              ))}
              <button type="button" onClick={() => setForm(p => ({ ...p, abonnement_debut: "", abonnement_fin: "" }))}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-100 transition">
                Illimité
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Début" type="date" value={form.abonnement_debut}
              onChange={e => f("abonnement_debut", e.target.value)} />
            <Input label="Fin (expiration)" type="date" value={form.abonnement_fin}
              onChange={e => f("abonnement_fin", e.target.value)} />
          </div>

          {/* Résumé visuel */}
          {form.abonnement_fin ? (
            <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
              ✅ Accès jusqu'au {new Date(form.abonnement_fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          ) : (
            <p className="text-xs text-blue-500 font-semibold bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
              ♾️ Accès illimité (pas de date d'expiration)
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <Btn onClick={onSubmit} loading={loading}>Créer l'entreprise</Btn>
      </div>
    </Modal>
  );
}

// ── Modal : gérer l'abonnement ────────────────────────────────────────────────
function AbonnementModal({ ent, onClose, mutate, notify, reload }) {
  const [type,   setType]   = useState(ent.abonnement_type  || "mensuel");
  const [debut,  setDebut]  = useState(ent.abonnement_debut ? ent.abonnement_debut.split("T")[0] : "");
  const [fin,    setFin]    = useState(ent.abonnement_fin   ? ent.abonnement_fin.split("T")[0]   : "");
  const [saving, setSaving] = useState(false);

  const abo = statutAbonnement({ abonnement_fin: fin || null });

  // Raccourcis dates
  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  };
  const setPreset = (days) => {
    const today = new Date().toISOString().split("T")[0];
    setDebut(today);
    setFin(addDays(days));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutate(ent.id, {
        abonnement_type:  type,
        abonnement_debut: debut || null,
        abonnement_fin:   fin   || null,
      });
      notify(`Abonnement de « ${ent.nom} » mis à jour.`);
      onClose();
      reload();
    } catch (err) { notify(err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Abonnement — ${ent.nom}`} onClose={onClose}>
      {/* Statut actuel */}
      {ent.abonnement_fin && (
        <div className={`rounded-xl px-4 py-3 mb-5 border text-sm font-semibold
          ${abo.color === "red"    ? "bg-red-50 border-red-200 text-red-700" :
            abo.color === "orange" ? "bg-orange-50 border-orange-200 text-orange-700" :
                                     "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          {abo.color === "red"    ? `⚠️  Abonnement expiré depuis ${fmtDate(ent.abonnement_fin)}` :
           abo.color === "orange" ? `⏰  Expire dans ${abo.days} jour${abo.days > 1 ? "s" : ""} — ${fmtDate(ent.abonnement_fin)}` :
                                    `✅  Actif jusqu'au ${fmtDate(ent.abonnement_fin)}`}
        </div>
      )}

      <div className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Type d'abonnement</label>
          <div className="grid grid-cols-4 gap-2">
            {["essai","mensuel","annuel","illimite"].map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                  type === t
                    ? "bg-[#0023FF] text-white border-[#0023FF]"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0023FF]/40"
                }`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Raccourcis */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Raccourcis</label>
          <div className="flex flex-wrap gap-2">
            {[[7,"7 jours"],[30,"1 mois"],[90,"3 mois"],[365,"1 an"]].map(([d,l]) => (
              <button key={d} type="button" onClick={() => setPreset(d)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-[#E6EAFF] hover:text-[#0023FF] transition">
                +{l}
              </button>
            ))}
            <button type="button" onClick={() => { setDebut(""); setFin(""); }}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition">
              Illimité
            </button>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date de début" type="date" value={debut} onChange={e => setDebut(e.target.value)} />
          <Input label="Date d'expiration" type="date" value={fin} onChange={e => setFin(e.target.value)} />
        </div>
        {!fin && (
          <p className="text-xs text-blue-500 font-semibold">
            ℹ️  Sans date d'expiration, l'accès est illimité dans le temps.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <Btn onClick={handleSave} loading={saving}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

// ── Modal : renommer ──────────────────────────────────────────────────────────
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
      <Input label="Nouveau nom *" value={nom} onChange={e => setNom(e.target.value)}
        placeholder={ent.nom} />
      <div className="flex justify-end gap-2 mt-5">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <Btn onClick={handleSave} loading={loading}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

// ── Modal : mot de passe SuperAdmin ──────────────────────────────────────────
function PasswordModal({ onClose, notify }) {
  const [mdpActuel,    setMdpActuel]    = useState("");
  const [nouveauMdp,   setNouveauMdp]   = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!mdpActuel || !nouveauMdp || !confirmation)
      return notify("Tous les champs sont obligatoires.", "error");
    if (nouveauMdp.length < 4)
      return notify("Le nouveau mot de passe doit contenir au moins 4 caractères.", "error");
    if (nouveauMdp !== confirmation)
      return notify("La confirmation ne correspond pas.", "error");
    setLoading(true);
    try {
      await authService.changePassword(mdpActuel, nouveauMdp);
      notify("Mot de passe modifié — utilisez-le dès votre prochaine connexion.");
      onClose();
    } catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Changer mon mot de passe" onClose={onClose}>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Ce mot de passe protège l'accès au pilotage complet de la plateforme.
        Choisissez-en un robuste et gardez-le secret.
      </p>
      <div className="space-y-3">
        <Input label="Mot de passe actuel *" type="password" value={mdpActuel}
          onChange={e => setMdpActuel(e.target.value)} placeholder="Mot de passe en cours" />
        <Input label="Nouveau mot de passe *" type="password" value={nouveauMdp}
          onChange={e => setNouveauMdp(e.target.value)} placeholder="4 caractères minimum" />
        <Input label="Confirmer *" type="password" value={confirmation}
          onChange={e => setConfirmation(e.target.value)} placeholder="Retapez le nouveau mot de passe" />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <Btn onClick={handleSave} loading={loading}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

// ── Modal : suppression ───────────────────────────────────────────────────────
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
            Action définitive — supprime tous ses utilisateurs, articles, ventes, factures…
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-xs text-red-700 leading-relaxed">
        Cette opération est <strong>irréversible</strong>. Toutes les données de cette
        entreprise seront effacées définitivement et ne pourront pas être récupérées.
      </div>

      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Tapez <span className="text-red-600 font-black font-mono">{ent.nom}</span> pour confirmer
        </label>
        <input type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder={ent.nom}
          className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition
            ${match ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 focus:border-red-300"}`} />
      </div>

      <div className="flex justify-end gap-2">
        <Btn color="gray" onClick={onClose}>Annuler</Btn>
        <button onClick={handleDelete} disabled={!match || loading}
          className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2">
          {loading && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10"/>
            </svg>
          )}
          Supprimer définitivement
        </button>
      </div>
    </Modal>
  );
}
