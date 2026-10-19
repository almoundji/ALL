// Jeu de données de démonstration cohérent (voyageurs récurrents, alertes issues des passages, vols APIS…).
// Tous les noms sont fictifs.
import {
  POSTES, VISA_EXEMPT, DEFAULT_GATE_CONFIG, alertType, assessRisk, buildTD3, severityOf, gateDecision, parseMRZ, prng, simulatedBiometric,
} from "../../public/shared/engine.js";

const GIVEN_M = ["Mamadou", "Cheikh", "Ousmane", "Ibrahima", "Moussa", "Abdoulaye", "Pape", "Modou", "Aliou", "Babacar", "Lamine", "Serigne", "Karim", "Youssou", "Amadou", "Thomas", "Lucas", "Jean", "Ahmed", "Wei", "Carlos", "Daniel"];
const GIVEN_F = ["Aminata", "Fatou", "Awa", "Mariama", "Khady", "Ndeye", "Astou", "Coumba", "Aissatou", "Rokhaya", "Binta", "Sokhna", "Marie", "Sarah", "Fatima", "Léa", "Mei", "Ana", "Grace"];
const SURNAMES: Record<string, string[]> = {
  SEN: ["Diop", "Ndiaye", "Fall", "Sow", "Ba", "Gueye", "Faye", "Mbaye", "Sarr", "Cissé", "Diallo", "Thiam", "Seck", "Kane", "Niang", "Dieng", "Sy", "Wade", "Diouf", "Toure"],
  MLI: ["Traoré", "Keïta", "Coulibaly", "Diarra", "Konaté"], GIN: ["Camara", "Bah", "Barry", "Condé", "Soumah"],
  CIV: ["Kouassi", "Koné", "Yao", "Ouattara"], GMB: ["Jallow", "Ceesay", "Jobe", "Sanneh"], MRT: ["Ould Ahmed", "Ould Salem", "Mint Ely"],
  NGA: ["Okafor", "Adeyemi", "Balogun", "Eze"], FRA: ["Martin", "Bernard", "Dubois", "Moreau", "Laurent"], ESP: ["García", "Fernández", "López"],
  BEL: ["Peeters", "Janssens"], MAR: ["El Amrani", "Benali", "Tazi"], USA: ["Smith", "Johnson", "Brown"], CHN: ["Wang", "Li", "Zhang"],
  LBN: ["Khalil", "Haddad", "Nassar"], TUR: ["Yılmaz", "Kaya"], ITA: ["Rossi", "Russo"], GHA: ["Mensah", "Owusu"], BFA: ["Ouédraogo", "Sawadogo"],
  CMR: ["Mbarga", "Fotso"], IND: ["Sharma", "Patel"], BRA: ["Silva", "Santos"],
};
const NAT_WEIGHTS: [string, number][] = [["SEN", 46], ["MLI", 6], ["GIN", 6], ["FRA", 8], ["GMB", 4], ["MRT", 4], ["CIV", 3], ["NGA", 3], ["MAR", 3], ["ESP", 2], ["BEL", 2], ["USA", 2], ["CHN", 3], ["LBN", 2], ["TUR", 2], ["ITA", 1], ["GHA", 1], ["BFA", 1], ["CMR", 2], ["IND", 2], ["BRA", 1]];
const ORIGINS = ["CDG", "ORY", "MAD", "BRU", "CMN", "IST", "ABJ", "BKO", "CKY", "NKC", "LOS", "ACC", "JFK", "DXB", "BJL", "OUA", "LIS", "FCO", "DOH", "ADD"];
const AIRLINES = [["HC", "Air Sénégal"], ["AF", "Air France"], ["TK", "Turkish Airlines"], ["AT", "Royal Air Maroc"], ["IB", "Iberia"], ["SN", "Brussels Airlines"], ["ET", "Ethiopian"], ["EK", "Emirates"], ["DL", "Delta"], ["TP", "TAP"]];
const AGENTS = ["A. Ndiaye", "F. Sarr", "M. Diallo", "K. Fall", "S. Gueye", "B. Thiam", "O. Seck"];

export type Seed = Record<string, unknown>;

export function generateSeed(now = new Date()): Seed {
  const rnd = prng(20261019);
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const weighted = (pairs: [string, number][]) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rnd() * total;
    for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
    return pairs[0][0];
  };
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  const id = (p: string, n: number) => `${p}-${String(n).padStart(6, "0")}`;

  // ----- Listes de surveillance (sources multiples) -----
  const watchlist = [
    { kind: "person", source: "INTERPOL_NOTICE", list: "Interpol — Notice rouge", surname: "Kabore", given: "Issouf Malick", dob: "1981-04-12", nat: "BFA", severity: "critique", reason: "Mandat d'arrêt international — trafic de migrants", reference: "A-1234/5-2025" },
    { kind: "person", source: "INTERPOL_NOTICE", list: "Interpol — Notice jaune", surname: "Mendy", given: "Clarisse", dob: "2009-09-30", nat: "SEN", severity: "haute", reason: "Mineure disparue", reference: "Y-2201/3-2026" },
    { kind: "person", source: "INTERPOL_DIFFUSION", list: "Interpol — Diffusion bleue", surname: "Haddad", given: "Rami Georges", dob: "1975-01-05", nat: "LBN", severity: "moyenne", reason: "Localisation demandée — enquête financière", reference: "BD-7781-2026" },
    { kind: "person", source: "FPR", list: "Fichier national des personnes recherchées", surname: "Ndour", given: "Pape Mor", dob: "1990-07-21", nat: "SEN", severity: "haute", reason: "Mandat d'arrêt — escroquerie", reference: "FPR-2026-00412" },
    { kind: "person", source: "FPR", list: "Fichier national des personnes recherchées", surname: "Sambou", given: "Edouard", dob: "1986-11-02", nat: "SEN", severity: "moyenne", reason: "Interdiction de sortie du territoire (ISTN)", reference: "FPR-2026-00977" },
    { kind: "person", source: "WAPIS", list: "WAPIS — Données régionales", surname: "Traore", given: "Bakary", dob: "1979-03-18", nat: "MLI", severity: "haute", reason: "Signalé — trafic de stupéfiants (Mali)", reference: "WAPIS-ML-55120" },
    { kind: "person", source: "POI", list: "Personne d'intérêt", surname: "Okonkwo", given: "Chidi", dob: "1988-06-14", nat: "NGA", severity: "moyenne", reason: "Voyages fréquents sur routes à risque — fraude documentaire suspectée", reference: "POI-0042" },
    { kind: "person", source: "POI", list: "Personne d'intérêt", surname: "Yilmaz", given: "Kerem", dob: "1983-12-01", nat: "TUR", severity: "basse", reason: "Observation — liens avec réseau de faux visas", reference: "POI-0057" },
    { kind: "person", source: "JUDICIAIRE", list: "Interdiction judiciaire du territoire", surname: "Dubreuil", given: "Marc Antoine", dob: "1969-08-09", nat: "FRA", severity: "haute", reason: "Expulsé — interdiction d'entrée 10 ans", reference: "IJT-2023-118" },
    { kind: "document", source: "INTERPOL_SLTD", list: "Interpol SLTD", docNo: "A04718823", issuer: "SEN", reason: "Passeport vierge volé (lot préfecture)", reference: "SLTD-SN-88213" },
    { kind: "document", source: "INTERPOL_SLTD", list: "Interpol SLTD", docNo: "GN2219034", issuer: "GIN", reason: "Déclaré perdu", reference: "SLTD-GN-12007" },
    { kind: "document", source: "INTERPOL_SLTD", list: "Interpol SLTD", docNo: "19FV22871", issuer: "FRA", reason: "Déclaré volé", reference: "SLTD-FR-993102" },
    { kind: "document", source: "SLTD_NATIONAL", list: "Documents nationaux invalidés", docNo: "A05102277", issuer: "SEN", reason: "Passeport annulé (fraude à l'état civil)", reference: "DAF-2026-301" },
  ].map((w, i) => ({ id: id("WL", i + 1), active: true, addedBy: "Système (seed)", addedAt: daysAgo(30 + i).toISOString(), ...w }));

  const rules = [
    { id: "R-001", name: "Mineur voyageant sur route transfrontalière terrestre", enabled: true, points: 15, conditions: [{ field: "age", op: "lt", value: "16" }, { field: "channel", op: "in", value: "GUICHET" }, { field: "origin", op: "in", value: "ROS KID KAR" }] },
    { id: "R-002", name: "Allers-retours très fréquents", enabled: true, points: 20, conditions: [{ field: "crossings30d", op: "gt", value: "6" }] },
    { id: "R-003", name: "Provenance hub à risque documentaire", enabled: true, points: 10, conditions: [{ field: "origin", op: "in", value: "IST DXB ADD" }, { field: "direction", op: "in", value: "ENTREE" }] },
    { id: "R-004", name: "Document à validité très courte à l'entrée", enabled: false, points: 10, conditions: [{ field: "docValidityDays", op: "lt", value: "30" }, { field: "direction", op: "in", value: "ENTREE" }] },
  ].map((r) => ({ ...r, author: "Analyste TMS", updatedAt: daysAgo(10).toISOString() }));

  // ----- Voyageurs récurrents -----
  const travelers: any[] = [];
  for (let i = 0; i < 420; i++) {
    const nat = weighted(NAT_WEIGHTS);
    const sex = rnd() < 0.52 ? "M" : "F";
    const age = rnd() < 0.08 ? 4 + Math.floor(rnd() * 13) : 19 + Math.floor(rnd() * 52);
    const dob = iso(new Date(Date.UTC(now.getUTCFullYear() - age, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28))));
    const exp = iso(new Date(now.getTime() + (rnd() < 0.03 ? -40 : 60 + rnd() * 3200) * 86400000));
    const letters = nat === "SEN" ? "A0" : nat.slice(0, 2);
    travelers.push({
      surname: pick(SURNAMES[nat] || SURNAMES.SEN), given: pick(sex === "M" ? GIVEN_M : GIVEN_F), sex, nat, issuer: nat, dob, expiry: exp,
      docNo: letters + String(1000000 + Math.floor(rnd() * 8999999)).slice(0, 7),
    });
  }
  // Quelques profils qui déclenchent des correspondances (fictifs).
  travelers.push(
    { surname: "Kabore", given: "Issouf Malik", sex: "M", nat: "BFA", issuer: "BFA", dob: "1981-04-12", expiry: "2029-02-01", docNo: "BF7712093" },
    { surname: "Ndour", given: "Pape Mor", sex: "M", nat: "SEN", issuer: "SEN", dob: "1990-07-21", expiry: "2030-05-10", docNo: "A06612380" },
    { surname: "Okonkwo", given: "Chidi", sex: "M", nat: "NGA", issuer: "NGA", dob: "1988-06-14", expiry: "2028-11-20", docNo: "NG5521907" },
    { surname: "Diatta", given: "Moustapha", sex: "M", nat: "SEN", issuer: "SEN", dob: "1992-02-02", expiry: "2031-01-01", docNo: "A04718823" },
    { surname: "Bangoura", given: "Mariam", sex: "F", nat: "GIN", issuer: "GIN", dob: "1995-10-10", expiry: "2029-03-03", docNo: "GN2219034" },
    { surname: "Traoré", given: "Bakary", sex: "M", nat: "MLI", issuer: "MLI", dob: "1979-03-18", expiry: "2027-09-09", docNo: "ML3390211" },
  );
  travelers.forEach((t, i) => { t.id = id("V", i + 1); t.mrz = buildTD3(t); });

  // ----- e-Visa (TAS / VMS) -----
  const evisaStatuses = ["APPROUVEE", "APPROUVEE", "APPROUVEE", "EN_EXAMEN", "SOUMISE", "INFO_DEMANDEE", "REFUSEE"];
  const evisas: any[] = [];
  const needVisa = travelers.filter((t) => !VISA_EXEMPT.includes(t.nat));
  needVisa.forEach((t, i) => {
    const status = i < needVisa.length * 0.75 ? "APPROUVEE" : pick(evisaStatuses);
    const created = daysAgo(2 + rnd() * 40);
    const risk = assessRisk(parseMRZ(t.mrz), { watchlist, rules, now, direction: "ENTREE", channel: "EVISA" });
    evisas.push({
      ref: `EV${String(260000 + i)}`, createdAt: created.toISOString(), status, travelerId: t.id,
      applicant: { surname: t.surname, given: t.given, dob: t.dob, sex: t.sex, nat: t.nat, docNo: t.docNo, expiry: t.expiry, email: `${t.given[0].toLowerCase()}.${t.surname.toLowerCase().replace(/[^a-z]/g, "")}@exemple.org`, phone: "+221 7" + Math.floor(rnd() * 1e8) },
      trip: { purpose: pick(["Tourisme", "Affaires", "Visite familiale", "Conférence", "Transit"]), arrival: iso(new Date(now.getTime() + (rnd() * 40 - 10) * 86400000)), nights: 3 + Math.floor(rnd() * 25), port: pick(["AIBD", "AIBD", "AIBD", "PDK"]), address: pick(["Hôtel Radisson, Dakar", "Saly Portudal", "Plateau, Dakar", "Saint-Louis", "Cap Skirring"]) },
      health: { yellowFever: rnd() > 0.05, symptoms: false, countriesVisited: "" },
      payment: { amount: 50000, currency: "XOF", method: pick(["Wave", "Orange Money", "Carte bancaire"]), paidAt: created.toISOString(), receipt: `PAY-${Math.floor(rnd() * 1e9)}` },
      prescreen: { score: risk.score, level: risk.level, factors: risk.factors },
      messages: status === "INFO_DEMANDEE" ? [{ from: "Agent VMS", at: daysAgo(1).toISOString(), text: "Merci de fournir la réservation d'hôtel." }] : [],
      decidedBy: ["APPROUVEE", "REFUSEE"].includes(status) ? pick(AGENTS) : null,
      visaNo: status === "APPROUVEE" ? `SN-EV-${2600000 + i}` : null,
      validUntil: status === "APPROUVEE" ? iso(new Date(created.getTime() + 90 * 86400000)) : null,
    });
  });
  const visaByDoc = new Map(evisas.map((v) => [v.applicant.docNo, v]));

  // ----- eGates / ABC -----
  const gates: any[] = [];
  const mkGate = (gid: string, name: string, posteId: string, zone: string, type: string, status = "EN_SERVICE") => gates.push({
    id: gid, name, posteId, zone, type, status, mode: status === "EN_SERVICE" ? "AUTO" : "FERME",
    config: { ...DEFAULT_GATE_CONFIG }, firmware: pick(["3.4.1", "3.4.2", "3.5.0"]), lastHeartbeat: now.toISOString(),
    devices: { lecteurDoc: "OK", camera: status === "ALARME" ? "DÉFAUT" : "OK", empreintes: "OK", portes: "OK" },
  });
  for (let i = 1; i <= 6; i++) mkGate(`EG-AIBD-A${String(i).padStart(2, "0")}`, `eGate Arrivées ${i}`, "AIBD", "Arrivées", "eGate", i === 5 ? "MAINTENANCE" : "EN_SERVICE");
  for (let i = 1; i <= 4; i++) mkGate(`EG-AIBD-D${String(i).padStart(2, "0")}`, `eGate Départs ${i}`, "AIBD", "Départs", "eGate", i === 3 ? "ALARME" : "EN_SERVICE");
  mkGate("ABC-AIBD-K01", "Kiosque ABC 1", "AIBD", "Arrivées", "Kiosque ABC");
  mkGate("ABC-AIBD-K02", "Kiosque ABC 2", "AIBD", "Arrivées", "Kiosque ABC");
  mkGate("CB-AIBD-01", "Corridor biométrique embarquement", "AIBD", "Embarquement", "Corridor biométrique");
  mkGate("EG-PDK-01", "eGate Croisières 1", "PDK", "Terminal passagers", "eGate");
  mkGate("EG-PDK-02", "eGate Croisières 2", "PDK", "Terminal passagers", "eGate", "HORS_SERVICE");
  const activeGates = gates.filter((g) => g.status === "EN_SERVICE");

  // ----- Passages (14 jours) -----
  const crossings: any[] = [];
  const history = new Map<string, number[]>();
  const posteWeights: [string, number][] = [["AIBD", 62], ["PDK", 8], ["ROS", 10], ["KID", 8], ["KAR", 7], ["ZIG", 5]];
  let n = 0;
  for (let d = 13; d >= 0; d--) {
    const perDay = 70 + Math.floor(rnd() * 35) + (d % 7 === 1 || d % 7 === 2 ? 25 : 0);
    for (let k = 0; k < perDay; k++) {
      const hour = weighted([["2", 2], ["6", 6], ["8", 8], ["10", 7], ["12", 6], ["14", 7], ["16", 8], ["18", 9], ["20", 10], ["22", 7]]);
      const ts = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - d, +hour + Math.floor(rnd() * 2), Math.floor(rnd() * 60)));
      if (ts > now) continue;
      const t = rnd() < 0.012 ? travelers[travelers.length - 1 - Math.floor(rnd() * 6)] : pick(travelers.slice(0, 420));
      const posteId = weighted(posteWeights);
      const poste = POSTES.find((p) => p.id === posteId)!;
      const direction = rnd() < 0.53 ? "ENTREE" : "SORTIE";
      const gateCandidates = activeGates.filter((g) => g.posteId === posteId && (g.zone === "Départs") === (direction === "SORTIE"));
      const channel = gateCandidates.length && rnd() < 0.42 ? "EGATE" : "GUICHET";
      const gate = channel === "EGATE" ? pick(gateCandidates) : null;
      const origin = poste.type === "Aérien" ? pick(ORIGINS) : poste.type === "Maritime" ? pick(["LPA", "LIS", "BJL"]) : posteId;
      const airline = pick(AIRLINES);
      const fraudDraw = rnd();
      const faceScore = simulatedBiometric(`${t.id}-${n}`, fraudDraw < 0.02 ? 0.62 : 0.93);
      const liveness = fraudDraw > 0.007;
      const prev = (history.get(t.id) || []).filter((x) => ts.getTime() - x < 30 * 86400000);
      const visa = visaByDoc.get(t.docNo);
      const p = parseMRZ(t.mrz);
      const risk = assessRisk(p, {
        watchlist, rules, now: ts, faceScore, liveness, crossings30d: prev.length, direction, channel, origin,
        visa: { required: !VISA_EXEMPT.includes(t.nat), status: visa?.status ?? null }, faceThreshold: gate?.config.faceThreshold,
      });
      let decision = risk.recommendation, reason = "";
      if (channel === "EGATE") {
        const g = gateDecision(p, risk, gate.config, ts, { faceScore, liveness });
        if (g.outcome === "ORIENTATION") { decision = "SECONDAIRE"; reason = `eGate : ${g.message}`; }
      }
      if (channel === "GUICHET" && decision === "SECONDAIRE" && risk.score < 60 && rnd() < 0.6) { decision = "AUTORISE"; reason = "Levée de doute au contrôle secondaire"; }
      history.set(t.id, [...prev, ts.getTime()]);
      crossings.push({
        id: id("PX", ++n), ts: ts.toISOString(), posteId, channel, gateId: gate?.id ?? null, direction, travelerId: t.id,
        traveler: { surname: t.surname, given: t.given, dob: t.dob, sex: t.sex, nat: t.nat, issuer: t.issuer, docNo: t.docNo, docType: "Passeport", expiry: t.expiry },
        flight: poste.type === "Aérien" ? `${airline[0]} ${100 + Math.floor(rnd() * 800)}` : null, origin,
        biometrics: { face: faceScore, liveness, fingerprints: channel === "GUICHET" ? 4 : 0, iris: rnd() < 0.15 ? simulatedBiometric(t.id + "iris", 0.95) : null },
        risk: { score: risk.score, level: risk.level, fraud: risk.fraud, factors: risk.factors },
        decision, reason, agent: channel === "EGATE" ? "eGate (automatique)" : pick(AGENTS),
        durationSec: channel === "EGATE" ? 11 + Math.floor(rnd() * 14) : 35 + Math.floor(rnd() * 90),
      });
    }
  }
  crossings.sort((a, b) => b.ts.localeCompare(a.ts));
  for (const g of gates) {
    const today = crossings.filter((c) => c.gateId === g.id && now.getTime() - Date.parse(c.ts) < 86400000);
    g.stats = { today: today.length, rejected: today.filter((c) => c.decision !== "AUTORISE").length, avgSec: today.length ? Math.round(today.reduce((s, c) => s + c.durationSec, 0) / today.length) : 0 };
  }

  // ----- Alertes (Threat Monitor) et dossiers -----
  const alerts: any[] = [];
  crossings.filter((c) => c.risk.score >= 35).forEach((c, i) => {
    const [type, title] = alertType(c.risk.factors);
    const age = now.getTime() - Date.parse(c.ts);
    const status = age < 6 * 3600000 ? "NOUVELLE" : age < 48 * 3600000 ? pick(["NOUVELLE", "EN_COURS", "CLOTUREE"]) : "CLOTUREE";
    alerts.push({
      id: id("AL", i + 1), ts: c.ts, type, title, severity: severityOf(c.risk.score),
      crossingId: c.id, posteId: c.posteId, traveler: `${c.traveler.surname} ${c.traveler.given}`, docNo: c.traveler.docNo,
      status, assignee: status === "NOUVELLE" ? null : pick(AGENTS), resolution: status === "CLOTUREE" ? pick(["Fausse alerte — homonyme", "Remis à la police aux frontières", "Refus d'entrée notifié", "Levée de doute — documents complémentaires"]) : null,
      history: [{ at: c.ts, by: "Système", text: "Alerte créée automatiquement" }],
    });
  });
  const cases = alerts.filter((a) => a.status !== "NOUVELLE" && a.severity !== "moyenne").slice(0, 8).map((a, i) => ({
    id: id("DS", i + 1), createdAt: a.ts, title: a.title, alertId: a.id, crossingId: a.crossingId, traveler: a.traveler, posteId: a.posteId,
    status: a.status === "CLOTUREE" ? "CLOS" : "OUVERT", owner: a.assignee, priority: a.severity,
    interview: { motif: "", hebergement: "", ressources: "", observations: "" },
    notes: [{ at: a.ts, by: a.assignee, text: "Voyageur orienté vers le contrôle secondaire." }],
  }));

  // ----- APIS / PNR -----
  const flights: any[] = [];
  for (let i = 0; i < 10; i++) {
    const [code, carrier] = AIRLINES[i % AIRLINES.length];
    const arrival = i < 7;
    const eta = new Date(now.getTime() + (0.5 + i * 1.3) * 3600000);
    const pax = travelers.slice(i * 30, i * 30 + 18 + Math.floor(rnd() * 12));
    if (i === 2) pax.push(travelers[travelers.length - 6]);
    if (i === 4) pax.push(travelers[travelers.length - 4]);
    const passengers = pax.map((t, k) => {
      const r = assessRisk(parseMRZ(t.mrz), { watchlist, rules, now, direction: arrival ? "ENTREE" : "SORTIE", channel: "APIS", visa: { required: !VISA_EXEMPT.includes(t.nat), status: visaByDoc.get(t.docNo)?.status ?? null } });
      return { seat: `${1 + Math.floor(k / 6)}${"ABCDEF"[k % 6]}`, surname: t.surname, given: t.given, nat: t.nat, dob: t.dob, docNo: t.docNo, pnr: Math.floor(rnd() * 36 ** 6).toString(36).toUpperCase().padStart(6, "X"), score: r.score, level: r.level, factors: r.factors };
    });
    flights.push({
      id: `FL-${i + 1}`, flight: `${code} ${200 + i * 37}`, carrier, direction: arrival ? "ARRIVEE" : "DEPART", posteId: "AIBD",
      route: arrival ? `${ORIGINS[i]} → DSS` : `DSS → ${ORIGINS[i + 5]}`, eta: eta.toISOString(),
      receivedAt: new Date(eta.getTime() - 3 * 3600000).toISOString(), source: i % 3 === 0 ? "PNR + API" : "API (UN/EDIFACT PAXLST)",
      onTime: rnd() > 0.15, passengers,
    });
  }

  // ----- Taxe de sécurité / WawPass -----
  const passes = travelers.slice(0, 40).map((t, i) => ({
    ref: `WP${String(880000 + i)}`, createdAt: daysAgo(rnd() * 10).toISOString(), surname: t.surname, given: t.given, docNo: t.docNo, nat: t.nat,
    flight: `${pick(AIRLINES)[0]} ${100 + Math.floor(rnd() * 800)}`, travelDate: iso(new Date(now.getTime() + (rnd() * 20 - 5) * 86400000)),
    amount: 15000, currency: "XOF", method: pick(["Wave", "Orange Money", "Carte bancaire"]), used: rnd() < 0.4,
  }));

  // ----- Véhicules (VRS) -----
  const vehicles = Array.from({ length: 60 }, (_, i) => {
    const posteId = pick(["ROS", "KID", "KAR"]);
    const country = posteId === "ROS" ? pick(["SN", "RIM"]) : posteId === "KID" ? pick(["SN", "RMM"]) : pick(["SN", "WAG"]);
    const driver = pick(travelers);
    return {
      id: id("VH", i + 1), ts: new Date(now.getTime() - rnd() * 7 * 86400000).toISOString(), posteId, direction: rnd() < 0.5 ? "ENTREE" : "SORTIE",
      plate: `${country === "SN" ? "DK" : country}-${1000 + Math.floor(rnd() * 8999)}-${String.fromCharCode(65 + Math.floor(rnd() * 26))}${String.fromCharCode(65 + Math.floor(rnd() * 26))}`,
      country, type: pick(["Véhicule léger", "Camion", "Bus", "Moto", "Camion-citerne"]), occupants: 1 + Math.floor(rnd() * 6),
      driver: `${driver.surname} ${driver.given}`, cargo: pick(["—", "Marchandises diverses", "Céréales", "Carburant", "Bétail", "Ciment"]),
      flagged: rnd() < 0.05, note: "",
    };
  });
  vehicles.forEach((v) => { if (v.flagged) v.note = "Plaque signalée — véhicule déclaré volé (WAPIS)"; });

  // ----- Équipements (SES) -----
  const devices: any[] = [];
  for (const p of POSTES) {
    const booths = p.id === "AIBD" ? 24 : p.type === "Terrestre" ? 4 : 6;
    for (let i = 1; i <= booths; i++) devices.push({ id: `TRM-${p.id}-${String(i).padStart(2, "0")}`, type: "Terminal guichet", posteId: p.id, status: rnd() < 0.06 ? "HORS_LIGNE" : "EN_LIGNE", version: "WawID Terminal 1.0" });
    for (let i = 1; i <= (p.id === "AIBD" ? 12 : 3); i++) devices.push({ id: `CCTV-${p.id}-${String(i).padStart(2, "0")}`, type: "Caméra CCTV (reconnaissance faciale)", posteId: p.id, status: rnd() < 0.08 ? "DÉGRADÉ" : "EN_LIGNE", version: "EverWatch-compatible" });
    if (p.type !== "Terrestre") devices.push({ id: `LGS-${p.id}-01`, type: "Scanner bagages 3D", posteId: p.id, status: "EN_LIGNE", version: "—" });
    if (p.type === "Terrestre") devices.push({ id: `ANPR-${p.id}-01`, type: "Lecteur de plaques (VRS)", posteId: p.id, status: rnd() < 0.2 ? "HORS_LIGNE" : "EN_LIGNE", version: "—" });
    devices.push({ id: `SRV-${p.id}`, type: "Serveur local (mode dégradé)", posteId: p.id, status: "EN_LIGNE", version: "sync 30 s" });
  }

  // ----- Connecteurs vers les fichiers externes -----
  const connectors = [
    { id: "CN-INTERPOL-SLTD", name: "Interpol I-24/7 — SLTD (documents perdus/volés)", source: "INTERPOL_SLTD", protocol: "FIND / MIND (SOAP-REST)", mode: "Temps réel", status: "SIMULÉ", lastSync: now.toISOString(), records: watchlist.filter((w) => w.source === "INTERPOL_SLTD").length, latencyMs: 180 },
    { id: "CN-INTERPOL-NOM", name: "Interpol I-24/7 — Nominal & notices", source: "INTERPOL_NOTICE", protocol: "FIND (REST)", mode: "Temps réel", status: "SIMULÉ", lastSync: now.toISOString(), records: watchlist.filter((w) => w.source.startsWith("INTERPOL_N") || w.source === "INTERPOL_DIFFUSION").length, latencyMs: 220 },
    { id: "CN-WAPIS", name: "WAPIS — Système d'information policière d'Afrique de l'Ouest", source: "WAPIS", protocol: "REST / mTLS", mode: "Synchronisation horaire", status: "SIMULÉ", lastSync: daysAgo(0.03).toISOString(), records: 1, latencyMs: 0 },
    { id: "CN-FPR", name: "Fichier national des personnes recherchées", source: "FPR", protocol: "REST / mTLS", mode: "Temps réel", status: "SIMULÉ", lastSync: now.toISOString(), records: 2, latencyMs: 90 },
    { id: "CN-JUD", name: "Interdictions judiciaires du territoire", source: "JUDICIAIRE", protocol: "Fichier CSV signé (SFTP)", mode: "Quotidien", status: "SIMULÉ", lastSync: daysAgo(0.5).toISOString(), records: 1, latencyMs: 0 },
    { id: "CN-ETATCIVIL", name: "Registre national des passeports (DAF)", source: "SLTD_NATIONAL", protocol: "REST", mode: "Temps réel", status: "SIMULÉ", lastSync: now.toISOString(), records: 1, latencyMs: 120 },
    { id: "CN-PAXLST", name: "Passerelle transporteurs API/PNR (PAXLST / PNRGOV)", source: "APIS", protocol: "UN/EDIFACT via MQ / HTTPS", mode: "Push transporteurs", status: "SIMULÉ", lastSync: now.toISOString(), records: flights.length, latencyMs: 0 },
  ];

  return {
    meta: { seededAt: now.toISOString(), version: 1 },
    settings: { visaExempt: VISA_EXEMPT, faceThreshold: 0.8, retentionDays: 1825, evisaFee: 50000, passFee: 15000 },
    watchlist, rules, travelers: travelers.map(({ mrz, ...t }) => t), crossings, alerts, cases, evisas, gates, flights, passes, vehicles, devices, connectors,
    enrolments: [],
  };
}
