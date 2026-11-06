// API du Centre de Fusion en fonction serverless Netlify (port de l'API FastAPI).
// L'état complet est conservé en un seul document JSON dans Netlify Blobs (démo) ; en mémoire si Blobs est indisponible.
import type { Config, Context } from "@netlify/functions";
import {
  audit, canSee, centrality, CLASSIFICATIONS, compartmentsOf, egoSubgraph, ENTITY_TYPES, evaluateAlerts, hashPassword, nextId, now,
  parseRows, RELATION_TYPES, runIngestion, shortestPath, signToken, SOURCE_TYPES, upsertEntity, upsertRelation, buildKey, verifyChain,
  verifyPassword, verifyToken, visibleEntities, visibleEntity, visibleRelations, type State, type User,
} from "../lib/core.mts";
import { createState } from "../lib/seed.mts";

const env = (k: string, d = "") => (globalThis as any).Netlify?.env.get(k) ?? process.env[k] ?? d;
const SECRET = () => env("FC_SECRET_KEY", "demo-secret-change-me-in-netlify-env");
const STORE_KEY = "state-v1";

// ---------- Persistance ----------
let memory: State | null = null;
async function store() {
  try { const { getStore } = await import("@netlify/blobs"); return getStore({ name: "fusion-center", consistency: "strong" }); } catch { return null; }
}
async function loadState(): Promise<State> {
  const st = await store();
  if (st) { try { const s = (await st.get(STORE_KEY, { type: "json" })) as State | null; if (s) return s; } catch { /* premier démarrage ou Blobs indisponible */ } }
  if (memory) return memory;
  memory = createState(env("FC_ADMIN_PASSWORD", "admin123"));
  if (st) { try { await st.setJSON(STORE_KEY, memory); } catch { /* ignore */ } }
  return memory;
}
async function saveState(s: State) { memory = s; const st = await store(); if (st) { try { await st.setJSON(STORE_KEY, s); } catch { /* ignore */ } } }

// ---------- Utilitaires HTTP ----------
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const num = (v: string | null, d: number) => (v == null || v === "" ? d : Number(v));
const pub = ({ password_hash, ...u }: User) => u;
const requireRole = (u: User, ...roles: string[]) => { if (!roles.includes(u.role)) throw new HttpError(403, "Droits insuffisants"); };
const sortDesc = <T,>(a: T[], k: keyof T) => [...a].sort((x, y) => String(y[k]).localeCompare(String(x[k])));

const TEMPLATES = {
  annuaire_personnes: { description: "Personnes avec téléphone et adresse (colonnes : nom, prenom, naissance, telephone, ville, lat, lon)", mapping: { entities: [{ ref: "p", type: "PERSON", label: "{prenom} {nom}", attributes: { birth_date: "{naissance}", city: "{ville}" } }, { ref: "t", type: "PHONE", label: "{telephone}", attributes: { number: "{telephone}" } }, { ref: "l", type: "LOCATION", label: "{ville}", lat: "{lat}", lon: "{lon}" }], relations: [{ source: "p", target: "t", type: "USES" }, { source: "p", target: "l", type: "LOCATED_AT" }] } },
  cdr_appels: { description: "Relevés d'appels (colonnes : appelant, appele, date, duree)", mapping: { entities: [{ ref: "a", type: "PHONE", label: "{appelant}", attributes: { number: "{appelant}" } }, { ref: "b", type: "PHONE", label: "{appele}", attributes: { number: "{appele}" } }], relations: [{ source: "a", target: "b", type: "CALLED", attributes: { date: "{date}", duration: "{duree}" } }] } },
  vehicules: { description: "Immatriculations et propriétaires (colonnes : plaque, marque, proprietaire)", mapping: { entities: [{ ref: "v", type: "VEHICLE", label: "{plaque}", attributes: { plate: "{plaque}", brand: "{marque}" } }, { ref: "p", type: "PERSON", label: "{proprietaire}" }], relations: [{ source: "p", target: "v", type: "OWNS" }] } },
  transactions: { description: "Virements (colonnes : emetteur, beneficiaire, montant, date)", mapping: { entities: [{ ref: "a", type: "ACCOUNT", label: "{emetteur}", attributes: { iban: "{emetteur}" } }, { ref: "b", type: "ACCOUNT", label: "{beneficiaire}", attributes: { iban: "{beneficiaire}" } }], relations: [{ source: "a", target: "b", type: "TRANSFERRED_TO", attributes: { amount: "{montant}", date: "{date}" } }] } },
};

// ---------- Routeur ----------
type Ctx = { s: State; user: User; ip: string; url: URL; req: Request; dirty: boolean };
type Handler = (c: Ctx, p: Record<string, string>) => Promise<unknown> | unknown;
const routes: { method: string; pattern: RegExp; keys: string[]; h: Handler; auth: boolean }[] = [];
function route(method: string, path: string, h: Handler, auth = true) {
  const keys: string[] = [];
  const pattern = new RegExp("^" + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "(\\d+)"; }) + "/?$");
  routes.push({ method, pattern, keys, h, auth });
}
const body = async (req: Request) => { try { return await req.json(); } catch { return {}; } };
const caseVisible = (c: Ctx, id: number) => { const x = c.s.cases.find((k) => k.id === id); if (!x || !canSee(c.user, x.classification, x.compartment)) throw new HttpError(404, "Dossier introuvable"); return x; };
const caseDetail = (c: Ctx, id: number) => {
  const k = caseVisible(c, id);
  const links = c.s.case_entities.filter((x) => x.case_id === id);
  return { ...k, entity_count: links.length, notes: c.s.case_notes.filter((n) => n.case_id === id), entities: links.map((l) => ({ ...l, entity: visibleEntity(c.s, c.user, l.entity_id) })) };
};
const caseOut = (c: Ctx, k: any) => ({ ...k, entity_count: c.s.case_entities.filter((x) => x.case_id === k.id).length });

route("GET", "/api/health", () => ({ status: "ok", app: "Centre de Fusion National", environment: "netlify" }), false);
route("GET", "/api/auth/meta", () => ({ classifications: CLASSIFICATIONS.map(([code, label], level) => ({ level, code, label })), entity_types: ENTITY_TYPES, relation_types: RELATION_TYPES, source_types: SOURCE_TYPES }), false);
route("GET", "/api/auth/me", (c) => pub(c.user));

// Entités
route("GET", "/api/entities", (c) => {
  const q = (c.url.searchParams.get("q") || "").toLowerCase(); const type = c.url.searchParams.get("type"); const cls = c.url.searchParams.get("classification"); const geo = c.url.searchParams.get("has_geo") === "true";
  let items = visibleEntities(c.s, c.user);
  if (type) items = items.filter((e) => e.type === type);
  if (cls) items = items.filter((e) => e.classification === Number(cls));
  if (geo) items = items.filter((e) => e.lat != null);
  if (q) items = items.filter((e) => e.label.toLowerCase().includes(q) || JSON.stringify(e.attributes).toLowerCase().includes(q));
  items = sortDesc(items, "updated_at");
  const limit = Math.min(500, num(c.url.searchParams.get("limit"), 50)), offset = num(c.url.searchParams.get("offset"), 0);
  return { total: items.length, items: items.slice(offset, offset + limit) };
});
route("POST", "/api/entities", async (c) => {
  requireRole(c.user, "admin", "analyst"); const b = await body(c.req);
  if (!ENTITY_TYPES.includes(b.type)) throw new HttpError(422, `type inconnu : ${b.type}`);
  if ((b.classification ?? 1) > c.user.clearance) throw new HttpError(403, "Impossible de créer un objet au-dessus de votre habilitation");
  const source = b.source_id ? c.s.sources.find((x) => x.id === b.source_id) : null;
  const { entity, created } = upsertEntity(c.s, { ...b, source, created_by: c.user.username });
  const raised = evaluateAlerts(c.s, entity);
  audit(c.s, c.user.username, created ? "ENTITY_CREATE" : "ENTITY_MERGE", "entity", entity.id, { label: entity.label, type: entity.type, alerts: raised.length }, c.ip);
  c.dirty = true; return entity;
});
route("GET", "/api/entities/:id", (c, p) => {
  const e = visibleEntity(c.s, c.user, +p.id); if (!e) throw new HttpError(404, "Entité introuvable");
  const degree = visibleRelations(c.s, c.user).filter((r) => r.source_id === e.id || r.target_id === e.id).length;
  audit(c.s, c.user.username, "ENTITY_VIEW", "entity", e.id, { label: e.label }, c.ip); c.dirty = true;
  const provenance = c.s.provenance.filter((x) => x.entity_id === e.id).map((x) => ({ ...x, source: c.s.sources.find((y) => y.id === x.source_id) }));
  return { ...e, provenance, degree };
});
route("PATCH", "/api/entities/:id", async (c, p) => {
  requireRole(c.user, "admin", "analyst"); const e = visibleEntity(c.s, c.user, +p.id); if (!e) throw new HttpError(404, "Entité introuvable");
  const b = await body(c.req); if (b.classification != null && b.classification > c.user.clearance) throw new HttpError(403, "Classification au-dessus de votre habilitation");
  for (const k of ["label", "attributes", "classification", "compartment", "lat", "lon", "confidence"]) if (k in b) (e as any)[k] = b[k];
  e.normalized_key = buildKey(e.type, e.label, e.attributes); e.updated_at = now();
  audit(c.s, c.user.username, "ENTITY_UPDATE", "entity", e.id, { changes: Object.keys(b) }, c.ip); c.dirty = true; return e;
});
route("DELETE", "/api/entities/:id", (c, p) => {
  requireRole(c.user, "admin"); const e = visibleEntity(c.s, c.user, +p.id); if (!e) throw new HttpError(404, "Entité introuvable");
  audit(c.s, c.user.username, "ENTITY_DELETE", "entity", e.id, { label: e.label }, c.ip);
  c.s.entities = c.s.entities.filter((x) => x.id !== e.id); c.s.relations = c.s.relations.filter((r) => r.source_id !== e.id && r.target_id !== e.id);
  c.s.provenance = c.s.provenance.filter((x) => x.entity_id !== e.id); c.s.case_entities = c.s.case_entities.filter((x) => x.entity_id !== e.id); c.s.alerts = c.s.alerts.filter((a) => a.entity_id !== e.id);
  c.dirty = true; return new Response(null, { status: 204 });
});
route("GET", "/api/entities/:id/relations", (c, p) => {
  if (!visibleEntity(c.s, c.user, +p.id)) throw new HttpError(404, "Entité introuvable");
  const vis = new Set(visibleEntities(c.s, c.user).map((e) => e.id));
  return visibleRelations(c.s, c.user).filter((r) => (r.source_id === +p.id || r.target_id === +p.id) && vis.has(r.source_id) && vis.has(r.target_id));
});
route("GET", "/api/entities/:id/graph", (c, p) => {
  if (!visibleEntity(c.s, c.user, +p.id)) throw new HttpError(404, "Entité introuvable");
  const depth = Math.min(4, num(c.url.searchParams.get("depth"), 1)), limit = Math.min(1000, num(c.url.searchParams.get("limit"), 200));
  const sub = egoSubgraph(c.s, c.user, [+p.id], depth, limit);
  audit(c.s, c.user.username, "GRAPH_EXPAND", "entity", +p.id, { depth, nodes: sub.nodes.length }, c.ip); c.dirty = true; return sub;
});
route("POST", "/api/relations", async (c) => {
  requireRole(c.user, "admin", "analyst"); const b = await body(c.req);
  if (!RELATION_TYPES.includes(b.type)) throw new HttpError(422, `type de relation inconnu : ${b.type}`);
  if (!visibleEntity(c.s, c.user, b.source_id) || !visibleEntity(c.s, c.user, b.target_id)) throw new HttpError(404, "Entité source ou cible introuvable");
  let res; try { res = upsertRelation(c.s, b.source_id, b.target_id, b.type, b.attributes || {}, b.weight ?? 1, b.classification ?? 1, b.compartment || null); } catch (e: any) { throw new HttpError(422, e.message); }
  res.relation.valid_from = b.valid_from ?? null; res.relation.valid_to = b.valid_to ?? null;
  audit(c.s, c.user.username, res.created ? "RELATION_CREATE" : "RELATION_MERGE", "relation", res.relation.id, { type: b.type, source: b.source_id, target: b.target_id }, c.ip); c.dirty = true; return res.relation;
});
route("DELETE", "/api/relations/:id", (c, p) => {
  requireRole(c.user, "admin", "analyst"); const r = c.s.relations.find((x) => x.id === +p.id);
  if (!r || !canSee(c.user, r.classification, r.compartment)) throw new HttpError(404, "Relation introuvable");
  audit(c.s, c.user.username, "RELATION_DELETE", "relation", r.id, { type: r.type }, c.ip); c.s.relations = c.s.relations.filter((x) => x.id !== r.id); c.dirty = true; return new Response(null, { status: 204 });
});

// Graphe
route("GET", "/api/graph/expand", (c) => {
  const roots = (c.url.searchParams.get("ids") || "").split(",").map(Number).filter((n) => Number.isFinite(n) && visibleEntity(c.s, c.user, n));
  if (!roots.length) throw new HttpError(404, "Aucune entité racine accessible");
  return egoSubgraph(c.s, c.user, roots, Math.min(4, num(c.url.searchParams.get("depth"), 1)), Math.min(1000, num(c.url.searchParams.get("limit"), 300)));
});
route("GET", "/api/graph/path", (c) => {
  const a = num(c.url.searchParams.get("a"), 0), b = num(c.url.searchParams.get("b"), 0);
  if (!visibleEntity(c.s, c.user, a) || !visibleEntity(c.s, c.user, b)) throw new HttpError(404, "Entité introuvable");
  const path = shortestPath(c.s, c.user, a, b);
  audit(c.s, c.user.username, "GRAPH_PATH", "entity", `${a}->${b}`, { found: !!path }, c.ip); c.dirty = true;
  return path ? { found: true, path, graph: egoSubgraph(c.s, c.user, path, 0) } : { found: false, path: [], graph: { nodes: [], edges: [] } };
});
route("GET", "/api/graph/analytics", (c) => centrality(c.s, c.user, Math.min(50, num(c.url.searchParams.get("top"), 10))));

// Dossiers
route("GET", "/api/cases", (c) => { const st = c.url.searchParams.get("status"); return sortDesc(c.s.cases.filter((k) => canSee(c.user, k.classification, k.compartment) && (!st || k.status === st)), "updated_at").map((k) => caseOut(c, k)); });
route("POST", "/api/cases", async (c) => {
  requireRole(c.user, "admin", "analyst"); const b = await body(c.req);
  if ((b.classification ?? 2) > c.user.clearance) throw new HttpError(403, "Classification au-dessus de votre habilitation");
  const k = { id: nextId(c.s), reference: `DRN-${new Date().getFullYear()}-${String(c.s.cases.length + 1).padStart(4, "0")}`, title: b.title, description: b.description || "", status: "OPEN", priority: b.priority || "P2", classification: b.classification ?? 2, compartment: b.compartment || null, owner: c.user.username, created_at: now(), updated_at: now() };
  c.s.cases.push(k); audit(c.s, c.user.username, "CASE_CREATE", "case", k.id, { reference: k.reference }, c.ip); c.dirty = true; return caseOut(c, k);
});
route("GET", "/api/cases/:id", (c, p) => { const d = caseDetail(c, +p.id); audit(c.s, c.user.username, "CASE_VIEW", "case", d.id, { reference: d.reference }, c.ip); c.dirty = true; return d; });
route("PATCH", "/api/cases/:id", async (c, p) => {
  requireRole(c.user, "admin", "analyst"); const k = caseVisible(c, +p.id); const b = await body(c.req);
  for (const f of ["title", "description", "status", "priority", "owner"]) if (f in b) (k as any)[f] = b[f];
  k.updated_at = now(); audit(c.s, c.user.username, "CASE_UPDATE", "case", k.id, { changes: b }, c.ip); c.dirty = true; return caseOut(c, k);
});
route("POST", "/api/cases/:id/entities", async (c, p) => {
  requireRole(c.user, "admin", "analyst"); const k = caseVisible(c, +p.id); const b = await body(c.req);
  if (!visibleEntity(c.s, c.user, b.entity_id)) throw new HttpError(404, "Entité introuvable");
  if (!c.s.case_entities.some((x) => x.case_id === k.id && x.entity_id === b.entity_id)) { c.s.case_entities.push({ id: nextId(c.s), case_id: k.id, entity_id: b.entity_id, role: b.role || "SUBJECT", added_by: c.user.username, added_at: now() }); audit(c.s, c.user.username, "CASE_ADD_ENTITY", "case", k.id, { entity_id: b.entity_id }, c.ip); }
  k.updated_at = now(); c.dirty = true; return caseDetail(c, k.id);
});
route("DELETE", "/api/cases/:id/entities/:eid", (c, p) => {
  requireRole(c.user, "admin", "analyst"); const k = caseVisible(c, +p.id);
  c.s.case_entities = c.s.case_entities.filter((x) => !(x.case_id === k.id && x.entity_id === +p.eid));
  audit(c.s, c.user.username, "CASE_REMOVE_ENTITY", "case", k.id, { entity_id: +p.eid }, c.ip); c.dirty = true; return new Response(null, { status: 204 });
});
route("POST", "/api/cases/:id/notes", async (c, p) => {
  requireRole(c.user, "admin", "analyst"); const k = caseVisible(c, +p.id); const b = await body(c.req);
  if (!b.content) throw new HttpError(422, "contenu vide");
  c.s.case_notes.push({ id: nextId(c.s), case_id: k.id, author: c.user.username, content: b.content, kind: b.kind || "NOTE", created_at: now() });
  k.updated_at = now(); audit(c.s, c.user.username, "CASE_NOTE", "case", k.id, { kind: b.kind || "NOTE" }, c.ip); c.dirty = true; return caseDetail(c, k.id);
});

// Ingestion
route("GET", "/api/ingest/sources", (c) => c.s.sources.filter((x) => x.classification <= c.user.clearance).sort((a, b) => a.name.localeCompare(b.name)));
route("POST", "/api/ingest/sources", async (c) => {
  requireRole(c.user, "admin", "analyst"); const b = await body(c.req);
  if (c.s.sources.some((x) => x.name === b.name)) throw new HttpError(409, "Source déjà existante");
  const src = { id: nextId(c.s), name: b.name, type: b.type || "CSV", reliability: b.reliability || "C", description: b.description || "", classification: b.classification ?? 1, created_at: now() };
  c.s.sources.push(src); audit(c.s, c.user.username, "SOURCE_CREATE", "source", src.id, { name: src.name }, c.ip); c.dirty = true; return src;
});
route("GET", "/api/ingest/templates", () => TEMPLATES);
route("POST", "/api/ingest/preview", async (c) => {
  const form = await c.req.formData(); const f = form.get("file") as File | null; if (!f) throw new HttpError(422, "fichier manquant");
  if (f.size > 4 * 1024 * 1024) throw new HttpError(413, "Fichier trop volumineux (4 Mo max sur Netlify)");
  let rows; try { rows = parseRows(f.name, await f.text()); } catch (e: any) { throw new HttpError(422, `Fichier illisible : ${e.message}`); }
  return { columns: rows[0] ? Object.keys(rows[0]) : [], rows: rows.slice(0, 10), total: rows.length };
});
route("POST", "/api/ingest/upload", async (c) => {
  requireRole(c.user, "admin", "analyst"); const form = await c.req.formData(); const f = form.get("file") as File | null; if (!f) throw new HttpError(422, "fichier manquant");
  const source = c.s.sources.find((x) => x.id === Number(form.get("source_id"))); if (!source) throw new HttpError(404, "Source introuvable");
  const classification = Number(form.get("classification") ?? 1); if (classification > c.user.clearance) throw new HttpError(403, "Classification au-dessus de votre habilitation");
  let mapping; try { mapping = JSON.parse(String(form.get("mapping"))); } catch { throw new HttpError(422, "Mapping JSON invalide"); }
  if (f.size > 4 * 1024 * 1024) throw new HttpError(413, "Fichier trop volumineux (4 Mo max sur Netlify)");
  const job = runIngestion(c.s, { source, filename: f.name || "upload.csv", text: await f.text(), mapping, username: c.user.username, classification, compartment: (form.get("compartment") as string) || null });
  audit(c.s, c.user.username, "INGEST", "ingest_job", job.id, { file: job.filename, rows: job.rows_total, created: job.entities_created, merged: job.entities_merged, relations: job.relations_created, status: job.status }, c.ip);
  c.dirty = true; return job;
});
route("GET", "/api/ingest/jobs", (c) => c.s.jobs.slice(0, 100));

// Veille et alertes
route("GET", "/api/watchlists", (c) => sortDesc(c.s.watchlists, "created_at"));
route("POST", "/api/watchlists", async (c) => {
  requireRole(c.user, "admin", "analyst"); const b = await body(c.req);
  const w = { id: nextId(c.s), name: b.name, entity_type: b.entity_type || null, field: b.field || "label", operator: b.operator || "contains", value: b.value, severity: b.severity || "MEDIUM", is_active: true, created_by: c.user.username, created_at: now() };
  c.s.watchlists.push(w); let raised = 0; for (const e of visibleEntities(c.s, c.user)) raised += evaluateAlerts(c.s, e).length;
  audit(c.s, c.user.username, "WATCHLIST_CREATE", "watchlist", w.id, { name: w.name, alerts: raised }, c.ip); c.dirty = true; return w;
});
route("PATCH", "/api/watchlists/:id/toggle", (c, p) => { requireRole(c.user, "admin", "analyst"); const w = c.s.watchlists.find((x) => x.id === +p.id); if (!w) throw new HttpError(404, "Règle introuvable"); w.is_active = !w.is_active; audit(c.s, c.user.username, "WATCHLIST_TOGGLE", "watchlist", w.id, { active: w.is_active }, c.ip); c.dirty = true; return w; });
route("DELETE", "/api/watchlists/:id", (c, p) => { requireRole(c.user, "admin"); const w = c.s.watchlists.find((x) => x.id === +p.id); if (w) { audit(c.s, c.user.username, "WATCHLIST_DELETE", "watchlist", w.id, { name: w.name }, c.ip); c.s.watchlists = c.s.watchlists.filter((x) => x.id !== w.id); c.dirty = true; } return new Response(null, { status: 204 }); });
route("GET", "/api/alerts", (c) => { const st = c.url.searchParams.get("status"); return sortDesc(c.s.alerts, "created_at").filter((a) => (!st || a.status === st) && (!a.entity_id || visibleEntity(c.s, c.user, a.entity_id))).slice(0, 500); });
route("PATCH", "/api/alerts/:id", async (c, p) => {
  requireRole(c.user, "admin", "analyst"); const a = c.s.alerts.find((x) => x.id === +p.id);
  if (!a || (a.entity_id && !visibleEntity(c.s, c.user, a.entity_id))) throw new HttpError(404, "Alerte introuvable");
  const b = await body(c.req); for (const f of ["status", "assigned_to"]) if (f in b) (a as any)[f] = b[f];
  audit(c.s, c.user.username, "ALERT_UPDATE", "alert", a.id, b, c.ip); c.dirty = true; return a;
});

// Tableau de bord, audit, utilisateurs
route("GET", "/api/dashboard", (c) => {
  const ents = visibleEntities(c.s, c.user); const rels = visibleRelations(c.s, c.user);
  const count = <T,>(arr: T[], k: (x: T) => string | number) => { const m = new Map<string | number, number>(); for (const x of arr) m.set(k(x), (m.get(k(x)) || 0) + 1); return [...m.entries()]; };
  const since = Date.now() - 30 * 86400000; const jobs = c.s.jobs.filter((j) => Date.parse(j.created_at) >= since);
  const open = c.s.alerts.filter((a) => a.status !== "CLOSED"); const an = centrality(c.s, c.user, 5);
  const byDay = new Map<string, number>(); for (const j of jobs) byDay.set(j.created_at.slice(0, 10), (byDay.get(j.created_at.slice(0, 10)) || 0) + j.entities_created + j.entities_merged);
  const admin = c.user.role === "admin" ? { users: c.s.users.length, audit_entries: c.s.audit.length, audit_today: c.s.audit.filter((a) => Date.parse(a.ts) >= Date.now() - 86400000).length } : {};
  return {
    entities: ents.length, relations: rels.length, geo_entities: ents.filter((e) => e.lat != null).length,
    sources: c.s.sources.filter((x) => x.classification <= c.user.clearance).length, watchlists_active: c.s.watchlists.filter((w) => w.is_active).length, jobs_30d: jobs.length, ...admin,
    by_type: count(ents, (e) => e.type).map(([type, n]) => ({ type, count: n })),
    by_classification: count(ents, (e) => e.classification).map(([level, n]) => ({ level, count: n })),
    alerts_by_severity: count(open, (a) => a.severity).map(([severity, n]) => ({ severity, count: n })),
    cases_by_status: count(c.s.cases.filter((k) => k.classification <= c.user.clearance), (k) => k.status).map(([status, n]) => ({ status, count: n })),
    open_alerts: open.length, ingest_timeline: [...byDay.entries()].sort().map(([day, n]) => ({ day, count: n })),
    recent_jobs: jobs.slice(0, 10).map((j) => ({ id: j.id, filename: j.filename, status: j.status, rows: j.rows_total, created_at: j.created_at })),
    recent_alerts: sortDesc(c.s.alerts.filter((a) => a.status === "NEW"), "created_at").slice(0, 8).map((a) => ({ id: a.id, title: a.title, severity: a.severity, entity_id: a.entity_id, created_at: a.created_at })),
    top_pagerank: an.pagerank, top_betweenness: an.betweenness, communities: an.communities.length,
  };
});
route("GET", "/api/audit", (c) => { requireRole(c.user, "admin"); const u = c.url.searchParams.get("username"), a = c.url.searchParams.get("action"); const limit = Math.min(2000, num(c.url.searchParams.get("limit"), 200)), offset = num(c.url.searchParams.get("offset"), 0); return [...c.s.audit].reverse().filter((x) => (!u || x.username === u) && (!a || x.action === a)).slice(offset, offset + limit); });
route("GET", "/api/audit/verify", (c) => { requireRole(c.user, "admin"); return verifyChain(c.s); });
route("GET", "/api/audit/mine", (c) => [...c.s.audit].reverse().filter((x) => x.username === c.user.username).slice(0, Math.min(500, num(c.url.searchParams.get("limit"), 50))));
route("GET", "/api/users", (c) => { requireRole(c.user, "admin"); return [...c.s.users].sort((a, b) => a.username.localeCompare(b.username)).map(pub); });
route("POST", "/api/users", async (c) => {
  requireRole(c.user, "admin"); const b = await body(c.req);
  if (!["admin", "analyst", "viewer"].includes(b.role || "analyst")) throw new HttpError(422, "rôle inconnu");
  if (!b.username || b.username.length < 3 || !b.password || b.password.length < 8) throw new HttpError(422, "identifiant (3+) et mot de passe (8+) requis");
  if (c.s.users.some((u) => u.username === b.username)) throw new HttpError(409, "Nom d'utilisateur déjà pris");
  const u: User = { id: nextId(c.s), username: b.username, full_name: b.full_name || "", password_hash: hashPassword(b.password), role: b.role || "analyst", clearance: Math.min(3, Math.max(0, b.clearance ?? 1)), compartments: b.compartments || "", unit: b.unit || "", is_active: true, created_at: now() };
  c.s.users.push(u); audit(c.s, c.user.username, "USER_CREATE", "user", u.id, { username: u.username, role: u.role, clearance: u.clearance }, c.ip); c.dirty = true; return pub(u);
});
route("PATCH", "/api/users/:id", async (c, p) => {
  requireRole(c.user, "admin"); const u = c.s.users.find((x) => x.id === +p.id); if (!u) throw new HttpError(404, "Utilisateur introuvable"); const b = await body(c.req);
  if (b.password) { u.password_hash = hashPassword(b.password); b.password = "***"; }
  for (const f of ["full_name", "role", "clearance", "compartments", "unit", "is_active"]) if (f in b) (u as any)[f] = b[f];
  audit(c.s, c.user.username, "USER_UPDATE", "user", u.id, b, c.ip); c.dirty = true; return pub(u);
});

route("POST", "/api/admin/reset-demo", async (c) => {
  requireRole(c.user, "admin");
  const fresh = createState(env("FC_ADMIN_PASSWORD", "admin123"));
  audit(fresh, c.user.username, "DEMO_RESET", "state", "demo", { previous_entities: c.s.entities.length }, c.ip);
  await saveState(fresh); c.dirty = false;
  return { ok: true, entities: fresh.entities.length, relations: fresh.relations.length };
});

// ---------- Point d'entrée ----------
export default async (req: Request, context: Context) => {
  const url = new URL(req.url); const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "";
  try {
    if (url.pathname === "/api/docs" || url.pathname === "/docs") return new Response(`<!doctype html><meta charset="utf-8"><title>API</title><body style="font-family:system-ui;max-width:800px;margin:40px auto"><h1>Centre de Fusion National — API</h1><p>Version serverless (Netlify). Routes :</p><ul>${routes.map((r) => `<li><code>${r.method} ${r.pattern.source.replace(/^\^|\/\?\$$/g, "").replace(/\(\\d\+\)/g, ":id").replace(/\\\//g, "/")}</code></li>`).join("")}</ul><p>Authentification : <code>POST /api/auth/login</code> (formulaire username / password) puis <code>Authorization: Bearer &lt;jeton&gt;</code>.</p>`, { headers: { "content-type": "text/html; charset=utf-8" } });
    const s = await loadState();
    if (url.pathname.replace(/\/$/, "") === "/api/auth/login" && req.method === "POST") {
      const form = await req.formData(); const username = String(form.get("username") || ""), password = String(form.get("password") || "");
      const u = s.users.find((x) => x.username === username);
      if (!u || !u.is_active || !verifyPassword(password, u.password_hash)) { audit(s, username, "LOGIN_FAILED", "", "", {}, ip); await saveState(s); return json({ detail: "Identifiants incorrects" }, 401); }
      audit(s, u.username, "LOGIN", "user", u.id, {}, ip); await saveState(s);
      return json({ access_token: signToken(SECRET(), { sub: u.username, role: u.role, clr: u.clearance }), token_type: "bearer" });
    }
    const match = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
    if (!match) return json({ detail: "Route inconnue" }, 404);
    let user: User | null = null;
    if (match.auth) {
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const payload = token ? verifyToken(SECRET(), token) : null;
      user = payload ? s.users.find((x) => x.username === payload.sub && x.is_active) || null : null;
      if (!user) return json({ detail: "Jeton invalide ou expiré" }, 401);
    }
    const m = url.pathname.match(match.pattern)!; const params = Object.fromEntries(match.keys.map((k, i) => [k, m[i + 1]]));
    const ctx: Ctx = { s, user: user as User, ip, url, req, dirty: false };
    const out = await match.h(ctx, params);
    if (ctx.dirty) await saveState(s);
    return out instanceof Response ? out : json(out);
  } catch (e: any) {
    if (e instanceof HttpError) return json({ detail: e.message }, e.status);
    console.error(e); return json({ detail: "Erreur interne" }, 500);
  }
};

export const config: Config = { path: ["/api", "/api/*", "/docs"] };
