import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk, buildTD3, checkDigit, gateDecision, nameSimilarity, parseMRZ, screenWatchlist, DEFAULT_GATE_CONFIG } from "../public/shared/engine.js";

test("chiffre de contrôle ICAO (exemple de la norme 9303)", () => {
  assert.equal(checkDigit("L898902C3"), "6");
  assert.equal(checkDigit("740812"), "2");
  assert.equal(checkDigit("120415"), "9");
});

test("MRZ du spécimen ICAO lue et validée", () => {
  const p = parseMRZ("P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10");
  assert.ok(p.ok);
  assert.equal(p.surname, "ERIKSSON");
  assert.equal(p.given, "ANNA MARIA");
  assert.equal(p.docNo, "L898902C3");
  assert.equal(p.dob, "1974-08-12");
  assert.ok(p.checksOk, JSON.stringify(p.checks));
});

test("MRZ générée relue à l'identique, altération détectée", () => {
  const mrz = buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" });
  const p = parseMRZ(mrz);
  assert.ok(p.checksOk);
  assert.equal(p.expiry, "2031-05-13");
  const forged = parseMRZ(mrz.replace("910514", "910515"));
  assert.equal(forged.checksOk, false);
});

test("correspondance floue : accents, ordre inversé", () => {
  assert.ok(nameSimilarity("Traoré Bakary", "BAKARY TRAORE") > 0.95);
  assert.ok(nameSimilarity("Diop Aminata", "Kabore Issouf") < 0.7);
});

const watchlist = [
  { kind: "person", list: "Interpol — Notice rouge", surname: "Kabore", given: "Issouf Malick", dob: "1981-04-12", severity: "critique", active: true },
  { kind: "document", list: "Interpol SLTD", docNo: "A04718823", active: true },
];

test("liste de surveillance : nom approché + date de naissance, document SLTD", () => {
  const hits = screenWatchlist({ surname: "KABORE", given: "ISSOUF MALIK", dob: "1981-04-12", docNo: "X" }, watchlist);
  assert.equal(hits.length, 1);
  assert.equal(screenWatchlist({ surname: "A", given: "B", docNo: "A04718823" }, watchlist).length, 1);
  assert.equal(screenWatchlist({ surname: "Kabore", given: "Issouf Malick", dob: "1999-01-01", docNo: "X" }, watchlist)[0]?.basis, "Nom (approché)");
});

test("score de risque explicable et recommandations", () => {
  const clean = parseMRZ(buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" }));
  const ok = assessRisk(clean, { watchlist, faceScore: 0.97, liveness: true });
  assert.equal(ok.recommendation, "AUTORISE");
  assert.equal(ok.score, 0);
  const wanted = parseMRZ(buildTD3({ issuer: "BFA", nat: "BFA", sex: "M", surname: "Kabore", given: "Issouf Malick", docNo: "BF7712093", dob: "1981-04-12", expiry: "2029-02-01" }));
  const r = assessRisk(wanted, { watchlist, faceScore: 0.97, liveness: true });
  assert.equal(r.recommendation, "REFUSE");
  assert.ok(r.factors.some((f) => f.code === "WATCHLIST"));
  const spoof = assessRisk(clean, { watchlist, faceScore: 0.5, liveness: false });
  assert.ok(spoof.fraud);
  const rule = assessRisk(clean, { rules: [{ id: "R", name: "Test", enabled: true, points: 40, conditions: [{ field: "nat", op: "in", value: "SEN MLI" }] }] });
  assert.equal(rule.score, 40);
  assert.equal(rule.factors[0].ruleId, "R");
});

test("eGate : ouverture, mineur, risque", () => {
  const adult = parseMRZ(buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" }));
  assert.equal(gateDecision(adult, assessRisk(adult, { faceScore: 0.95, liveness: true })).outcome, "OUVERTURE");
  const child = parseMRZ(buildTD3({ issuer: "SEN", nat: "SEN", sex: "M", surname: "Fall", given: "Ibou", docNo: "A09988776", dob: "2016-06-01", expiry: "2029-06-01" }));
  assert.equal(gateDecision(child, assessRisk(child, {})).code, "AGE");
  const cfg = { ...DEFAULT_GATE_CONFIG, eligibility: "CEDEAO" };
  const fr = parseMRZ(buildTD3({ issuer: "FRA", nat: "FRA", sex: "M", surname: "Martin", given: "Paul", docNo: "19AB12345", dob: "1980-01-01", expiry: "2032-01-01" }));
  assert.equal(gateDecision(fr, assessRisk(fr, {}), cfg).code, "ELIGIBILITE");
});

test("eGate : jamais d'ouverture sur correspondance, même avec un seuil de risque relevé ; biométrie obligatoire", () => {
  const sltd = parseMRZ(buildTD3({ issuer: "SEN", nat: "SEN", sex: "M", surname: "Diatta", given: "Moustapha", docNo: "A04718823", dob: "1992-02-02", expiry: "2031-01-01" }));
  const lax = { ...DEFAULT_GATE_CONFIG, maxRisk: 100 };
  assert.equal(gateDecision(sltd, assessRisk(sltd, { watchlist, faceScore: 0.97, liveness: true }), lax).outcome, "ORIENTATION");
  const low = [{ kind: "person", list: "POI", surname: "Diop", given: "Aminata", severity: "basse", active: true }];
  const clean = parseMRZ(buildTD3({ issuer: "SEN", nat: "SEN", sex: "F", surname: "Diop", given: "Aminata", docNo: "A01234567", dob: "1991-05-14", expiry: "2031-05-13" }));
  assert.equal(gateDecision(clean, assessRisk(clean, { watchlist: low, faceScore: 0.97, liveness: true })).outcome, "ORIENTATION");
  assert.equal(gateDecision(clean, assessRisk(clean, {}), DEFAULT_GATE_CONFIG, new Date(), {}).code, "BIOMETRIE");
  assert.equal(gateDecision(clean, assessRisk(clean, { faceScore: 0.97 }), DEFAULT_GATE_CONFIG, new Date(), { faceScore: 0.97 }).code, "LIVENESS");
});

test("pas de faux positifs sur les noms ouest-africains courants, variantes reconnues", () => {
  for (const [a, b] of [["Ndiaye Awa", "Ndiaye Adama"], ["Ndiaye Awa", "Faye Awa"], ["Diop Fatou", "Diop Astou"], ["Sy Ali", "Sy Malick"]]) assert.ok(nameSimilarity(a, b) < 0.9, `${a} / ${b}`);
  for (const [a, b] of [["Mohamed Diallo", "Mouhamed Diallo"], ["N'Diaye Awa", "Ndiaye Awa"], ["Abd Al Rahman Haddad", "Abdelrahman Haddad"]]) assert.ok(nameSimilarity(a, b) >= 0.9, `${a} / ${b}`);
});

test("dates MRZ impossibles refusées, SLTD tolérant aux espaces, translittération ICAO", () => {
  const mrz = buildTD3({ issuer: "SEN", nat: "SEN", sex: "M", surname: "X", given: "Y", docNo: "A1", dob: "1990-02-28", expiry: "2030-01-01" });
  assert.equal(parseMRZ(mrz.replace("900228", "900231")).checksOk, false);
  assert.equal(screenWatchlist({ surname: "A", given: "B", docNo: "A04718823" }, [{ kind: "document", docNo: "A04 718823", active: true }]).length, 1);
  assert.ok(buildTD3({ issuer: "D", nat: "D", sex: "M", surname: "Ødegård", given: "Jean-Pierre", docNo: "C01X00T47", dob: "1964-08-12", expiry: "2030-01-01" }).startsWith("P<D<<OEDEGAARD<<JEAN<PIERRE"));
});
