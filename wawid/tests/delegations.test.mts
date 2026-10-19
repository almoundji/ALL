// Délégations : enregistrement, pré-contrôle, validation, facilitation au guichet, déclaration par un organisateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/api.mts";
import { buildTD3 } from "../public/shared/engine.js";

let cookie = "";
async function call(method: string, path: string, body?: unknown) {
  const res = await handler(new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined }));
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: res.status, data: await res.json() };
}
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const member = { surname: "Tanaka", given: "Hiro", nat: "JPN", sex: "M", dob: "1990-02-03", docNo: "TK1234567", role: "Athlète", passportType: "ORDINAIRE" };

test("organisateur : déclaration publique, suivi sans résultat de pré-contrôle", async () => {
  const bad = await call("POST", "/api/public/delegations", { name: "Équipe", type: "COMPETITION", arrival: day(1), departure: day(5), members: [member], contact: { email: "x" }, consent: true });
  assert.equal(bad.status, 400);
  const r = await call("POST", "/api/public/delegations", { name: "Équipe nationale de judo du Japon", type: "COMPETITION", arrival: day(1), departure: day(5), members: [member, { ...member, surname: "Kabore", given: "Issouf Malick", nat: "BFA", dob: "1981-04-12", docNo: "BF7712093" }], contact: { name: "Comité", email: "org@example.org" }, consent: true });
  assert.equal(r.status, 200);
  assert.equal(r.data.status, "SOUMISE");
  const st = await call("POST", "/api/public/delegations/status", { ref: r.data.ref, email: "org@example.org" });
  assert.equal(st.status, 200);
  assert.equal(JSON.stringify(st.data).includes("prescreen"), false);
});

test("DPAF : pré-contrôle des membres, alerte, validation puis facilitation au guichet", async () => {
  await call("POST", "/api/session", { username: "superviseur", password: "demo" });
  const { data } = await call("GET", "/api/data");
  const g = data.delegations.find((x: any) => x.name.includes("judo"));
  const flagged = g.members.find((m: any) => m.docNo === "BF7712093");
  assert.ok(flagged.prescreen.score >= 60, "membre sur liste de surveillance signalé");
  assert.ok(data.alerts.some((a: any) => a.type === "DELEGATION" && a.delegationId === g.id));
  // Avant validation : pas d'autorisation pour un ressortissant soumis à visa.
  const mrz = buildTD3({ issuer: "JPN", nat: "JPN", sex: "M", surname: "Tanaka", given: "Hiro", docNo: "TK1234567", dob: "1990-02-03", expiry: "2031-01-01" });
  const before = await call("POST", "/api/assess", { mrz, faceScore: 0.97, liveness: true });
  assert.equal(before.data.delegation, null);
  const v = await call("PATCH", `/api/delegations/${g.id}`, { action: "valider", collectiveAuthorization: true });
  assert.equal(v.data.status, "VALIDEE");
  const after = await call("POST", "/api/assess", { mrz, faceScore: 0.97, liveness: true });
  assert.equal(after.data.delegation.ref, g.ref);
  assert.equal(after.data.visa.status, "APPROUVEE");
  assert.ok(!after.data.risk.factors.some((f: any) => f.code === "VISA"));
  // Ajout puis retrait d'un membre ; agent : pas de droit de validation.
  const add = await call("PATCH", `/api/delegations/${g.id}`, { action: "ajouter", members: [{ ...member, docNo: "TK7654321", given: "Yuki" }] });
  assert.equal(add.data.members.length, 3);
  assert.equal((await call("PATCH", `/api/delegations/${g.id}`, { action: "ajouter", members: [member] })).status, 400);
  await call("POST", "/api/session", { username: "agent", password: "demo" });
  assert.equal((await call("PATCH", `/api/delegations/${g.id}`, { action: "cloturer" })).status, 403);
  const m = add.data.members.find((x: any) => x.docNo === "TK1234567");
  assert.equal((await call("PATCH", `/api/delegations/${g.id}`, { action: "arrivee", memberId: m.id })).status, 200);
});
