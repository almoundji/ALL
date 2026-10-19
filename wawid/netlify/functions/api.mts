// API WawID : une seule fonction, routée sur /api/*.
import type { Config } from "@netlify/functions";
import {
  COUNTRIES, DEFAULT_GATE_CONFIG, POSTES, alertType, assessRisk, gateDecision, normName, parseMRZ, severityOf,
} from "../../public/shared/engine.js";
import {
  ROLES, clearCookie, currentUser, gateKeyValid, hashPassword, json, login, publicUser, sessionCookie, signToken, verifyToken,
} from "../lib/auth.mts";
import { decorate, externalHits, testConnector } from "../lib/connectors.mts";
import { audit, ensureSeeded, load, loadMany, save, verifyChain } from "../lib/store.mts";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const fail = (status: number, message: string): never => { throw new HttpError(status, message); };

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

async function body(req: Request): Promise<any> {
  const text = await req.text();
  if (text.length > 1_000_000) fail(413, "Requête trop volumineuse");
  try { return text ? JSON.parse(text) : {}; } catch { return fail(400, "JSON invalide"); }
}

function need(user: any, perm: string) {
  if (!user) fail(401, "Session expirée — reconnectez-vous");
  if (!user.perms.includes(perm)) fail(403, "Action non autorisée pour votre rôle");
}

// ---------- Évaluation d'un voyageur (commune guichet / eGate / e-Visa / APIS) ----------

async function evaluate(input: any, extra: Record<string, unknown> = {}) {
  const parsed = parseMRZ(input.mrz);
  if (!parsed.ok) return { parsed, risk: null, externalErrors: [] };
  const d = await loadMany(["watchlist", "rules", "crossings", "evisas", "settings", "connectors"]);
  const connectors = decorate(d.connectors);
  const disabled = new Set(connectors.filter((c: any) => c.status === "DÉSACTIVÉ").map((c: any) => c.source));
  const ext = await externalHits(parsed, connectors);
  const monthAgo = Date.now() - 30 * 86400000;
  const crossings30d = d.crossings.filter((c: any) => c.traveler.docNo === parsed.docNo && Date.parse(c.ts) > monthAgo).length;
  const visa = activeVisa(d.evisas, parsed.docNo);
  // Contrôles de réutilisation d'identité sur l'historique des passages.
  const sameName = (t: any) => normName(t.surname) === normName(parsed.surname) && normName(t.given) === normName(parsed.given);
  const reused = d.crossings.find((c: any) => c.traveler.docNo === parsed.docNo && (!sameName(c.traveler) || c.traveler.dob !== parsed.dob));
  const quarter = Date.now() - 90 * 86400000;
  const otherDocs = new Set(d.crossings.filter((c: any) => Date.parse(c.ts) > quarter && sameName(c.traveler) && c.traveler.dob === parsed.dob && c.traveler.docNo !== parsed.docNo).map((c: any) => c.traveler.docNo)).size;
  const risk = assessRisk(parsed, {
    watchlist: [...d.watchlist.filter((w: any) => !disabled.has(w.source)), ...ext.entries], rules: d.rules, crossings30d,
    faceScore: typeof input.faceScore === "number" ? input.faceScore : undefined,
    liveness: input.liveness === undefined ? undefined : Boolean(input.liveness),
    irisScore: typeof input.irisScore === "number" ? input.irisScore : undefined,
    direction: input.direction || "ENTREE", channel: input.channel || "GUICHET", origin: str(input.origin, 20) || undefined,
    visa: { required: !(d.settings.visaExempt || []).includes(parsed.nat), status: visa?.status ?? null, ref: visa?.ref },
    faceThreshold: input.faceThreshold ?? d.settings.faceThreshold, chip: chipFacts(parsed, input.chip),
    attack: typeof input.attack === "string" ? input.attack : undefined,
    identity: { docOtherIdentity: reused ? `${reused.traveler.surname} ${reused.traveler.given} (${reused.id})` : null, otherDocs }, ...extra,
  });
  return { parsed, risk, visa: visa ? { ref: visa.ref, status: visa.status, visaNo: visa.visaNo, validUntil: visa.validUntil } : null, crossings30d, externalErrors: ext.errors };
}

/** e-Visa utilisable pour ce document (une autorisation approuvée mais échue est signalée « EXPIREE »). */
function activeVisa(evisas: any[], docNo: string) {
  const v = evisas.find((x: any) => x.applicant.docNo === docNo && x.status !== "REFUSEE");
  if (v?.status === "APPROUVEE" && v.validUntil && v.validUntil < nowIso().slice(0, 10)) return { ...v, status: "EXPIREE" };
  return v;
}

/** Résultat de lecture NFC transmis par le terminal : la cohérence DG1 ↔ MRZ imprimée est recalculée ici. */
function chipFacts(parsed: any, chip: any) {
  if (!chip || typeof chip !== "object") return undefined;
  if (chip.read === false) return { read: false };
  const dg1 = chip.dg1 ? parseMRZ(chip.dg1) : null;
  const key = (a: any) => normName(String(a ?? "")).replace(/ /g, "");
  // La MRZ tronque les noms longs : on compare par préfixe. Les dates sont comparées sur AAMMJJ (siècle ambigu dans la MRZ).
  const nameOk = (a: any, b: any) => { const x = key(a), y = key(b); return Boolean(x && y) && (x.startsWith(y) || y.startsWith(x)); };
  const yymmdd = (d: any) => String(d ?? "").replace(/-/g, "").slice(2);
  const dg1Match = !dg1?.ok || !dg1.checksOk ? false
    : key(dg1.docNo) === key(parsed.docNo) && yymmdd(dg1.dob) === yymmdd(parsed.dob) && yymmdd(dg1.expiry) === yymmdd(parsed.expiry) && nameOk(dg1.surname, parsed.surname) && key(dg1.nat) === key(parsed.nat);
  return { read: true, passiveAuth: typeof chip.passiveAuth === "boolean" ? chip.passiveAuth : undefined, dg1Match };
}

async function recordCrossing(c: any) {
  const crossings = (await load<any[]>("crossings")) || [];
  crossings.unshift(c);
  await save("crossings", crossings.slice(0, 20000));
  if (c.risk.score >= 35 || c.decision === "REFUSE") {
    const [type, title] = alertType(c.risk.factors);
    const alerts = (await load<any[]>("alerts")) || [];
    alerts.unshift({
      id: uid("AL"), ts: c.ts, type, title, severity: severityOf(c.risk.score), crossingId: c.id, posteId: c.posteId,
      traveler: `${c.traveler.surname} ${c.traveler.given}`, docNo: c.traveler.docNo, status: "NOUVELLE", assignee: null, resolution: null,
      history: [{ at: c.ts, by: "Système", text: `Alerte créée (${c.channel === "EGATE" ? "eGate " + c.gateId : "guichet"})` }],
    });
    await save("alerts", alerts);
  }
}

const chipSummary = (c: any) => (c && typeof c === "object" ? { read: c.read !== false, passiveAuth: c.passiveAuth ?? null, protocol: str(c.protocol, 10) || null, source: str(c.source, 20) || null } : null);
const validRole = (r: unknown): r is string => typeof r === "string" && Object.hasOwn(ROLES, r);
/** Nombre borné ; une valeur non numérique conserve l'ancienne valeur. */
const bounded = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const travelerOf = (p: any) => ({ surname: p.surname, given: p.given, dob: p.dob, sex: p.sex, nat: p.nat, issuer: p.issuer, docNo: p.docNo, docType: p.docType, expiry: p.expiry });

// ---------- Routes ----------

type Handler = (req: Request, params: Record<string, string>, user: any) => Promise<Response>;
const routes: [string, string, Handler][] = [];
const on = (method: string, path: string, h: Handler) => routes.push([method, path, h]);

// --- Session ---
on("GET", "/api/session", async (_r, _p, user) => (user ? json({ user }) : json({ error: "non connecté" }, 401)));
on("DELETE", "/api/session", async (_r, _p, user) => {
  if (user) await audit(user.username, "DECONNEXION", user.username);
  return json({ ok: true }, 200, { "set-cookie": clearCookie });
});
on("POST", "/api/session", async (req) => {
  const { username = "", password = "" } = await body(req);
  const user = await login(str(username, 60), String(password).slice(0, 200));
  if (!user) {
    await new Promise((r) => setTimeout(r, 700));
    await audit(str(username, 60) || "?", "ECHEC_CONNEXION", "back-office");
    return json({ error: "Identifiant ou mot de passe incorrect (ou comptes non initialisés)." }, 401);
  }
  await audit(user.username, "CONNEXION", "back-office", ROLES[user.role]?.label);
  return json({ user: publicUser(user) }, 200, { "set-cookie": sessionCookie(user.id) });
});

// --- Portail voyageur (public) ---
on("GET", "/api/public/info", async () => {
  const s = await load("settings");
  return json({ postes: POSTES, countries: COUNTRIES, visaExempt: s.visaExempt, evisaFee: s.evisaFee, passFee: s.passFee });
});

on("POST", "/api/public/evisa", async (req) => {
  const b = await body(req);
  const a = b.applicant || {}, t = b.trip || {}, h = b.health || {};
  for (const [k, v] of Object.entries({ Nom: a.surname, Prénoms: a.given, "Date de naissance": a.dob, Nationalité: a.nat, "N° de passeport": a.docNo, "Expiration du passeport": a.expiry, "E-mail": a.email, "Date d'arrivée": t.arrival }))
    if (!str(v)) fail(400, `Champ obligatoire manquant : ${k}`);
  if (!/^\S+@\S+\.\S+$/.test(str(a.email))) fail(400, "Adresse e-mail invalide");
  if (!b.consent) fail(400, "Le consentement au traitement des données est requis");
  const settings = await load("settings");
  const applicant = {
    surname: str(a.surname, 60), given: str(a.given, 80), dob: str(a.dob, 10), sex: str(a.sex, 1) || "X", nat: str(a.nat, 3).toUpperCase(),
    docNo: str(a.docNo, 12).toUpperCase().replace(/\s/g, ""), expiry: str(a.expiry, 10), email: str(a.email, 120), phone: str(a.phone, 30),
  };
  const chip = b.chip && typeof b.chip === "object" ? chipFacts({ ...applicant }, b.chip) : undefined;
  const risk = assessRisk({ ...applicant, issuer: applicant.nat }, {
    ...(await loadMany(["watchlist", "rules"])), direction: "ENTREE", channel: "EVISA", chip,
  });
  const evisas = (await load<any[]>("evisas")) || [];
  const ref = `EV${Date.now().toString().slice(-7)}`;
  const app = {
    ref, createdAt: nowIso(), status: "SOUMISE", applicant,
    trip: { purpose: str(t.purpose, 40), arrival: str(t.arrival, 10), nights: Number(t.nights) || 0, port: str(t.port, 6) || "AIBD", address: str(t.address, 160) },
    health: { yellowFever: Boolean(h.yellowFever), symptoms: Boolean(h.symptoms), countriesVisited: str(h.countriesVisited, 160) },
    payment: { amount: settings.evisaFee, currency: "XOF", method: str(b.paymentMethod, 30) || "Carte bancaire", paidAt: nowIso(), receipt: uid("PAY") },
    prescreen: { score: risk.score, level: risk.level, factors: risk.factors }, messages: [], decidedBy: null, visaNo: null, validUntil: null,
    channel: str(b.channel, 20) || "Web", chip: chip ? { ...chip, source: str(b.chip.source, 30) || "NFC", protocol: str(b.chip.protocol, 10) || null } : null,
  };
  evisas.unshift(app);
  await save("evisas", evisas);
  await audit("Portail voyageur", "EVISA_DEPOT", ref, `${applicant.surname} ${applicant.given} (${applicant.nat})`);
  return json({ ref, status: app.status, receipt: app.payment.receipt, amount: app.payment.amount });
});

async function findApplication(b: any) {
  const evisas = (await load<any[]>("evisas")) || [];
  const app = evisas.find((v) => v.ref === str(b.ref, 20).toUpperCase() && v.applicant.docNo === str(b.docNo, 12).toUpperCase().replace(/\s/g, ""));
  if (!app) { await new Promise((r) => setTimeout(r, 400)); fail(404, "Aucune demande ne correspond à cette référence et ce numéro de passeport."); }
  return { evisas, app: app! };
}
const publicApplication = (app: any) => ({
  ref: app.ref, status: app.status, createdAt: app.createdAt, applicant: { surname: app.applicant.surname, given: app.applicant.given, nat: app.applicant.nat, docNo: app.applicant.docNo },
  trip: app.trip, messages: app.messages, visaNo: app.visaNo, validUntil: app.validUntil,
  token: app.status === "APPROUVEE" ? signToken("EV", app.ref) : null,
});
on("POST", "/api/public/evisa/status", async (req) => json(publicApplication((await findApplication(await body(req))).app)));
on("POST", "/api/public/evisa/reply", async (req) => {
  const b = await body(req);
  const { evisas, app } = await findApplication(b);
  if (app.status !== "INFO_DEMANDEE") fail(409, "Aucune information complémentaire n'est attendue.");
  if (!str(b.text)) fail(400, "Message vide");
  app.messages.push({ from: "Demandeur", at: nowIso(), text: str(b.text, 1000) });
  app.status = "EN_EXAMEN";
  await save("evisas", evisas);
  await audit("Portail voyageur", "EVISA_REPONSE", app.ref);
  return json(publicApplication(app));
});

on("POST", "/api/public/pass", async (req) => {
  const b = await body(req);
  for (const [k, v] of Object.entries({ Nom: b.surname, Prénoms: b.given, "N° de passeport": b.docNo, Vol: b.flight, "Date du voyage": b.travelDate }))
    if (!str(v)) fail(400, `Champ obligatoire manquant : ${k}`);
  const settings = await load("settings");
  const passes = (await load<any[]>("passes")) || [];
  const pass = {
    ref: `WP${Date.now().toString().slice(-7)}`, createdAt: nowIso(), surname: str(b.surname, 60), given: str(b.given, 80), docNo: str(b.docNo, 12).toUpperCase(),
    nat: str(b.nat, 3).toUpperCase(), flight: str(b.flight, 12).toUpperCase(), travelDate: str(b.travelDate, 10), amount: settings.passFee, currency: "XOF",
    method: str(b.paymentMethod, 30) || "Carte bancaire", used: false,
  };
  passes.unshift(pass);
  await save("passes", passes);
  await audit("Portail voyageur", "WAWPASS_PAIEMENT", pass.ref);
  return json({ ...pass, token: signToken("WP", pass.ref) });
});

on("POST", "/api/public/enrol", async (req) => {
  const b = await body(req);
  const parsed = parseMRZ(b.mrz);
  if (!parsed.ok || !parsed.checksOk) fail(400, "MRZ invalide : vérifiez les deux lignes de votre passeport.");
  if (!b.consent) fail(400, "Le consentement biométrique est requis");
  const enrolments = (await load<any[]>("enrolments")) || [];
  const ref = `EN${Date.now().toString().slice(-7)}`;
  enrolments.unshift({ ref, createdAt: nowIso(), status: "EN_ATTENTE", traveler: travelerOf(parsed), email: str(b.email, 120), phone: str(b.phone, 30) });
  await save("enrolments", enrolments);
  await audit("Portail voyageur", "PREENROLEMENT", ref);
  return json({ ref, status: "EN_ATTENTE" });
});

// --- eGates / kiosques ABC ---
const gateAuth = (req: Request, user: any) => {
  if (gateKeyValid(req)) return "Équipement";
  if (user && (user.perms.includes("gates") || user.perms.includes("control"))) return user.username;
  return fail(401, "Clé d'équipement invalide");
};
on("GET", "/api/gate/list", async (req, _p, user) => {
  gateAuth(req, user);
  const gates = (await load<any[]>("gates")) || [];
  return json(gates.map(({ id, name, posteId, zone, type, status, mode, config }) => ({ id, name, posteId, zone, type, status, mode, config })));
});
on("POST", "/api/gate/transaction", async (req, _p, user) => {
  const actor = gateAuth(req, user);
  const b = await body(req);
  const gates = (await load<any[]>("gates")) || [];
  const gate = gates.find((g) => g.id === b.gateId) ?? fail(404, "Équipement inconnu");
  if (gate.status !== "EN_SERVICE" || gate.mode !== "AUTO") return json({ outcome: "INDISPONIBLE", message: "Cette porte est fermée. Merci de vous diriger vers un guichet." });
  const direction = gate.zone === "Départs" || gate.zone === "Embarquement" ? "SORTIE" : "ENTREE";
  const { parsed, risk, visa } = await evaluate({ ...b, direction, channel: "EGATE", faceThreshold: gate.config.faceThreshold });
  const decision = gateDecision(parsed, risk ?? { score: 0, factors: [], recommendation: "AUTORISE" }, gate.config, new Date(), { faceScore: b.faceScore, liveness: b.liveness });
  gate.lastHeartbeat = nowIso();
  gate.stats = gate.stats || { today: 0, rejected: 0, avgSec: 0 };
  gate.stats.today++;
  if (decision.outcome !== "OUVERTURE") gate.stats.rejected++;
  await save("gates", gates);
  if (parsed.ok && risk) {
    const c = {
      id: uid("PX"), ts: nowIso(), posteId: gate.posteId, channel: "EGATE", gateId: gate.id, direction, travelerId: null, traveler: travelerOf(parsed),
      flight: str(b.flight, 12) || null, origin: null, biometrics: { face: b.faceScore ?? null, liveness: b.liveness !== false, fingerprints: 0, iris: null, chip: chipSummary(b.chip) },
      risk: { score: risk.score, level: risk.level, fraud: risk.fraud, factors: risk.factors },
      decision: decision.outcome === "OUVERTURE" ? "AUTORISE" : "SECONDAIRE", reason: decision.outcome === "OUVERTURE" ? "" : `eGate : ${decision.message}`,
      agent: "eGate (automatique)", durationSec: Math.max(5, Math.min(120, Number(b.durationSec) || 15)),
    };
    await recordCrossing(c);
    await audit(actor, "EGATE_TRANSACTION", gate.id, `${decision.outcome} · ${c.id}`);
    return json({ ...decision, crossingId: c.id, traveler: { surname: parsed.surname, given: parsed.given }, visa });
  }
  await audit(actor, "EGATE_REJET", gate.id, decision.code);
  return json(decision);
});

// --- Back-office ---
on("GET", "/api/data", async (_r, _p, user) => {
  need(user, "read");
  const d = await loadMany(["settings", "watchlist", "rules", "crossings", "alerts", "cases", "evisas", "gates", "flights", "passes", "vehicles", "devices", "connectors", "enrolments"]);
  d.crossings = d.crossings.slice(0, 4000);
  d.connectors = decorate(d.connectors);
  // Statistiques des eGates sur 24 h glissantes, recalculées à partir des passages.
  const dayAgo = Date.now() - 86400000;
  d.gates = d.gates.map((g: any) => {
    const tx = d.crossings.filter((c: any) => c.gateId === g.id && Date.parse(c.ts) > dayAgo);
    return { ...g, stats: { today: tx.length, rejected: tx.filter((c: any) => c.decision !== "AUTORISE").length, avgSec: tx.length ? Math.round(tx.reduce((s: number, c: any) => s + c.durationSec, 0) / tx.length) : 0 } };
  });
  d.evisas = d.evisas.map((v: any) => (v.status === "APPROUVEE" ? { ...v, token: signToken("EV", v.ref) } : v));
  d.passes = d.passes.map((p: any) => ({ ...p, token: signToken("WP", p.ref) }));
  return json({ ...d, postes: POSTES, countries: COUNTRIES, roles: ROLES, me: user, serverTime: nowIso() });
});

on("POST", "/api/assess", async (req, _p, user) => {
  need(user, "control");
  return json(await evaluate(await body(req)));
});

on("POST", "/api/crossings", async (req, _p, user) => {
  need(user, "control");
  const b = await body(req);
  const { parsed, risk } = await evaluate(b);
  if (!parsed.ok || !risk) fail(400, parsed.error || "MRZ invalide");
  const decision = ["AUTORISE", "SECONDAIRE", "REFUSE"].includes(b.decision) ? b.decision : fail(400, "Décision invalide");
  if (decision !== risk!.recommendation && !str(b.reason)) fail(400, "Motif obligatoire lorsque la décision diffère de la recommandation");
  const c = {
    id: uid("PX"), ts: nowIso(), posteId: str(b.posteId, 6) || user.posteId, channel: "GUICHET", gateId: null, direction: b.direction === "SORTIE" ? "SORTIE" : "ENTREE",
    travelerId: null, traveler: travelerOf(parsed), flight: str(b.flight, 12) || null, origin: str(b.origin, 20) || null,
    biometrics: { face: b.faceScore ?? null, liveness: b.liveness !== false, fingerprints: Number(b.fingerprints) || 0, iris: b.irisScore ?? null, chip: chipSummary(b.chip) },
    risk: { score: risk!.score, level: risk!.level, fraud: risk!.fraud, factors: risk!.factors },
    decision, reason: str(b.reason, 300), notes: str(b.notes, 1000), agent: user.name, durationSec: Math.max(5, Math.min(900, Number(b.durationSec) || 60)),
  };
  await recordCrossing(c);
  await audit(user.username, "PASSAGE_DECISION", c.id, `${decision} · score ${risk!.score}`);
  return json(c);
});

on("PATCH", "/api/alerts/:id", async (req, p, user) => {
  need(user, "alerts");
  const b = await body(req);
  const alerts = (await load<any[]>("alerts")) || [];
  const a = alerts.find((x) => x.id === p.id) ?? fail(404, "Alerte introuvable");
  if (b.action === "assign") { a.assignee = user.name; a.status = "EN_COURS"; a.history.push({ at: nowIso(), by: user.name, text: "Prise en charge" }); }
  else if (b.action === "close") {
    if (!str(b.resolution)) fail(400, "Résolution obligatoire");
    a.status = "CLOTUREE"; a.resolution = str(b.resolution, 300); a.history.push({ at: nowIso(), by: user.name, text: `Clôturée : ${a.resolution}` });
  } else if (b.action === "reopen") { a.status = "EN_COURS"; a.history.push({ at: nowIso(), by: user.name, text: "Réouverte" }); }
  else if (b.action === "note" && str(b.note)) a.history.push({ at: nowIso(), by: user.name, text: str(b.note, 500) });
  else fail(400, "Action inconnue");
  await save("alerts", alerts);
  await audit(user.username, `ALERTE_${String(b.action).toUpperCase()}`, a.id);
  return json(a);
});

on("POST", "/api/cases", async (req, _p, user) => {
  need(user, "cases");
  const b = await body(req);
  const [alerts, cases] = await Promise.all([load<any[]>("alerts"), load<any[]>("cases")]);
  const a = (alerts || []).find((x) => x.id === b.alertId);
  const c = {
    id: uid("DS"), createdAt: nowIso(), title: str(b.title, 160) || a?.title || "Contrôle secondaire", alertId: a?.id ?? null, crossingId: str(b.crossingId, 30) || a?.crossingId || null,
    traveler: str(b.traveler, 120) || a?.traveler || "", posteId: a?.posteId || user.posteId, status: "OUVERT", owner: user.name, priority: a?.severity || "moyenne",
    interview: { motif: "", hebergement: "", ressources: "", observations: "" }, notes: [{ at: nowIso(), by: user.name, text: "Dossier ouvert" }],
  };
  (cases || []).unshift(c);
  await save("cases", cases || [c]);
  await audit(user.username, "DOSSIER_CREATION", c.id, c.title);
  return json(c);
});
on("PATCH", "/api/cases/:id", async (req, p, user) => {
  need(user, "cases");
  const b = await body(req);
  const cases = (await load<any[]>("cases")) || [];
  const c = cases.find((x) => x.id === p.id) ?? fail(404, "Dossier introuvable");
  if (b.interview && typeof b.interview === "object") for (const k of Object.keys(c.interview)) if (k in b.interview) c.interview[k] = str(b.interview[k], 2000);
  if (str(b.note)) c.notes.push({ at: nowIso(), by: user.name, text: str(b.note, 1000) });
  if (["OUVERT", "CLOS"].includes(b.status) && b.status !== c.status) { c.status = b.status; c.notes.push({ at: nowIso(), by: user.name, text: b.status === "CLOS" ? "Dossier clos" : "Dossier rouvert" }); }
  await save("cases", cases);
  await audit(user.username, "DOSSIER_MAJ", c.id);
  return json(c);
});

on("POST", "/api/watchlist", async (req, _p, user) => {
  need(user, "watchlist");
  const b = await body(req);
  const kind = b.kind === "document" ? "document" : "person";
  if (kind === "person" && (!str(b.surname) || !str(b.given))) fail(400, "Nom et prénoms obligatoires");
  if (kind === "document" && !str(b.docNo)) fail(400, "Numéro de document obligatoire");
  const list = (await load<any[]>("watchlist")) || [];
  const e = {
    id: uid("WL"), kind, source: str(b.source, 30) || "POI", list: str(b.list, 80) || "Personne d'intérêt", surname: str(b.surname, 60), given: str(b.given, 80),
    dob: str(b.dob, 10), nat: str(b.nat, 3).toUpperCase(), docNo: str(b.docNo, 20).toUpperCase().replace(/[^A-Z0-9]/g, ""), issuer: str(b.issuer, 3).toUpperCase(),
    severity: ["critique", "haute", "moyenne", "basse"].includes(b.severity) ? b.severity : "moyenne", reason: str(b.reason, 300), reference: str(b.reference, 60),
    active: true, addedBy: user.name, addedAt: nowIso(),
  };
  list.unshift(e);
  await save("watchlist", list);
  await audit(user.username, "SURVEILLANCE_AJOUT", e.id, `${e.list} · ${e.surname || e.docNo}`);
  return json(e);
});
on("PATCH", "/api/watchlist/:id", async (req, p, user) => {
  need(user, "watchlist");
  const b = await body(req);
  const list = (await load<any[]>("watchlist")) || [];
  const e = list.find((x) => x.id === p.id) ?? fail(404, "Entrée introuvable");
  e.active = Boolean(b.active);
  await save("watchlist", list);
  await audit(user.username, e.active ? "SURVEILLANCE_ACTIVATION" : "SURVEILLANCE_DESACTIVATION", e.id);
  return json(e);
});

on("POST", "/api/rules", async (req, _p, user) => {
  need(user, "rules");
  const b = await body(req);
  const rules = (await load<any[]>("rules")) || [];
  const conditions = (Array.isArray(b.conditions) ? b.conditions : []).slice(0, 8).filter((c: any) => c && typeof c === "object")
    .map((c: any) => ({ field: str(c.field, 30), op: str(c.op, 4), value: str(c.value, 200) })).filter((c: any) => c.field && c.op && c.value);
  if (!str(b.name) || !conditions.length) fail(400, "Nom et au moins une condition requis");
  const existing = b.id ? rules.find((r) => r.id === b.id) : null;
  const rule = { id: existing?.id || uid("R"), name: str(b.name, 120), enabled: b.enabled !== false, points: Math.max(0, Math.min(100, Number.isFinite(Number(b.points)) && b.points !== "" && b.points !== null ? Number(b.points) : 10)), conditions, author: user.name, updatedAt: nowIso() };
  if (existing) Object.assign(existing, rule); else rules.push(rule);
  await save("rules", rules);
  await audit(user.username, existing ? "REGLE_MODIFICATION" : "REGLE_CREATION", rule.id, rule.name);
  return json(rule);
});
on("DELETE", "/api/rules/:id", async (_r, p, user) => {
  need(user, "rules");
  const rules = (await load<any[]>("rules")) || [];
  await save("rules", rules.filter((r) => r.id !== p.id));
  await audit(user.username, "REGLE_SUPPRESSION", p.id);
  return json({ ok: true });
});

on("PATCH", "/api/evisas/:ref", async (req, p, user) => {
  need(user, "evisa");
  const b = await body(req);
  const evisas = (await load<any[]>("evisas")) || [];
  const app = evisas.find((v) => v.ref === p.ref) ?? fail(404, "Demande introuvable");
  const msg = str(b.message, 1000);
  if (b.action === "review") app.status = "EN_EXAMEN";
  else if (b.action === "request_info") { if (!msg) fail(400, "Précisez l'information demandée"); app.status = "INFO_DEMANDEE"; }
  else if (b.action === "approve") {
    app.status = "APPROUVEE"; app.decidedBy = user.name; app.visaNo = `SN-EV-${Date.now().toString().slice(-7)}`;
    app.validUntil = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  } else if (b.action === "reject") { if (!msg) fail(400, "Motif de refus obligatoire"); app.status = "REFUSEE"; app.decidedBy = user.name; }
  else fail(400, "Action inconnue");
  if (msg) app.messages.push({ from: "Agent VMS", at: nowIso(), text: msg });
  await save("evisas", evisas);
  await audit(user.username, `EVISA_${String(b.action).toUpperCase()}`, app.ref);
  return json(app);
});

on("POST", "/api/verify-token", async (req, _p, user) => {
  need(user, "read");
  const { token } = await body(req);
  const t = verifyToken(str(token, 100));
  if (!t) return json({ valid: false, message: "QR code invalide ou falsifié (signature incorrecte)." });
  if (t.kind === "EV") {
    const app = ((await load<any[]>("evisas")) || []).find((v) => v.ref === t.ref);
    const valid = app?.status === "APPROUVEE" && app.validUntil >= nowIso().slice(0, 10);
    return json({ valid, kind: "e-Visa", ref: t.ref, holder: app && `${app.applicant.surname} ${app.applicant.given}`, docNo: app?.applicant.docNo, message: valid ? `e-Visa ${app.visaNo} valide jusqu'au ${app.validUntil}` : `e-Visa non valide (${app?.status ?? "inconnu"})` });
  }
  const passes = (await load<any[]>("passes")) || [];
  const pass = passes.find((x) => x.ref === t.ref);
  if (!pass) return json({ valid: false, message: "Reçu inconnu." });
  const already = pass.used;
  pass.used = true;
  await save("passes", passes);
  await audit(user.username, "WAWPASS_VALIDATION", pass.ref);
  return json({ valid: !already, kind: "WawPass (taxe de sécurité)", ref: pass.ref, holder: `${pass.surname} ${pass.given}`, docNo: pass.docNo, message: already ? "Reçu déjà utilisé." : `Taxe acquittée — vol ${pass.flight} du ${pass.travelDate}` });
});

on("PATCH", "/api/gates/:id", async (req, p, user) => {
  need(user, "gates");
  const b = await body(req);
  const gates = (await load<any[]>("gates")) || [];
  const g = gates.find((x) => x.id === p.id) ?? fail(404, "Équipement introuvable");
  const changes: string[] = [];
  if (["EN_SERVICE", "HORS_SERVICE", "MAINTENANCE"].includes(b.status)) { g.status = b.status; changes.push(`statut ${b.status}`); if (b.status === "EN_SERVICE") g.devices.camera = "OK"; }
  if (["AUTO", "MANUEL", "FERME"].includes(b.mode)) { g.mode = b.mode; changes.push(`mode ${b.mode}`); }
  if (b.config) {
    const c = b.config;
    g.config = {
      ...DEFAULT_GATE_CONFIG, ...g.config,
      faceThreshold: bounded(c.faceThreshold, 0.5, 0.99, g.config.faceThreshold),
      minAge: bounded(c.minAge, 0, 21, g.config.minAge), maxRisk: bounded(c.maxRisk, 0, 100, g.config.maxRisk),
      eligibility: ["TOUS", "CEDEAO", "LISTE"].includes(c.eligibility) ? c.eligibility : g.config.eligibility, eligibleNats: str(c.eligibleNats ?? g.config.eligibleNats, 200),
      livenessRequired: typeof c.livenessRequired === "boolean" ? c.livenessRequired : g.config.livenessRequired,
      requireVisaCheck: typeof c.requireVisaCheck === "boolean" ? c.requireVisaCheck : g.config.requireVisaCheck,
    };
    changes.push("paramètres");
  }
  if (b.command === "restart") { g.lastHeartbeat = nowIso(); changes.push("redémarrage à distance"); }
  if (b.command === "open") changes.push("ouverture forcée (assistance)");
  await save("gates", gates);
  await audit(user.username, "EGATE_COMMANDE", g.id, changes.join(", "));
  return json(g);
});

on("POST", "/api/apis/manifest", async (req, _p, user) => {
  need(user, "apis");
  const b = await body(req);
  const pax = Array.isArray(b.passengers) ? b.passengers.slice(0, 600).filter((x: any) => x && typeof x === "object") : [];
  if (!str(b.flight) || !pax.length) fail(400, "Vol et passagers requis");
  const d = await loadMany(["watchlist", "rules", "evisas", "settings", "flights", "alerts"]);
  const direction = b.direction === "DEPART" ? "DEPART" : "ARRIVEE";
  const passengers = pax.map((x: any, i: number) => {
    const person = { surname: str(x.surname, 60), given: str(x.given, 80), dob: str(x.dob, 10), nat: str(x.nat, 3).toUpperCase(), issuer: str(x.nat, 3).toUpperCase(), docNo: str(x.docNo, 12).toUpperCase(), expiry: str(x.expiry, 10) || null, sex: str(x.sex, 1) };
    const visa = activeVisa(d.evisas, person.docNo);
    const r = assessRisk(person, { watchlist: d.watchlist, rules: d.rules, direction: direction === "ARRIVEE" ? "ENTREE" : "SORTIE", channel: "APIS", visa: { required: !d.settings.visaExempt.includes(person.nat), status: visa?.status ?? null } });
    return { seat: str(x.seat, 4) || String(i + 1), ...person, pnr: str(x.pnr, 8), score: r.score, level: r.level, factors: r.factors };
  });
  const flight = { id: uid("FL"), flight: str(b.flight, 12).toUpperCase(), carrier: str(b.carrier, 60), direction, posteId: "AIBD", route: str(b.route, 30), eta: str(b.eta, 30) || nowIso(), receivedAt: nowIso(), source: `Chargement manuel (${user.name})`, onTime: true, passengers };
  d.flights.unshift(flight);
  for (const p of passengers.filter((p: any) => p.score >= 35)) {
    d.alerts.unshift({ id: uid("AL"), ts: nowIso(), type: "APIS", title: `APIS : ${alertType(p.factors)[1]}`, severity: severityOf(p.score), crossingId: null, flightId: flight.id, posteId: "AIBD", traveler: `${p.surname} ${p.given}`, docNo: p.docNo, status: "NOUVELLE", assignee: null, resolution: null, history: [{ at: nowIso(), by: "APIS Monitor", text: `Pré-contrôle du vol ${flight.flight}` }] });
  }
  await Promise.all([save("flights", d.flights.slice(0, 200)), save("alerts", d.alerts)]);
  await audit(user.username, "APIS_MANIFESTE", flight.id, `${flight.flight} · ${passengers.length} passagers`);
  return json(flight);
});

on("PATCH", "/api/connectors/:id", async (req, p, user) => {
  need(user, "system");
  const b = await body(req);
  const list = (await load<any[]>("connectors")) || [];
  const c = list.find((x) => x.id === p.id) ?? fail(404, "Connecteur introuvable");
  c.status = b.enabled ? "SIMULÉ" : "DÉSACTIVÉ";
  await save("connectors", list);
  await audit(user.username, b.enabled ? "CONNECTEUR_ACTIVATION" : "CONNECTEUR_DESACTIVATION", c.id);
  return json(decorate([c])[0]);
});
on("POST", "/api/connectors/:id/test", async (_r, p, user) => {
  need(user, "watchlist");
  const c = ((await load<any[]>("connectors")) || []).find((x) => x.id === p.id) ?? fail(404, "Connecteur introuvable");
  const result = await testConnector(c);
  await audit(user.username, "CONNECTEUR_TEST", c.id, result.message);
  return json(result);
});

on("GET", "/api/users", async (_r, _p, user) => {
  need(user, "users");
  return json(((await load<any[]>("users")) || []).map(publicUser));
});
on("POST", "/api/users", async (req, _p, user) => {
  need(user, "users");
  const b = await body(req);
  const username = str(b.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) fail(400, "Identifiant : 3 à 40 caractères (a-z, 0-9, . _ -)");
  if (String(b.password || "").length < 10) fail(400, "Mot de passe : 10 caractères minimum");
  if (!validRole(b.role)) fail(400, "Rôle invalide");
  const users = (await load<any[]>("users")) || [];
  if (users.some((u) => u.username === username)) fail(409, "Identifiant déjà utilisé");
  const u = { id: uid("U"), username, name: str(b.name, 80) || username, role: b.role, posteId: str(b.posteId, 6) || "AIBD", active: true, createdAt: nowIso(), lastLogin: null, ...hashPassword(String(b.password)) };
  users.push(u);
  await save("users", users);
  await audit(user.username, "UTILISATEUR_CREATION", username, b.role);
  return json(publicUser(u));
});
on("PATCH", "/api/users/:id", async (req, p, user) => {
  need(user, "users");
  const b = await body(req);
  const users = (await load<any[]>("users")) || [];
  const u = users.find((x) => x.id === p.id) ?? fail(404, "Utilisateur introuvable");
  if (b.role !== undefined && !validRole(b.role)) fail(400, "Rôle invalide");
  if (u.id === user.id && (b.active === false || (b.role !== undefined && b.role !== "admin"))) fail(400, "Vous ne pouvez pas désactiver ou rétrograder votre propre compte");
  if (b.role !== undefined) u.role = b.role;
  if (typeof b.active === "boolean") u.active = b.active;
  if (b.posteId) u.posteId = str(b.posteId, 6);
  if (b.password) { if (String(b.password).length < 10) fail(400, "Mot de passe : 10 caractères minimum"); Object.assign(u, hashPassword(String(b.password))); }
  await save("users", users);
  await audit(user.username, "UTILISATEUR_MAJ", u.username, Object.keys(b).filter((k) => k !== "password").join(", ") + (b.password ? ", mot de passe" : ""));
  return json(publicUser(u));
});

on("GET", "/api/audit", async (_r, _p, user) => {
  need(user, "read");
  const log = (await load<any[]>("audit")) || [];
  return json({ entries: log.slice(-1000).reverse(), verification: verifyChain(log) });
});

on("POST", "/api/system/reset", async (_r, _p, user) => {
  need(user, "system");
  await ensureSeeded(true);
  await audit(user.username, "REINITIALISATION_DEMO", "toutes collections");
  return json({ ok: true });
});

// ---------- Point d'entrée ----------

function match(pattern: string, path: string) {
  const a = pattern.split("/"), b = path.replace(/\/+$/, "").split("/");
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export default async (req: Request) => {
  const path = new URL(req.url).pathname;
  try {
    await ensureSeeded();
    for (const [method, pattern, handler] of routes) {
      if (method !== req.method) continue;
      const params = match(pattern, path);
      if (params) return await handler(req, params, await currentUser(req));
    }
    return json({ error: "Route inconnue" }, 404);
  } catch (e: any) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Erreur serveur" }, 500);
  }
};

export const config: Config = { path: "/api/*" };
