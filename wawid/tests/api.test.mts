// Tests d'intégration de l'API (stockage mémoire).
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/api.mts";
import { buildTD3 } from "../public/shared/engine.js";

let cookie = "";
async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await handler(new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json", cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }));
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { status: res.status, data: await res.json() };
}

test("accès refusé sans session, connexion et données", async () => {
  assert.equal((await call("GET", "/api/data")).status, 401);
  assert.equal((await call("POST", "/api/session", { username: "admin", password: "faux" })).status, 401);
  const login = await call("POST", "/api/session", { username: "admin", password: "admin" });
  assert.equal(login.status, 200);
  const { data } = await call("GET", "/api/data");
  assert.ok(data.crossings.length > 500);
  assert.ok(data.gates.length > 5);
});

test("contrôle guichet : évaluation puis décision motivée", async () => {
  const mrz = buildTD3({ issuer: "BFA", nat: "BFA", sex: "M", surname: "Kabore", given: "Issouf Malick", docNo: "BF7712093", dob: "1981-04-12", expiry: "2029-02-01" });
  const a = await call("POST", "/api/assess", { mrz, faceScore: 0.97, liveness: true });
  assert.equal(a.data.risk.recommendation, "REFUSE");
  assert.equal((await call("POST", "/api/crossings", { mrz, faceScore: 0.97, liveness: true, decision: "AUTORISE" })).status, 400);
  const c = await call("POST", "/api/crossings", { mrz, faceScore: 0.97, liveness: true, decision: "REFUSE" });
  assert.equal(c.status, 200);
  const { data } = await call("GET", "/api/data");
  assert.ok(data.alerts.some((x: any) => x.crossingId === c.data.id));
});

test("eGate : clé d'équipement requise, ouverture et orientation", async () => {
  const saved = cookie; cookie = "";
  assert.equal((await call("POST", "/api/gate/transaction", { gateId: "EG-AIBD-A01" })).status, 401);
  const key = { "x-gate-key": "dev-gate-key" };
  const ok = buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" });
  assert.equal((await call("POST", "/api/gate/transaction", { gateId: "EG-AIBD-A01", mrz: ok, faceScore: 0.96, liveness: true }, key)).data.outcome, "OUVERTURE");
  assert.equal((await call("POST", "/api/gate/transaction", { gateId: "EG-AIBD-A01", mrz: ok, faceScore: 0.5, liveness: false }, key)).data.outcome, "ORIENTATION");
  cookie = saved;
});

test("e-Visa : dépôt public, suivi, approbation et QR vérifiable", async () => {
  const saved = cookie; cookie = "";
  const dep = await call("POST", "/api/public/evisa", { consent: true, applicant: { surname: "Wang", given: "Lei", dob: "1985-03-09", nat: "CHN", docNo: "E81234567", expiry: "2030-08-01", email: "lei@exemple.org" }, trip: { arrival: "2026-12-01", purpose: "Tourisme" } });
  assert.equal(dep.status, 200);
  assert.equal((await call("POST", "/api/public/evisa/status", { ref: dep.data.ref, docNo: "MAUVAIS" })).status, 404);
  cookie = saved;
  await call("PATCH", `/api/evisas/${dep.data.ref}`, { action: "approve" });
  cookie = "";
  const st = await call("POST", "/api/public/evisa/status", { ref: dep.data.ref, docNo: "E81234567" });
  assert.equal(st.data.status, "APPROUVEE");
  cookie = saved;
  assert.equal((await call("POST", "/api/verify-token", { token: st.data.token })).data.valid, true);
  assert.equal((await call("POST", "/api/verify-token", { token: st.data.token.slice(0, -2) + "xx" })).data.valid, false);
});

test("journal d'audit chaîné intègre", async () => {
  const { data } = await call("GET", "/api/audit");
  assert.ok(data.verification.ok);
  assert.ok(data.entries.length > 3);
});

test("permissions : un agent ne peut pas gérer les utilisateurs", async () => {
  await call("POST", "/api/session", { username: "agent", password: "demo" });
  assert.equal((await call("GET", "/api/users")).status, 403);
});
