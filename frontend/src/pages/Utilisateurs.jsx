// src/pages/Utilisateurs.jsx
import { useState } from "react";
import { useUtilisateurs } from "../hooks/useApi";
import { utilisateursService, adminService } from "../services";
import { useMutation } from "../hooks/useApi";
import { Spinner, ErrorBox, Badge, Modal, Select, Input, Btn, PageHeader, Toast } from "../components/UI";

const MODULES = [
  { key: "perm_vente",       label: "Ventes",       icon: "↗" },
  { key: "perm_appro",       label: "Appro.",        icon: "↙" },
  { key: "perm_articles",    label: "Articles",      icon: "◫" },
  { key: "perm_facturation", label: "Facturation",   icon: "▤" },
  { key: "perm_clients",     label: "Clients",       icon: "◎" },
];

const RESET_MODULES = [
  { key: "ventes",   label: "Ventes",             desc: "Toutes les lignes de vente",                    color: "orange" },
  { key: "factures", label: "Factures",            desc: "Factures et paiements associés",                color: "blue"   },
  { key: "achats",   label: "Approvisionnements",  desc: "Achats fournisseurs",                           color: "purple" },
  { key: "clients",  label: "Clients & Fourn.",    desc: "Tous les contacts",                             color: "teal"   },
  { key: "articles", label: "Articles & Stock",    desc: "Catalogue produits et stocks",                  color: "green"  },
  { key: "gammes",   label: "Gammes",              desc: "Familles de produits et leurs variantes",       color: "amber"  },
  { key: "audit",    label: "Journal d'audit",     desc: "Historique des actions",                        color: "gray"   },
];

const COLOR_MAP = {
  orange: { bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700"  },
  blue:   { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700"    },
  amber:  { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700"   },
  purple: { bg: "bg-purple-50",  border: "border-purple-200",  text: "text-purple-700"  },
  teal:   { bg: "bg-teal-50",    border: "border-teal-200",    text: "text-teal-700"    },
  green:  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  gray:   { bg: "bg-gray-50",    border: "border-gray-200",    text: "text-gray-600"    },
};

const ROLE_COLOR = { Admin: "purple", Gestionnaire: "blue", Vendeur: "amber" };
const ROLE_ICON  = { Admin: "👑", Gestionnaire: "🛡️", Vendeur: "👤" };

export default function Utilisateurs() {
  const { data: users = [], loading, error, reload } = useUtilisateurs();
  const { mutate: create, loading: saving } = useMutation(utilisateursService.create);
  const { mutate: del } = useMutation(utilisateursService.delete);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [form, setForm] = useState({
    login: "", mdp: "", categorie: "Vendeur",
    perm_vente: true, perm_appro: false, perm_articles: false,
    perm_facturation: true, perm_clients: true,
  });
  const [toast, setToast] = useState(null);
  const notify = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const handleSave = async () => {
    if (!form.login || !form.mdp) return notify("Login et mot de passe requis.", "error");
    try {
      await create(form);
      notify("Utilisateur créé !");
      setShowAdd(false);
      setForm({ login: "", mdp: "", categorie: "Vendeur", perm_vente: true, perm_appro: false, perm_articles: false, perm_facturation: true, perm_clients: true });
      reload();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleDel = async (id, login) => {
    if (!window.confirm(`Supprimer l'utilisateur ${login} ?`)) return;
    try { await del(id); notify("Utilisateur supprimé."); reload(); }
    catch (err) { notify(err.message, "error"); }
  };

  const nbAdmins  = users.filter(u => u.categorie === "Admin").length;
  const nbActifs  = users.length;

  return (
    <div>
      <PageHeader
        title="Gestion des Utilisateurs"
        sub={`${nbActifs} utilisateur${nbActifs > 1 ? "s" : ""} — ${nbAdmins} admin${nbAdmins > 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReset(true)} title="Réinitialiser les données"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
            <Btn onClick={() => setShowAdd(true)}>+ Nouvel Utilisateur</Btn>
          </div>
        }
      />

      {/* ── Cartes utilisateurs ── */}
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => (
            <UserCard key={u.id} user={u} onDelete={handleDel} />
          ))}

          {/* Carte "Ajouter" */}
          <button onClick={() => setShowAdd(true)}
            className="rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition min-h-[160px]">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center text-xl font-light">+</div>
            <span className="text-sm font-semibold">Ajouter un utilisateur</span>
          </button>
        </div>
      )}

      {/* ── Modal ajout ── */}
      {showAdd && (
        <Modal title="Nouvel Utilisateur" onClose={() => setShowAdd(false)}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Input label="Login *" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="ex: marie" />
            <Input label="Mot de passe *" type="password" value={form.mdp} onChange={(e) => setForm({ ...form, mdp: e.target.value })} />
            <div className="col-span-2">
              <Select label="Rôle" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                <option>Admin</option><option>Gestionnaire</option><option>Vendeur</option>
              </Select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Permissions modules</div>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label key={m.key} className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border transition ${
                  form[m.key] ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200 hover:border-gray-300"
                }`}>
                  <input type="checkbox" checked={form[m.key]}
                    onChange={(e) => setForm({ ...form, [m.key]: e.target.checked })}
                    className="accent-orange-500 w-4 h-4" />
                  <span className="text-sm">{m.icon}</span>
                  <span className={`text-sm font-medium ${form[m.key] ? "text-orange-700" : "text-gray-600"}`}>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Btn color="gray" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn onClick={handleSave} loading={saving}>Créer</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal réinitialisation ── */}
      {showReset && <ResetModal onClose={() => setShowReset(false)} notify={notify} />}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Carte utilisateur ─────────────────────────────────────────────
function UserCard({ user: u, onDelete }) {
  const permsActives = MODULES.filter(m => u[m.key]);
  const permsInactives = MODULES.filter(m => !u[m.key]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black
            ${u.categorie === "Admin" ? "bg-purple-100" : u.categorie === "Gestionnaire" ? "bg-blue-100" : "bg-amber-100"}`}>
            {ROLE_ICON[u.categorie] || "👤"}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{u.login}</div>
            <Badge color={ROLE_COLOR[u.categorie] || "gray"}>{u.categorie}</Badge>
          </div>
        </div>
        <button onClick={() => onDelete(u.id, u.login)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>

      {/* Permissions */}
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Accès aux modules</div>
        <div className="flex flex-wrap gap-1.5">
          {permsActives.map(m => (
            <span key={m.key} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="text-emerald-500 text-xs">✓</span> {m.label}
            </span>
          ))}
          {permsInactives.map(m => (
            <span key={m.key} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-300 border border-gray-100">
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Barre modules actifs */}
      <div className="pt-2 border-t border-gray-50">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">Modules actifs</span>
          <span className="text-xs font-bold text-gray-600">{permsActives.length}/{MODULES.length}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((permsActives.length / MODULES.length) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Modal réinitialisation ────────────────────────────────────────
function ResetModal({ onClose, notify }) {
  const [selected, setSelected] = useState([]);
  const [step,     setStep]     = useState(1);
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const toggle = (key) => setSelected(s => {
    const next = s.includes(key) ? s.filter(k => k !== key) : [...s, key];
    // Supprimer gammes impose de supprimer articles (FK)
    if (key === "gammes" && !s.includes("gammes") && !next.includes("articles"))
      return [...next, "articles"];
    return next;
  });
  const selectAll = () => setSelected(selected.length === RESET_MODULES.length ? [] : RESET_MODULES.map(m => m.key));

  const handleReset = async () => {
    if (confirm !== "REINITIALISER") return;
    setLoading(true);
    try {
      await adminService.reset(selected);
      notify("Données réinitialisées avec succès.", "success");
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Erreur lors de la réinitialisation.", "error");
    } finally { setLoading(false); }
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
          <div className="font-black text-gray-900 text-base">Réinitialisation des données</div>
          <div className="text-xs text-red-500 font-semibold">Action irréversible — les données supprimées ne peuvent pas être récupérées</div>
        </div>
      </div>

      {step === 1 && (
        <>
          <label className="flex items-center gap-2 mb-3 cursor-pointer p-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:bg-gray-50">
            <input type="checkbox" checked={selected.length === RESET_MODULES.length} onChange={selectAll} className="accent-red-500 w-4 h-4" />
            <span className="text-sm font-bold text-gray-700">Tout sélectionner</span>
          </label>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {RESET_MODULES.map((m) => {
              const c = COLOR_MAP[m.color];
              const sel = selected.includes(m.key);
              return (
                <label key={m.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${sel ? `${c.bg} ${c.border}` : "bg-white border-gray-100 hover:border-gray-200"}`}>
                  <input type="checkbox" checked={sel} onChange={() => toggle(m.key)} className="w-4 h-4 accent-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${sel ? c.text : "text-gray-700"}`}>{m.label}</div>
                    <div className="text-xs text-gray-400">{m.desc}</div>
                  </div>
                  {sel && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>✓</span>}
                </label>
              );
            })}
          </div>
          {selected.includes("gammes") && (
            <div className="flex items-start gap-2 px-3 py-2 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <span>La suppression des <strong>Gammes</strong> entraîne automatiquement celle des <strong>Articles & Stock</strong> liés.</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Btn color="gray" onClick={onClose}>Annuler</Btn>
            <button onClick={() => setStep(2)} disabled={selected.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Continuer →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Modules qui seront effacés :</div>
            <div className="flex flex-wrap gap-2">
              {selected.map(key => {
                const m = RESET_MODULES.find(r => r.key === key);
                const c = COLOR_MAP[m.color];
                return <span key={key} className={`text-xs font-bold px-3 py-1 rounded-full ${c.bg} ${c.text}`}>{m.label}</span>;
              })}
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tapez <span className="text-red-600 font-black font-mono">REINITIALISER</span> pour confirmer
            </label>
            <input type="text" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="REINITIALISER"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition ${
                confirm === "REINITIALISER" ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 focus:border-red-300"
              }`} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn color="gray" onClick={() => { setStep(1); setConfirm(""); }}>← Retour</Btn>
            <button onClick={handleReset} disabled={confirm !== "REINITIALISER" || loading}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2">
              {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10"/></svg>}
              Réinitialiser définitivement
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
