// src/utils/printer.js
// Connexion d'une mini-imprimante thermique Bluetooth (ESC/POS) via Web Bluetooth
// et impression de tickets de reçu. Pour les factures et rapports (mise en page),
// on utilise plutôt l'impression PDF système (printBlob dans services/api.js).
//
// Compatibilité : Web Bluetooth fonctionne sur Chrome (Android et ordinateur).
// Il n'est pas disponible sur iPhone (iOS) — dans ce cas, on retombe sur le PDF.

const LS_NAME = "warigest_printer_name";
const LS_MODE = "warigest_print_mode"; // "ticket" | "pdf"

// Services GATT les plus courants des imprimantes thermiques BLE.
const PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

let device = null;
let characteristic = null;

export function isBluetoothSupported() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}
export function getPrinterName() {
  try { return localStorage.getItem(LS_NAME) || ""; } catch { return ""; }
}
export function getPrintMode() {
  try { return localStorage.getItem(LS_MODE) || "pdf"; } catch { return "pdf"; }
}
export function setPrintMode(m) {
  try { localStorage.setItem(LS_MODE, m); } catch { /* ignore */ }
}
export function isPrinterConnected() {
  return !!(device && device.gatt && device.gatt.connected && characteristic);
}
export function forgetPrinter() {
  try {
    if (device && device.gatt && device.gatt.connected) device.gatt.disconnect();
  } catch { /* ignore */ }
  device = null;
  characteristic = null;
  try { localStorage.removeItem(LS_NAME); } catch { /* ignore */ }
}

// Demande à l'utilisateur de choisir une imprimante Bluetooth, puis se connecte.
export async function connectPrinter() {
  if (!isBluetoothSupported())
    throw new Error("Le Bluetooth (Web Bluetooth) n'est pas disponible ici. Utilisez Chrome sur Android ou ordinateur.");
  device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });
  characteristic = await connectGatt(device);
  try { localStorage.setItem(LS_NAME, device.name || "Imprimante"); } catch { /* ignore */ }
  device.addEventListener("gattserverdisconnected", () => { characteristic = null; });
  return device.name || "Imprimante";
}

async function connectGatt(dev) {
  const server = await dev.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const service of services) {
    let chars;
    try { chars = await service.getCharacteristics(); } catch { continue; }
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  throw new Error("Imprimante connectée, mais aucun canal d'impression trouvé. Essayez un autre appareil.");
}

async function ensureConnected() {
  if (isPrinterConnected()) return;
  if (!device)
    throw new Error("Aucune imprimante connectée. Connectez-la d'abord dans Paramètres > Imprimante.");
  characteristic = await connectGatt(device);
}

// Envoie des octets bruts à l'imprimante, par petits paquets (compatibilité BLE).
export async function printRaw(bytes) {
  await ensureConnected();
  const CHUNK = 20;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(slice);
    else await characteristic.writeValue(slice);
    await new Promise((r) => setTimeout(r, 18));
  }
}

// ── Construction d'un ticket ESC/POS ───────────────────────────────────────
const ACCENTS = {
  "à":"a","â":"a","ä":"a","é":"e","è":"e","ê":"e","ë":"e","î":"i","ï":"i",
  "ô":"o","ö":"o","ù":"u","û":"u","ü":"u","ç":"c","ñ":"n",
  "À":"A","Â":"A","É":"E","È":"E","Ê":"E","Ë":"E","Î":"I","Ô":"O","Û":"U","Ç":"C",
  "’":"'","‘":"'","“":'"',"”":'"',"–":"-","—":"-","€":"E","…":"...",
};
function enc(s) {
  const ascii = String(s).replace(/[^\x00-\x7F]/g, (ch) => ACCENTS[ch] || "");
  const out = new Uint8Array(ascii.length);
  for (let i = 0; i < ascii.length; i++) out[i] = ascii.charCodeAt(i) & 0xff;
  return out;
}
function concat(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}
const ESC = 0x1b, GS = 0x1d;
const C = {
  init: new Uint8Array([ESC, 0x40]),
  left: new Uint8Array([ESC, 0x61, 0]),
  center: new Uint8Array([ESC, 0x61, 1]),
  boldOn: new Uint8Array([ESC, 0x45, 1]),
  boldOff: new Uint8Array([ESC, 0x45, 0]),
  big: new Uint8Array([GS, 0x21, 0x11]),
  normal: new Uint8Array([GS, 0x21, 0x00]),
  feed: new Uint8Array([0x0a]),
  cut: new Uint8Array([GS, 0x56, 0x42, 0x00]),
};
const WIDTH = 32; // ~58 mm
const ln = (txt = "") => concat([enc(txt), C.feed]);
function twoCols(left, right) {
  left = String(left); right = String(right);
  const space = Math.max(1, WIDTH - left.length - right.length);
  return ln(left + " ".repeat(space) + right);
}
const sep = () => ln("-".repeat(WIDTH));

// ticket = { entreprise:{nom,telephone,adresse}, code, dateStr, clientNom,
//            items:[{libelle,quantite,prix}], total, paye, monnaie, money, devise }
export function buildReceiptEscPos(t) {
  const money = t.money || ((n) => String(Math.round(Number(n) || 0)));
  const devise = t.devise || "FCFA";
  const parts = [C.init, C.center, C.boldOn, C.big];
  parts.push(ln(t.entreprise?.nom || "RECU"));
  parts.push(C.normal, C.boldOff);
  if (t.entreprise?.telephone) parts.push(ln(t.entreprise.telephone));
  if (t.entreprise?.adresse) parts.push(ln(t.entreprise.adresse));
  parts.push(sep());
  parts.push(C.left);
  if (t.code) parts.push(ln("Recu : " + t.code));
  if (t.dateStr) parts.push(ln("Date : " + t.dateStr));
  if (t.clientNom) parts.push(ln("Client : " + t.clientNom));
  parts.push(sep());
  for (const it of (t.items || [])) {
    parts.push(ln(it.libelle));
    parts.push(twoCols(`  ${it.quantite} x ${money(it.prix)}`, money((Number(it.prix) || 0) * (Number(it.quantite) || 0))));
  }
  parts.push(sep());
  parts.push(C.boldOn);
  parts.push(twoCols("TOTAL", money(t.total) + " " + devise));
  parts.push(C.boldOff);
  if (t.paye != null) parts.push(twoCols("Paye", money(t.paye)));
  if (t.monnaie != null && Number(t.monnaie) > 0) parts.push(twoCols("Monnaie", money(t.monnaie)));
  parts.push(C.center, C.feed);
  parts.push(ln("Merci de votre visite !"));
  parts.push(C.feed, C.feed, C.feed, C.cut);
  return concat(parts);
}

export async function printReceipt(ticket) {
  await printRaw(buildReceiptEscPos(ticket));
}

export async function printTest() {
  await printRaw(buildReceiptEscPos({
    entreprise: { nom: "TEST IMPRESSION", telephone: "WariGest" },
    code: "TEST-0001",
    dateStr: new Date().toLocaleString("fr-FR"),
    items: [{ libelle: "Article de test", quantite: 1, prix: 1000 }],
    total: 1000, paye: 1000, monnaie: 0,
  }));
}
