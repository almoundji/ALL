// API de la Plateforme nationale de l'Artisanat (fonction serverless Netlify, route /api/*).
// Trois espaces : public (sans compte), artisan (jeton obtenu avec numéro + téléphone), administration (compte agent).
import type { Config } from "@netlify/functions";
import {
  ACHETEURS, BESOINS, CATEGORIES_ACTU, createState, FILIERES, FORMATIONS, fold, hashPassword, INSTRUMENTS, isValidPhone, nextId,
  normalizeCni, normalizePhone, now, numeroArtisan, PRESCRIPTIONS, REGIONS, signToken, STATUTS_FONCIERS, STATUTS_JURIDIQUES,
  verifyPassword, verifyToken, type Artisan, type Role, type State, type User,
} from "../lib/data.mts";

const env = (k: string, d = "") => (globalThis as any).Netlify?.env.get(k) ?? process.env[k] ?? d;
const SECRET = () => env("ART_SECRET_KEY", "demo-secret-a-remplacer");
const STORE_KEY = "state-v1";

// ---------- Persistance (Netlify Blobs, mémoire en repli) ----------
let memory: State | null = null;
async function store() {
  if (env("ART_STORAGE") === "memory") return null;
  try { const { getStore } = await import("@netlify/blobs"); return getStore({ name: "artisanat", consistency: "strong" }); } catch { return null; }
}
async function loadState(): Promise<State> {
  const st = await store();
  if (st) { try { const s = (await st.get(STORE_KEY, { type: "json" })) as State | null; if (s) return s; } catch { /* Blobs indisponible */ } }
  if (memory) return memory;
  memory = createState(env("ART_ADMIN_PASSWORD", "admin123"));
  if (st) { try { await st.setJSON(STORE_KEY, memory); } catch { /* ignore */ } }
  return memory;
}
async function saveState(s: State) { memory = s; const st = await store(); if (st) { try { await st.setJSON(STORE_KEY, s); } catch { /* ignore */ } } }

// ---------- HTTP ----------
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const json = (b: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(typeof b === "string" ? b : JSON.stringify(b), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown, d = 0) => { if (v === null || v === undefined || v === "") return d; const n = Number(v); return Number.isFinite(n) ? Math.round(n) : d; };
const required = (o: Record<string, unknown>, keys: string[]) => { const miss = keys.filter((k) => !str(o[k])); if (miss.length) throw new HttpError(422, `Champs obligatoires manquants : ${miss.join(", ")}`); };
const oneOf = (v: string, list: string[], label: string) => { if (!list.includes(v)) throw new HttpError(422, `${label} invalide`); return v; };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const countBy = <T,>(a: T[], f: (x: T) => string) => a.reduce<Record<string, number>>((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});

type Ctx = { s: State; req: Request; url: URL; user?: User; artisan?: Artisan; dirty: boolean };
type Handler = (c: Ctx, p: Record<string, string>, body: any) => unknown | Promise<unknown>;
type Space = "public" | "artisan" | "admin";
const routes: { method: string; re: RegExp; keys: string[]; h: Handler; space: Space; roles?: Role[] }[] = [];
function route(method: string, path: string, space: Space, h: Handler, roles?: Role[]) {
  const keys: string[] = [];
  const re = new RegExp("^" + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$");
  routes.push({ method, re, keys, h, space, roles });
}
const audit = (c: Ctx, action: string, objet: string, details = "") => {
  c.s.audit.push({ id: nextId(c.s), ts: now(), user: c.user?.username || (c.artisan ? c.artisan.numero : "public"), action, objet, details });
  if (c.s.audit.length > 3000) c.s.audit.splice(0, c.s.audit.length - 3000);
  c.dirty = true;
};
const inScope = (c: Ctx, region: string) => !c.user?.region || c.user.region === region;
const artisanById = (c: Ctx, id: number) => { const a = c.s.artisans.find((x) => x.id === id); if (!a || !inScope(c, a.region)) throw new HttpError(404, "Artisan introuvable"); return a; };
const ident = (a?: Artisan) => (a ? { id: a.id, numero: a.numero, nom: a.nom, prenom: a.prenom, metier: a.metier, region: a.region, telephone: a.telephone } : null);

// ---------- Indicateurs ----------
function fonds(s: State) {
  const ressources = sum(s.contributions.map((x) => x.montant));
  const engage = sum(s.financements.filter((f) => f.statut === "accordee" || f.statut === "decaissee").map((f) => f.montant_accorde));
  const decaisse = sum(s.financements.filter((f) => f.statut === "decaissee").map((f) => f.montant_accorde));
  return { ressources, engage, decaisse, disponible: ressources - engage,
    par_source: s.contributions.reduce<Record<string, number>>((o, x) => { o[x.source] = (o[x.source] || 0) + x.montant; return o; }, {}),
    apports_artisans: sum(s.contributions.filter((x) => x.source === "Artisan").map((x) => x.montant)),
    cotisants: new Set(s.contributions.filter((x) => x.artisan_id).map((x) => x.artisan_id)).size };
}
function stats(s: State, region = "") {
  const A = s.artisans.filter((a) => !region || a.region === region);
  const V = A.filter((a) => a.statut === "valide");
  const sites = s.sites.filter((x) => !region || x.region === region);
  const villages = sites.filter((x) => x.type === "village");
  const ids = new Set(A.map((a) => a.id));
  const fin = s.financements.filter((f) => ids.has(f.artisan_id));
  const days: Record<string, number> = {};
  for (const a of A) { const d = a.date_inscription.slice(0, 10); days[d] = (days[d] || 0) + 1; }
  return {
    artisans: { total: A.length, valides: V.length, en_attente: A.filter((a) => a.statut === "en_attente").length, rejetes: A.filter((a) => a.statut === "rejete").length,
      femmes: A.filter((a) => a.sexe === "F").length, apprentis: sum(A.map((a) => a.apprentis)), emplois: sum(A.map((a) => a.employes + 1 + a.apprentis)),
      informels: A.filter((a) => a.statut_juridique === "Informel").length, par_region: countBy(A, (a) => a.region), par_filiere: countBy(A, (a) => a.filiere),
      par_canal: countBy(A, (a) => a.canal), par_jour: Object.fromEntries(Object.entries(days).sort()), besoins: countBy(A.flatMap((a) => a.besoins), (b) => b) },
    commande: { marches_ouverts: s.marches.filter((m) => m.statut === "ouvert").length, montant_ouvert: sum(s.marches.filter((m) => m.statut === "ouvert").map((m) => m.montant)),
      candidatures: s.candidatures.filter((x) => ids.has(x.artisan_id)).length, retenues: s.candidatures.filter((x) => ids.has(x.artisan_id) && x.statut === "retenue").length },
    financement: { ...fonds(s), demandes: fin.length, en_cours: fin.filter((f) => f.statut === "soumise" || f.statut === "instruction").length,
      accordees: fin.filter((f) => f.statut === "accordee" || f.statut === "decaissee").length, montant_demande: sum(fin.map((f) => f.montant_demande)), par_statut: countBy(fin, (f) => f.statut) },
    infrastructures: { chambres: sites.filter((x) => x.type === "chambre").length, villages: villages.length,
      villages_regularises: villages.filter((x) => x.statut_foncier.startsWith("Titre") || x.statut_foncier.startsWith("Bail")).length,
      villages_non_regularises: villages.filter((x) => x.statut_foncier === "Non régularisé").length, degrades: sites.filter((x) => x.etat === "degrade").length,
      budget: sum(sites.map((x) => x.budget)), avancement_moyen: sites.length ? Math.round(sum(sites.map((x) => x.avancement)) / sites.length) : 0, par_foncier: countBy(villages, (x) => x.statut_foncier) },
  };
}

// ---------- Validation d'un dossier d'enrôlement ----------
function readArtisan(b: any): Partial<Artisan> {
  required(b, ["nom", "prenom", "sexe", "date_naissance", "cni", "telephone", "region", "departement", "filiere", "metier", "statut_juridique"]);
  const region = oneOf(str(b.region), Object.keys(REGIONS), "Région");
  const filiere = oneOf(str(b.filiere), Object.keys(FILIERES), "Filière");
  if (!REGIONS[region].includes(str(b.departement))) throw new HttpError(422, "Département invalide pour cette région");
  if (!FILIERES[filiere].includes(str(b.metier))) throw new HttpError(422, "Métier invalide pour cette filière");
  if (!isValidPhone(b.telephone)) throw new HttpError(422, "Numéro de téléphone invalide (format 7X XXX XX XX)");
  const cni = normalizeCni(b.cni); if (cni.length < 10 || cni.length > 17) throw new HttpError(422, "Numéro de pièce d'identité invalide");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.date_naissance))) throw new HttpError(422, "Date de naissance invalide");
  const age = (Date.now() - Date.parse(b.date_naissance)) / (365.25 * 86400_000);
  if (!(age >= 15 && age <= 100)) throw new HttpError(422, "L'âge doit être compris entre 15 et 100 ans");
  if (b.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(b.email))) throw new HttpError(422, "Adresse électronique invalide");
  return {
    nom: str(b.nom, 60).toUpperCase(), prenom: str(b.prenom, 60), sexe: b.sexe === "F" ? "F" : "M", date_naissance: str(b.date_naissance, 10), cni, telephone: normalizePhone(b.telephone),
    email: str(b.email, 120), region, departement: str(b.departement), commune: str(b.commune, 80) || str(b.departement), adresse: str(b.adresse, 160), filiere, metier: str(b.metier),
    enseigne: str(b.enseigne, 120), statut_juridique: oneOf(str(b.statut_juridique), STATUTS_JURIDIQUES, "Statut juridique"), ninea: str(b.ninea, 20),
    formation: FORMATIONS.includes(str(b.formation)) ? str(b.formation) : FORMATIONS[0], annees_experience: Math.max(0, Math.min(80, int(b.annees_experience))),
    apprentis: Math.max(0, Math.min(200, int(b.apprentis))), employes: Math.max(0, Math.min(500, int(b.employes))),
    besoins: Array.isArray(b.besoins) ? b.besoins.filter((x: string) => BESOINS.includes(x)) : [], visible_annuaire: b.visible_annuaire !== false,
    site_id: b.site_id ? int(b.site_id) : null,
  };
}
function ensureUnique(s: State, a: Partial<Artisan>, exceptId = 0) {
  const dup = s.artisans.find((x) => x.id !== exceptId && x.statut !== "rejete" && (x.cni === a.cni || x.telephone === a.telephone));
  if (dup) throw new HttpError(409, `Un dossier existe déjà pour cette pièce d'identité ou ce téléphone (${dup.numero}). Utilisez « Suivre mon dossier ».`);
}

// =================== Espace public ===================
route("GET", "/public/referentiels", "public", () => ({ regions: REGIONS, filieres: FILIERES, statuts_juridiques: STATUTS_JURIDIQUES, formations: FORMATIONS, besoins: BESOINS,
  instruments: INSTRUMENTS, acheteurs: ACHETEURS, statuts_fonciers: STATUTS_FONCIERS, categories: CATEGORIES_ACTU, prescriptions: PRESCRIPTIONS }));
route("GET", "/public/stats", "public", (c) => { const x = stats(c.s); return { ...x, financement: { ...x.financement, par_source: undefined } }; });
route("GET", "/public/actualites", "public", (c) => c.s.actualites.filter((a) => a.publie).sort((a, b) => b.date.localeCompare(a.date)).map(({ contenu, ...a }) => a));
route("GET", "/public/actualites/:id", "public", (c, p) => { const a = c.s.actualites.find((x) => x.id === int(p.id) && x.publie); if (!a) throw new HttpError(404, "Article introuvable"); return a; });
route("GET", "/public/marches", "public", (c) => [...c.s.marches].sort((a, b) => a.statut.localeCompare(b.statut) || a.date_limite.localeCompare(b.date_limite))
  .map((m) => ({ ...m, candidatures: c.s.candidatures.filter((x) => x.marche_id === m.id).length })));
route("GET", "/public/sites", "public", (c) => c.s.sites.map(({ budget, reference_fonciere, observations, ...x }) => x));
route("GET", "/public/annuaire", "public", (c) => {
  const q = fold(c.url.searchParams.get("q") || ""); const region = c.url.searchParams.get("region") || ""; const filiere = c.url.searchParams.get("filiere") || "";
  const rows = c.s.artisans.filter((a) => a.statut === "valide" && a.visible_annuaire && (!region || a.region === region) && (!filiere || a.filiere === filiere)
    && (!q || fold(`${a.prenom} ${a.nom} ${a.metier} ${a.enseigne} ${a.commune}`).includes(q)));
  return { total: rows.length, items: rows.slice(0, 60).map((a) => ({ numero: a.numero, nom: `${a.prenom} ${a.nom.charAt(0)}.`, enseigne: a.enseigne, metier: a.metier, filiere: a.filiere,
    region: a.region, commune: a.commune, annees_experience: a.annees_experience, telephone: a.telephone.replace(/^(\d{2})\d{3}(\d{4})$/, "$1 *** $2") })) };
});
route("POST", "/public/enrolement", "public", (c, _p, b) => {
  if (b.consentement !== true) throw new HttpError(422, "Le consentement au traitement des données est requis");
  const data = readArtisan(b); ensureUnique(c.s, data);
  const a = { ...data, id: nextId(c.s), numero: numeroArtisan(c.s, data.region!), statut: "en_attente", motif: "", canal: "En ligne", date_inscription: now(), date_decision: null, agent: null } as Artisan;
  c.s.artisans.push(a); c.artisan = a; audit(c, "enrolement", a.numero, `${a.prenom} ${a.nom} – ${a.metier}, ${a.region}`);
  return { numero: a.numero, statut: a.statut, token: signToken(SECRET(), { kind: "artisan", id: a.id }, 120) };
});
route("POST", "/public/suivi", "public", (c, _p, b) => {
  const numero = str(b.numero, 40).toUpperCase(); const tel = normalizePhone(b.telephone);
  const a = c.s.artisans.find((x) => x.numero === numero && x.telephone === tel);
  if (!a) throw new HttpError(404, "Aucun dossier ne correspond à ce numéro et à ce téléphone");
  return { token: signToken(SECRET(), { kind: "artisan", id: a.id }, 120) };
});

// =================== Espace artisan ===================
const meView = (c: Ctx) => {
  const a = c.artisan!;
  return { artisan: a, site: c.s.sites.find((x) => x.id === a.site_id) || null,
    candidatures: c.s.candidatures.filter((x) => x.artisan_id === a.id).map((x) => ({ ...x, marche: c.s.marches.find((m) => m.id === x.marche_id) })),
    financements: c.s.financements.filter((f) => f.artisan_id === a.id), contributions: c.s.contributions.filter((x) => x.artisan_id === a.id) };
};
const mustBeValid = (c: Ctx) => { if (c.artisan!.statut !== "valide") throw new HttpError(403, "Votre dossier doit être validé par la Chambre de métiers pour accéder à ce service"); };
route("GET", "/me", "artisan", (c) => meView(c));
route("PATCH", "/me", "artisan", (c, _p, b) => {
  const a = c.artisan!;
  if (b.telephone !== undefined) { if (!isValidPhone(b.telephone)) throw new HttpError(422, "Numéro de téléphone invalide"); const t = normalizePhone(b.telephone); ensureUnique(c.s, { cni: "-", telephone: t }, a.id); a.telephone = t; }
  if (b.email !== undefined) a.email = str(b.email, 120);
  if (b.adresse !== undefined) a.adresse = str(b.adresse, 160);
  if (b.enseigne !== undefined) a.enseigne = str(b.enseigne, 120);
  if (Array.isArray(b.besoins)) a.besoins = b.besoins.filter((x: string) => BESOINS.includes(x));
  if (b.visible_annuaire !== undefined) a.visible_annuaire = !!b.visible_annuaire;
  audit(c, "mise_a_jour_profil", a.numero); return meView(c);
});
route("POST", "/me/candidatures", "artisan", (c, _p, b) => {
  mustBeValid(c); const a = c.artisan!;
  const m = c.s.marches.find((x) => x.id === int(b.marche_id)); if (!m) throw new HttpError(404, "Marché introuvable");
  if (m.statut !== "ouvert" || m.date_limite < now().slice(0, 10)) throw new HttpError(409, "Ce marché n'accepte plus de candidatures");
  if (m.filiere !== a.filiere) throw new HttpError(403, `Marché réservé à la filière « ${m.filiere} »`);
  if (m.region !== "Toutes régions" && m.region !== a.region) throw new HttpError(403, `Marché réservé aux artisans de la région de ${m.region}`);
  if (c.s.candidatures.some((x) => x.marche_id === m.id && x.artisan_id === a.id)) throw new HttpError(409, "Vous avez déjà candidaté à ce marché");
  const montant = int(b.montant); if (montant <= 0 || montant > m.montant) throw new HttpError(422, "Montant de l'offre invalide");
  const k = { id: nextId(c.s), marche_id: m.id, artisan_id: a.id, montant, delai_jours: Math.max(1, Math.min(365, int(b.delai_jours, 30))), note: str(b.note, 1000), statut: "soumise" as const, date: now() };
  c.s.candidatures.push(k); audit(c, "candidature", m.reference, `${montant} FCFA`); return k;
});
route("POST", "/me/financements", "artisan", (c, _p, b) => {
  mustBeValid(c); required(b, ["instrument", "objet", "montant_demande"]);
  const montant = int(b.montant_demande); if (montant < 50_000 || montant > 50_000_000) throw new HttpError(422, "Montant demandé hors limites (50 000 à 50 000 000 FCFA)");
  if (c.s.financements.some((f) => f.artisan_id === c.artisan!.id && (f.statut === "soumise" || f.statut === "instruction"))) throw new HttpError(409, "Une demande est déjà en cours d'instruction");
  const f = { id: nextId(c.s), reference: `FSA-${new Date().getFullYear()}-${String(c.s.financements.length + 1).padStart(5, "0")}`, artisan_id: c.artisan!.id,
    instrument: oneOf(str(b.instrument), INSTRUMENTS, "Instrument"), objet: str(b.objet, 300), montant_demande: montant, apport_personnel: Math.max(0, int(b.apport_personnel)),
    duree_mois: Math.max(3, Math.min(84, int(b.duree_mois, 24))), montant_accorde: 0, statut: "soumise" as const, motif: "", date: now(), date_decision: null };
  c.s.financements.push(f); audit(c, "demande_financement", f.reference, `${montant} FCFA`); return f;
});
route("POST", "/me/contributions", "artisan", (c, _p, b) => {
  mustBeValid(c); const montant = int(b.montant);
  if (montant < 500 || montant > 5_000_000) throw new HttpError(422, "Montant de l'apport invalide (500 à 5 000 000 FCFA)");
  const x = { id: nextId(c.s), artisan_id: c.artisan!.id, source: "Artisan", montant, date: now(), libelle: str(b.libelle, 100) || "Apport solidaire" };
  c.s.contributions.push(x); audit(c, "apport_solidaire", c.artisan!.numero, `${montant} FCFA`); return x;
});

// =================== Administration ===================
route("POST", "/admin/login", "public", (c, _p, b) => {
  const u = c.s.users.find((x) => x.username === str(b.username, 60).toLowerCase() && x.actif);
  if (!u || !verifyPassword(String(b.password || ""), u.password_hash)) { c.s.audit.push({ id: nextId(c.s), ts: now(), user: str(b.username, 60), action: "echec_connexion", objet: "session", details: "" }); c.dirty = true; throw new HttpError(401, "Identifiant ou mot de passe incorrect"); }
  c.user = u; audit(c, "connexion", "session");
  return { token: signToken(SECRET(), { kind: "admin", id: u.id }, 480), user: { username: u.username, nom: u.nom, role: u.role, region: u.region } };
});
route("GET", "/admin/me", "admin", (c) => ({ username: c.user!.username, nom: c.user!.nom, role: c.user!.role, region: c.user!.region }));
route("GET", "/admin/dashboard", "admin", (c) => ({ ...stats(c.s, c.user!.region), derniers: c.s.audit.slice(-8).reverse() }));

// Artisans
route("GET", "/admin/artisans", "admin", (c) => {
  const sp = c.url.searchParams; const q = fold(sp.get("q") || "");
  let rows = c.s.artisans.filter((a) => inScope(c, a.region));
  for (const k of ["statut", "region", "filiere", "canal", "sexe", "statut_juridique"] as const) { const v = sp.get(k); if (v) rows = rows.filter((a) => String(a[k]) === v); }
  if (q) rows = rows.filter((a) => fold(`${a.numero} ${a.prenom} ${a.nom} ${a.telephone} ${a.cni} ${a.metier} ${a.enseigne} ${a.commune}`).includes(q));
  const sort = sp.get("sort") || "-date_inscription"; const dir = sort.startsWith("-") ? -1 : 1; const key = sort.replace(/^-/, "") as keyof Artisan;
  rows = [...rows].sort((x, y) => String(x[key]).localeCompare(String(y[key]), "fr", { numeric: true }) * dir);
  if (sp.get("format") === "csv") {
    const cols: (keyof Artisan)[] = ["numero", "statut", "prenom", "nom", "sexe", "date_naissance", "cni", "telephone", "email", "region", "departement", "commune", "filiere", "metier", "enseigne", "statut_juridique", "ninea", "formation", "annees_experience", "apprentis", "employes", "canal", "date_inscription"];
    const esc = (v: unknown) => { const t = Array.isArray(v) ? v.join(" | ") : String(v ?? ""); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    audit(c, "export_csv", "artisans", `${rows.length} lignes`);
    return new Response("﻿" + [cols.join(";"), ...rows.map((a) => cols.map((k) => esc(a[k])).join(";"))].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=artisans.csv" } });
  }
  const offset = int(sp.get("offset"), 0), limit = Math.min(200, int(sp.get("limit"), 50));
  return { total: rows.length, items: rows.slice(offset, offset + limit) };
});
route("POST", "/admin/artisans", "admin", (c, _p, b) => {
  const data = readArtisan(b); if (!inScope(c, data.region!)) throw new HttpError(403, "Région hors de votre périmètre"); ensureUnique(c.s, data);
  const a = { ...data, id: nextId(c.s), numero: numeroArtisan(c.s, data.region!), statut: "en_attente", motif: "", canal: "Guichet Chambre de métiers", date_inscription: now(), date_decision: null, agent: c.user!.username } as Artisan;
  c.s.artisans.push(a); audit(c, "enrolement_guichet", a.numero); return a;
}, ["admin", "agent"]);
route("GET", "/admin/artisans/:id", "admin", (c, p) => { const a = artisanById(c, int(p.id)); c.artisan = a; audit(c, "consultation", a.numero); c.artisan = undefined;
  return { ...meView({ ...c, artisan: a }), historique: c.s.audit.filter((x) => x.objet === a.numero).slice(-30).reverse(),
    doublons: c.s.artisans.filter((x) => x.id !== a.id && (fold(x.nom) === fold(a.nom) && fold(x.prenom) === fold(a.prenom) && x.date_naissance === a.date_naissance)).map(ident) }; });
route("PATCH", "/admin/artisans/:id", "admin", (c, p, b) => {
  const a = artisanById(c, int(p.id)); const data = readArtisan({ ...a, ...b }); ensureUnique(c.s, data, a.id);
  if (!inScope(c, data.region!)) throw new HttpError(403, "Région hors de votre périmètre");
  Object.assign(a, data); audit(c, "modification", a.numero); return a;
}, ["admin", "agent"]);
route("POST", "/admin/artisans/:id/decision", "admin", (c, p, b) => {
  const a = artisanById(c, int(p.id)); const statut = oneOf(str(b.statut), ["valide", "rejete", "en_attente"], "Décision");
  if (statut === "rejete" && !str(b.motif)) throw new HttpError(422, "Le motif du rejet est obligatoire");
  Object.assign(a, { statut, motif: statut === "rejete" ? str(b.motif, 300) : "", date_decision: now(), agent: c.user!.username });
  audit(c, statut === "valide" ? "validation" : statut === "rejete" ? "rejet" : "reouverture", a.numero, a.motif); return a;
}, ["admin", "agent"]);
route("POST", "/admin/artisans/decision-groupee", "admin", (c, _p, b) => {
  const ids: number[] = Array.isArray(b.ids) ? b.ids.map(Number) : []; let n = 0;
  for (const id of ids) { const a = c.s.artisans.find((x) => x.id === id && x.statut === "en_attente" && inScope(c, x.region)); if (a) { Object.assign(a, { statut: "valide", date_decision: now(), agent: c.user!.username }); n++; audit(c, "validation", a.numero, "groupée"); } }
  return { valides: n };
}, ["admin", "agent"]);

// Marchés et candidatures
route("GET", "/admin/marches", "admin", (c) => c.s.marches.map((m) => ({ ...m, candidatures: c.s.candidatures.filter((x) => x.marche_id === m.id).length, retenues: c.s.candidatures.filter((x) => x.marche_id === m.id && x.statut === "retenue").length })).sort((a, b) => b.id - a.id));
route("GET", "/admin/marches/:id", "admin", (c, p) => { const m = c.s.marches.find((x) => x.id === int(p.id)); if (!m) throw new HttpError(404, "Marché introuvable");
  return { ...m, candidatures: c.s.candidatures.filter((x) => x.marche_id === m.id).map((x) => ({ ...x, artisan: ident(c.s.artisans.find((a) => a.id === x.artisan_id)) })) }; });
const readMarche = (b: any) => {
  required(b, ["intitule", "acheteur", "filiere", "region", "montant", "date_limite"]);
  return { intitule: str(b.intitule, 200), acheteur: oneOf(str(b.acheteur), ACHETEURS, "Acheteur"), filiere: oneOf(str(b.filiere), Object.keys(FILIERES), "Filière"),
    region: str(b.region) === "Toutes régions" ? "Toutes régions" : oneOf(str(b.region), Object.keys(REGIONS), "Région"), description: str(b.description, 2000),
    montant: Math.max(0, int(b.montant)), date_limite: str(b.date_limite, 10), quota_artisans: Math.max(1, int(b.quota_artisans, 20)),
    statut: (["ouvert", "clos", "attribue"].includes(b.statut) ? b.statut : "ouvert") as "ouvert" };
};
route("POST", "/admin/marches", "admin", (c, _p, b) => { const m = { ...readMarche(b), id: nextId(c.s), reference: `MP-ART-${new Date().getFullYear()}-${String(c.s.marches.length + 1).padStart(3, "0")}`, date_publication: now().slice(0, 10) };
  c.s.marches.push(m); audit(c, "publication_marche", m.reference); return m; }, ["admin"]);
route("PATCH", "/admin/marches/:id", "admin", (c, p, b) => { const m = c.s.marches.find((x) => x.id === int(p.id)); if (!m) throw new HttpError(404, "Marché introuvable");
  Object.assign(m, readMarche({ ...m, ...b })); audit(c, "modification_marche", m.reference); return m; }, ["admin"]);
route("POST", "/admin/candidatures/:id/decision", "admin", (c, p, b) => {
  const k = c.s.candidatures.find((x) => x.id === int(p.id)); if (!k) throw new HttpError(404, "Candidature introuvable");
  k.statut = oneOf(str(b.statut), ["soumise", "retenue", "non_retenue"], "Décision") as typeof k.statut;
  const m = c.s.marches.find((x) => x.id === k.marche_id)!; audit(c, "decision_candidature", m.reference, `${k.statut} – artisan #${k.artisan_id}`); return k;
}, ["admin"]);

// Fonds spécial
route("GET", "/admin/financements", "admin", (c) => {
  const st = c.url.searchParams.get("statut") || "";
  return { fonds: fonds(c.s), items: c.s.financements.filter((f) => !st || f.statut === st).map((f) => ({ ...f, artisan: ident(c.s.artisans.find((a) => a.id === f.artisan_id)) }))
    .filter((f) => f.artisan && inScope(c, f.artisan.region)).sort((a, b) => b.id - a.id),
    contributions: c.s.contributions.slice(-50).reverse().map((x) => ({ ...x, artisan: ident(c.s.artisans.find((a) => a.id === x.artisan_id)) })) };
});
route("POST", "/admin/financements/:id/decision", "admin", (c, p, b) => {
  const f = c.s.financements.find((x) => x.id === int(p.id)); if (!f) throw new HttpError(404, "Demande introuvable");
  const statut = oneOf(str(b.statut), ["instruction", "accordee", "rejetee", "decaissee"], "Décision") as typeof f.statut;
  if (statut === "accordee") {
    const m = int(b.montant_accorde, f.montant_demande); if (m <= 0 || m > f.montant_demande) throw new HttpError(422, "Montant accordé invalide");
    if (m > fonds(c.s).disponible + f.montant_accorde) throw new HttpError(409, "Ressources disponibles du Fonds insuffisantes"); f.montant_accorde = m;
  }
  if (statut === "decaissee" && f.statut !== "accordee") throw new HttpError(409, "Seule une demande accordée peut être décaissée");
  if (statut === "rejetee") { if (!str(b.motif)) throw new HttpError(422, "Le motif du rejet est obligatoire"); f.motif = str(b.motif, 300); f.montant_accorde = 0; }
  f.statut = statut; f.date_decision = now(); audit(c, "decision_financement", f.reference, `${statut} ${f.montant_accorde || ""}`); return f;
}, ["admin"]);
route("POST", "/admin/contributions", "admin", (c, _p, b) => {
  required(b, ["source", "montant"]); const x = { id: nextId(c.s), artisan_id: null, source: oneOf(str(b.source), ["État", "Initiatives existantes", "Partenaire"], "Source"), montant: Math.max(1, int(b.montant)), date: now(), libelle: str(b.libelle, 120) };
  c.s.contributions.push(x); audit(c, "abondement_fonds", x.source, `${x.montant} FCFA`); return x;
}, ["admin"]);

// Infrastructures et foncier
route("GET", "/admin/sites", "admin", (c) => c.s.sites.filter((x) => inScope(c, x.region)).map((x) => ({ ...x, artisans: c.s.artisans.filter((a) => a.site_id === x.id).length })));
route("PATCH", "/admin/sites/:id", "admin", (c, p, b) => {
  const x = c.s.sites.find((y) => y.id === int(p.id) && inScope(c, y.region)); if (!x) throw new HttpError(404, "Site introuvable");
  if (b.statut_foncier !== undefined) x.statut_foncier = oneOf(str(b.statut_foncier), STATUTS_FONCIERS, "Statut foncier");
  if (b.etat !== undefined) x.etat = oneOf(str(b.etat), ["bon", "moyen", "degrade"], "État") as typeof x.etat;
  if (b.avancement !== undefined) x.avancement = Math.max(0, Math.min(100, int(b.avancement)));
  if (b.budget !== undefined) x.budget = Math.max(0, int(b.budget));
  for (const k of ["reference_fonciere", "projet", "observations", "echeance"] as const) if (b[k] !== undefined) x[k] = str(b[k], 400);
  audit(c, "mise_a_jour_site", x.nom); return x;
}, ["admin", "agent"]);

// Actualités
route("GET", "/admin/actualites", "admin", (c) => [...c.s.actualites].sort((a, b) => b.date.localeCompare(a.date)));
const readActu = (b: any) => { required(b, ["titre", "chapo", "contenu", "categorie"]);
  return { titre: str(b.titre, 200), chapo: str(b.chapo, 400), contenu: str(b.contenu, 10000), categorie: oneOf(str(b.categorie), CATEGORIES_ACTU, "Catégorie"),
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(b.date)) ? str(b.date) : now().slice(0, 10), publie: !!b.publie, illustration: ["conseil", "recensement", "commande", "financement", "infrastructures", "formation"].includes(b.illustration) ? b.illustration : "conseil" }; };
route("POST", "/admin/actualites", "admin", (c, _p, b) => { const a = { ...readActu(b), id: nextId(c.s), auteur: c.user!.nom }; c.s.actualites.push(a); audit(c, "creation_actualite", `actualité #${a.id}`, a.titre); return a; }, ["admin"]);
route("PATCH", "/admin/actualites/:id", "admin", (c, p, b) => { const a = c.s.actualites.find((x) => x.id === int(p.id)); if (!a) throw new HttpError(404, "Article introuvable");
  Object.assign(a, readActu({ ...a, ...b })); audit(c, "modification_actualite", `actualité #${a.id}`); return a; }, ["admin"]);
route("DELETE", "/admin/actualites/:id", "admin", (c, p) => { const i = c.s.actualites.findIndex((x) => x.id === int(p.id)); if (i < 0) throw new HttpError(404, "Article introuvable");
  c.s.actualites.splice(i, 1); audit(c, "suppression_actualite", `actualité #${p.id}`); return { ok: true }; }, ["admin"]);

// Utilisateurs, audit, réinitialisation
route("GET", "/admin/utilisateurs", "admin", (c) => c.s.users.map(({ password_hash, ...u }) => u), ["admin"]);
route("POST", "/admin/utilisateurs", "admin", (c, _p, b) => {
  required(b, ["username", "nom", "role", "password"]); const username = str(b.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(422, "Identifiant invalide (lettres minuscules, chiffres, . _ -)");
  if (c.s.users.some((u) => u.username === username)) throw new HttpError(409, "Identifiant déjà utilisé");
  if (String(b.password).length < 8) throw new HttpError(422, "Le mot de passe doit comporter au moins 8 caractères");
  const region = str(b.region); if (region && !REGIONS[region]) throw new HttpError(422, "Région invalide");
  const u: User = { id: nextId(c.s), username, nom: str(b.nom, 80), role: oneOf(str(b.role), ["admin", "agent", "lecteur"], "Rôle") as Role, region, password_hash: hashPassword(String(b.password)), actif: true, created_at: now() };
  c.s.users.push(u); audit(c, "creation_utilisateur", username, u.role); const { password_hash, ...pub } = u; return pub;
}, ["admin"]);
route("PATCH", "/admin/utilisateurs/:id", "admin", (c, p, b) => {
  const u = c.s.users.find((x) => x.id === int(p.id)); if (!u) throw new HttpError(404, "Utilisateur introuvable");
  if (u.id === c.user!.id && b.actif === false) throw new HttpError(409, "Vous ne pouvez pas désactiver votre propre compte");
  if (b.actif !== undefined) u.actif = !!b.actif;
  if (b.role !== undefined) u.role = oneOf(str(b.role), ["admin", "agent", "lecteur"], "Rôle") as Role;
  if (b.region !== undefined) { const r = str(b.region); if (r && !REGIONS[r]) throw new HttpError(422, "Région invalide"); u.region = r; }
  if (b.password) { if (String(b.password).length < 8) throw new HttpError(422, "Mot de passe trop court"); u.password_hash = hashPassword(String(b.password)); }
  audit(c, "modification_utilisateur", u.username); const { password_hash, ...pub } = u; return pub;
}, ["admin"]);
route("GET", "/admin/audit", "admin", (c) => c.s.audit.slice(-500).reverse(), ["admin"]);
route("POST", "/admin/reinitialiser", "admin", (c) => { const s = createState(env("ART_ADMIN_PASSWORD", "admin123")); Object.assign(c.s, s); audit(c, "reinitialisation", "base", "Jeu de démonstration rechargé"); return { ok: true }; }, ["admin"]);

// ---------- Point d'entrée ----------
export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/(\.netlify\/functions\/api|api)/, "") || "/";
  const match = routes.map((r) => ({ r, m: r.method === req.method ? path.match(r.re) : null })).find((x) => x.m);
  if (!match) return json({ detail: routes.some((r) => path.match(r.re)) ? "Méthode non autorisée" : "Ressource introuvable" }, routes.some((r) => path.match(r.re)) ? 405 : 404);
  const { r, m } = match;
  try {
    const s = await loadState();
    const c: Ctx = { s, req, url, dirty: false };
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (r.space !== "public") {
      const p = verifyToken(SECRET(), token);
      if (!p || p.kind !== r.space) throw new HttpError(401, "Session expirée, veuillez vous reconnecter");
      if (r.space === "admin") { c.user = s.users.find((u) => u.id === p.id && u.actif); if (!c.user) throw new HttpError(401, "Compte inactif"); }
      else { c.artisan = s.artisans.find((a) => a.id === p.id); if (!c.artisan) throw new HttpError(401, "Dossier introuvable"); }
      const write = req.method !== "GET";
      if (c.user && write && c.user.role === "lecteur") throw new HttpError(403, "Profil en lecture seule");
      if (c.user && r.roles && !r.roles.includes(c.user.role)) throw new HttpError(403, "Droits insuffisants");
    }
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m![i + 1])]));
    const out = await r.h(c, params, body ?? {});
    if (c.dirty || req.method !== "GET") await saveState(s);
    return out instanceof Response ? out : json(out, req.method === "POST" && /enrolement|candidatures$|financements$|contributions$/.test(path) ? 201 : 200);
  } catch (e) {
    if (e instanceof HttpError) { if (e.status === 401 && memory?.audit.at(-1)?.action === "echec_connexion") await saveState(memory); return json({ detail: e.message }, e.status); }
    console.error(e); return json({ detail: "Erreur interne" }, 500);
  }
};

export const config: Config = { path: ["/api/*"] };
