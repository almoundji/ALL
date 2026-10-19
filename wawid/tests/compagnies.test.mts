// Plateforme des compagnies aériennes : dissociation des plateformes, cloisonnement par compagnie, circuit de la redevance.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/api.mts";

const jars: Record<string, string> = {};
async function call(who: string, method: string, path: string, body?: unknown) {
  const res = await handler(new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json", cookie: jars[who] || "" }, body: body ? JSON.stringify(body) : undefined }));
  const set = res.headers.get("set-cookie");
  if (set) jars[who] = set.split(";")[0];
  return { status: res.status, data: await res.json() };
}

test("plateformes dissociées : un compte compagnie n'ouvre pas l'espace DPAF, et inversement", async () => {
  assert.equal((await call("x", "POST", "/api/session", { username: "airsenegal", password: "demo" })).status, 403);
  assert.equal((await call("x", "POST", "/api/session", { username: "agent", password: "demo", platform: "compagnies" })).status, 403);
  const ok = await call("hc", "POST", "/api/session", { username: "airsenegal", password: "demo", platform: "compagnies" });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.carrier, "HC");
  assert.equal(ok.data.user.platform, "compagnies");
  assert.equal((await call("hc", "GET", "/api/data")).status, 403);
});

test("compagnie : données limitées à sa compagnie, sans résultat de pré-contrôle", async () => {
  const samples = (await call("hc", "GET", "/api/compagnie/samples")).data;
  const sent = await call("hc", "POST", "/api/compagnie/messages", { message: samples.PAXLST });
  assert.equal(sent.status, 202);
  assert.equal(sent.data.flagged, undefined);
  const { data } = await call("hc", "GET", "/api/compagnie/overview");
  assert.equal(data.carrier.code, "HC");
  assert.ok(data.flights.length >= 1 && data.flights.every((f: any) => f.flight.startsWith("HC")));
  assert.ok(data.messages.every((m: any) => m.carrier === "HC" && m.flagged === undefined));
  assert.ok(data.invoices.length && data.invoices.every((i: any) => i.carrier === "HC"));
  const detail = await call("hc", "GET", `/api/compagnie/flights/${data.flights[0].id}`);
  assert.equal(detail.status, 200);
  assert.ok(detail.data.list.every((p: any) => p.score === undefined && p.factors === undefined));
  // Un vol d'une autre compagnie est invisible ; un message pour une autre compagnie est rejeté.
  await call("af", "POST", "/api/session", { username: "airfrance", password: "demo", platform: "compagnies" });
  assert.equal((await call("af", "GET", `/api/compagnie/flights/${data.flights[0].id}`)).status, 404);
  assert.equal((await call("af", "POST", "/api/compagnie/messages", { message: samples.PAXLST })).status, 422);
});

test("redevance : la compagnie déclare son virement, WawID le valide puis reverse la part de l'État au Trésor", async () => {
  const { data } = await call("hc", "GET", "/api/compagnie/overview");
  assert.equal(data.redevance.circuit, "OPERATEUR");
  const inv = data.invoices[0];
  const declared = await call("hc", "POST", "/api/compagnie/payments", { invoiceId: inv.id, amount: 1000, ref: "VIR-TEST-1", method: "Virement" });
  assert.equal(declared.status, 200);
  const idx = declared.data.payments.length - 1;
  assert.equal(declared.data.payments[idx].status, "DECLARE");
  assert.equal((await call("af", "POST", "/api/compagnie/payments", { invoiceId: inv.id, amount: 1, ref: "X" })).status, 404);
  // La compagnie ne peut pas valider elle-même.
  assert.equal((await call("hc", "PATCH", `/api/redevance/payments/${inv.id}/${idx}`, { decision: "CONFIRME" })).status, 403);
  await call("fin", "POST", "/api/session", { username: "tresor", password: "demo" });
  const confirmed = await call("fin", "PATCH", `/api/redevance/payments/${inv.id}/${idx}`, { decision: "CONFIRME" });
  assert.equal(confirmed.data.payments[idx].status, "CONFIRME");
  assert.equal((await call("fin", "PATCH", `/api/redevance/payments/${inv.id}/${idx}`, { decision: "REJETE" })).status, 409);
  const rev = await call("fin", "POST", "/api/redevance/reversements", { month: inv.month, amount: 250, ref: "VIR-TRESOR-TEST" });
  assert.equal(rev.status, 200);
  const all = await call("fin", "GET", "/api/data");
  assert.ok(all.data.reversements.some((r: any) => r.ref === "VIR-TRESOR-TEST"));
});

test("documentation interne réservée à l'espace DPAF", async () => {
  const list = await call("hc", "GET", "/api/docs");
  assert.equal(list.data.internal, false);
  assert.equal((await call("hc", "GET", "/api/docs/fr/score-de-risque")).status, 403);
  assert.equal((await call("hc", "GET", "/api/docs/fr/api-reference")).status, 200);
  assert.equal((await call("fin", "GET", "/api/docs/fr/score-de-risque")).status, 200);
});
