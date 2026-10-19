// WawID — moteur partagé navigateur / serveur :
// lecture MRZ (ICAO 9303), correspondance floue sur listes de surveillance,
// règles de ciblage, score de risque explicable et éligibilité eGate / ABC.

export const POSTES = [
  { id: "AIBD", name: "Aéroport Int. Blaise Diagne", type: "Aérien", region: "Thiès" },
  { id: "PDK", name: "Port Autonome de Dakar", type: "Maritime", region: "Dakar" },
  { id: "ROS", name: "Rosso", type: "Terrestre", region: "Saint-Louis" },
  { id: "KID", name: "Kidira", type: "Terrestre", region: "Tambacounda" },
  { id: "KAR", name: "Karang", type: "Terrestre", region: "Fatick" },
  { id: "ZIG", name: "Aéroport de Ziguinchor", type: "Aérien", region: "Ziguinchor" },
];

export const COUNTRIES = {
  SEN: "Sénégal", MLI: "Mali", GIN: "Guinée", CIV: "Côte d'Ivoire", GMB: "Gambie", MRT: "Mauritanie",
  BFA: "Burkina Faso", NGA: "Nigeria", GHA: "Ghana", CMR: "Cameroun", MAR: "Maroc", FRA: "France",
  ESP: "Espagne", BEL: "Belgique", ITA: "Italie", USA: "États-Unis", CHN: "Chine", LBN: "Liban",
  TUR: "Turquie", GBR: "Royaume-Uni", DEU: "Allemagne", CAN: "Canada", BRA: "Brésil", IND: "Inde",
};

// Ressortissants dispensés de visa (CEDEAO + accords bilatéraux) — politique paramétrable côté admin.
export const VISA_EXEMPT = ["SEN", "MLI", "GIN", "CIV", "GMB", "BFA", "NGA", "GHA", "MRT", "MAR", "FRA", "BEL", "ESP", "ITA", "USA", "CAN", "GBR", "DEU", "BRA"];

export const DECISIONS = { AUTORISE: "Autorisé", SECONDAIRE: "Contrôle secondaire", REFUSE: "Refusé" };

// ---------- MRZ ----------

const W = [7, 3, 1];
const charValue = (c) => (c === "<" ? 0 : c >= "0" && c <= "9" ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 55);

export function checkDigit(s) {
  let t = 0;
  for (let i = 0; i < s.length; i++) t += charValue(s[i]) * W[i % 3];
  return String(t % 10);
}

const pad = (s, n) => (s + "<".repeat(n)).slice(0, n);
const clean = (s) => String(s).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9 ]/g, "").trim();
const ymd = (iso) => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);

/** Construit une MRZ de passeport TD3 (2 × 44 caractères). Dates au format AAAA-MM-JJ. */
export function buildTD3({ issuer, surname, given, docNo, nat, dob, sex, expiry, personal = "" }) {
  const name = clean(surname).replace(/ +/g, "<") + "<<" + clean(given).replace(/ +/g, "<");
  const l1 = pad("P<" + issuer + name, 44);
  const doc = pad(clean(docNo).replace(/ /g, ""), 9), per = pad(clean(personal).replace(/ /g, ""), 14);
  const b = ymd(dob), e = ymd(expiry);
  const part = doc + checkDigit(doc) + nat + b + checkDigit(b) + (sex || "<") + e + checkDigit(e) + per + checkDigit(per);
  return l1 + "\n" + part + checkDigit(part.slice(0, 10) + part.slice(13, 20) + part.slice(21, 43));
}

function mrzDate(s, kind) {
  if (!/^\d{6}$/.test(s)) return null;
  const yy = +s.slice(0, 2), mm = +s.slice(2, 4), dd = +s.slice(4, 6);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const nowYY = new Date().getUTCFullYear() % 100;
  const century = kind === "dob" ? (yy > nowYY ? 1900 : 2000) : 2000;
  return `${century + yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Analyse une MRZ TD3 (passeport) ou TD1 (carte d'identité, 3 × 30). */
export function parseMRZ(text) {
  const lines = String(text || "").toUpperCase().replace(/[ \t\r]/g, "").split("\n").filter(Boolean);
  if (!/^[A-Z0-9<]*$/.test(lines.join(""))) return { ok: false, error: "Caractères non autorisés dans la MRZ." };
  if (lines.length === 2 && lines.every((l) => l.length === 44)) return parseTD3(lines);
  if (lines.length === 3 && lines.every((l) => l.length === 30)) return parseTD1(lines);
  return { ok: false, error: "Format attendu : passeport TD3 (2 lignes de 44) ou carte TD1 (3 lignes de 30)." };
}

function names(field) {
  const [sn, ...rest] = field.split("<<");
  return { surname: sn.replace(/</g, " ").trim(), given: rest.join(" ").replace(/</g, " ").replace(/\s+/g, " ").trim() };
}

function finish(base, checks) {
  const dob = mrzDate(base.dobRaw, "dob"), expiry = mrzDate(base.expiryRaw, "exp");
  if (!dob) checks.push({ label: "Date de naissance lisible", ok: false });
  if (!expiry) checks.push({ label: "Date d'expiration lisible", ok: false });
  const { dobRaw, expiryRaw, ...rest } = base;
  return { ok: true, ...rest, dob, expiry, checks, checksOk: checks.every((c) => c.ok) };
}

function parseTD3([a, b]) {
  if (a[0] !== "P") return { ok: false, error: "La ligne 1 d'un passeport commence par « P »." };
  const per = b.slice(28, 42);
  const checks = [
    { label: "Numéro de document", ok: checkDigit(b.slice(0, 9)) === b[9] },
    { label: "Date de naissance", ok: checkDigit(b.slice(13, 19)) === b[19] },
    { label: "Date d'expiration", ok: checkDigit(b.slice(21, 27)) === b[27] },
    { label: "Données personnelles", ok: checkDigit(per) === b[42] || (/^<+$/.test(per) && b[42] === "<") },
    { label: "Contrôle composite", ok: checkDigit(b.slice(0, 10) + b.slice(13, 20) + b.slice(21, 43)) === b[43] },
  ];
  return finish({
    format: "TD3", docType: "Passeport", issuer: a.slice(2, 5).replace(/</g, ""), ...names(a.slice(5)),
    docNo: b.slice(0, 9).replace(/</g, ""), nat: b.slice(10, 13).replace(/</g, ""),
    dobRaw: b.slice(13, 19), sex: b[20] === "<" ? "X" : b[20], expiryRaw: b.slice(21, 27),
  }, checks);
}

function parseTD1([a, b, c]) {
  const checks = [
    { label: "Numéro de document", ok: checkDigit(a.slice(5, 14)) === a[14] },
    { label: "Date de naissance", ok: checkDigit(b.slice(0, 6)) === b[6] },
    { label: "Date d'expiration", ok: checkDigit(b.slice(8, 14)) === b[14] },
    { label: "Contrôle composite", ok: checkDigit(a.slice(5, 30) + b.slice(0, 7) + b.slice(8, 15) + b.slice(18, 29)) === b[29] },
  ];
  return finish({
    format: "TD1", docType: "Carte d'identité", issuer: a.slice(2, 5).replace(/</g, ""), ...names(c),
    docNo: a.slice(5, 14).replace(/</g, ""), nat: b.slice(15, 18).replace(/</g, ""),
    dobRaw: b.slice(0, 6), sex: b[7] === "<" ? "X" : b[7], expiryRaw: b.slice(8, 14),
  }, checks);
}

// ---------- Correspondance floue ----------

export const normName = (s) => clean(s || "").replace(/\s+/g, " ");

export function jaroWinkler(s1, s2) {
  if (s1 === s2) return s1 ? 1 : 0;
  if (!s1 || !s2) return 0;
  const range = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const m1 = new Array(s1.length).fill(false), m2 = new Array(s2.length).fill(false);
  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(s2.length, i + range + 1); j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = m2[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  const jaro = (matches / s1.length + matches / s2.length + (matches - t / 2) / matches) / 3;
  let p = 0;
  while (p < 4 && s1[p] && s1[p] === s2[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}

/** Similarité de noms insensible à l'ordre (nom/prénoms inversés) et aux accents. */
export function nameSimilarity(a, b) {
  const x = normName(a), y = normName(b);
  const sorted = (s) => s.split(" ").sort().join(" ");
  return Math.max(jaroWinkler(x, y), jaroWinkler(sorted(x), sorted(y)));
}

/** Recherche un voyageur dans la liste de surveillance (biographique + documents SLTD). */
export function screenWatchlist(p, watchlist) {
  const hits = [];
  const full = `${p.surname} ${p.given}`;
  for (const w of watchlist || []) {
    if (w.active === false) continue;
    if (w.kind === "document") {
      if (w.docNo && normName(w.docNo) === normName(p.docNo)) hits.push({ entry: w, score: 1, basis: "Numéro de document" });
      continue;
    }
    let score = nameSimilarity(full, `${w.surname} ${w.given}`);
    const dobMatch = w.dob && p.dob && w.dob === p.dob;
    if (dobMatch) score = Math.min(1, score + 0.06);
    if (w.dob && p.dob && !dobMatch) score -= 0.08;
    if (score >= 0.9) hits.push({ entry: w, score: +score.toFixed(3), basis: dobMatch ? "Nom + date de naissance" : "Nom (approché)" });
  }
  return hits.sort((a, b) => b.score - a.score);
}

// ---------- Règles de ciblage (TMS) ----------

export const RULE_FIELDS = {
  nat: { label: "Nationalité", type: "list" },
  issuer: { label: "État émetteur", type: "list" },
  origin: { label: "Provenance / destination", type: "list" },
  age: { label: "Âge", type: "number" },
  sex: { label: "Sexe", type: "list" },
  direction: { label: "Sens", type: "list" },
  channel: { label: "Canal", type: "list" },
  crossings30d: { label: "Passages sur 30 jours", type: "number" },
  docValidityDays: { label: "Validité restante du document (jours)", type: "number" },
};
export const RULE_OPS = { in: "est parmi", nin: "n'est pas parmi", gt: "supérieur à", lt: "inférieur à" };

export function ageAt(dob, now = new Date()) {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00Z");
  let a = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) a--;
  return a;
}

const daysUntil = (iso, now) => (iso ? Math.floor((new Date(iso + "T00:00:00Z") - now) / 86400000) : null);

function ruleMatches(rule, facts) {
  return (rule.conditions || []).length > 0 && rule.conditions.every(({ field, op, value }) => {
    const v = facts[field];
    if (v === null || v === undefined) return false;
    const list = String(value).toUpperCase().split(/[,;\s]+/).filter(Boolean);
    if (op === "in") return list.includes(String(v).toUpperCase());
    if (op === "nin") return !list.includes(String(v).toUpperCase());
    if (op === "gt") return Number(v) > Number(value);
    if (op === "lt") return Number(v) < Number(value);
    return false;
  });
}

// ---------- Évaluation du risque ----------

export const LEVELS = [
  { max: 29, id: "FAIBLE", label: "Faible", tone: "good" },
  { max: 59, id: "MODERE", label: "Modéré", tone: "warning" },
  { max: 100, id: "ELEVE", label: "Élevé", tone: "critical" },
];
export const levelOf = (score) => LEVELS.find((l) => score <= l.max);

/**
 * Score de risque explicable 0–100 : chaque facteur est listé avec ses points.
 * p : identité issue de la MRZ ; ctx : { watchlist, rules, faceScore, liveness, irisScore,
 *        crossings30d, visa, origin, direction, channel, now, faceThreshold }
 */
export function assessRisk(p, ctx = {}) {
  const now = ctx.now ? new Date(ctx.now) : new Date();
  const factors = [];
  const add = (code, label, points, detail = "", extra = {}) => factors.push({ code, label, points, detail, ...extra });
  let critical = false;

  for (const h of screenWatchlist(p, ctx.watchlist)) {
    const w = h.entry;
    if (w.kind === "document") {
      critical = true;
      add("SLTD", "Document signalé perdu / volé", 85, `${w.list} — ${w.reason || "signalement"}`);
    } else {
      const pts = { critique: 80, haute: 60, moyenne: 35, basse: 15 }[w.severity] ?? 40;
      if (w.severity === "critique") critical = true;
      add("WATCHLIST", `Correspondance ${w.list}`, pts, `${w.surname} ${w.given} · ${h.basis} · similarité ${(h.score * 100).toFixed(0)} %`);
    }
  }

  // Puce sans contact (ICAO 9303 partie 10/11) : authentification passive et cohérence avec la MRZ imprimée.
  if (ctx.chip) {
    if (ctx.chip.read === false) add("PUCE_ABSENTE", "Puce non lue (lecture NFC impossible)", 10, "Vérification manuelle des sécurités physiques");
    else {
      if (ctx.chip.passiveAuth === false) add("PUCE_PA", "Authentification passive de la puce échouée", 60, "Signature du SOD invalide : document falsifié ou puce clonée");
      if (ctx.chip.dg1Match === false) add("PUCE_MRZ", "Données de la puce différentes de la MRZ imprimée", 60, "Page biographique altérée");
    }
  }

  if (p.checks && !p.checksOk) add("MRZ", "Chiffres de contrôle MRZ invalides", 40, p.checks.filter((c) => !c.ok).map((c) => c.label).join(", "));
  const validity = daysUntil(p.expiry, now);
  if (validity !== null && validity < 0) add("EXPIRE", "Document expiré", 35, `expiré depuis ${-validity} j`);
  else if (validity !== null && validity < 90) add("EXPIRE_PROCHE", "Document proche de l'expiration", 5, `${validity} j restants`);

  const threshold = ctx.faceThreshold ?? 0.8;
  if (typeof ctx.faceScore === "number") {
    if (ctx.faceScore < threshold) add("FACE", "Correspondance faciale insuffisante", 40, `score ${(ctx.faceScore * 100).toFixed(1)} % < seuil ${(threshold * 100).toFixed(0)} %`);
    else if (ctx.faceScore < threshold + 0.07) add("FACE_LIMITE", "Correspondance faciale limite", 10, `score ${(ctx.faceScore * 100).toFixed(1)} %`);
  }
  if (ctx.liveness === false) add("LIVENESS", "Détection du vivant échouée (suspicion d'usurpation)", 50);
  // Attaques de présentation / d'injection (ISO/IEC 30107-3), à la manière des moteurs eKYC (ex. ZOLOZ).
  const PAD = { masque: "masque 3D", ecran: "rejeu sur écran", impression: "photo imprimée", deepfake: "deepfake / injection vidéo" };
  if (ctx.attack && PAD[ctx.attack]) add("ATTAQUE", `Attaque de présentation détectée : ${PAD[ctx.attack]}`, 60);
  // Réutilisation d'identité : même document avec une autre identité, ou même personne avec plusieurs documents.
  if (ctx.identity?.docOtherIdentity) add("DOC_REUTILISE", "Document déjà présenté sous une autre identité", 70, ctx.identity.docOtherIdentity);
  if (ctx.identity?.otherDocs > 0) add("MULTI_DOCS", "Même identité présentée avec plusieurs documents", 15, `${ctx.identity.otherDocs} autre(s) document(s) sur 90 jours`);
  if (typeof ctx.irisScore === "number" && ctx.irisScore < 0.8) add("IRIS", "Correspondance iris insuffisante", 25, `score ${(ctx.irisScore * 100).toFixed(1)} %`);

  if (ctx.visa && ctx.visa.required && ctx.direction !== "SORTIE") {
    if (!ctx.visa.status) add("VISA", "Aucune autorisation de voyage (e-Visa) valide", 30);
    else if (ctx.visa.status !== "APPROUVEE") add("VISA", `e-Visa non valide (${ctx.visa.status})`, 30);
  }

  const age = ageAt(p.dob, now);
  if (age !== null && age < 18) add("MINEUR", "Voyageur mineur — vérifier l'autorisation de sortie", 5, `${age} ans`);

  const facts = {
    nat: p.nat, issuer: p.issuer, sex: p.sex, age, origin: ctx.origin, direction: ctx.direction,
    channel: ctx.channel, crossings30d: ctx.crossings30d ?? 0, docValidityDays: validity,
  };
  for (const r of ctx.rules || []) if (r.enabled && ruleMatches(r, facts)) add("REGLE", `Règle de ciblage : ${r.name}`, Number(r.points) || 0, "", { ruleId: r.id });

  const score = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  const level = levelOf(score);
  const recommendation = critical || score >= 80 ? "REFUSE" : score >= 30 ? "SECONDAIRE" : "AUTORISE";
  const fraud = factors.some((f) => ["SLTD", "MRZ", "LIVENESS", "FACE", "PUCE_PA", "PUCE_MRZ", "ATTAQUE", "DOC_REUTILISE"].includes(f.code));
  return { score, level: level.id, levelLabel: level.label, tone: level.tone, recommendation, critical, fraud, factors };
}

// ---------- eGate / ABC ----------

export const DEFAULT_GATE_CONFIG = {
  faceThreshold: 0.82, livenessRequired: true, minAge: 18, eligibility: "TOUS", // TOUS | CEDEAO | LISTE
  eligibleNats: "", maxRisk: 29, requireVisaCheck: true, maxSessionSec: 45,
};
const ECOWAS = ["SEN", "MLI", "GIN", "CIV", "GMB", "BFA", "NGA", "GHA", "BEN", "TGO", "NER", "LBR", "SLE", "GNB", "CPV"];

/** Décision d'une eGate : OUVERTURE ou ORIENTATION vers un guichet, avec motif. */
export function gateDecision(p, risk, cfg = DEFAULT_GATE_CONFIG, now = new Date()) {
  const deny = (code, message) => ({ outcome: "ORIENTATION", code, message });
  if (!p.ok) return deny("ILLISIBLE", "Document illisible — veuillez vous présenter au guichet.");
  if (!p.checksOk) return deny("MRZ", "Le document n'a pas pu être authentifié.");
  const age = ageAt(p.dob, now);
  if (age !== null && age < cfg.minAge) return deny("AGE", "Les voyageurs mineurs sont traités au guichet.");
  if (cfg.eligibility === "CEDEAO" && !ECOWAS.includes(p.nat)) return deny("ELIGIBILITE", "Nationalité non éligible au passage automatisé.");
  if (cfg.eligibility === "LISTE" && !String(cfg.eligibleNats).toUpperCase().split(/[,;\s]+/).includes(p.nat)) return deny("ELIGIBILITE", "Nationalité non éligible au passage automatisé.");
  if (risk.factors.some((f) => f.code.startsWith("PUCE"))) return deny("PUCE", "La puce de votre passeport n'a pas pu être vérifiée.");
  if (risk.factors.some((f) => ["ATTAQUE", "DOC_REUTILISE"].includes(f.code))) return deny("FRAUDE", "Contrôle complémentaire requis — un agent va vous accompagner.");
  if (risk.factors.some((f) => f.code === "LIVENESS")) return deny("LIVENESS", "Vérification biométrique impossible.");
  if (risk.factors.some((f) => f.code === "FACE")) return deny("FACE", "Votre visage ne correspond pas suffisamment à la photo du document.");
  if (risk.factors.some((f) => f.code === "EXPIRE")) return deny("EXPIRE", "Document expiré.");
  if (cfg.requireVisaCheck && risk.factors.some((f) => f.code === "VISA")) return deny("VISA", "Autorisation de voyage introuvable.");
  if (risk.score > cfg.maxRisk) return deny("RISQUE", "Contrôle complémentaire requis — un agent va vous accompagner.");
  return { outcome: "OUVERTURE", code: "OK", message: "Bon voyage ! Les portes s'ouvrent." };
}

// ---------- Utilitaires ----------

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Score facial de démonstration : en production il est fourni par le SDK biométrique du terminal. */
export function simulatedBiometric(seedText, base = 0.9) {
  const r = prng(hashString(seedText))();
  return +Math.min(0.995, Math.max(0.3, base + (r - 0.5) * 0.12)).toFixed(3);
}

/** Type et intitulé d'alerte déduits des facteurs de risque (Threat Monitor). */
export function alertType(factors) {
  const find = (code) => factors.find((f) => f.code === code);
  if (find("SLTD")) return ["SLTD", "Document signalé perdu / volé"];
  if (find("WATCHLIST")) return ["WATCHLIST", find("WATCHLIST").label];
  if (find("DOC_REUTILISE")) return ["FRAUDE_DOC", "Document réutilisé sous une autre identité"];
  if (find("ATTAQUE")) return ["FRAUDE_BIO", find("ATTAQUE").label];
  if (find("PUCE_PA") || find("PUCE_MRZ")) return ["FRAUDE_DOC", "Puce électronique invalide (document falsifié)"];
  if (find("LIVENESS") || find("FACE")) return ["FRAUDE_BIO", "Suspicion d'usurpation d'identité (biométrie)"];
  if (find("MRZ")) return ["FRAUDE_DOC", "Document suspect (MRZ)"];
  if (find("EXPIRE")) return ["DOCUMENT", "Document expiré présenté"];
  if (find("REGLE")) return ["REGLE", find("REGLE").label];
  if (find("VISA")) return ["VISA", "Entrée sans autorisation de voyage"];
  return ["RISQUE", "Score de risque élevé"];
}
export const severityOf = (score) => (score >= 80 ? "critique" : score >= 60 ? "haute" : "moyenne");
