// src/pages/Parametres.jsx — Personnalisation de l'entreprise (admin)
// Permet à chaque société qui utilise WariGest de renseigner ses propres
// nom, coordonnées, devise, logo et couleur d'accent. Ces réglages sont
// ensuite appliqués automatiquement par le serveur aux factures, reçus et
// rapports PDF générés — sans modification de code ni redéploiement.
import { useEffect, useRef, useState } from "react";
import { useEntreprise } from "../hooks/useApi";
import { entrepriseService } from "../services";
import { Spinner, ErrorBox, Card, Input, Btn, PageHeader, Toast, SectionTitle } from "../components/UI";

const DEVISES = ["FCFA", "EUR", "USD", "XOF", "XAF", "MAD", "GNF", "CDF", "NGN", "GHS"];

const DEFAULT_FORM = {
  nom: "", adresse: "", telephone: "", email: "",
  devise: "FCFA", couleur: "#0023FF", logo: "", pied_de_page: "",
  facture_style: "classic-bleu", recu_style: "classic-bleu", rapport_style: "classic-bleu",
};

// Onglets de la galerie de styles PDF (3 types de documents)
const DOC_TABS = [
  { key: "facture", label: "Factures", field: "facture_style" },
  { key: "recu",    label: "Reçus",    field: "recu_style" },
  { key: "rapport", label: "Rapports", field: "rapport_style" },
];

// ── Aperçu miniature CSS d'une mise en page (5 architectures) ─────────────
function StyleThumb({ layoutId, pal }) {
  const ACC = pal.primary, LIGHT = pal.light, DARK = pal.dark;
  switch (layoutId) {
    case "moderne":
      return (
        <div className="relative w-full h-full bg-white">
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ACC }} />
          <div className="absolute top-3 left-3 w-2/5 h-2 rounded-sm bg-gray-100" />
          <div className="absolute top-7 left-3 w-1/3 h-2.5 rounded-sm bg-gray-200" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute left-3 right-3 h-px bg-gray-100" style={{ top: `${52 + i * 11}%` }} />
          ))}
          <div className="absolute bottom-2.5 right-3 w-1/3 h-1.5 rounded-sm" style={{ background: ACC }} />
        </div>
      );
    case "bloc":
      return (
        <div className="relative w-full h-full bg-white">
          <div className="absolute top-0 left-0 right-0 h-[36%]" style={{ background: ACC }} />
          <div className="absolute top-2 left-3 w-1/3 h-2 rounded-sm bg-white/85" />
          <div className="absolute top-2 right-3 w-1/4 h-2 rounded-sm bg-white/60" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute left-3 right-3 h-1.5 rounded-sm" style={{ top: `${46 + i * 13}%`, background: i % 2 ? LIGHT : "#F3F4F6" }} />
          ))}
          <div className="absolute bottom-2 right-3 w-1/3 h-2 rounded-sm border" style={{ background: LIGHT, borderColor: ACC }} />
        </div>
      );
    case "elegant":
      return (
        <div className="relative w-full h-full bg-white flex flex-col items-center pt-2.5">
          <div className="w-1/3 h-1.5 rounded-sm bg-gray-300 mb-1.5" />
          <div className="w-2/3 h-px bg-gray-200 mb-0.5" />
          <div className="w-2/3 h-px mb-2" style={{ background: ACC }} />
          <div className="w-1/2 h-2 rounded-sm mb-2.5" style={{ background: DARK }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-4/5 h-px bg-gray-100 mb-1.5" />
          ))}
          <div className="w-2/3 h-px mt-1" style={{ background: ACC }} />
        </div>
      );
    case "compact":
      return (
        <div className="relative w-full h-full bg-white p-2.5">
          <div className="flex justify-between mb-1.5">
            <div className="w-1/3 h-1.5 rounded-sm bg-gray-300" />
            <div className="w-1/4 h-1.5 rounded-sm" style={{ background: ACC }} />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-full h-[5px] mb-[2px] rounded-sm" style={{ background: i % 2 ? LIGHT : "transparent" }} />
          ))}
        </div>
      );
    case "classic":
    default:
      return (
        <div className="relative w-full h-full bg-white">
          <div className="absolute top-2 left-3 w-1/3 h-2 rounded-sm bg-gray-300" />
          <div className="absolute top-2 right-3 w-1/4 h-2.5 rounded-sm" style={{ background: ACC }} />
          <div className="absolute top-7 left-3 right-3 h-px bg-gray-200" />
          <div className="absolute top-9 left-3 right-3 h-2 rounded-sm" style={{ background: ACC }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute left-3 right-3 h-1.5 rounded-sm bg-gray-50 border border-gray-100" style={{ top: `${52 + i * 12}%` }} />
          ))}
          <div className="absolute bottom-2 right-3 w-1/3 h-2 rounded-sm border" style={{ background: LIGHT, borderColor: ACC }} />
        </div>
      );
  }
}

// ── Galerie de sélection des 25 styles (5 layouts × 5 palettes) ───────────
function StyleGallery({ catalog, palettes, value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 max-h-[24rem] overflow-y-auto p-1 -m-1">
      {catalog.map((s) => {
        const pal = palettes[s.palette];
        const active = value === s.id;
        return (
          <button key={s.id} type="button" onClick={() => onChange(s.id)}
            className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${active ? "" : "border-gray-100 hover:border-gray-200"}`}
            style={active ? { borderColor: pal.primary, boxShadow: `0 0 0 2px ${pal.primary}33` } : undefined}>
            <div className="h-16 w-full">
              <StyleThumb layoutId={s.layout} pal={pal} />
            </div>
            <div className="px-2 py-1.5 bg-white border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-700 truncate">{s.label}</p>
            </div>
            {active && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: pal.primary }}>✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Redimensionne et compresse une image côté client avant envoi (même logique
// que le scan de facture dans Achats.jsx) — garde le PNG pour préserver la
// transparence des logos, limite la taille à 320px de côté.
const resizeLogoBase64 = (file, maxDim = 320) =>
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
          width  = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

export default function Parametres() {
  const { data: cfg, loading, error, reload } = useEntreprise();
  const [form,    setForm]    = useState(DEFAULT_FORM);
  const [saving,  setSaving]  = useState(false);
  const [logoErr, setLogoErr] = useState("");
  const [toast,   setToast]   = useState(null);
  const [pdfStyles, setPdfStyles] = useState(null);
  const [styleTab,  setStyleTab]  = useState("facture");
  const fileRef = useRef(null);

  // Charge le catalogue des 25 styles PDF (layouts × palettes)
  useEffect(() => {
    entrepriseService.getPdfStyles().then(setPdfStyles).catch(() => {});
  }, []);

  const notify = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  // Pré-remplit le formulaire dès que la config est chargée
  useEffect(() => {
    if (cfg) {
      setForm({
        nom:          cfg.nom          || "",
        adresse:      cfg.adresse      || "",
        telephone:    cfg.telephone    || "",
        email:        cfg.email        || "",
        devise:       cfg.devise       || "FCFA",
        couleur:      cfg.couleur      || "#0023FF",
        logo:         cfg.logo         || "",
        pied_de_page: cfg.pied_de_page || "",
        facture_style: cfg.facture_style || "classic-bleu",
        recu_style:    cfg.recu_style    || "classic-bleu",
        rapport_style: cfg.rapport_style || "classic-bleu",
      });
    }
  }, [cfg]);

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-choisir le même fichier
    if (!file) return;
    setLogoErr("");
    if (!file.type.startsWith("image/")) { setLogoErr("Choisissez un fichier image (PNG, JPEG, WebP)."); return; }
    if (file.size > 8 * 1024 * 1024)      { setLogoErr("Image trop volumineuse (8 Mo max avant compression)."); return; }
    try {
      const base64 = await resizeLogoBase64(file);
      setForm((f) => ({ ...f, logo: base64 }));
    } catch (err) {
      setLogoErr(err.message || "Impossible de traiter cette image.");
    }
  };

  const handleSave = async () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.couleur)) return notify("Couleur invalide. Utilisez un code hexadécimal, ex: #0023FF.", "error");
    setSaving(true);
    try {
      await entrepriseService.updateConfig(form);
      notify("Configuration enregistrée ! Vos PDF utiliseront désormais ces informations.");
      reload();
    } catch (err) {
      notify(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error)   return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Paramètres de l'entreprise"
        sub="Personnalisez les informations affichées sur vos factures, reçus et rapports PDF"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Formulaire ── */}
        <div className="lg:col-span-3 space-y-5">
          <Card>
            <SectionTitle>Informations de l'entreprise</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="sm:col-span-2">
                <Input label="Nom de l'entreprise" value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: Ets Diallo & Frères" />
              </div>
              <div className="sm:col-span-2">
                <Input label="Adresse" value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="ex: Marché Sandaga, Dakar" />
              </div>
              <Input label="Téléphone" value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="ex: +221 77 123 45 67" />
              <Input label="Email" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ex: contact@entreprise.com" />
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Devise</label>
                <select value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-800 border border-gray-200 bg-white
                    hover:border-gray-300 focus:border-[#0023FF] focus:ring-4 focus:ring-[#0023FF]/8
                    transition-all duration-150 outline-none cursor-pointer">
                  {DEVISES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Couleur d'accent</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.couleur}
                    onChange={(e) => setForm({ ...form, couleur: e.target.value })}
                    className="w-11 h-[42px] rounded-xl border border-gray-200 cursor-pointer p-1 bg-white" />
                  <input type="text" value={form.couleur}
                    onChange={(e) => setForm({ ...form, couleur: e.target.value })}
                    placeholder="#0023FF" maxLength={7}
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-800 border border-gray-200 bg-white
                      hover:border-gray-300 focus:border-[#0023FF] focus:ring-4 focus:ring-[#0023FF]/8
                      transition-all duration-150 outline-none uppercase" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Logo</SectionTitle>
            <p className="text-xs text-gray-400 mt-1 mb-3">Affiché en en-tête de vos factures, reçus et rapports PDF. Format PNG, JPEG ou WebP recommandé (idéalement carré, fond transparent).</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {form.logo
                  ? <img src={form.logo} alt="Logo entreprise" className="w-full h-full object-contain" />
                  : <span className="text-[10px] text-gray-300 font-semibold text-center px-1">Aucun logo</span>}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Btn sm onClick={() => fileRef.current?.click()}>{form.logo ? "Changer le logo" : "Importer un logo"}</Btn>
                  {form.logo && (
                    <Btn sm color="red" onClick={() => setForm({ ...form, logo: "" })}>Retirer</Btn>
                  )}
                </div>
                {logoErr && <p className="text-xs text-red-500 font-medium">{logoErr}</p>}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Pied de page personnalisé</SectionTitle>
            <p className="text-xs text-gray-400 mt-1 mb-3">Message affiché en bas de vos factures et reçus (remplace le message par défaut).</p>
            <Input value={form.pied_de_page}
              onChange={(e) => setForm({ ...form, pied_de_page: e.target.value })}
              placeholder="ex: Merci pour votre confiance — Paiement à 30 jours." />
          </Card>

          <div className="flex justify-end">
            <Btn onClick={handleSave} loading={saving}>Enregistrer les modifications</Btn>
          </div>
        </div>

        {/* ── Aperçu ── */}
        <div className="lg:col-span-2">
          <div className="sticky top-4">
            <Card padding={false} className="overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <SectionTitle>Aperçu de l'en-tête PDF</SectionTitle>
              </div>
              <div className="p-5">
                <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="h-1.5" style={{ background: form.couleur }} />
                  <div className="p-4 bg-white flex items-start gap-3">
                    {form.logo && (
                      <img src={form.logo} alt="Logo" className="w-11 h-11 object-contain rounded-lg flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold text-gray-800 text-[15px] truncate">{form.nom || "Nom de l'entreprise"}</div>
                      <div className="text-[11px] text-gray-400 truncate">{form.adresse || "Adresse de l'entreprise"}</div>
                      {(form.telephone || form.email) && (
                        <div className="text-[11px] text-gray-400 truncate">
                          {form.telephone}{form.telephone && form.email ? "  ·  " : ""}{form.email}
                        </div>
                      )}
                    </div>
                    <div className="ml-auto text-right flex-shrink-0">
                      <div className="font-black text-gray-800 text-lg tracking-tight">FACTURE</div>
                      <div className="text-[10px] text-gray-400">N° FACT0001</div>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="rounded-lg px-3 py-2 text-right text-sm font-bold" style={{ background: form.couleur + "15", color: form.couleur }}>
                      TOTAL — 125 000 {form.devise}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  Ces informations seront appliquées automatiquement à toutes les factures, tous les reçus et tous les rapports financiers générés en PDF — aucune autre modification n'est nécessaire.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Styles des documents PDF ── */}
      <div className="mt-5">
        <Card>
          <SectionTitle>Styles des documents PDF</SectionTitle>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Choisissez l'apparence de vos factures, reçus et rapports financiers parmi 25 styles (5 mises en page × 5 palettes de couleurs). Le style est appliqué immédiatement à la prochaine génération PDF.
          </p>

          {!pdfStyles ? <Spinner sm /> : (
            <>
              <div className="flex gap-2 mb-3 flex-wrap">
                {DOC_TABS.map((t) => (
                  <button key={t.key} type="button" onClick={() => setStyleTab(t.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      styleTab === t.key ? "bg-[#0023FF] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {DOC_TABS.filter((t) => t.key === styleTab).map((t) => (
                <StyleGallery key={t.key}
                  catalog={pdfStyles.catalog}
                  palettes={pdfStyles.palettes}
                  value={form[t.field]}
                  onChange={(id) => setForm((f) => ({ ...f, [t.field]: id }))}
                />
              ))}
            </>
          )}
        </Card>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
