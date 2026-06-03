// src/components/ScanFacture.jsx
// Scan photo d'une facture fournisseur → extraction automatique des données
import { useState, useRef } from "react";

const B = "#0023FF";
const D = "#060d2e";

/* ── Parsing du texte OCR → données structurées ─────────── */
function parseFactureOCR(rawText) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 1);

  // Nettoyage : supprimer les lignes parasites (trop courtes ou uniquement symboles)
  const validLines = lines.filter(l => l.length > 2 && /[a-zA-ZÀ-ÿ0-9]/.test(l));

  // ── Détecter le fournisseur (généralement en haut, avant les articles) ──
  let fournisseur = "";
  for (const line of validLines.slice(0, 6)) {
    // Ignorer les lignes qui ressemblent à des dates ou des titres génériques
    if (/facture|invoice|reçu|recu|bon de/i.test(line)) continue;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue;
    if (/^(date|tel|fax|bp|bp|ref|n°)/i.test(line)) continue;
    if (line.length > 3 && /[a-zA-ZÀ-ÿ]/.test(line)) {
      fournisseur = line.replace(/[^a-zA-ZÀ-ÿ\s\-\.&]/g, " ").trim().toUpperCase();
      if (fournisseur.length > 2) break;
    }
  }

  // ── Extraction des articles ──────────────────────────────
  // Patterns : "LIBELLE  QTE  PU  TOTAL" ou "QTE x PU  LIBELLE"
  const articles = [];

  // Regex patterns pour détecter les lignes produits
  const patterns = [
    // LIBELLE    QTE    PRIX_UNIT    TOTAL
    /^(.{3,40}?)\s+(\d+(?:[.,]\d+)?)\s+(\d[\d\s]*(?:[.,]\d+)?)\s+(\d[\d\s]*(?:[.,]\d+)?)$/,
    // LIBELLE    QTE    PRIX
    /^(.{3,40}?)\s+(\d+(?:[.,]\d+)?)\s+(\d[\d\s]*(?:[.,]\d+)?)$/,
    // QTE x PU   LIBELLE  TOTAL
    /^(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d[\d\s]*(?:[.,]\d+)?)\s+(.{3,40})/,
  ];

  for (const line of validLines) {
    // Essayer chaque pattern
    let matched = false;

    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (!m) continue;

      let libelle, quantite, prix;

      if (pattern === patterns[2]) {
        // Pattern QTE x PU LIBELLE
        quantite = parseFloat(m[1].replace(",", "."));
        prix     = parseFloat(m[2].replace(/\s/g, "").replace(",", "."));
        libelle  = m[3].trim().toUpperCase();
      } else {
        // Patterns LIBELLE QTE PU
        libelle  = m[1].replace(/[^\wÀ-ÿ\s\-\.]/g, "").trim().toUpperCase();
        quantite = parseFloat(m[2].replace(",", "."));
        prix     = parseFloat(m[3].replace(/\s/g, "").replace(",", "."));
      }

      // Validation
      if (!libelle || libelle.length < 2) continue;
      if (isNaN(quantite) || quantite <= 0 || quantite > 100000) continue;
      if (isNaN(prix)     || prix <= 0)    continue;
      // Ignorer les lignes qui ressemblent à des totaux
      if (/^(total|sous.total|tva|net|montant|somme|amount)/i.test(libelle)) continue;

      articles.push({ libelle, quantite, prix_achat: Math.round(prix) });
      matched = true;
      break;
    }

    // Fallback : ligne avec un seul gros nombre → peut-être un montant total
    if (!matched && /TOTAL/i.test(line)) {
      const numMatch = line.match(/(\d[\d\s]{2,}(?:[.,]\d+)?)\s*(?:FCFA|F\.?CFA|XOF)?/i);
      if (numMatch) {
        // Stocker le total détecté pour info
      }
    }
  }

  // ── Détecter la date ────────────────────────────────────
  let date = new Date().toISOString().split("T")[0];
  const dateMatch = rawText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dateMatch) {
    const j = dateMatch[1].padStart(2, "0");
    const m = dateMatch[2].padStart(2, "0");
    let a   = dateMatch[3];
    if (a.length === 2) a = "20" + a;
    date = `${a}-${m}-${j}`;
    if (isNaN(Date.parse(date))) date = new Date().toISOString().split("T")[0];
  }

  return { fournisseur, articles, date };
}

/* ── Composant principal ──────────────────────────────────── */
export default function ScanFacture({ onResult, onClose }) {
  const [step, setStep]       = useState("capture"); // capture | preview | processing | result | error
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState("Initialisation…");
  const [result, setResult]   = useState(null);
  const [rawText, setRawText] = useState("");
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setStep("preview");
  };

  const runOCR = async () => {
    if (!imageFile) return;
    setStep("processing");
    setProgress(0);
    setProgressMsg("Chargement du moteur OCR…");

    try {
      const { createWorker } = window.Tesseract;
      if (!createWorker) throw new Error("Tesseract non chargé");

      const worker = await createWorker("fra+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
            setProgressMsg("Lecture du texte en cours…");
          } else if (m.status === "loading language traineddata") {
            setProgressMsg("Chargement du modèle de langue…");
          } else if (m.status === "initializing api") {
            setProgressMsg("Initialisation…");
          }
        },
      });

      const { data } = await worker.recognize(imageFile);
      await worker.terminate();

      const text = data.text || "";
      setRawText(text);
      setProgressMsg("Analyse des données…");

      if (text.trim().length < 10) {
        setStep("error");
        return;
      }

      const parsed = parseFactureOCR(text);
      setResult(parsed);
      setStep("result");
    } catch (err) {
      console.error("OCR error:", err);
      setStep("error");
    }
  };

  const handleConfirm = () => {
    if (result) onResult(result);
    onClose();
  };

  // Modifier une ligne article dans le résultat
  const updateArticle = (i, field, value) => {
    setResult(r => ({ ...r, articles: r.articles.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  };
  const removeArticle = (i) => {
    setResult(r => ({ ...r, articles: r.articles.filter((_, idx) => idx !== i) }));
  };
  const addArticle = () => {
    setResult(r => ({ ...r, articles: [...r.articles, { libelle: "", quantite: 1, prix_achat: 0 }] }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,13,46,0.75)", backdropFilter: "blur(12px)", fontFamily: "inherit" }}>
      <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,35,255,0.2)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f0f2ff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8ecff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📷</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: D }}>Scanner une facture</div>
              <div style={{ fontSize: 11, color: "#9ba5c9" }}>Extraction automatique par OCR</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: "#f0f2ff", border: "none", cursor: "pointer", fontSize: 18, color: "#9ba5c9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* ── ÉTAPE 1 : Capture ── */}
          {step === "capture" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "#f0f2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🧾</div>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: D, margin: "0 0 8px" }}>Photographiez la facture fournisseur</h3>
                <p style={{ fontSize: 13, color: "#9ba5c9", margin: 0, lineHeight: 1.6 }}>
                  Prenez une photo nette de la facture ou importez une image.<br />
                  L'OCR lira automatiquement les articles, quantités et prix.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                {/* Appareil photo (mobile) */}
                <button onClick={() => { fileRef.current.accept = "image/*"; fileRef.current.capture = "environment"; fileRef.current.click(); }}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: B, color: "white", border: "none", borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,35,255,0.35)", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 24 }}>📸</span>
                  <div style={{ textAlign: "left" }}>
                    <div>Prendre une photo</div>
                    <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Utiliser l'appareil photo</div>
                  </div>
                </button>

                {/* Importer fichier */}
                <button onClick={() => { fileRef.current.removeAttribute("capture"); fileRef.current.accept = "image/*,application/pdf"; fileRef.current.click(); }}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "white", color: D, border: "2px dashed #c7d0ff", borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
                  <span style={{ fontSize: 24 }}>📁</span>
                  <div style={{ textAlign: "left" }}>
                    <div>Importer une image</div>
                    <div style={{ fontSize: 11, color: "#9ba5c9", fontWeight: 400 }}>JPG, PNG, PDF depuis votre appareil</div>
                  </div>
                </button>
              </div>

              <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "12px 16px", width: "100%", boxSizing: "border-box" }}>
                <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
                  💡 <strong>Conseil :</strong> Prenez la photo dans un endroit bien éclairé, de face et sans flou. Plus l'image est nette, meilleure sera la lecture.
                </p>
              </div>

              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>
          )}

          {/* ── ÉTAPE 2 : Aperçu ── */}
          {step === "preview" && imageUrl && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderRadius: 14, overflow: "hidden", border: "2px solid #e8ecff", background: "#f7f8ff" }}>
                <img src={imageUrl} alt="Facture" style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} />
              </div>
              <p style={{ fontSize: 13, color: "#9ba5c9", textAlign: "center", margin: 0 }}>Vérifiez que la facture est bien lisible avant de lancer l'analyse.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setStep("capture"); setImageUrl(null); setImageFile(null); }}
                  style={{ flex: 1, padding: "11px", background: "white", color: "#475569", border: "1.5px solid #e8ecff", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                  ← Recommencer
                </button>
                <button onClick={runOCR}
                  style={{ flex: 2, padding: "11px", background: B, color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 14px rgba(0,35,255,0.3)", fontFamily: "inherit" }}>
                  🔍 Analyser la facture
                </button>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : Traitement ── */}
          {step === "processing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "20px 0" }}>
              {imageUrl && (
                <div style={{ borderRadius: 12, overflow: "hidden", border: "2px solid #e8ecff", width: "100%", opacity: 0.5 }}>
                  <img src={imageUrl} alt="Facture" style={{ width: "100%", maxHeight: 180, objectFit: "contain", display: "block", filter: "blur(1px)" }} />
                </div>
              )}
              <div style={{ width: 60, height: 60, borderRadius: 20, background: "#e8ecff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🤖</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: D, marginBottom: 6 }}>Analyse en cours…</div>
                <div style={{ fontSize: 12, color: "#9ba5c9", marginBottom: 16 }}>{progressMsg}</div>
                <div style={{ width: 280, height: 8, background: "#f0f2ff", borderRadius: 99, overflow: "hidden", margin: "0 auto" }}>
                  <div style={{ height: "100%", background: `linear-gradient(90deg, ${B}, #6b7fff)`, borderRadius: 99, width: `${progress}%`, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 12, color: B, fontWeight: 700, marginTop: 8 }}>{progress}%</div>
              </div>
              <p style={{ fontSize: 11, color: "#c7d0ff", textAlign: "center" }}>Première utilisation : téléchargement du modèle (~10 Mo)</p>
            </div>
          )}

          {/* ── ÉTAPE 4 : Résultat ── */}
          {step === "result" && result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>Analyse terminée</div>
                  <div style={{ fontSize: 11, color: "#059669" }}>{result.articles.length} article(s) détecté(s) — Vérifiez et corrigez si nécessaire</div>
                </div>
              </div>

              {/* Fournisseur */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8492b4", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fournisseur détecté</label>
                <input value={result.fournisseur}
                  onChange={e => setResult(r => ({ ...r, fournisseur: e.target.value }))}
                  style={{ width: "100%", border: "1.5px solid #e8ecff", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: D, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  placeholder="Nom du fournisseur" />
              </div>

              {/* Date */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8492b4", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Date détectée</label>
                <input type="date" value={result.date}
                  onChange={e => setResult(r => ({ ...r, date: e.target.value }))}
                  style={{ width: "100%", border: "1.5px solid #e8ecff", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: D, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              {/* Articles */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#8492b4", textTransform: "uppercase", letterSpacing: "0.08em" }}>Articles ({result.articles.length})</label>
                  <button onClick={addArticle}
                    style={{ fontSize: 12, color: B, background: "#e8ecff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>+ Ajouter</button>
                </div>

                {result.articles.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", background: "#f7f8ff", borderRadius: 12, color: "#9ba5c9", fontSize: 13 }}>
                    Aucun article détecté. Ajoutez-en manuellement.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.articles.map((a, i) => (
                      <div key={i} style={{ background: "#f7f8ff", borderRadius: 12, border: "1.5px solid #e8ecff", padding: 12 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          <input value={a.libelle} onChange={e => updateArticle(i, "libelle", e.target.value.toUpperCase())}
                            style={{ flex: 1, border: "1.5px solid #e0e5ff", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: D, outline: "none", fontFamily: "inherit", fontWeight: 600 }}
                            placeholder="Libellé article" />
                          <button onClick={() => removeArticle(i)}
                            style={{ width: 30, height: 30, borderRadius: 8, background: "#fee2e2", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <div>
                            <label style={{ fontSize: 10, color: "#9ba5c9", fontWeight: 600, display: "block", marginBottom: 3 }}>QUANTITÉ</label>
                            <input type="number" value={a.quantite} onChange={e => updateArticle(i, "quantite", parseFloat(e.target.value) || 0)}
                              style={{ width: "100%", border: "1.5px solid #e0e5ff", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: D, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: "#9ba5c9", fontWeight: 600, display: "block", marginBottom: 3 }}>PRIX UNITAIRE (FCFA)</label>
                            <input type="number" value={a.prix_achat} onChange={e => updateArticle(i, "prix_achat", parseInt(e.target.value) || 0)}
                              style={{ width: "100%", border: "1.5px solid #e0e5ff", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: D, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                          </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: "#9ba5c9", textAlign: "right" }}>
                          Total : <strong style={{ color: B }}>{new Intl.NumberFormat("fr-FR").format(Math.round((a.quantite || 0) * (a.prix_achat || 0)))} FCFA</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Texte brut (debug) */}
              <details style={{ cursor: "pointer" }}>
                <summary style={{ fontSize: 11, color: "#c7d0ff", fontWeight: 600, listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>▶</span> Voir le texte brut extrait
                </summary>
                <pre style={{ marginTop: 8, background: "#f7f8ff", borderRadius: 10, padding: 12, fontSize: 10, color: "#8492b4", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 150, overflow: "auto" }}>{rawText}</pre>
              </details>
            </div>
          )}

          {/* ── ÉTAPE 5 : Erreur ── */}
          {step === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>😕</div>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: D, margin: "0 0 8px" }}>Lecture difficile</h3>
                <p style={{ fontSize: 13, color: "#9ba5c9", margin: 0, lineHeight: 1.6 }}>
                  L'OCR n'a pas pu lire suffisamment de texte.<br />
                  Essayez avec une image plus nette et bien éclairée.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button onClick={() => { setStep("capture"); setImageUrl(null); setImageFile(null); }}
                  style={{ flex: 1, padding: "11px", background: B, color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                  📷 Réessayer
                </button>
                <button onClick={onClose}
                  style={{ flex: 1, padding: "11px", background: "white", color: "#475569", border: "1.5px solid #e8ecff", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                  Saisie manuelle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "result" && result && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f2ff", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={() => { setStep("capture"); setResult(null); setImageUrl(null); }}
              style={{ flex: 1, padding: "11px", background: "white", color: "#475569", border: "1.5px solid #e8ecff", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
              ← Rescanner
            </button>
            <button onClick={handleConfirm}
              disabled={result.articles.length === 0}
              style={{ flex: 2, padding: "11px", background: result.articles.length > 0 ? B : "#c7d0ff", color: "white", border: "none", borderRadius: 12, cursor: result.articles.length > 0 ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, boxShadow: result.articles.length > 0 ? "0 4px 14px rgba(0,35,255,0.3)" : "none", fontFamily: "inherit" }}>
              ✅ Utiliser ces données ({result.articles.length} article{result.articles.length > 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
