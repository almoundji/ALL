// Test de scénario de l'API sans Netlify : npm test
import assert from "node:assert/strict";
import handler from "./functions/api.mts";

const BASE = "http://localhost";
let cookie = "";
const call = async (method: string, path: string, data?: unknown, raw = false) => {
  const headers: Record<string, string> = { cookie }; let body: string | undefined;
  if (data !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(data); }
  const res = await handler(new Request(BASE + path, { method, headers, body }), {} as any);
  const sc = res.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
  return { status: res.status, body: raw ? await res.text() : await res.json() };
};
const ok = (r: { status: number; body: any }, expected = 200) => { assert.equal(r.status, expected, JSON.stringify(r.body).slice(0, 300)); return r.body; };

// Public
const cfg = ok(await call("GET", "/api/public/config")); assert.equal(cfg.price, 25000);

// Démo école
assert.equal((await call("GET", "/api/auth/me")).status, 401);
assert.equal((await call("POST", "/api/auth/login", { email: "demo-ecole@jotna.sn", password: "mauvais" })).status, 401);
const me = ok(await call("POST", "/api/auth/login", { email: "demo-ecole@jotna.sn", password: "demo2026" }));
assert.equal(me.tenant.type, "ecole"); assert.equal(me.tenant.vocab.payer, "Parent");
const dash = ok(await call("GET", "/api/dashboard"));
assert.ok(dash.contracts === 30 && dash.expected > 0 && dash.paye + dash.partiel + dash.retard + dash.avenir === 30, JSON.stringify(dash));
assert.ok(dash.toVerify >= 4, "lignes à vérifier " + dash.toVerify);
const payers = ok(await call("GET", "/api/payers")); assert.equal(payers.length, 30); assert.ok(payers.filter((p: any) => p.alias).length >= 26 && payers.some((p: any) => !p.alias));

// Fiche payeur et reçu
const late = payers.find((p: any) => p.status === "retard") || payers[0];
const fiche = ok(await call("GET", `/api/payers/${late.id}`)); assert.ok(fiche.history.length >= 6 && fiche.payments.length >= 5);
const receipt = await call("GET", `/api/receipts/${fiche.payments[0].id}`, undefined, true); assert.equal(receipt.status, 200); assert.ok(receipt.body.includes("Reçu n°"));

// Espace parent : accès par code, déclaration, reçu
assert.ok(fiche.access.code.length === 6 && fiche.access.link.includes("/parent/#t="));
const tenantCookie = cookie; cookie = "";
assert.equal((await call("POST", "/api/parent/login", { phone: late.tel, code: "000000" })).status, 401);
const pv = ok(await call("POST", "/api/parent/login", { phone: late.tel, code: fiche.access.code }));
assert.equal(pv.payer.nom, late.nom); assert.ok(pv.contracts.length >= 1 && pv.contracts[0].months.length === 6);
const decl = ok(await call("POST", "/api/parent/declare", { contractId: pv.contracts[0].id, month: pv.month, amount: 20000, channel: "Wave", ref: "PARENT-1" }), 201);
assert.equal(decl.pending.status, "a_verifier");
const pv2 = ok(await call("GET", "/api/parent/me")); assert.equal(pv2.pending.length, 1);
if (pv2.payments.length) assert.equal((await call("GET", pv2.payments[0].receipt, undefined, true)).status, 200);
cookie = ""; const tk = ok(await call("POST", "/api/parent/token", { token: fiche.access.link.split("#t=")[1] })); assert.equal(tk.payer.nom, late.nom);
cookie = tenantCookie;
const declared = ok(await call("GET", "/api/payments?status=a_verifier")).find((p: any) => p.ref === "PARENT-1"); assert.ok(declared && declared.source === "parent" && declared.suggested);

// Saisie manuelle → statut
const k = late.contracts[0]; const before = k.installment.status;
const pay = ok(await call("POST", "/api/payments", { contractId: k.id, month: dash.month, amount: k.amount, channel: "Espèces" }), 201); assert.equal(pay.status, "associe");
const after = ok(await call("GET", `/api/payers/${late.id}`)); assert.equal(after.contracts[0].installment.status, "paye", `avant ${before}`);

// Rapprochement : import CSV avec référence, alias, numéro, inconnu, doublon
const alias = payers.find((p: any) => p.alias && p.status === "retard") || payers.find((p: any) => p.alias);
const byPhone = payers.find((p: any) => p.id !== alias.id && p.status === "retard" && p.tel) || payers[2];
const csv = ["date;montant;emetteur;libelle;reference",
  `${dash.month}-13;${alias.contracts[0].amount};${alias.alias};paiement;TEST-ALIAS-1`,
  `${dash.month}-13;${byPhone.contracts[0].amount};${byPhone.tel};;TEST-TEL-1`,
  `${dash.month}-13;${payers[5].contracts[0].amount};inconnu 70 000 00 00;${payers[5].contracts[0].ref} ${dash.month};TEST-REF-1`,
  `${dash.month}-13;12345;70 111 22 33;;TEST-UNK-1`,
  `${dash.month}-13;12345;70 111 22 33;;TEST-UNK-1`].join("\n");
const imp = ok(await call("POST", "/api/payments/import", { csv, channel: "Wave" }));
assert.equal(imp.lines, 5); assert.equal(imp.duplicates, 1); assert.ok(imp.auto >= 3, JSON.stringify(imp)); assert.equal(imp.toVerify, 1);
const pending = ok(await call("GET", "/api/payments?status=a_verifier")); const unk = pending.find((p: any) => p.ref === "TEST-UNK-1"); assert.ok(unk);
const target = payers[7].contracts[0];
const assigned = ok(await call("POST", `/api/payments/${unk.id}/assign`, { contractId: target.id, month: dash.month })); assert.equal(assigned.status, "associe"); assert.equal(assigned.installment.paid >= 12345, true);
ok(await call("POST", `/api/payments/${pending[0].id}/ignore`));

// Relances et demandes
const rem = ok(await call("GET", "/api/reminders")); assert.ok(rem.length > 0 && rem[0].message.includes("keur-xaleyi") && rem[0].waLink.startsWith("https://wa.me/221"));
const sent = ok(await call("POST", "/api/reminders", { month: dash.month, items: [{ contractId: rem[0].contractId }] })); assert.equal(sent.length, 1);
const req = ok(await call("POST", "/api/requests", { month: dash.month, contractIds: [rem[0].contractId] })); assert.equal(req[0].beneficiary, "keur-xaleyi");

// Paramètres, utilisateurs, export, droits
ok(await call("PUT", "/api/settings", { dueDay: 10, templates: { relance: "Test {prenom} {montant} {alias}" } }));
const settings = ok(await call("GET", "/api/settings")); assert.equal(settings.tenant.dueDay, 10);
const u = ok(await call("POST", "/api/users", { email: "compta@exemple.sn", name: "Compta", password: "compta2026", role: "comptable" }), 201);
const exp = await call("GET", "/api/export/payments.csv", undefined, true); assert.ok(exp.body.split("\n").length > 100);
assert.equal((await call("GET", "/api/admin/tenants")).status, 403);
ok(await call("POST", "/api/demo/reset"));

assert.equal((await call("POST", "/api/auth/password", { current: "faux", password: "nouveau123" })).status, 401);

// Comptable : lecture oui, modification des payeurs non
cookie = ""; ok(await call("POST", "/api/auth/login", { email: "compta@exemple.sn", password: "compta2026" }));
ok(await call("POST", "/api/auth/password", { current: "compta2026", password: "compta2027x" })); cookie = ""; ok(await call("POST", "/api/auth/login", { email: "compta@exemple.sn", password: "compta2027x" }));
assert.equal((await call("POST", "/api/payers", { nom: "X" })).status, 403);
ok(await call("GET", "/api/payers"));

// Inscription d'un nouvel établissement (bailleur), import de locataires, demande
cookie = "";
assert.equal((await call("POST", "/api/auth/signup", { email: "pas-un-mail", password: "12345678", establishment: "X" })).status, 400);
const nb = ok(await call("POST", "/api/auth/signup", { email: "gerant@residence-test.sn", password: "motdepasse1", name: "Gérant", establishment: "Résidence Test", type: "bailleur", alias: "res-test", dueDay: 3 }), 201);
assert.equal(nb.tenant.vocab.payer, "Locataire"); assert.equal(nb.tenant.plan, "essai"); assert.equal(nb.tenant.onboarding.payers, false);
const om = ok(await call("GET", "/api/onboarding/message")); assert.ok(om.message.includes("res-test"));
ok(await call("POST", "/api/onboarding", { step: "informed" })); assert.equal((await call("GET", "/api/auth/me")).body.tenant.onboarding.informed, true);
const impP = ok(await call("POST", "/api/payers/import", { csv: "locataire;telephone;alias;logement;immeuble;loyer\nAwa Ndiaye;77 100 20 30;awa.ndiaye;Appt 1;Bât A;250 000\nOmar Sy;77 200 30 40;;Appt 2;Bât A;300000" }));
assert.equal(impP.created, 2); assert.equal(impP.contracts, 2);
const d2 = ok(await call("GET", "/api/dashboard")); assert.equal(d2.expected, 550000);
const inst = ok(await call("GET", "/api/installments")); assert.equal(inst.length, 2); assert.ok(inst[0].ref.startsWith("LO-"));
assert.equal((await call("POST", "/api/auth/signup", { email: "gerant@residence-test.sn", password: "motdepasse1", establishment: "Doublon" })).status, 409);
ok(await call("DELETE", "/api/auth/session")); assert.equal((await call("GET", "/api/auth/me")).status, 401);

console.log("OK : scénario API complet (école de démo, rapprochement, relances, inscription bailleur, droits)");
