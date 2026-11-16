// Scénarios de bout en bout sur la fonction serverless (Node 22, sans Netlify) : node --test
import { test } from "node:test";
import assert from "node:assert/strict";
process.env.ART_STORAGE = "memory";
const { default: handler } = await import("../netlify/functions/api.mts");

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await handler(new Request("http://x/api" + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }));
  const text = await res.text();
  let data: any = text; try { data = JSON.parse(text); } catch { /* csv */ }
  return { status: res.status, data };
}
const dossier = { nom: "Ndiaye", prenom: "Fatou", sexe: "F", date_naissance: "1990-04-12", cni: "1751199000123", telephone: "77 555 44 33", region: "Thiès", departement: "Mbour",
  filiere: "Bois et ameublement", metier: "Menuisier ébéniste", statut_juridique: "GIE", consentement: true, besoins: ["Financement"] };

test("parcours complet : enrôlement, validation, candidature, financement, apport", async () => {
  const ref = await call("GET", "/public/referentiels"); assert.equal(Object.keys(ref.data.regions).length, 14);
  const e = await call("POST", "/public/enrolement", dossier); assert.equal(e.status, 201, JSON.stringify(e.data)); assert.match(e.data.numero, /^ART-\d{4}-THI-\d{5}$/);
  assert.equal((await call("POST", "/public/enrolement", dossier)).status, 409, "doublon refusé");
  const s = await call("POST", "/public/suivi", { numero: e.data.numero, telephone: "+221775554433" }); assert.equal(s.status, 200);
  const tok = s.data.token;
  assert.equal((await call("POST", "/me/financements", { instrument: "Garantie", objet: "x", montant_demande: 100000 }, tok)).status, 403, "dossier non validé");

  const agent = await call("POST", "/admin/login", { username: "cm.thies", password: "agent123" }); assert.equal(agent.status, 200);
  const list = await call("GET", "/admin/artisans?statut=en_attente&q=fatou", undefined, agent.data.token);
  const mine = list.data.items.find((a: any) => a.numero === e.data.numero); assert.ok(mine, JSON.stringify({ n: e.data.numero, l: list.data.items?.map((a: any) => a.numero), st: list.status, d: list.data.detail }));
  assert.ok(list.data.items.every((a: any) => a.region === "Thiès"), "périmètre régional");
  assert.equal((await call("POST", `/admin/artisans/${mine.id}/decision`, { statut: "rejete" }, agent.data.token)).status, 422, "motif obligatoire");
  assert.equal((await call("POST", `/admin/artisans/${mine.id}/decision`, { statut: "valide" }, agent.data.token)).status, 200);

  const marches = await call("GET", "/public/marches"); const m = marches.data.find((x: any) => x.filiere === "Bois et ameublement" && x.statut === "ouvert" && x.region !== "Kolda");
  const k = await call("POST", "/me/candidatures", { marche_id: m.id, montant: 1000000, delai_jours: 30 }, tok); assert.equal(k.status, 201, JSON.stringify(k.data));
  assert.equal((await call("POST", "/me/candidatures", { marche_id: m.id, montant: 1000000 }, tok)).status, 409);
  const f = await call("POST", "/me/financements", { instrument: "Crédit d'équipement", objet: "Raboteuse", montant_demande: 1500000 }, tok); assert.equal(f.status, 201);
  assert.equal((await call("POST", "/me/contributions", { montant: 5000 }, tok)).status, 201);
  const me = await call("GET", "/me", undefined, tok); assert.equal(me.data.candidatures.length, 1); assert.equal(me.data.financements.length, 1);

  const admin = await call("POST", "/admin/login", { username: "admin", password: "admin123" });
  assert.equal((await call("POST", `/admin/financements/${f.data.id}/decision`, { statut: "decaissee" }, admin.data.token)).status, 409);
  assert.equal((await call("POST", `/admin/financements/${f.data.id}/decision`, { statut: "accordee", montant_accorde: 1200000 }, admin.data.token)).status, 200);
  assert.equal((await call("POST", `/admin/financements/${f.data.id}/decision`, { statut: "accordee" }, agent.data.token)).status, 403, "agent ne décide pas du financement");
  const csv = await call("GET", "/admin/artisans?format=csv", undefined, admin.data.token); assert.match(csv.data, /numero;statut/);
  const d = await call("GET", "/admin/dashboard", undefined, admin.data.token); assert.ok(d.data.artisans.total > 300);
});

test("sécurité : jetons, rôles, validation", async () => {
  assert.equal((await call("GET", "/admin/dashboard")).status, 401);
  assert.equal((await call("POST", "/admin/login", { username: "admin", password: "faux" })).status, 401);
  const lec = await call("POST", "/admin/login", { username: "lecteur", password: "lecteur123" });
  assert.equal((await call("GET", "/admin/dashboard", undefined, lec.data.token)).status, 200);
  assert.equal((await call("POST", "/admin/actualites", { titre: "t" }, lec.data.token)).status, 403);
  const art = await call("POST", "/public/suivi", { numero: "ART-2026-THI-00001", telephone: "000" }); assert.equal(art.status, 404);
  assert.equal((await call("POST", "/public/enrolement", { ...dossier, telephone: "12", cni: "1999888777666", consentement: true })).status, 422);
  assert.equal((await call("POST", "/public/enrolement", { ...dossier, consentement: false })).status, 422);
  const pub = await call("GET", "/public/annuaire?region=Dakar"); assert.ok(pub.data.items.every((x: any) => x.telephone.includes("***") && !("cni" in x)));
  assert.equal((await call("GET", "/inexistant")).status, 404);
});
