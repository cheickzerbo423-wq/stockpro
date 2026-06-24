// src/pages/Parametres.jsx — Personnalisation de l'entreprise (admin)
// Permet à chaque société qui utilise WariGest de renseigner ses propres
// nom, coordonnées, devise, logo et couleur d'accent. Ces réglages sont
// ensuite appliqués automatiquement par le serveur aux factures, reçus et
// rapports PDF générés — sans modification de code ni redéploiement.
import { useEffect, useRef, useState } from "react";
import { useEntreprise } from "../hooks/useApi";
import { entrepriseService } from "../services";
import { openBlob } from "../services/api";
import * as printer from "../utils/printer";
import { Spinner, ErrorBox, Card, Input, Btn, PageHeader, Toast, SectionTitle, Modal } from "../components/UI";

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

// ── Carte : connexion imprimante (Bluetooth tickets + PDF système) ─────────
function PrinterCard() {
  const [name, setName] = useState(printer.getPrinterName());
  const [mode, setMode] = useState(printer.getPrintMode());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState(null);
  const supported = printer.isBluetoothSupported();

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleConnect = async () => {
    setBusy(true);
    try {
      const n = await printer.connectPrinter();
      setName(n);
      flash(`Imprimante « ${n} » connectée.`);
    } catch (e) {
      if (e?.name !== "NotFoundError") flash(e.message || "Connexion annulée.", "error");
    } finally { setBusy(false); }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      await printer.printTest();
      flash("Ticket de test envoyé à l'imprimante.");
    } catch (e) { flash(e.message || "Échec de l'impression.", "error"); }
    finally { setBusy(false); }
  };

  const handleForget = () => {
    printer.forgetPrinter();
    setName("");
    flash("Imprimante oubliée.");
  };

  const changeMode = (m) => { setMode(m); printer.setPrintMode(m); };

  return (
    <Card>
      <SectionTitle>Imprimante</SectionTitle>
      <p className="text-xs text-gray-400 mt-1 mb-4">
        Connectez une mini-imprimante Bluetooth pour les tickets de reçu, et/ou imprimez les factures, reçus et rapports en PDF sur n'importe quelle imprimante via la fenêtre d'impression du système.
      </p>

      <div className="rounded-xl border border-gray-200 p-4 mb-4">
        <div className="min-w-0 mb-3">
          <div className="text-sm font-bold text-gray-800">Mini-imprimante Bluetooth (tickets)</div>
          <div className="text-xs mt-0.5">
            {name
              ? <span className="text-emerald-600 font-semibold">● {name}</span>
              : <span className="text-gray-400">Aucune imprimante connectée</span>}
          </div>
        </div>

        {!supported ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Le Bluetooth n'est pas disponible sur ce navigateur. Utilisez Google Chrome (Android ou ordinateur). Sur iPhone, utilisez l'impression PDF.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Btn onClick={handleConnect} loading={busy}>{name ? "Reconnecter / changer" : "Connecter une imprimante"}</Btn>
            <Btn color="gray" onClick={handleTest} disabled={busy}>Imprimer un test</Btn>
            {name && <Btn color="gray" onClick={handleForget} disabled={busy}>Oublier</Btn>}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Impression des reçus par défaut</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => changeMode("ticket")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${mode === "ticket" ? "bg-[#0023FF] text-white border-[#0023FF]" : "bg-white text-gray-600 border-gray-200 hover:border-[#0023FF]/40"}`}>
            🧾 Ticket (Bluetooth)
          </button>
          <button type="button" onClick={() => changeMode("pdf")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${mode === "pdf" ? "bg-[#0023FF] text-white border-[#0023FF]" : "bg-white text-gray-600 border-gray-200 hover:border-[#0023FF]/40"}`}>
            📄 PDF (système)
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Les factures et rapports s'impriment toujours en PDF (mise en page complète).
        </p>
      </div>

      {msg && (
        <div className={`mt-4 text-xs font-semibold rounded-lg px-3 py-2 ${msg.type === "error" ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
          {msg.text}
        </div>
      )}
    </Card>
  );
}

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
    case "sidebar":
      return (
        <div className="relative w-full h-full bg-white flex">
          <div className="h-full" style={{ width: "30%", background: ACC }}>
            <div className="w-3/5 h-1.5 rounded-sm bg-white/85 mx-auto mt-2.5" />
            <div className="w-2/5 h-1 rounded-sm bg-white/60 mx-auto mt-1.5" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-3/5 h-1.5 rounded-sm bg-white/70 mx-auto" style={{ marginTop: i === 0 ? "10px" : "6px" }} />
            ))}
          </div>
          <div className="flex-1 p-2 flex flex-col gap-1.5">
            <div className="w-2/3 h-2 rounded-sm bg-gray-300" />
            <div className="w-full h-px bg-gray-200 mt-1" style={{ background: ACC, height: 1.5 }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-full h-1.5 rounded-sm" style={{ background: i % 2 ? LIGHT : "#F3F4F6" }} />
            ))}
          </div>
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

// ── Galerie de sélection des 30 styles (6 layouts × 5 palettes) ───────────
function StyleGallery({ catalog, palettes, value, onChange, onPreview }) {
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
            <div className="px-2 py-1.5 bg-white border-t border-gray-50 flex items-center justify-between gap-1">
              <p className="text-[10px] font-bold text-gray-700 truncate">{s.label}</p>
              <span
                role="button"
                tabIndex={0}
                title="Aperçu du document"
                onClick={(e) => { e.stopPropagation(); onPreview(s); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); onPreview(s); } }}
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] text-gray-400 hover:text-white hover:bg-[#0023FF] transition"
              >
                👁
              </span>
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

// ── Modal d'aperçu PDF (données fictives) pour un style donné ────────────
function PdfPreviewModal({ docType, docLabel, style, onClose }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let blobUrl = null;
    let cancelled = false;
    setUrl(null);
    setErr("");
    entrepriseService.getPdfPreviewBlobUrl(docType, style.id)
      .then((u) => { if (!cancelled) { blobUrl = u; setUrl(u); } else { URL.revokeObjectURL(u); } })
      .catch((e) => { if (!cancelled) setErr(e.message || "Impossible de générer l'aperçu."); });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [docType, style.id, retryCount]);

  return (
    <Modal title={`Aperçu — ${docLabel} · ${style.label}`} onClose={onClose} wide>
      <p className="text-xs text-gray-400 -mt-2 mb-3">
        Exemple généré avec des données fictives, à partir de vos informations d'entreprise (nom, logo, devise...).
      </p>
      {err ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-red-500 font-medium">{err}</p>
          <Btn color="gray" onClick={() => setRetryCount((c) => c + 1)}>Réessayer</Btn>
        </div>
      ) : !url ? (
        <div className="py-16"><Spinner /></div>
      ) : (
        <>
          {/* Aperçu intégré — fonctionne sur la plupart des navigateurs de bureau */}
          <iframe src={url} title="Aperçu PDF" className="hidden sm:block w-full h-[70vh] rounded-xl border border-gray-100" />
          {/* Sur mobile, les navigateurs n'affichent pas les PDF dans un cadre :
              on propose d'ouvrir l'aperçu dans le lecteur PDF du téléphone. */}
          <div className="sm:hidden flex flex-col items-center gap-3 py-10 px-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
            <span className="text-4xl">📄</span>
            <p className="text-sm text-gray-500">L'aperçu intégré n'est pas disponible sur ce navigateur.</p>
            <Btn onClick={async () => {
              const blob = await entrepriseService.getPdfPreviewBlob(docType, style.id);
              openBlob(blob, `Apercu_${docType}_${style.id}.pdf`);
            }}>Ouvrir l'aperçu PDF</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

// Redimensionne et compresse une image côté client avant envoi — garde le PNG
// pour préserver la transparence des logos, limite la taille à 320px de côté.
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
  const [preview,   setPreview]   = useState(null); // { id, label } du style à prévisualiser
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="md:col-span-2">
                <Input label="Nom de l'entreprise" value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: Ets Diallo & Frères" />
              </div>
              <div className="md:col-span-2">
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
                  onPreview={(s) => setPreview(s)}
                />
              ))}
            </>
          )}
        </Card>
      </div>

      {/* ── Imprimante ── */}
      <div className="mt-5">
        <PrinterCard />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {preview && (
        <PdfPreviewModal
          docType={styleTab}
          docLabel={DOC_TABS.find((t) => t.key === styleTab)?.label}
          style={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
