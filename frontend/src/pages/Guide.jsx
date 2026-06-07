// src/pages/Guide.jsx
import { useState } from "react";

const BRAND = "#0023FF";

/* ── Petits composants ─────────────────────────── */
function Step({ n, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
        style={{ background: BRAND }}>
        {n}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ icon = "💡", color = "amber", children }) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue:  "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    red:   "bg-red-50 border-red-200 text-red-800",
  };
  return (
    <div className={`flex gap-2 items-start px-3 py-2.5 rounded-xl border text-xs font-medium ${colors[color]}`}>
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Badge({ children, color }) {
  const map = {
    orange: "bg-[#E6EAFF] text-[#0023FF] border-[#B3BFFF]",
    blue:   "bg-blue-100 text-blue-700 border-blue-200",
    green:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    red:    "bg-red-100 text-red-700 border-red-200",
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg border ${map[color] || map.gray}`}>
      {children}
    </span>
  );
}

function Section({ id, icon, title, subtitle, accentColor = "#0023FF", children }) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5 print:mb-4 print:break-inside-avoid">
      {/* En-tête section */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition print:hover:bg-transparent"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: accentColor + "18" }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-gray-400 text-sm transition-transform print:hidden ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-2">
      <div className="h-3 w-0.5 bg-[#0023FF] rounded-full" />
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</p>
    </div>
  );
}

/* ── Page principale ────────────────────────────── */
export default function Guide() {
  const handlePrint = () => window.print();

  const modules = [
    { id: "dashboard",    icon: "🏠", label: "Tableau de Bord" },
    { id: "articles",     icon: "📦", label: "Articles & Stock" },
    { id: "ventes",       icon: "🛍️",  label: "Ventes" },
    { id: "appro",        icon: "🚚", label: "Approvisionnements" },
    { id: "clients",      icon: "👥", label: "Clients & Fournisseurs" },
    { id: "factures",     icon: "🧾", label: "Factures" },
    { id: "rapports",     icon: "📊", label: "Rapports Financiers" },
    { id: "utilisateurs", icon: "🔐", label: "Utilisateurs" },
  ];

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Hero ── */}
      <div className="rounded-2xl mb-6 overflow-hidden print:rounded-none print:mb-4"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #0F172A 55%, #0023FF55 100%)" }}>
        <div className="px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden">
              <svg viewBox="0 0 52 52" width="48" height="48" fill="none">
                <rect width="52" height="52" fill="#0023FF"/>
                <rect x="4" y="4" width="44" height="44" rx="8" fill="white"/>
                <path d="M9,13 L9,29 C9,40 27,40 27,29 L27,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M25,13 L25,29 C25,40 43,40 43,29 L43,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <line x1="47" y1="22" x2="47" y2="40" stroke="#0023FF" strokeWidth="5" strokeLinecap="round"/>
                <circle cx="47" cy="14" r="4" fill="#FFF900"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-black text-xl tracking-tight" style={{ fontFamily: "'Groote', sans-serif" }}>WariGest</div>
              <div className="text-[#B3BFFF] text-xs font-semibold">Gestion & Facturation</div>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight mb-1">
            Guide Utilisateur
          </h1>
          <p className="text-slate-300 text-sm">
            Tout ce qu'il faut savoir pour utiliser WariGest efficacement.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {modules.map(m => (
              <a key={m.id} href={`#${m.id}`}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-[#0023FF] transition border border-white/10">
                {m.icon} {m.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton imprimer */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:border-[#B3BFFF] hover:text-[#0023FF] transition shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimer / Exporter PDF
        </button>
      </div>

      {/* ═══════════════════════════════════════
          MODULE 0 – Tableau de Bord
      ═══════════════════════════════════════ */}
      <Section id="dashboard" icon="🏠" title="Tableau de Bord"
        subtitle="Vue globale de l'activité et alertes de stock en temps réel" accentColor="#6366f1">

        <SectionTitle>4 indicateurs clés (KPIs)</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "CA de l'année",    desc: "Chiffre d'affaires cumulé depuis le 1er janvier",             color: "orange" },
            { label: "Bénéfice Net",     desc: "CA total moins les dépenses fournisseurs de l'année",         color: "green" },
            { label: "Valeur du Stock",  desc: "Valeur totale du stock actif au prix d'achat",                color: "blue" },
            { label: "Factures Émises",  desc: "Nombre total de factures, avec le nombre d'impayées en sous-titre", color: "red" },
          ].map(i => (
            <div key={i.label} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xs font-bold text-gray-800">{i.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{i.desc}</div>
            </div>
          ))}
        </div>

        <SectionTitle>Autres blocs du tableau de bord</SectionTitle>
        <div className="space-y-2">
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-bold text-gray-800">📈 Taux de recouvrement</div>
            <div className="text-xs text-gray-400 mt-0.5">Barre de progression montrant la part encaissée vs. le total facturé. Vert ≥ 80 %, ambre ≥ 50 %, rouge en dessous.</div>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-bold text-gray-800">📊 Évolution du CA — graphique annuel</div>
            <div className="text-xs text-gray-400 mt-0.5">Courbe mois par mois du chiffre d'affaires pour l'année en cours.</div>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-bold text-gray-800">👥 Top Clients · 🧾 Dernières Factures · ⚠️ Alertes Stock</div>
            <div className="text-xs text-gray-400 mt-0.5">Trois panneaux côte à côte : meilleurs clients par CA, factures récentes avec statut, et articles en rupture ou stock bas.</div>
          </div>
        </div>

        <SectionTitle>Alertes de stock</SectionTitle>
        <p className="text-xs text-gray-500 leading-relaxed">
          Les articles dont le stock est inférieur au seuil minimum configuré apparaissent automatiquement dans le panneau <strong>Alertes Stock</strong>.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="text-xs font-bold text-amber-800 mb-1">⚠️ Stock bas</div>
            <p className="text-xs text-amber-600">Le stock restant est positif mais inférieur ou égal au stock minimum — l'article affiche la quantité restante.</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="text-xs font-bold text-red-800 mb-1">🔴 Rupture</div>
            <p className="text-xs text-red-600">Le stock est à zéro — l'article affiche <strong>Rupture</strong> en rouge.</p>
          </div>
        </div>

        <Tip icon="🔔" color="amber">
          En cas de rupture ou de stock bas, cliquez sur <strong>Approvisionnements</strong> dans le menu pour créer un réapprovisionnement directement.
        </Tip>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 1 – Articles & Stock
      ═══════════════════════════════════════ */}
      <Section id="articles" icon="📦" title="Articles & Stock"
        subtitle="Gérer le catalogue produits et les niveaux de stock">

        <SectionTitle>Ajouter un article</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur <strong>+ Nouvel Article</strong> en haut à droite.</Step>
          <Step n="2">Saisissez le <strong>libellé</strong> (nom du produit) — le code est généré automatiquement.</Step>
          <Step n="3">Renseignez le prix d'achat, le prix de vente et le stock minimum d'alerte.</Step>
          <Step n="4">Cliquez <strong>Enregistrer</strong>.</Step>
        </div>

        <Tip icon="✨" color="amber">
          Le code article est auto-généré depuis le nom : ex. <strong>BISCUIT → BIS001</strong>. Vous pouvez le modifier ou le régénérer avec le bouton ↺.
        </Tip>

        <SectionTitle>Modifier un article</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur le bouton ✏ en fin de ligne pour ouvrir le formulaire de modification.</Step>
          <Step n="2">Modifiez le libellé, les prix ou le seuil d'alerte minimum.</Step>
          <Step n="3">Cliquez <strong>Enregistrer</strong> — les changements s'appliquent immédiatement.</Step>
        </div>

        <SectionTitle>Gérer le stock</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Chaque approvisionnement met à jour le stock automatiquement.</Step>
          <Step n="2">Cliquez sur n'importe quel <strong>en-tête de colonne</strong> pour trier (▲/▼) : code, libellé, prix, stock, valeur.</Step>
          <Step n="3">Utilisez la barre de recherche pour filtrer rapidement par code ou libellé.</Step>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="text-center p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="text-emerald-600 font-black text-sm">Vert</div>
            <div className="text-xs text-gray-500 mt-0.5">Stock OK</div>
          </div>
          <div className="text-center p-2 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="text-amber-600 font-black text-sm">Ambre</div>
            <div className="text-xs text-gray-500 mt-0.5">Stock bas</div>
          </div>
          <div className="text-center p-2 bg-red-50 border border-red-100 rounded-xl">
            <div className="text-red-600 font-black text-sm">Rouge</div>
            <div className="text-xs text-gray-500 mt-0.5">Rupture</div>
          </div>
        </div>

        <Tip icon="🔢" color="blue">
          Le tri est <strong>persistant</strong> : il reste actif après chaque nouvel approvisionnement ou vente, sans avoir à trier à nouveau.
        </Tip>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 2 – Ventes
      ═══════════════════════════════════════ */}
      <Section id="ventes" icon="🛍️" title="Ventes"
        subtitle="Créer des ventes et générer des factures automatiquement">

        <SectionTitle>Créer une nouvelle vente</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur <strong>+ Nouvelle Vente</strong>.</Step>
          <Step n="2">Dans le champ <strong>Client</strong>, tapez les premières lettres pour filtrer la liste, puis cliquez sur un nom pour le sélectionner.</Step>
          <Step n="3">Si le client n'est pas encore enregistré, ouvrez la liste déroulante et cliquez sur <strong>+ Nouveau client</strong> — remplissez le mini-formulaire et il sera créé et sélectionné automatiquement.</Step>
          <Step n="4">Dans le panneau <strong>Catalogue</strong> (gauche / onglet mobile), recherchez un produit et cliquez <strong>+</strong> pour l'ajouter au panier.</Step>
          <Step n="5">Dans le <strong>Panier</strong> (droite / onglet mobile), ajustez les quantités et prix si nécessaire.</Step>
          <Step n="6">Choisissez le mode de paiement (<Badge color="green">Comptant</Badge> ou <Badge color="red">Crédit</Badge>) puis cliquez <strong>Valider</strong>.</Step>
        </div>

        <Tip icon="🎫" color="blue">
          Le <strong>ticket de caisse</strong> thermique s'ouvre automatiquement après chaque vente validée. La facture PDF reste accessible depuis l'onglet Factures.
        </Tip>
        <Tip icon="📱" color="amber">
          Sur mobile, utilisez les onglets <strong>Catalogue / Panier</strong> pour naviguer entre les deux panneaux.
        </Tip>

        <SectionTitle>Modifier la quantité dans le panier</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Utilisez les boutons <strong>−</strong> et <strong>+</strong> autour du nombre de quantité.</Step>
          <Step n="2">Cliquez directement sur le champ de quantité pour saisir une valeur précise.</Step>
          <Step n="3">Le prix unitaire est également modifiable pour appliquer une remise ponctuelle.</Step>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 3 – Approvisionnements
      ═══════════════════════════════════════ */}
      <Section id="appro" icon="🚚" title="Approvisionnements"
        subtitle="Commander plusieurs produits en une seule opération">

        <SectionTitle>Créer un approvisionnement</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur <strong>+ Nouvel Approvisionnement</strong>.</Step>
          <Step n="2">Dans le champ <strong>Fournisseur</strong>, tapez pour filtrer et cliquez sur un nom pour le sélectionner.</Step>
          <Step n="3">Si le fournisseur n'existe pas encore, ouvrez la liste et cliquez sur <strong>+ Nouveau fournisseur</strong> — il sera créé et sélectionné immédiatement.</Step>
          <Step n="4">Dans chaque ligne, tapez le nom ou code de l'article et sélectionnez-le dans la liste déroulante.</Step>
          <Step n="5">Saisissez la quantité et le prix unitaire d'achat.</Step>
          <Step n="6">Cliquez <strong>+ Ajouter un produit</strong> pour ajouter autant de lignes que nécessaire.</Step>
          <Step n="7">Définissez le mode de paiement et cliquez <strong>Enregistrer</strong>.</Step>
        </div>

        <Tip icon="⚡" color="green">
          Le bouton <strong>Comptant</strong> remplit automatiquement le montant payé au total de la commande.
        </Tip>
        <Tip icon="📋" color="amber">
          En mode <strong>Crédit total</strong>, la dette fournisseur est enregistrée et visible dans le tableau. Vous pouvez la solder plus tard via le bouton <strong>Payer</strong>.
        </Tip>

        <SectionTitle>Payer une dette fournisseur</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Repérez la ligne avec le statut <Badge color="orange">Crédit</Badge> dans le tableau.</Step>
          <Step n="2">Cliquez sur le bouton <strong>Payer</strong> en fin de ligne.</Step>
          <Step n="3">Saisissez le <strong>montant que vous versez maintenant</strong> (peut être partiel).</Step>
          <Step n="4">Ou cliquez sur <em>Solder la dette</em> pour régler le reste en une seule fois.</Step>
        </div>

        <Tip icon="🔢" color="blue">
          Cliquez sur n'importe quel <strong>en-tête de colonne</strong> pour trier le tableau (▲ croissant, ▼ décroissant). Le tri reste actif même après l'ajout de nouvelles opérations.
        </Tip>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 4 – Clients & Fournisseurs
      ═══════════════════════════════════════ */}
      <Section id="clients" icon="👥" title="Clients & Fournisseurs"
        subtitle="Gérer vos contacts commerciaux et consulter leur bilan financier">

        <SectionTitle>Ajouter un contact</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Choisissez l'onglet <Badge color="blue">Clients</Badge> ou <Badge color="orange">Fournisseurs</Badge>.</Step>
          <Step n="2">Cliquez sur <strong>+ Ajouter</strong> en haut à droite.</Step>
          <Step n="3">Renseignez le nom (obligatoire), le téléphone, l'email, la ville et l'adresse.</Step>
        </div>

        <SectionTitle>Modifier un contact</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Dans le tableau, cliquez sur l'icône <strong>✏</strong> (crayon) en fin de ligne du contact à modifier.</Step>
          <Step n="2">Le formulaire pré-rempli s'ouvre — modifiez les champs souhaités.</Step>
          <Step n="3">Cliquez <strong>Enregistrer</strong> pour valider les changements.</Step>
        </div>

        <Tip icon="🔗" color="blue">
          Les clients et fournisseurs créés ici apparaissent automatiquement dans les listes déroulantes de Ventes et Approvisionnements. Ils peuvent aussi être créés à la volée directement depuis ces modules.
        </Tip>

        <SectionTitle>Fiche financière complète</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur n'importe quelle ligne du tableau pour ouvrir la <strong>fiche financière</strong> du contact.</Step>
          <Step n="2">Le panneau affiche les <strong>KPIs</strong> : CA, encaissé, créances (client) ou achats, payé, dettes (fournisseur).</Step>
          <Step n="3">Un <strong>graphique en barres</strong> montre l'évolution mensuelle.</Step>
          <Step n="4">Le <strong>Top 5 articles</strong> et l'<strong>historique complet</strong> des transactions sont affichés en bas.</Step>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-xs font-bold text-blue-800 mb-1">👤 Fiche Client</div>
            <p className="text-xs text-blue-600">CA · Encaissé · Créances · Historique factures</p>
          </div>
          <div className="p-3 bg-[#E6EAFF] rounded-xl border border-[#B3BFFF]">
            <div className="text-xs font-bold text-[#0023FF] mb-1">🏭 Fiche Fournisseur</div>
            <p className="text-xs text-[#0023FF]/70">Total achats · Payé · Dettes · Bouton Payer intégré</p>
          </div>
        </div>

        <Tip icon="💰" color="amber">
          Depuis la fiche fournisseur, cliquez directement sur <strong>Payer</strong> en face d'un achat à crédit pour solder la dette sans quitter le panneau.
        </Tip>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 5 – Factures
      ═══════════════════════════════════════ */}
      <Section id="factures" icon="🧾" title="Factures"
        subtitle="Consulter, encaisser et générer des documents clients">

        <SectionTitle>Consulter une facture</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur le <strong>numéro de facture</strong> dans le tableau pour voir le détail.</Step>
          <Step n="2">Le détail affiche le client, la date, les articles, les montants et le statut de paiement.</Step>
        </div>

        <SectionTitle>Générer les documents</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-sm font-bold text-gray-800 mb-1">📄 Facture PDF</div>
            <p className="text-xs text-gray-500">Document A4 officiel avec détail des articles, totaux et coordonnées entreprise.</p>
            <div className="mt-2">
              <Badge color="orange">Bouton PDF dans le détail</Badge>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-sm font-bold text-gray-800 mb-1">🧾 Reçu thermique</div>
            <p className="text-xs text-gray-500">Ticket 80mm compact, idéal pour imprimante de caisse. S'ouvre en nouvelle fenêtre.</p>
            <div className="mt-2">
              <Badge color="blue">Bouton Reçu dans le détail</Badge>
            </div>
          </div>
        </div>

        <SectionTitle>Enregistrer un paiement</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Les factures impayées affichent un bouton <strong>Payer</strong> en fin de ligne.</Step>
          <Step n="2">Cliquez dessus, saisissez le <strong>montant encaissé maintenant</strong> (versement partiel ou total).</Step>
          <Step n="3">Cliquez sur le lien <em>Solder la dette</em> pour pré-remplir automatiquement le montant restant dû.</Step>
          <Step n="4">Ou ouvrez le détail de la facture et cliquez <strong>Enregistrer paiement</strong>.</Step>
        </div>

        <Tip icon="📊" color="green">
          Les indicateurs en haut de page (<em>CA Total, Factures réglées, Factures impayées, Reste à recouvrer</em>) se mettent à jour en temps réel après chaque paiement enregistré.
        </Tip>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 6 – Rapports
      ═══════════════════════════════════════ */}
      <Section id="rapports" icon="📊" title="Rapports Financiers"
        subtitle="Analyser les performances sur n'importe quelle période">

        <SectionTitle>Générer un rapport</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Sélectionnez une période prédéfinie : <em>Aujourd'hui, Cette semaine, Ce mois, Ce trimestre, Cette année</em>.</Step>
          <Step n="2">Ou choisissez <strong>Personnalisé</strong> pour définir vos propres dates de début et fin.</Step>
          <Step n="3">Le rapport se charge automatiquement à l'ouverture de la page (mois en cours).</Step>
        </div>

        <SectionTitle>Indicateurs disponibles</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Chiffre d'Affaires", desc: "Toutes les ventes de la période", color: "orange" },
            { label: "Total Dépenses",      desc: "Achats fournisseurs cumulés",    color: "red" },
            { label: "Bénéfice Net",        desc: "CA moins les dépenses",          color: "green" },
            { label: "Taux de marge",       desc: "Rentabilité en pourcentage",     color: "blue" },
            { label: "Recouvrement",        desc: "Part des factures encaissées",   color: "green" },
            { label: "Top 5 articles",      desc: "Produits les plus vendus",       color: "orange" },
          ].map(i => (
            <div key={i.label} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xs font-bold text-gray-800">{i.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{i.desc}</div>
            </div>
          ))}
        </div>

        <Tip icon="⬇" color="blue">
          Cliquez sur <strong>Exporter PDF</strong> pour télécharger le rapport complet au format PDF.
        </Tip>
      </Section>

      {/* ═══════════════════════════════════════
          MODULE 7 – Utilisateurs
      ═══════════════════════════════════════ */}
      <Section id="utilisateurs" icon="🔐" title="Utilisateurs"
        subtitle="Gérer les accès et les droits (Admin uniquement)">

        <Tip icon="🔒" color="red">
          Cet onglet est réservé aux comptes <Badge color="red">Admin</Badge>. Les autres utilisateurs n'y ont pas accès.
        </Tip>

        <SectionTitle>3 rôles disponibles</SectionTitle>
        <div className="space-y-2">
          {[
            { role: "Admin",        icon: "👑", desc: "Accès total à tous les modules, à la gestion des utilisateurs et à la réinitialisation des données." },
            { role: "Gestionnaire", icon: "🛡️", desc: "Profil polyvalent : articles, approvisionnements, clients, factures et rapports selon les permissions accordées." },
            { role: "Vendeur",      icon: "👤", desc: "Profil orienté vente : accès aux ventes, à la facturation et aux clients selon les permissions accordées." },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-base flex-shrink-0 mt-0.5">{r.icon}</span>
              <div>
                <Badge color={r.role === "Admin" ? "red" : r.role === "Gestionnaire" ? "blue" : "green"}>{r.role}</Badge>
                <p className="text-xs text-gray-600 mt-1">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Permissions par module</SectionTitle>
        <p className="text-xs text-gray-500 leading-relaxed mb-2">
          Quel que soit le rôle, vous pouvez activer ou désactiver chaque module indépendamment :
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { perm: "Ventes",       desc: "Créer et consulter les ventes" },
            { perm: "Appro.",       desc: "Gérer les approvisionnements" },
            { perm: "Articles",     desc: "Gérer le catalogue et le stock" },
            { perm: "Facturation",  desc: "Consulter et encaisser les factures" },
            { perm: "Clients",      desc: "Gérer les clients et fournisseurs" },
          ].map(p => (
            <div key={p.perm} className="flex items-start gap-2 p-2 bg-[#E6EAFF] border border-[#B3BFFF] rounded-xl">
              <span className="text-[#0023FF] font-black text-xs flex-shrink-0 mt-0.5">✓</span>
              <div>
                <div className="text-xs font-bold text-[#0023FF]">{p.perm}</div>
                <div className="text-[10px] text-[#0023FF]/60">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Créer un utilisateur</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur <strong>+ Nouvel Utilisateur</strong>.</Step>
          <Step n="2">Saisissez le <strong>login</strong> et le <strong>mot de passe</strong>, puis choisissez le rôle (Admin / Gestionnaire / Vendeur).</Step>
          <Step n="3">Cochez les permissions souhaitées dans la grille <em>Permissions modules</em>.</Step>
          <Step n="4">Cliquez <strong>Créer</strong> — le compte apparaît immédiatement sous forme de carte.</Step>
        </div>

        <SectionTitle>Supprimer un utilisateur</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Repérez la <strong>carte</strong> de l'utilisateur dans la grille.</Step>
          <Step n="2">Cliquez sur le bouton <strong>✕</strong> dans le coin supérieur droit de la carte.</Step>
          <Step n="3">Confirmez dans la boîte de dialogue. L'opération est <strong>définitive</strong>.</Step>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="text-xs font-bold text-emerald-800 mb-1">✅ Autorisé</div>
            <p className="text-xs text-emerald-600">Un Admin peut supprimer n'importe quel autre utilisateur, y compris un autre Admin.</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="text-xs font-bold text-red-800 mb-1">🚫 Interdit</div>
            <p className="text-xs text-red-600">Un Admin ne peut pas supprimer son propre compte pour éviter de se bloquer.</p>
          </div>
        </div>

        <Tip icon="⚠️" color="red">
          La suppression est permanente. Toutes les opérations (ventes, factures, achats) créées par cet utilisateur sont conservées, mais le compte est définitivement retiré.
        </Tip>

        <SectionTitle>Réinitialiser les données</SectionTitle>
        <div className="space-y-2">
          <Step n="1">Cliquez sur l'icône <strong>↺</strong> (petite icône rouge, en haut à droite de la page Utilisateurs) pour ouvrir le panneau de réinitialisation.</Step>
          <Step n="2">Cochez les modules à effacer parmi : <em>Ventes, Factures, Approvisionnements, Clients &amp; Fournisseurs, Articles &amp; Stock, Gammes, Journal d'audit</em>.</Step>
          <Step n="3">Cliquez <strong>Continuer</strong>, tapez <code className="bg-red-100 text-red-700 px-1 rounded font-mono text-xs">REINITIALISER</code> dans le champ de confirmation.</Step>
          <Step n="4">Cliquez <strong>Réinitialiser définitivement</strong> pour exécuter l'opération.</Step>
        </div>

        <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-1.5 mt-1">
          <p className="text-xs font-black text-red-800">⚠️ Points importants</p>
          <p className="text-xs text-red-700">• L'action est <strong>irréversible</strong> — les données ne peuvent pas être récupérées.</p>
          <p className="text-xs text-red-700">• Effacer les <strong>Articles</strong> supprime aussi automatiquement les ventes et achats liés.</p>
          <p className="text-xs text-red-700">• Effacer les <strong>Factures</strong> supprime aussi les lignes de vente associées.</p>
          <p className="text-xs text-red-700">• Effacer les <strong>Gammes</strong> sans effacer les articles détache ces derniers de leur gamme (sans les supprimer).</p>
          <p className="text-xs text-red-700">• Les comptes utilisateurs ne sont <strong>jamais</strong> affectés par cette réinitialisation.</p>
        </div>
      </Section>

      {/* ── Pied de page ── */}
      <div className="mt-4 mb-8 text-center text-xs text-gray-400 print:mt-2">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
          <div className="w-5 h-5 rounded-md overflow-hidden">
            <svg viewBox="0 0 52 52" width="20" height="20" fill="none">
              <rect width="52" height="52" fill="#0023FF"/>
              <rect x="4" y="4" width="44" height="44" rx="8" fill="white"/>
              <path d="M9,13 L9,29 C9,40 27,40 27,29 L27,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M25,13 L25,29 C25,40 43,40 43,29 L43,13" stroke="#0023FF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <line x1="47" y1="22" x2="47" y2="40" stroke="#0023FF" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="47" cy="14" r="4" fill="#FFF900"/>
            </svg>
          </div>
          <span><strong className="text-gray-600">WariGest</strong> — Guide Utilisateur · Toutes les fonctionnalités</span>
        </div>
      </div>

      {/* ── Styles d'impression ── */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          button { pointer-events: none; }
        }
      `}</style>
    </div>
  );
}
