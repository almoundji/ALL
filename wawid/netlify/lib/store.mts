// Persistance : Netlify Blobs en production, mémoire en local (serveur de dev et tests).
// Chaque collection est un document JSON. Pour une exploitation à grande échelle, migrer vers Netlify DB / PostgreSQL.
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { generateSeed } from "./seed.mts";

const memory = new Map<string, unknown>();
const onNetlify = () => Boolean((globalThis as any).Netlify);
const store = () => getStore({ name: "wawid", consistency: "strong" });

export async function load<T = any>(key: string): Promise<T | null> {
  if (!onNetlify()) return (memory.has(key) ? structuredClone(memory.get(key)) : null) as T | null;
  return (await store().get(key, { type: "json" })) as T | null;
}

export async function save(key: string, value: unknown): Promise<void> {
  if (!onNetlify()) { memory.set(key, structuredClone(value)); return; }
  await store().setJSON(key, value);
}

export const COLLECTIONS = ["settings", "watchlist", "rules", "travelers", "crossings", "alerts", "cases", "evisas", "gates", "flights", "passes", "vehicles", "devices", "connectors", "enrolments"];

let seeded = false;
export async function ensureSeeded(force = false) {
  if (seeded && !force) return;
  if (!force && (await load("meta"))) { seeded = true; return; }
  const data = generateSeed();
  await Promise.all(COLLECTIONS.map((k) => save(k, data[k])));
  await save("audit", []);
  await save("meta", data.meta);
  seeded = true;
  await audit("Système", "INITIALISATION", "jeu de démonstration", force ? "Réinitialisation demandée" : "Premier démarrage");
}

/** Lit plusieurs collections en parallèle. */
export async function loadMany(keys: string[]): Promise<Record<string, any>> {
  const values = await Promise.all(keys.map((k) => load(k)));
  return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? []]));
}

// ----- Journal d'audit chaîné (SHA-256) : toute altération rompt la chaîne. -----

const digest = (e: any) => createHash("sha256").update([e.seq, e.ts, e.actor, e.action, e.target, e.details, e.prev].join("|")).digest("hex");

export async function audit(actor: string, action: string, target: string, details = "") {
  const log = (await load<any[]>("audit")) || [];
  const last = log[log.length - 1];
  const entry: any = { seq: (last?.seq ?? 0) + 1, ts: new Date().toISOString(), actor, action, target, details, prev: last?.hash ?? "0".repeat(64) };
  entry.hash = digest(entry);
  log.push(entry);
  // Pas de troncature silencieuse : l'archivage du journal (export signé) relève de l'exploitation.
  await save("audit", log);
}

export function verifyChain(log: any[]) {
  if (log.length && log[0].prev !== "0".repeat(64)) return { ok: false, brokenAt: log[0].seq, reason: "Début de chaîne manquant (entrées anciennes supprimées)" };
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    if (digest(e) !== e.hash) return { ok: false, brokenAt: e.seq, reason: "Empreinte invalide (entrée modifiée)" };
    if (i > 0 && e.prev !== log[i - 1].hash) return { ok: false, brokenAt: e.seq, reason: "Chaînage rompu (entrée supprimée ou insérée)" };
  }
  return { ok: true, count: log.length, head: log[log.length - 1]?.hash ?? null };
}
