// Passerelle transporteurs : décodage PAXLST / PNR et ingestion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectFormat, edifactSegments, parsePaxlst, parsePnr, samples } from "../netlify/lib/carrier.mts";
import handler from "../netlify/functions/api.mts";
import { load } from "../netlify/lib/store.mts";

test("EDIFACT : séparateurs UNA et caractère d'échappement", () => {
  const segs = edifactSegments("UNA:+.? 'NAD+FL+++O?'NEIL:JOHN'DOC+P:110:111+AB?+12'");
  assert.equal(segs[0][4][0], "O'NEIL");
  assert.equal(segs[1][2][0], "AB+12");
});

test("PAXLST : vol, passagers, documents et dates", () => {
  const m = parsePaxlst(samples().PAXLST);
  assert.equal(m.flight, "HC404");
  assert.equal(m.origin, "CDG");
  assert.equal(m.destination, "DSS");
  assert.equal(m.passengers.length, 3);
  const k = m.passengers[1];
  assert.equal(k.surname, "KABORE");
  assert.equal(k.given, "ISSOUF MALICK");
  assert.equal(k.dob, "1981-04-12");
  assert.equal(k.docNo, "BF7712093");
  assert.equal(k.expiry, "2029-02-01");
  assert.equal(k.seat, "31C");
  assert.deepEqual(m.errors, []);
});

test("PNR : SSR DOCS, contacts, paiement, itinéraire", () => {
  const m = parsePnr(samples().PNR);
  assert.equal(m.passengers.length, 3);
  const w = m.passengers[0];
  assert.equal(w.docNo, "E81234567");
  assert.equal(w.dob, "1985-03-09");
  assert.equal(w.payment, "Espèces");
  assert.equal(w.oneWay, true);
  assert.equal(w.phone, "221770001313");
  assert.equal(m.passengers[2].oneWay, false);
  assert.equal(m.passengers[2].email, "mariama.sow@exemple.sn");
  assert.equal(detectFormat(samples().PAXLST), "PAXLST");
  assert.equal(detectFormat(samples().PNR), "PNR");
  assert.equal(detectFormat("bonjour"), null);
});

const call = async (path: string, body: string, headers: Record<string, string>) => {
  const res = await handler(new Request(`http://localhost${path}`, { method: "POST", headers, body }));
  return { status: res.status, data: await res.json() };
};

test("passerelle : clé requise, ingestion API puis PNR fusionnées dans le même vol", async () => {
  assert.equal((await call("/api/carrier/messages", samples().PAXLST, { "content-type": "text/plain" })).status, 401);
  const key = { "content-type": "text/plain", "x-carrier-key": "dev-carrier-key" };
  const api = await call("/api/carrier/messages", samples().PAXLST, key);
  assert.equal(api.status, 202);
  assert.equal(api.data.passengers, 3);
  // Le pré-contrôle n'est jamais communiqué à la compagnie (risque d'alerter un passager signalé)…
  assert.equal(api.data.flagged, undefined);
  const pnr = await call("/api/carrier/messages", samples().PNR, key);
  assert.equal(pnr.status, 202);
  assert.equal(pnr.data.flagged, undefined);
  // … mais il a bien lieu côté DPAF.
  const flight = ((await load<any[]>("flights")) || []).find((f) => f.flight === "HC 404");
  assert.ok(flight.passengers.some((p: any) => p.surname?.toUpperCase().startsWith("KABORE") && p.score >= 35), "Kabore (notice rouge) doit être signalé");
  const bad = await call("/api/carrier/messages", "n'importe quoi", key);
  assert.equal(bad.status, 422);
});
