// Noyau métier partagé (port TypeScript du backend Python) : normalisation, résolution d'identité,
// habilitations, veille, audit chaîné, algorithmes de graphe, ingestion.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Role = "admin" | "analyst" | "viewer";
export interface User { id: number; username: string; full_name: string; password_hash: string; role: Role; clearance: number; compartments: string; unit: string; is_active: boolean; created_at: string }
export interface Source { id: number; name: string; type: string; reliability: string; description: string; classification: number; created_at: string }
export interface Entity { id: number; type: string; label: string; normalized_key: string; attributes: Record<string, any>; classification: number; compartment: string | null; confidence: number; lat: number | null; lon: number | null; created_by: string; created_at: string; updated_at: string }
export interface Provenance { id: number; entity_id: number; source_id: number; external_ref: string; asserted: Record<string, any>; match_score: number; observed_at: string }
export interface Relation { id: number; source_id: number; target_id: number; type: string; attributes: Record<string, any>; weight: number; classification: number; compartment: string | null; valid_from: string | null; valid_to: string | null; data_source_id: number | null; created_at: string }
export interface Case { id: number; reference: string; title: string; description: string; status: string; priority: string; classification: number; compartment: string | null; owner: string; created_at: string; updated_at: string }
export interface CaseEntity { id: number; case_id: number; entity_id: number; role: string; added_by: string; added_at: string }
export interface CaseNote { id: number; case_id: number; author: string; content: string; kind: string; created_at: string }
export interface Watchlist { id: number; name: string; entity_type: string | null; field: string; operator: string; value: string; severity: string; is_active: boolean; created_by: string; created_at: string }
export interface Alert { id: number; watchlist_id: number | null; entity_id: number | null; title: string; message: string; severity: string; status: string; assigned_to: string | null; created_at: string }
export interface IngestJob { id: number; source_id: number; filename: string; status: string; rows_total: number; entities_created: number; entities_merged: number; relations_created: number; alerts_raised: number; errors: string[]; mapping: any; started_by: string; created_at: string }
export interface AuditEntry { id: number; ts: string; username: string; action: string; resource_type: string; resource_id: string; details: Record<string, any>; ip: string; prev_hash: string; hash: string }

export interface State {
  seq: number; users: User[]; sources: Source[]; entities: Entity[]; provenance: Provenance[]; relations: Relation[];
  cases: Case[]; case_entities: CaseEntity[]; case_notes: CaseNote[]; watchlists: Watchlist[]; alerts: Alert[]; jobs: IngestJob[]; audit: AuditEntry[];
}

export const ENTITY_TYPES = ["PERSON", "ORGANIZATION", "VEHICLE", "PHONE", "LOCATION", "EVENT", "ACCOUNT", "DEVICE", "DOCUMENT", "VESSEL"];
export const RELATION_TYPES = ["KNOWS", "MEMBER_OF", "OWNS", "USES", "CALLED", "LOCATED_AT", "PARTICIPATED_IN", "TRANSFERRED_TO", "TRAVELLED_TO", "MENTIONS", "RELATED_TO", "FAMILY_OF", "EMPLOYED_BY"];
export const SOURCE_TYPES = ["HUMINT", "OSINT", "SIGINT", "FININT", "GEOINT", "ADMIN", "PARTNER", "CSV", "API"];
export const CLASSIFICATIONS = [["NP", "Non protégé"], ["DR", "Diffusion restreinte"], ["CD", "Confidentiel Défense"], ["SD", "Secret Défense"]];

export const now = () => new Date().toISOString();
export const nextId = (s: State) => ++s.seq;

// ---------- Mots de passe et jetons ----------
export const hashPassword = (pwd: string, salt = randomBytes(8).toString("hex")) => `${salt}$${createHash("sha256").update(salt + pwd).digest("hex")}`;
export function verifyPassword(pwd: string, stored: string): boolean {
  const [salt, h] = stored.split("$");
  const cand = createHash("sha256").update(salt + pwd).digest();
  const ref = Buffer.from(h, "hex");
  return cand.length === ref.length && timingSafeEqual(cand, ref);
}
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
export function signToken(secret: string, payload: Record<string, any>, minutes = 480): string {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + minutes * 60 }));
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
}
export function verifyToken(secret: string, token: string): Record<string, any> | null {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) return null;
  const expected = createHmac("sha256", secret).update(`${h}.${b}`).digest();
  const given = Buffer.from(s, "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  return payload.exp && payload.exp > Date.now() / 1000 ? payload : null;
}

// ---------- Habilitations ----------
export const compartmentsOf = (u: User) => new Set(u.compartments.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean));
export const canSee = (u: User, classification: number, compartment: string | null | undefined) =>
  classification <= u.clearance && (!compartment || compartmentsOf(u).has(compartment.trim().toUpperCase()));
export const visibleEntities = (s: State, u: User) => s.entities.filter((e) => canSee(u, e.classification, e.compartment));
export const visibleRelations = (s: State, u: User) => s.relations.filter((r) => canSee(u, r.classification, r.compartment));
export const visibleEntity = (s: State, u: User, id: number) => { const e = s.entities.find((x) => x.id === id); return e && canSee(u, e.classification, e.compartment) ? e : null; };

// ---------- Normalisation et résolution d'identité ----------
export const normalizeText = (v: string) => (v || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
export function normalizePhone(v: string) { let d = (v || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.length === 9 && "73".includes(d[0])) d = "221" + d; return d; }
export const normalizePlate = (v: string) => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function buildKey(type: string, label: string, a: Record<string, any> = {}): string {
  if (type === "PHONE") return "phone:" + normalizePhone(a.number || label);
  if (type === "VEHICLE") return "plate:" + normalizePlate(a.plate || label);
  if (type === "PERSON") {
    const nid = a.national_id || a.passport;
    if (nid) return "id:" + normalizeText(String(nid));
    return `person:${normalizeText(label)}|${normalizeText(String(a.birth_date || ""))}`;
  }
  if (type === "ACCOUNT") return "iban:" + normalizeText(String(a.iban || a.number || label));
  if (type === "DEVICE") return "imei:" + normalizeText(String(a.imei || a.mac || label));
  if (type === "LOCATION" && a.lat != null && a.lon != null) return `geo:${Number(a.lat).toFixed(4)},${Number(a.lon).toFixed(4)}`;
  return `${type.toLowerCase()}:${normalizeText(label)}`;
}

// token_set_ratio équivalent à RapidFuzz : ratio = 2·LCS / (|a|+|b|) (distance d'indel, une substitution compte double).
function lcs(a: string, b: string): number {
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) { const cur = [0]; for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); prev = cur; }
  return prev[n];
}
const ratio = (a: string, b: string) => (a.length + b.length === 0 ? 100 : (200 * lcs(a, b)) / (a.length + b.length));
export function tokenSetRatio(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean)), tb = new Set(b.split(" ").filter(Boolean));
  const inter = [...ta].filter((t) => tb.has(t)).sort().join(" ");
  const da = [...ta].filter((t) => !tb.has(t)).sort().join(" "), db = [...tb].filter((t) => !ta.has(t)).sort().join(" ");
  const s1 = (inter + " " + da).trim(), s2 = (inter + " " + db).trim();
  return Math.max(ratio(inter, s1), ratio(inter, s2), ratio(s1, s2));
}

export function findMatch(s: State, type: string, label: string, a: Record<string, any>): { match: Entity | null; score: number; method: string } {
  const key = buildKey(type, label, a);
  const exact = s.entities.find((e) => e.type === type && e.normalized_key === key);
  if (exact) return { match: exact, score: 100, method: "key" };
  if (["PHONE", "VEHICLE", "ACCOUNT", "DEVICE"].includes(type) || key.startsWith("id:")) return { match: null, score: 0, method: "none" };
  const norm = normalizeText(label); const nTok = Math.max(1, norm.split(" ").length);
  let best: Entity | null = null, bestScore = 0;
  for (const c of s.entities.filter((e) => e.type === type)) {
    const cn = normalizeText(c.label); const cTok = Math.max(1, cn.split(" ").length);
    if (Math.min(nTok, cTok) / Math.max(nTok, cTok) < 0.6) continue;
    if (type === "PERSON") { const b1 = String(a.birth_date || ""), b2 = String(c.attributes?.birth_date || ""); if (b1 && b2 && b1 !== b2) continue; }
    const sc = tokenSetRatio(norm, cn);
    if (sc > bestScore) { best = c; bestScore = sc; }
  }
  return best && bestScore >= 90 ? { match: best, score: bestScore, method: "fuzzy" } : { match: null, score: 0, method: "none" };
}

export function mergeAttributes(existing: Record<string, any>, incoming: Record<string, any>) {
  const merged = { ...(existing || {}) };
  for (const [k, v] of Object.entries(incoming || {})) {
    if (v === null || v === "" || v === undefined) continue;
    if (!(k in merged) || merged[k] === null || merged[k] === "") merged[k] = v;
    else if (merged[k] !== v) { const alts = (merged._variants = merged._variants || {}); const l = (alts[k] = alts[k] || []); if (!l.includes(v)) l.push(v); }
  }
  return merged;
}

export interface UpsertOpts { type: string; label: string; attributes?: Record<string, any>; classification?: number; compartment?: string | null; lat?: number | null; lon?: number | null; source?: Source | null; external_ref?: string; created_by?: string; confidence?: number }
export function upsertEntity(s: State, o: UpsertOpts): { entity: Entity; created: boolean } {
  const attrs = Object.fromEntries(Object.entries(o.attributes || {}).filter(([, v]) => v !== "" && v != null));
  const cls = o.classification ?? 1;
  const { match, score } = findMatch(s, o.type, o.label, attrs);
  if (match) {
    match.attributes = mergeAttributes(match.attributes, attrs);
    if (o.lat != null && match.lat == null) { match.lat = o.lat; match.lon = o.lon ?? null; }
    match.confidence = Math.min(0.99, match.confidence + 0.1); match.classification = Math.max(match.classification, cls); match.updated_at = now();
    if (o.source) s.provenance.push({ id: nextId(s), entity_id: match.id, source_id: o.source.id, external_ref: o.external_ref || "", asserted: { label: o.label, ...attrs }, match_score: score, observed_at: now() });
    return { entity: match, created: false };
  }
  const e: Entity = { id: nextId(s), type: o.type, label: o.label, normalized_key: buildKey(o.type, o.label, attrs), attributes: attrs, classification: cls, compartment: o.compartment || null, confidence: o.confidence ?? 0.6, lat: o.lat ?? null, lon: o.lon ?? null, created_by: o.created_by || "system", created_at: now(), updated_at: now() };
  s.entities.push(e);
  if (o.source) s.provenance.push({ id: nextId(s), entity_id: e.id, source_id: o.source.id, external_ref: o.external_ref || "", asserted: { label: o.label, ...attrs }, match_score: 100, observed_at: now() });
  return { entity: e, created: true };
}

export function upsertRelation(s: State, source_id: number, target_id: number, type: string, attributes: Record<string, any> = {}, weight = 1, classification = 1, compartment: string | null = null, data_source_id: number | null = null): { relation: Relation; created: boolean } {
  if (source_id === target_id) throw new Error("relation réflexive refusée");
  const ex = s.relations.find((r) => r.source_id === source_id && r.target_id === target_id && r.type === type);
  if (ex) { ex.weight += weight; ex.attributes = mergeAttributes(ex.attributes, attributes); ex.classification = Math.max(ex.classification, classification); return { relation: ex, created: false }; }
  const r: Relation = { id: nextId(s), source_id, target_id, type, attributes, weight, classification, compartment: compartment || null, valid_from: null, valid_to: null, data_source_id, created_at: now() };
  s.relations.push(r); return { relation: r, created: true };
}

// ---------- Veille ----------
function fieldValue(e: Entity, field: string): string {
  if (field === "label") return e.label || "";
  if (field.startsWith("attributes.")) return String(e.attributes?.[field.slice(11)] ?? "");
  return String((e as any)[field] ?? "");
}
export function ruleMatches(w: Watchlist, e: Entity): boolean {
  if (w.entity_type && w.entity_type !== e.type) return false;
  const v = fieldValue(e, w.field);
  if (w.operator === "equals") return normalizeText(v) === normalizeText(w.value);
  if (w.operator === "contains") return normalizeText(v).includes(normalizeText(w.value));
  if (w.operator === "fuzzy") return tokenSetRatio(normalizeText(v), normalizeText(w.value)) >= 85;
  if (w.operator === "regex") { try { return new RegExp(w.value, "i").test(v); } catch { return false; } }
  return false;
}
export function evaluateAlerts(s: State, e: Entity): Alert[] {
  const raised: Alert[] = [];
  for (const w of s.watchlists.filter((x) => x.is_active)) {
    if (!ruleMatches(w, e)) continue;
    if (s.alerts.some((a) => a.watchlist_id === w.id && a.entity_id === e.id && a.status !== "CLOSED")) continue;
    const a: Alert = { id: nextId(s), watchlist_id: w.id, entity_id: e.id, severity: w.severity, status: "NEW", assigned_to: null, created_at: now(), title: `[${w.name}] correspondance : ${e.label}`, message: `L'entité ${e.type} « ${e.label} » correspond à la règle « ${w.name} » (${w.field} ${w.operator} '${w.value}').` };
    s.alerts.push(a); raised.push(a);
  }
  return raised;
}

// ---------- Audit chaîné ----------
const GENESIS = "0".repeat(64);
const stable = (o: any): string => (o && typeof o === "object" && !Array.isArray(o)) ? "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}" : Array.isArray(o) ? "[" + o.map(stable).join(",") + "]" : JSON.stringify(o);
const digest = (prev: string, ts: string, user: string, action: string, rtype: string, rid: string, details: any, ip: string) =>
  createHash("sha256").update(stable({ prev, ts, user, action, rtype, rid, details, ip })).digest("hex");
export function audit(s: State, username: string, action: string, resource_type = "", resource_id: string | number = "", details: Record<string, any> = {}, ip = ""): AuditEntry {
  const prev = s.audit.length ? s.audit[s.audit.length - 1].hash : GENESIS; const ts = now();
  const e: AuditEntry = { id: nextId(s), ts, username, action, resource_type, resource_id: String(resource_id), details, ip, prev_hash: prev, hash: digest(prev, ts, username, action, resource_type, String(resource_id), details, ip) };
  s.audit.push(e); return e;
}
export function verifyChain(s: State) {
  let prev = GENESIS, checked = 0;
  for (const r of s.audit) {
    if (r.prev_hash !== prev || r.hash !== digest(prev, r.ts, r.username, r.action, r.resource_type, r.resource_id, r.details, r.ip)) return { valid: false, checked, broken_at: r.id };
    prev = r.hash; checked++;
  }
  return { valid: true, checked, broken_at: null };
}

// ---------- Graphe ----------
export function egoSubgraph(s: State, u: User, roots: number[], depth = 1, limit = 300) {
  const rels = visibleRelations(s, u); const vis = new Set(visibleEntities(s, u).map((e) => e.id));
  const seen = new Set<number>(); const q: [number, number][] = [];
  for (const r of roots) if (vis.has(r) && !seen.has(r)) { seen.add(r); q.push([r, 0]); }
  while (q.length && seen.size < limit) {
    const [n, d] = q.shift()!; if (d >= depth) continue;
    for (const r of rels) {
      if (r.source_id !== n && r.target_id !== n) continue;
      const o = r.source_id === n ? r.target_id : r.source_id;
      if (vis.has(o) && !seen.has(o)) { seen.add(o); q.push([o, d + 1]); if (seen.size >= limit) break; }
    }
  }
  const nodes = s.entities.filter((e) => seen.has(e.id));
  const edges = rels.filter((r) => seen.has(r.source_id) && seen.has(r.target_id));
  return { nodes, edges };
}
function adjacency(s: State, u: User) {
  const adj = new Map<number, Map<number, number>>();
  for (const e of visibleEntities(s, u)) adj.set(e.id, new Map());
  for (const r of visibleRelations(s, u)) if (adj.has(r.source_id) && adj.has(r.target_id)) { adj.get(r.source_id)!.set(r.target_id, (adj.get(r.source_id)!.get(r.target_id) || 0) + r.weight); adj.get(r.target_id)!.set(r.source_id, (adj.get(r.target_id)!.get(r.source_id) || 0) + r.weight); }
  return adj;
}
export function shortestPath(s: State, u: User, a: number, b: number, maxLen = 6): number[] | null {
  const adj = adjacency(s, u); if (!adj.has(a) || !adj.has(b)) return null;
  const prev = new Map<number, number>([[a, -1]]); const q = [a];
  while (q.length) { const n = q.shift()!; if (n === b) break; for (const m of adj.get(n)!.keys()) if (!prev.has(m)) { prev.set(m, n); q.push(m); } }
  if (!prev.has(b)) return null;
  const path = [b]; while (path[0] !== a) path.unshift(prev.get(path[0])!);
  return path.length - 1 <= maxLen ? path : null;
}
export function centrality(s: State, u: User, top = 10) {
  const adj = adjacency(s, u); const ids = [...adj.keys()]; const n = ids.length;
  const byId = new Map(s.entities.map((e) => [e.id, e]));
  const fmt = (m: Map<number, number>) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, top).map(([id, sc]) => ({ id, label: byId.get(id)!.label, type: byId.get(id)!.type, score: Math.round(sc * 10000) / 10000 }));
  if (!n) return { degree: [], betweenness: [], pagerank: [], communities: [], nodes: 0, edges: 0 };
  const degree = new Map(ids.map((id) => [id, adj.get(id)!.size / Math.max(1, n - 1)]));
  // Betweenness (Brandes, non pondéré)
  const bet = new Map(ids.map((id) => [id, 0]));
  for (const src of ids) {
    const stack: number[] = []; const P = new Map<number, number[]>(ids.map((id) => [id, []])); const sigma = new Map(ids.map((id) => [id, 0])); const dist = new Map(ids.map((id) => [id, -1]));
    sigma.set(src, 1); dist.set(src, 0); const q = [src];
    while (q.length) { const v = q.shift()!; stack.push(v); for (const w of adj.get(v)!.keys()) { if (dist.get(w)! < 0) { q.push(w); dist.set(w, dist.get(v)! + 1); } if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); P.get(w)!.push(v); } } }
    const delta = new Map(ids.map((id) => [id, 0]));
    while (stack.length) { const w = stack.pop()!; for (const v of P.get(w)!) delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!)); if (w !== src) bet.set(w, bet.get(w)! + delta.get(w)!); }
  }
  const scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 0; for (const id of ids) bet.set(id, bet.get(id)! * scale);
  // PageRank pondéré
  let pr = new Map(ids.map((id) => [id, 1 / n])); const d = 0.85;
  for (let it = 0; it < 60; it++) {
    const next = new Map(ids.map((id) => [id, (1 - d) / n]));
    for (const id of ids) { const out = adj.get(id)!; const tot = [...out.values()].reduce((x, y) => x + y, 0); if (!tot) { for (const j of ids) next.set(j, next.get(j)! + (d * pr.get(id)!) / n); continue; } for (const [m, w] of out) next.set(m, next.get(m)! + d * pr.get(id)! * (w / tot)); }
    pr = next;
  }
  // Communautés : propagation de labels (déterministe)
  const label = new Map(ids.map((id) => [id, id]));
  for (let it = 0; it < 20; it++) {
    let changed = false;
    for (const id of [...ids].sort((x, y) => (degree.get(y)! - degree.get(x)!) || x - y)) {
      const counts = new Map<number, number>(); for (const [m, w] of adj.get(id)!) counts.set(label.get(m)!, (counts.get(label.get(m)!) || 0) + w);
      if (!counts.size) continue;
      const best = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0];
      if (best !== label.get(id)) { label.set(id, best); changed = true; }
    }
    if (!changed) break;
  }
  const groups = new Map<number, number[]>(); for (const id of ids) { const l = label.get(id)!; groups.set(l, [...(groups.get(l) || []), id]); }
  const communities = [...groups.values()].filter((g) => g.length > 1).sort((x, y) => y.length - x.length).slice(0, 10).map((members, i) => ({ id: i, size: members.length, members: members.sort((x, y) => degree.get(y)! - degree.get(x)!).slice(0, 12).map((id) => ({ id, label: byId.get(id)!.label, type: byId.get(id)!.type })) }));
  const edges = ids.reduce((acc, id) => acc + adj.get(id)!.size, 0) / 2;
  return { degree: fmt(degree), betweenness: fmt(bet), pagerank: fmt(pr), communities, nodes: n, edges };
}

// ---------- Ingestion ----------
export function parseRows(filename: string, text: string): Record<string, string>[] {
  text = text.replace(/^﻿/, "");
  if (filename.toLowerCase().endsWith(".json")) { let data = JSON.parse(text); if (!Array.isArray(data)) data = data.rows || data.data || [data]; return data.map((r: any) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)]))); }
  const first = text.split(/\r?\n/)[0] || "";
  const delim = [";", ",", "\t", "|"].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  // Lecture caractère par caractère : les guillemets peuvent contenir le séparateur et des sauts de ligne.
  const records: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((v) => v.trim())) records.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); if (row.some((v) => v.trim())) records.push(row); }
  const header = records[0].map((h) => h.trim());
  return records.slice(1).map((vals) => Object.fromEntries(header.map((h, i) => [h, (vals[i] ?? "").trim()])));
}
const render = (tpl: any, row: Record<string, string>) => (typeof tpl === "string" ? tpl.replace(/\{([^{}]+)\}/g, (_, k) => row[k] ?? "").trim() : tpl);
const toNum = (v: any) => { if (v === "" || v == null) return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
export function runIngestion(s: State, o: { source: Source; filename: string; text: string; mapping: any; username: string; classification: number; compartment: string | null }): IngestJob {
  const job: IngestJob = { id: nextId(s), source_id: o.source.id, filename: o.filename, status: "RUNNING", rows_total: 0, entities_created: 0, entities_merged: 0, relations_created: 0, alerts_raised: 0, errors: [], mapping: o.mapping, started_by: o.username, created_at: now() };
  s.jobs.unshift(job);
  let rows: Record<string, string>[];
  try { rows = parseRows(o.filename, o.text); } catch (e: any) { job.status = "FAILED"; job.errors = [`lecture impossible : ${e.message}`]; return job; }
  job.rows_total = rows.length;
  rows.forEach((row, idx) => {
    const refs: Record<string, Entity> = {};
    try {
      for (const spec of o.mapping.entities || []) {
        const label = render(spec.label || "", row); if (!label) continue;
        const attrs = Object.fromEntries(Object.entries(spec.attributes || {}).map(([k, v]) => [k, render(v, row)]));
        const { entity, created } = upsertEntity(s, { type: spec.type, label, attributes: attrs, classification: Number(spec.classification ?? o.classification), compartment: spec.compartment || o.compartment, lat: toNum(render(spec.lat, row)), lon: toNum(render(spec.lon, row)), source: o.source, external_ref: `${o.filename}#${idx + 1}`, created_by: o.username });
        refs[spec.ref] = entity; created ? job.entities_created++ : job.entities_merged++;
        job.alerts_raised += evaluateAlerts(s, entity).length;
      }
      for (const spec of o.mapping.relations || []) {
        const a = refs[spec.source], b = refs[spec.target]; if (!a || !b || a.id === b.id) continue;
        const attrs = Object.fromEntries(Object.entries(spec.attributes || {}).map(([k, v]) => [k, render(v, row)]));
        if (upsertRelation(s, a.id, b.id, spec.type, attrs, Number(spec.weight ?? 1), Number(spec.classification ?? o.classification), spec.compartment || o.compartment, o.source.id).created) job.relations_created++;
      }
    } catch (e: any) { job.errors.push(`ligne ${idx + 1} : ${e.message}`); }
  });
  job.errors = job.errors.slice(0, 200);
  job.status = !job.errors.length ? "DONE" : job.errors.length < rows.length ? "PARTIAL" : "FAILED";
  return job;
}
