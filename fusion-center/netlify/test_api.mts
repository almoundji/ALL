// Test local de la fonction serverless (sans Netlify) : node --experimental-strip-types netlify/test_api.mts
import assert from "node:assert/strict";
import handler from "./functions/api.mts";

const BASE = "http://localhost";
const call = async (method: string, path: string, opts: { token?: string; json?: any; form?: FormData; raw?: URLSearchParams } = {}) => {
  const headers: Record<string, string> = {}; if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: any; if (opts.json) { headers["content-type"] = "application/json"; body = JSON.stringify(opts.json); } else if (opts.form) body = opts.form; else if (opts.raw) { headers["content-type"] = "application/x-www-form-urlencoded"; body = opts.raw; }
  const res = await handler(new Request(BASE + path, { method, headers, body }), { ip: "127.0.0.1" } as any);
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};
const login = async (u: string, p: string) => { const r = await call("POST", "/api/auth/login", { raw: new URLSearchParams({ username: u, password: p }) }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.access_token as string; };

const admin = await login("admin", "admin123"), analyst = await login("analyste", "analyste123"), officer = await login("officier", "officier123"), viewer = await login("lecteur", "lecteur123");
assert.equal((await call("POST", "/api/auth/login", { raw: new URLSearchParams({ username: "admin", password: "x" }) })).status, 401);

const tA = (await call("GET", "/api/entities", { token: admin })).body.total, tO = (await call("GET", "/api/entities", { token: officer })).body.total, tV = (await call("GET", "/api/entities", { token: viewer })).body.total;
assert.ok(tA > tO && tO > tV && tV > 0, `clearance ${tA} ${tO} ${tV}`);
const cyber = (await call("GET", "/api/entities?q=Libert%C3%A9%206", { token: admin })).body.items[0];
assert.equal(cyber.compartment, "CYBER"); assert.equal((await call("GET", `/api/entities/${cyber.id}`, { token: analyst })).status, 404);

const merged = (await call("POST", "/api/entities", { token: analyst, json: { type: "PERSON", label: "Abdou-Karim Ndour", attributes: { birth_date: "1984-03-12", alias: "Karim" }, classification: 1 } })).body;
assert.equal(merged.label, "Abdou Karim NDOUR"); assert.ok(merged.attributes._variants.alias.includes("Karim"));
const ph1 = (await call("POST", "/api/entities", { token: analyst, json: { type: "PHONE", label: "00221771234567", attributes: { number: "00221771234567" } } })).body;
const ph2 = (await call("POST", "/api/entities", { token: analyst, json: { type: "PHONE", label: "77 123 45 67", attributes: { number: "77 123 45 67" } } })).body;
assert.equal(ph1.id, ph2.id);
assert.equal((await call("POST", "/api/entities", { token: officer, json: { type: "PERSON", label: "Test SD", classification: 3 } })).status, 403);
assert.equal((await call("POST", "/api/entities", { token: viewer, json: { type: "PERSON", label: "X Y" } })).status, 403);

const ak = (await call("GET", "/api/entities?q=Abdou%20Karim", { token: admin })).body.items.find((e: any) => e.label === "Abdou Karim NDOUR");
const oumar = (await call("GET", "/api/entities?q=Oumar%20BA", { token: admin })).body.items[0];
const g = (await call("GET", `/api/entities/${ak.id}/graph?depth=2`, { token: admin })).body; assert.ok(g.nodes.length > 5 && g.edges.length > 5);
const p = (await call("GET", `/api/graph/path?a=${ak.id}&b=${oumar.id}`, { token: admin })).body; assert.ok(p.found && p.path[0] === ak.id);
const an = (await call("GET", "/api/graph/analytics", { token: admin })).body; assert.ok(an.pagerank.length && an.betweenness.length && an.communities.length, JSON.stringify(an).slice(0, 200));
assert.equal((await call("GET", `/api/entities/${ak.id}/graph`, { token: officer })).status, 404);
const mf = (await call("GET", "/api/entities?q=Mamadou%20FAYE", { token: officer })).body.items[0];
const go = (await call("GET", `/api/entities/${mf.id}/graph?depth=3`, { token: officer })).body; assert.ok(go.nodes.every((n: any) => n.classification <= 1) && go.edges.every((e: any) => e.classification <= 1));

const src = (await call("GET", "/api/ingest/sources", { token: analyst })).body.find((s: any) => s.name === "DEMO-ADMIN");
const tpl = (await call("GET", "/api/ingest/templates", { token: analyst })).body.annuaire_personnes.mapping;
const csv = "nom;prenom;naissance;telephone;ville;lat;lon\nNDOUR;Abdou Karim;1984-03-12;+221771234567;Dakar;14.69;-17.44\nDIENG;Pape;1980-02-02;+221701112233;Rosso;16.51;-15.80\nDIENG;Pape;1980-02-02;+221701112233;Rosso;16.51;-15.80\n";
const fd = new FormData(); fd.append("file", new File([csv], "annuaire.csv", { type: "text/csv" })); fd.append("source_id", String(src.id)); fd.append("mapping", JSON.stringify(tpl)); fd.append("classification", "1");
const job = (await call("POST", "/api/ingest/upload", { token: analyst, form: fd })).body;
assert.equal(job.status, "DONE", JSON.stringify(job)); assert.equal(job.rows_total, 3); assert.ok(job.entities_merged >= 4 && job.entities_created >= 3 && job.alerts_raised >= 1, JSON.stringify(job));
const pv = new FormData(); pv.append("file", new File([csv], "annuaire.csv")); assert.equal((await call("POST", "/api/ingest/preview", { token: analyst, form: pv })).body.total, 3);
const detail = (await call("GET", `/api/entities/${ak.id}`, { token: admin })).body; assert.ok(detail.provenance.length >= 2 && detail.degree > 0);

const kase = (await call("POST", "/api/cases", { token: analyst, json: { title: "Dossier test", priority: "P1", classification: 1 } })).body; assert.ok(kase.reference.startsWith("DRN-"));
const d1 = (await call("POST", `/api/cases/${kase.id}/entities`, { token: analyst, json: { entity_id: mf.id, role: "SUBJECT" } })).body; assert.equal(d1.entities[0].entity.label, "Mamadou FAYE");
const d2 = (await call("POST", `/api/cases/${kase.id}/notes`, { token: analyst, json: { content: "Hypothèse A", kind: "HYPOTHESIS" } })).body; assert.equal(d2.notes[0].kind, "HYPOTHESIS");
assert.equal((await call("PATCH", `/api/cases/${kase.id}`, { token: analyst, json: { status: "CLOSED" } })).body.status, "CLOSED");
const refsO = (await call("GET", "/api/cases", { token: officer })).body.map((c: any) => c.reference); assert.ok(!refsO.some((r: string) => r.endsWith("0001")));

const wl = (await call("POST", "/api/watchlists", { token: analyst, json: { name: "Test véhicule", entity_type: "VEHICLE", field: "attributes.plate", operator: "contains", value: "8890", severity: "CRITICAL" } })); assert.equal(wl.status, 200);
const hit = (await call("GET", "/api/alerts", { token: admin })).body.find((a: any) => a.title.startsWith("[Test véhicule]")); assert.ok(hit);
assert.equal((await call("PATCH", `/api/alerts/${hit.id}`, { token: analyst, json: { status: "ACK", assigned_to: "analyste" } })).body.status, "ACK");

const dash = (await call("GET", "/api/dashboard", { token: analyst })).body; assert.ok(dash.entities > 0 && dash.by_type.length && dash.top_pagerank.length && dash.geo_entities > 0);
assert.equal((await call("GET", "/api/audit", { token: analyst })).status, 403);
const v = (await call("GET", "/api/audit/verify", { token: admin })).body; assert.ok(v.valid && v.checked > 10, JSON.stringify(v));
const nu = (await call("POST", "/api/users", { token: admin, json: { username: "nouvel", password: "motdepasse1", role: "viewer", clearance: 0 } })); assert.equal(nu.status, 200, JSON.stringify(nu.body));
assert.equal((await call("PATCH", `/api/users/${nu.body.id}`, { token: admin, json: { clearance: 2, compartments: "OPS" } })).body.clearance, 2);
assert.equal((await call("GET", "/api/health")).body.status, "ok");
console.log("OK — fonction serverless : tous les scénarios passent", { entities: tA, audit: v.checked });
