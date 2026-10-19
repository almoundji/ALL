// Lecture de la puce sans contact des documents de voyage (ICAO 9303 — BAC/PACE, DG1, DG2, SOD).
// Le navigateur ne peut pas dialoguer avec une puce de passeport (Web NFC se limite au NDEF) :
// WawID passe par un pont local installé sur le poste, relié au lecteur NFC / lecteur pleine page
// (voir tools/nfc-bridge.mjs). Sans pont, une lecture simulée est renvoyée et signalée comme telle.
import { parseMRZ } from "./engine.js";

const KEY = "wawid:nfcBridge";
export const DEFAULT_BRIDGE = "http://127.0.0.1:8765";

export function bridgeUrl() {
  try { return (localStorage.getItem(KEY) || DEFAULT_BRIDGE).replace(/\/+$/, ""); } catch { return DEFAULT_BRIDGE; }
}
export function setBridgeUrl(url) {
  try { url ? localStorage.setItem(KEY, url) : localStorage.removeItem(KEY); } catch {}
}

/** État du pont : { ok, reader, version } ou { ok:false }. */
export async function bridgeStatus(url = bridgeUrl()) {
  url = url.replace(/\/+$/, "");
  try {
    const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(1200) });
    return { ok: res.ok, ...(await res.json()) };
  } catch { return { ok: false }; }
}

/**
 * Lit la puce. La MRZ (lue optiquement) sert à dériver les clés d'accès BAC/PACE.
 * simulate : { passiveAuth?: boolean, dg1?: string, read?: boolean } pour les scénarios de démonstration.
 * Retour : { source, read, protocol, dg1, photo, passiveAuth, activeAuth, reader }
 */
export async function readChip(mrz, simulate = {}) {
  try {
    const res = await fetch(`${bridgeUrl()}/read`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mrz, simulate }), signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { source: "lecteur", ...(await res.json()) };
  } catch { /* pas de pont : simulation */ }
  await new Promise((r) => setTimeout(r, 700));
  if (simulate.read === false) return { source: "simulation", read: false };
  const p = parseMRZ(mrz);
  return {
    source: "simulation", read: true, protocol: "PACE", reader: "Simulation (aucun lecteur détecté)",
    dg1: simulate.dg1 ?? mrz, photo: p.ok ? avatar(p) : null,
    passiveAuth: simulate.passiveAuth ?? true, activeAuth: simulate.passiveAuth === false ? false : true,
  };
}

/** Portrait de substitution (en production : image DG2 extraite de la puce). */
function avatar(p) {
  const initials = `${p.surname[0] || ""}${p.given[0] || ""}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#e9e6dc"/><circle cx="60" cy="58" r="30" fill="#c9c2ae"/><path d="M14 150c4-34 24-50 46-50s42 16 46 50z" fill="#c9c2ae"/><text x="60" y="66" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="800" font-size="22" fill="#333">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** Résumé transmis au serveur (la photo reste sur le poste). */
export const chipPayload = (c) => (c ? { read: c.read !== false, dg1: c.dg1, passiveAuth: c.passiveAuth, protocol: c.protocol, source: c.source } : undefined);
