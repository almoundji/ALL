// API Jotna en fonction serverless Netlify. Un document JSON par établissement dans Netlify Blobs,
// plus un index (utilisateurs, établissements). En mémoire quand Blobs est indisponible (tests locaux).
import type { Config, Context } from "@netlify/functions";
import {
  audit, createTenant, currentMonth, dashboard, DEFAULT_TEMPLATES, fmtAmount, hashPassword, installment, installments, linesFromCSV,
  monthLabel, nextRef, normalizeAlias, normalizePhone, payersFromCSV, readSession, recordPayment, renderTemplate, signSession, todayISO, uid,
  VOCAB, verifyPassword, waLink, type Contract, type Index, type Payer, type Role, type TenantState, type TenantType, type User,
} from "../lib/core.mts";
import { demoLandlord, demoSchool } from "../lib/seed.mts";

const env = (k: string, d = "") => (globalThis as any).Netlify?.env.get(k) ?? process.env[k] ?? d;
const SECRET = () => env("SESSION_SECRET", "jotna-dev-secret-change-me");
const ADMIN_EMAILS = () => env("ADMIN_EMAILS", "").split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
const COOKIE = "jotna_session";
const DEMO_PASSWORD = () => env("DEMO_PASSWORD", "demo2026");

// ---------- Persistance ----------
const memory = new Map<string, any>();
async function store() {
  try { const { getStore } = await import("@netlify/blobs"); const st = getStore({ name: "jotna", consistency: "strong" }); await st.getMetadata("__ping__"); return st; } catch { return null; }
}
async function load<T>(key: string): Promise<T | null> {
  const st = await store();
  if (st) { try { return (await st.get(key, { type: "json" })) as T | null; } catch { return null; } }
  return (memory.get(key) as T) ?? null;
}
async function save(key: string, value: unknown) { memory.set(key, value); const st = await store(); if (st) await st.setJSON(key, value); }

async function loadIndex(): Promise<Index> {
  let idx = await load<Index>("index");
  if (!idx) {
    idx = { users: [], tenants: [] };
    for (const [state, email, name] of [[demoSchool(), "demo-ecole@jotna.sn", "Mme Diène (démo)"], [demoLandlord(), "demo-bailleur@jotna.sn", "M. Ndour (démo)"]] as [TenantState, string, string][]) {
      idx.tenants.push(summary(state)); idx.users.push({ id: uid(), email, name, passwordHash: hashPassword(DEMO_PASSWORD()), role: "gestionnaire", tenantId: state.tenant.id, createdAt: state.tenant.createdAt });
      await save(`tenant/${state.tenant.id}`, state);
    }
    await save("index", idx);
  }
  return idx;
}
const summary = (s: TenantState) => ({ id: s.tenant.id, slug: s.tenant.slug, name: s.tenant.name, type: s.tenant.type, plan: s.tenant.plan, createdAt: s.tenant.createdAt, demo: s.tenant.demo });
const loadTenant = (id: string) => load<TenantState>(`tenant/${id}`);
const saveTenant = async (s: TenantState, idx?: Index) => { await save(`tenant/${s.tenant.id}`, s); if (idx) { const i = idx.tenants.findIndex((t) => t.id === s.tenant.id); if (i >= 0) idx.tenants[i] = summary(s); await save("index", idx); } };

// ---------- HTTP ----------
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const cookieOf = (req: Request) => req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
const setCookie = (token: string, maxAge = 30 * 86400) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const body = async (req: Request) => { try { return await req.json(); } catch { return {}; } };
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const pub = ({ passwordHash, ...u }: User) => u;
const isAdmin = (u: User) => ADMIN_EMAILS().includes(u.email.toLowerCase());
const requireRole = (u: User, ...roles: Role[]) => { if (!roles.includes(u.role)) throw new HttpError(403, "Droits insuffisants pour cette action"); };
const month = (url: URL) => { const m = url.searchParams.get("month") || currentMonth(); if (!/^\d{4}-\d{2}$/.test(m)) throw new HttpError(400, "Mois invalide"); return m; };

type Ctx = { req: Request; url: URL; idx: Index; user: User; s: TenantState; dirty: boolean; dirtyIndex: boolean };
type Handler = (c: Ctx, p: Record<string, string>) => Promise<unknown> | unknown;
const routes: { method: string; re: RegExp; keys: string[]; h: Handler; auth: boolean }[] = [];
const route = (method: string, path: string, h: Handler, auth = true) => { const keys: string[] = []; routes.push({ method, keys, h, auth, re: new RegExp("^" + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([\\w-]+)"; }) + "/?$") }); };

// ---------- Vue d'un établissement ----------
function enrich(s: TenantState, c: Contract, m: string) {
  const p = s.payers.find((x) => x.id === c.payerId); const inst = installment(s, c, m);
  return { ...c, payer: p ? { id: p.id, nom: p.nom, tel: p.tel, alias: p.alias } : null, installment: inst };
}
const tenantView = (s: TenantState) => ({ ...s.tenant, vocab: VOCAB[s.tenant.type] });

// ---------- Authentification ----------
route("POST", "/api/auth/signup", async (c) => {
  const b = await body(c.req);
  const email = str(b.email).toLowerCase(), password = String(b.password ?? ""), name = str(b.name, 80), establishment = str(b.establishment, 80);
  const type = (["ecole", "bailleur", "salle", "autre"] as TenantType[]).includes(b.type) ? (b.type as TenantType) : "autre";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
  if (password.length < 8) throw new HttpError(400, "Mot de passe : 8 caractères au minimum");
  if (!establishment) throw new HttpError(400, "Indiquez le nom de l'établissement");
  if (c.idx.users.some((u) => u.email === email)) throw new HttpError(409, "Un compte existe déjà avec cette adresse");
  const s = createTenant({ name: establishment, type, city: str(b.city, 60), alias: normalizeAlias(str(b.alias, 60)) || undefined, dueDay: Math.min(28, Math.max(1, Number(b.dueDay) || 5)) }, c.idx.tenants.map((t) => t.slug));
  const user: User = { id: uid(), email, name: name || email.split("@")[0], passwordHash: hashPassword(password), role: "gestionnaire", tenantId: s.tenant.id, createdAt: s.tenant.createdAt };
  audit(s, user.name, "tenant.create", `${establishment} (${type})`);
  c.idx.users.push(user); c.idx.tenants.push(summary(s)); await saveTenant(s); await save("index", c.idx);
  return json({ user: pub(user), tenant: tenantView(s), admin: isAdmin(user) }, 201, { "set-cookie": setCookie(signSession(SECRET(), user.id)) });
}, false);
route("POST", "/api/auth/login", async (c) => {
  const b = await body(c.req); const email = str(b.email).toLowerCase();
  const user = c.idx.users.find((u) => u.email === email);
  if (!user || !verifyPassword(String(b.password ?? ""), user.passwordHash)) { await new Promise((r) => setTimeout(r, 600)); throw new HttpError(401, "E-mail ou mot de passe incorrect"); }
  const s = await loadTenant(user.tenantId); if (!s) throw new HttpError(500, "Établissement introuvable");
  return json({ user: pub(user), tenant: tenantView(s), admin: isAdmin(user) }, 200, { "set-cookie": setCookie(signSession(SECRET(), user.id)) });
}, false);
route("DELETE", "/api/auth/session", () => json({ ok: true }, 200, { "set-cookie": setCookie("", 0) }), false);
route("GET", "/api/auth/me", (c) => ({ user: pub(c.user), tenant: tenantView(c.s), admin: isAdmin(c.user) }));

// ---------- Tableau de bord ----------
route("GET", "/api/dashboard", (c) => { const m = month(c.url); return { ...dashboard(c.s, m), monthLabel: monthLabel(m), trialEnds: c.s.tenant.trialEnds, plan: c.s.tenant.plan }; });

// ---------- Payeurs et contrats ----------
route("GET", "/api/payers", (c) => {
  const m = month(c.url);
  return c.s.payers.map((p) => { const cs = c.s.contracts.filter((x) => x.payerId === p.id); const insts = cs.filter((x) => x.active).map((x) => installment(c.s, x, m));
    const worst = insts.some((i) => i.status === "retard") ? "retard" : insts.some((i) => i.status === "partiel") ? "partiel" : insts.length && insts.every((i) => i.status === "paye") ? "paye" : insts.length ? "avenir" : "aucun";
    const last = c.s.payments.filter((x) => x.status === "associe" && cs.some((k) => k.id === x.contractId)).sort((a, b) => b.date.localeCompare(a.date))[0];
    return { ...p, contracts: cs.map((x) => ({ ...x, installment: installment(c.s, x, m) })), status: worst, due: insts.reduce((a, i) => a + Math.max(0, i.amount - i.paid), 0), lastPayment: last ? { date: last.date, amount: last.amount, channel: last.channel } : null, reminders: c.s.reminders.filter((r) => r.payerId === p.id && r.month === m).length }; });
});
route("POST", "/api/payers", async (c) => {
  requireRole(c.user, "gestionnaire", "direction");
  const b = await body(c.req); const nom = str(b.nom, 80); if (!nom) throw new HttpError(400, "Le nom est obligatoire");
  const p: Payer = { id: uid(), nom, tel: str(b.tel, 30), alias: normalizeAlias(str(b.alias, 60)), email: str(b.email, 80).toLowerCase(), note: str(b.note, 500), createdAt: todayISO() };
  c.s.payers.push(p); audit(c.s, c.user.name, "payer.create", nom);
  if (b.contract && b.contract.label) {
    const amount = Number(b.contract.amount) || 0; if (amount <= 0) throw new HttpError(400, "Montant de l'échéance invalide");
    c.s.contracts.push({ id: uid(), payerId: p.id, ref: nextRef(c.s), label: str(b.contract.label, 80), group: str(b.contract.group, 60), amount, startMonth: /^\d{4}-\d{2}$/.test(b.contract.startMonth) ? b.contract.startMonth : currentMonth(), endMonth: null, active: true });
  }
  c.dirty = true; return json({ ...p, contracts: c.s.contracts.filter((x) => x.payerId === p.id) }, 201);
});
route("PUT", "/api/payers/:id", async (c, { id }) => {
  requireRole(c.user, "gestionnaire", "direction"); const p = c.s.payers.find((x) => x.id === id); if (!p) throw new HttpError(404, "Payeur introuvable");
  const b = await body(c.req);
  if (b.nom !== undefined) p.nom = str(b.nom, 80) || p.nom; if (b.tel !== undefined) p.tel = str(b.tel, 30); if (b.alias !== undefined) p.alias = normalizeAlias(str(b.alias, 60));
  if (b.email !== undefined) p.email = str(b.email, 80).toLowerCase(); if (b.note !== undefined) p.note = str(b.note, 500);
  audit(c.s, c.user.name, "payer.update", p.nom); c.dirty = true; return p;
});
route("DELETE", "/api/payers/:id", (c, { id }) => {
  requireRole(c.user, "gestionnaire"); const p = c.s.payers.find((x) => x.id === id); if (!p) throw new HttpError(404, "Payeur introuvable");
  const cs = c.s.contracts.filter((x) => x.payerId === id);
  if (cs.some((x) => c.s.payments.some((pay) => pay.contractId === x.id))) { cs.forEach((x) => (x.active = false)); audit(c.s, c.user.name, "payer.archive", p.nom); c.dirty = true; return { archived: true }; }
  c.s.contracts = c.s.contracts.filter((x) => x.payerId !== id); c.s.payers = c.s.payers.filter((x) => x.id !== id); audit(c.s, c.user.name, "payer.delete", p.nom); c.dirty = true; return { deleted: true };
});
route("GET", "/api/payers/:id", (c, { id }) => {
  const p = c.s.payers.find((x) => x.id === id); if (!p) throw new HttpError(404, "Payeur introuvable");
  const m = month(c.url); const cs = c.s.contracts.filter((x) => x.payerId === id);
  const months = [-5, -4, -3, -2, -1, 0].map((n) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7); });
  const history = cs.flatMap((x) => months.filter((mm) => x.startMonth <= mm && (!x.endMonth || x.endMonth >= mm)).map((mm) => ({ contractId: x.id, label: x.label, ...installment(c.s, x, mm), monthLabel: monthLabel(mm), paidOn: c.s.payments.filter((pay) => pay.status === "associe" && pay.contractId === x.id && pay.month === mm).map((pay) => pay.date).sort().pop() || null })));
  return { ...p, contracts: cs.map((x) => enrich(c.s, x, m)), history: history.sort((a, b) => b.month.localeCompare(a.month) || a.label.localeCompare(b.label)), payments: c.s.payments.filter((pay) => pay.status === "associe" && cs.some((x) => x.id === pay.contractId)).sort((a, b) => b.date.localeCompare(a.date)), reminders: c.s.reminders.filter((r) => r.payerId === id).sort((a, b) => b.date.localeCompare(a.date)) };
});
route("POST", "/api/payers/import", async (c) => {
  requireRole(c.user, "gestionnaire", "direction"); const b = await body(c.req); const rows = payersFromCSV(String(b.csv ?? ""), c.s);
  if (!rows.length) throw new HttpError(400, "Aucune ligne lisible. Colonnes attendues : nom (ou parent/locataire), telephone, alias, eleve (ou logement/abonnement), classe (ou immeuble/formule), montant");
  let created = 0, merged = 0;
  for (const r of rows) {
    let p = c.s.payers.find((x) => (r.payer.tel && normalizePhone(x.tel) === normalizePhone(r.payer.tel)) || x.nom.toLowerCase() === r.payer.nom.toLowerCase());
    if (!p) { p = { id: uid(), ...r.payer, alias: normalizeAlias(r.payer.alias), createdAt: todayISO() }; c.s.payers.push(p); created++; } else { merged++; if (!p.alias && r.payer.alias) p.alias = normalizeAlias(r.payer.alias); if (!p.tel && r.payer.tel) p.tel = r.payer.tel; }
    if (r.contract.amount > 0 && !c.s.contracts.some((x) => x.payerId === p!.id && x.label.toLowerCase() === r.contract.label.toLowerCase())) c.s.contracts.push({ id: uid(), payerId: p.id, ref: nextRef(c.s), ...r.contract });
  }
  audit(c.s, c.user.name, "payer.import", `${rows.length} lignes, ${created} créés, ${merged} fusionnés`); c.dirty = true; return { rows: rows.length, created, merged, contracts: c.s.contracts.length };
});
route("POST", "/api/contracts", async (c) => {
  requireRole(c.user, "gestionnaire", "direction"); const b = await body(c.req);
  const p = c.s.payers.find((x) => x.id === b.payerId); if (!p) throw new HttpError(404, "Payeur introuvable");
  const amount = Number(b.amount) || 0; if (amount <= 0 || !str(b.label)) throw new HttpError(400, "Libellé et montant obligatoires");
  const k: Contract = { id: uid(), payerId: p.id, ref: nextRef(c.s), label: str(b.label, 80), group: str(b.group, 60), amount, startMonth: /^\d{4}-\d{2}$/.test(b.startMonth) ? b.startMonth : currentMonth(), endMonth: null, active: true };
  c.s.contracts.push(k); audit(c.s, c.user.name, "contract.create", `${k.ref} ${k.label}`); c.dirty = true; return json(k, 201);
});
route("PUT", "/api/contracts/:id", async (c, { id }) => {
  requireRole(c.user, "gestionnaire", "direction"); const k = c.s.contracts.find((x) => x.id === id); if (!k) throw new HttpError(404, "Contrat introuvable"); const b = await body(c.req);
  if (b.label !== undefined) k.label = str(b.label, 80) || k.label; if (b.group !== undefined) k.group = str(b.group, 60); if (b.amount !== undefined && Number(b.amount) > 0) k.amount = Number(b.amount);
  if (b.active !== undefined) { k.active = Boolean(b.active); k.endMonth = k.active ? null : currentMonth(); } if (b.endMonth !== undefined) k.endMonth = b.endMonth || null;
  audit(c.s, c.user.name, "contract.update", k.ref); c.dirty = true; return k;
});

// ---------- Échéances ----------
route("GET", "/api/installments", (c) => { const m = month(c.url); return installments(c.s, m).map((i) => { const k = c.s.contracts.find((x) => x.id === i.contractId)!; const p = c.s.payers.find((x) => x.id === i.payerId); return { ...i, ref: k.ref, label: k.label, group: k.group, payer: p ? { id: p.id, nom: p.nom, tel: p.tel, alias: p.alias } : null }; }); });

// ---------- Paiements et rapprochement ----------
route("GET", "/api/payments", (c) => { const status = c.url.searchParams.get("status"); return c.s.payments.filter((p) => !status || p.status === status).map((p) => { const k = p.contractId ? c.s.contracts.find((x) => x.id === p.contractId) : null; const sg = p.suggestedContractId ? c.s.contracts.find((x) => x.id === p.suggestedContractId) : null; const payer = k ? c.s.payers.find((x) => x.id === k.payerId) : null; return { ...p, contract: k ? { id: k.id, ref: k.ref, label: k.label, payer: payer?.nom } : null, suggested: sg ? { id: sg.id, ref: sg.ref, label: sg.label, payer: c.s.payers.find((x) => x.id === sg.payerId)?.nom } : null }; }); });
route("POST", "/api/payments", async (c) => {
  requireRole(c.user, "gestionnaire", "comptable"); const b = await body(c.req); const amount = Number(b.amount) || 0; if (amount <= 0) throw new HttpError(400, "Montant invalide");
  const k = c.s.contracts.find((x) => x.id === b.contractId); if (!k) throw new HttpError(404, "Contrat introuvable");
  const m = /^\d{4}-\d{2}$/.test(b.month) ? b.month : currentMonth(); const p = c.s.payers.find((x) => x.id === k.payerId)!;
  const pay = recordPayment(c.s, { date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : todayISO(), amount, sender: p.nom, label: `${k.ref} ${m}`, channel: str(b.channel, 30) || "Espèces", ref: str(b.ref, 60) }, "manuel", c.user.name, { contractId: k.id, month: m });
  audit(c.s, c.user.name, "payment.manual", `${fmtAmount(amount)} ${k.ref} ${m}`); c.dirty = true; return json(pay, 201);
});
route("POST", "/api/payments/import", async (c) => {
  requireRole(c.user, "gestionnaire", "comptable"); const b = await body(c.req); const lines = linesFromCSV(String(b.csv ?? ""), str(b.channel, 30) || "Relevé");
  if (!lines.length) throw new HttpError(400, "Aucune ligne lisible. Colonnes attendues : date, montant, emetteur (alias ou numéro), libelle, reference");
  const before = c.s.payments.length; const results = lines.map((l) => recordPayment(c.s, l, "import", c.user.name));
  const added = results.slice(0, c.s.payments.length - before);
  const auto = added.filter((p) => p.status === "associe").length, check = added.filter((p) => p.status === "a_verifier").length;
  audit(c.s, c.user.name, "payment.import", `${lines.length} lignes : ${auto} associées, ${check} à vérifier, ${lines.length - added.length} doublons`); c.dirty = true;
  return { lines: lines.length, auto, toVerify: check, duplicates: lines.length - added.length };
});
route("POST", "/api/payments/:id/assign", async (c, { id }) => {
  requireRole(c.user, "gestionnaire", "comptable"); const p = c.s.payments.find((x) => x.id === id); if (!p) throw new HttpError(404, "Paiement introuvable"); const b = await body(c.req);
  const k = c.s.contracts.find((x) => x.id === b.contractId); if (!k) throw new HttpError(404, "Contrat introuvable");
  const m = /^\d{4}-\d{2}$/.test(b.month) ? b.month : currentMonth(); const split = Number(b.splitAmount) || 0;
  if (split > 0 && split < p.amount) { c.s.payments.unshift({ ...p, id: uid(), amount: p.amount - split, contractId: null, month: null, status: "a_verifier", motif: `Reste de ${p.ref} après affectation de ${fmtAmount(split)}`, suggestedContractId: null, createdAt: todayISO() }); p.amount = split; }
  p.contractId = k.id; p.month = m; p.status = "associe"; p.motif = `Associé manuellement par ${c.user.name}`;
  audit(c.s, c.user.name, "payment.assign", `${p.ref} → ${k.ref} ${m}`); c.dirty = true; return { ...p, installment: installment(c.s, k, m) };
});
route("POST", "/api/payments/:id/ignore", (c, { id }) => { requireRole(c.user, "gestionnaire", "comptable"); const p = c.s.payments.find((x) => x.id === id); if (!p) throw new HttpError(404, "Paiement introuvable"); p.status = "ignore"; p.motif = `Ignoré par ${c.user.name}`; audit(c.s, c.user.name, "payment.ignore", p.ref); c.dirty = true; return p; });
route("DELETE", "/api/payments/:id", (c, { id }) => { requireRole(c.user, "gestionnaire"); const p = c.s.payments.find((x) => x.id === id); if (!p) throw new HttpError(404, "Paiement introuvable"); if (p.source !== "manuel") throw new HttpError(400, "Seule une saisie manuelle peut être supprimée ; une ligne importée s'ignore"); c.s.payments = c.s.payments.filter((x) => x.id !== id); audit(c.s, c.user.name, "payment.delete", p.ref); c.dirty = true; return { deleted: true }; });

// ---------- Relances et demandes de paiement ----------
route("GET", "/api/reminders", (c) => {
  const m = month(c.url);
  return installments(c.s, m).filter((i) => i.status === "retard" || i.status === "partiel").map((i) => { const k = c.s.contracts.find((x) => x.id === i.contractId)!; const p = c.s.payers.find((x) => x.id === i.payerId)!; const msg = renderTemplate(c.s.tenant.templates.relance, c.s, k, p, m); return { ...i, ref: k.ref, label: k.label, group: k.group, payer: { id: p.id, nom: p.nom, tel: p.tel, alias: p.alias }, message: msg, waLink: waLink(p.tel, msg), sent: c.s.reminders.filter((r) => r.contractId === k.id && r.month === m).length }; });
});
route("POST", "/api/reminders", async (c) => {
  requireRole(c.user, "gestionnaire", "direction"); const b = await body(c.req); const m = /^\d{4}-\d{2}$/.test(b.month) ? b.month : currentMonth();
  const items: { contractId: string; message?: string }[] = Array.isArray(b.items) ? b.items : [];
  const out = items.map(({ contractId, message }) => { const k = c.s.contracts.find((x) => x.id === contractId); if (!k) return null; const p = c.s.payers.find((x) => x.id === k.payerId)!; const msg = str(message, 1000) || renderTemplate(c.s.tenant.templates.relance, c.s, k, p, m); const r = { id: uid(), payerId: p.id, contractId: k.id, month: m, date: todayISO(), channel: str(b.channel, 20) || "WhatsApp", message: msg, status: "envoye" as const, by: c.user.name }; c.s.reminders.unshift(r); return { ...r, waLink: waLink(p.tel, msg), payer: p.nom }; }).filter(Boolean);
  audit(c.s, c.user.name, "reminder.send", `${out.length} relances ${m}`); c.dirty = true; return out;
});
route("POST", "/api/requests", async (c) => {
  const b = await body(c.req); const m = /^\d{4}-\d{2}$/.test(b.month) ? b.month : currentMonth(); const ids: string[] = Array.isArray(b.contractIds) ? b.contractIds : [];
  const out = ids.map((id) => { const k = c.s.contracts.find((x) => x.id === id); if (!k) return null; const p = c.s.payers.find((x) => x.id === k.payerId)!; const inst = installment(c.s, k, m); const label = renderTemplate(c.s.tenant.templates.demande, c.s, k, p, m); return { contractId: k.id, ref: k.ref, payer: p.nom, tel: p.tel, alias: p.alias, amount: Math.max(0, inst.amount - inst.paid), beneficiary: c.s.tenant.alias, label, qrText: `PI-SPI|${c.s.tenant.alias}|${Math.max(0, inst.amount - inst.paid)}|${label}`, waLink: waLink(p.tel, `${label} : ${fmtAmount(Math.max(0, inst.amount - inst.paid))} à régler vers l'alias PI-SPI ${c.s.tenant.alias} (libellé « ${k.ref} »).`) }; }).filter(Boolean);
  audit(c.s, c.user.name, "request.prepare", `${out.length} demandes ${m}`); c.dirty = true; return out;
});

// ---------- Reçus ----------
route("GET", "/api/receipts/:id", (c, { id }) => {
  const p = c.s.payments.find((x) => x.id === id && x.status === "associe"); if (!p) throw new HttpError(404, "Reçu introuvable"); const k = c.s.contracts.find((x) => x.id === p.contractId)!; const payer = c.s.payers.find((x) => x.id === k.payerId)!;
  const esc = (v: unknown) => String(v).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reçu ${esc(p.ref)}</title><style>body{font-family:"72",Inter,"Segoe UI",system-ui,sans-serif;color:#32363a;max-width:38rem;margin:2rem auto;padding:0 1rem}h1{font-weight:400;font-size:1.25rem;border-bottom:3px solid #0a6ed1;padding-bottom:.5rem}table{width:100%;border-collapse:collapse;margin:1rem 0}td{padding:.5rem 0;border-bottom:1px solid #d9d9d9}td:first-child{color:#6a6d70;width:40%}.amt{font-size:1.75rem;font-weight:300}.foot{color:#6a6d70;font-size:.8125rem;margin-top:2rem}@media print{.noprint{display:none}}</style></head><body><h1>${esc(c.s.tenant.name)} · Reçu n° ${esc(p.ref)}</h1><p class="amt">${esc(fmtAmount(p.amount))}</p><table><tr><td>Reçu de</td><td>${esc(payer.nom)}</td></tr><tr><td>${esc(VOCAB[c.s.tenant.type].contract)}</td><td>${esc(k.label)}${k.group ? " · " + esc(k.group) : ""} (réf. ${esc(k.ref)})</td></tr><tr><td>Période</td><td>${esc(monthLabel(p.month!))}</td></tr><tr><td>Date du paiement</td><td>${esc(p.date.split("-").reverse().join("/"))}</td></tr><tr><td>Canal</td><td>${esc(p.channel)}</td></tr><tr><td>Référence de transaction</td><td>${esc(p.ref)}</td></tr><tr><td>Reste dû sur la période</td><td>${esc(fmtAmount(Math.max(0, k.amount - c.s.payments.filter((x) => x.status === "associe" && x.contractId === k.id && x.month === p.month).reduce((a, x) => a + x.amount, 0))))}</td></tr></table><p>${esc(renderTemplate(c.s.tenant.templates.recu, c.s, k, payer, p.month!, { montant: fmtAmount(p.amount) }))}</p><p class="foot">Émis par Jotna le ${esc(todayISO().split("-").reverse().join("/"))}. Alias PI-SPI de l'établissement : ${esc(c.s.tenant.alias)}.</p><p class="noprint"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></p></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
});

// ---------- Paramètres, utilisateurs, abonnement ----------
route("GET", "/api/settings", (c) => ({ tenant: tenantView(c.s), users: c.idx.users.filter((u) => u.tenantId === c.s.tenant.id).map(pub), defaults: DEFAULT_TEMPLATES, audit: c.s.audit.slice(0, 50) }));
route("PUT", "/api/settings", async (c) => {
  requireRole(c.user, "gestionnaire", "direction"); const b = await body(c.req); const t = c.s.tenant;
  if (b.name !== undefined) t.name = str(b.name, 80) || t.name; if (b.alias !== undefined) t.alias = normalizeAlias(str(b.alias, 60)) || t.alias; if (b.city !== undefined) t.city = str(b.city, 60);
  if (b.dueDay !== undefined) t.dueDay = Math.min(28, Math.max(1, Number(b.dueDay) || 5)); if (b.type && VOCAB[b.type as TenantType]) t.type = b.type;
  if (b.templates) for (const k of ["relance", "demande", "recu"] as const) if (typeof b.templates[k] === "string" && b.templates[k].trim()) t.templates[k] = str(b.templates[k], 1000);
  audit(c.s, c.user.name, "settings.update"); c.dirty = true; c.dirtyIndex = true; return tenantView(c.s);
});
route("POST", "/api/users", async (c) => {
  requireRole(c.user, "gestionnaire"); const b = await body(c.req); const email = str(b.email).toLowerCase(); const role = (["gestionnaire", "direction", "comptable"] as Role[]).includes(b.role) ? (b.role as Role) : "comptable";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Adresse e-mail invalide"); if (String(b.password ?? "").length < 8) throw new HttpError(400, "Mot de passe : 8 caractères au minimum");
  if (c.idx.users.some((u) => u.email === email)) throw new HttpError(409, "Cette adresse a déjà un compte");
  const u: User = { id: uid(), email, name: str(b.name, 80) || email.split("@")[0], passwordHash: hashPassword(String(b.password)), role, tenantId: c.s.tenant.id, createdAt: todayISO() };
  c.idx.users.push(u); c.dirtyIndex = true; audit(c.s, c.user.name, "user.create", `${email} (${role})`); c.dirty = true; return json(pub(u), 201);
});
route("DELETE", "/api/users/:id", (c, { id }) => { requireRole(c.user, "gestionnaire"); const u = c.idx.users.find((x) => x.id === id && x.tenantId === c.s.tenant.id); if (!u) throw new HttpError(404, "Utilisateur introuvable"); if (u.id === c.user.id) throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte"); c.idx.users = c.idx.users.filter((x) => x.id !== id); c.dirtyIndex = true; audit(c.s, c.user.name, "user.delete", u.email); c.dirty = true; return { deleted: true }; });
route("POST", "/api/demo/reset", async (c) => { if (!c.s.tenant.demo) throw new HttpError(400, "Réinitialisation réservée aux établissements de démonstration"); const fresh = c.s.tenant.type === "bailleur" ? demoLandlord() : demoSchool(); fresh.tenant.id = c.s.tenant.id; fresh.tenant.slug = c.s.tenant.slug; Object.assign(c.s, fresh); c.dirty = true; return { ok: true }; });
route("POST", "/api/demo/load", async (c) => { requireRole(c.user, "gestionnaire"); if (c.s.payers.length) throw new HttpError(400, "Des payeurs existent déjà ; l'exemple ne se charge que dans un établissement vide"); const fresh = c.s.tenant.type === "bailleur" ? demoLandlord() : demoSchool(); c.s.payers = fresh.payers; c.s.contracts = fresh.contracts; c.s.payments = fresh.payments; c.s.reminders = fresh.reminders; audit(c.s, c.user.name, "demo.load", "Données d'exemple chargées"); c.dirty = true; return { payers: c.s.payers.length }; });
route("GET", "/api/export/payments.csv", (c) => {
  const rows = [["date", "montant", "canal", "reference", "emetteur", "libelle", "statut", "contrat_ref", "contrat", "payeur", "mois"].join(";")];
  for (const p of c.s.payments) { const k = p.contractId ? c.s.contracts.find((x) => x.id === p.contractId) : null; const payer = k ? c.s.payers.find((x) => x.id === k.payerId) : null; rows.push([p.date, p.amount, p.channel, p.ref, p.sender, p.label, p.status, k?.ref || "", k?.label || "", payer?.nom || "", p.month || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")); }
  return new Response("﻿" + rows.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="jotna-paiements-${todayISO()}.csv"` } });
});

// ---------- Administration du SaaS ----------
route("GET", "/api/admin/tenants", async (c) => {
  if (!isAdmin(c.user)) throw new HttpError(403, "Réservé à l'administrateur de Jotna");
  const out = [] as any[];
  for (const t of c.idx.tenants) { const s = await loadTenant(t.id); const d = s ? dashboard(s, currentMonth()) : null; out.push({ ...t, trialEnds: s?.tenant.trialEnds, users: c.idx.users.filter((u) => u.tenantId === t.id).length, payers: s?.payers.length ?? 0, contracts: d?.contracts ?? 0, rate: d?.rate ?? 0, expected: d?.expected ?? 0, lastAudit: s?.audit[0]?.ts ?? null }); }
  return out;
});
route("PUT", "/api/admin/tenants/:id", async (c, { id }) => {
  if (!isAdmin(c.user)) throw new HttpError(403, "Réservé à l'administrateur de Jotna"); const b = await body(c.req); const s = await loadTenant(id); if (!s) throw new HttpError(404, "Établissement introuvable");
  if (["essai", "actif", "suspendu"].includes(b.plan)) s.tenant.plan = b.plan; if (b.trialEnds && /^\d{4}-\d{2}-\d{2}$/.test(b.trialEnds)) s.tenant.trialEnds = b.trialEnds;
  audit(s, c.user.name, "admin.plan", `${s.tenant.plan} jusqu'au ${s.tenant.trialEnds}`); await saveTenant(s, c.idx); return summary(s);
});

// ---------- Point d'entrée ----------
export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  try {
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const r = routes.find((x) => x.method === req.method && x.re.test(path)); if (!r) throw new HttpError(404, "Route inconnue");
    const m = path.match(r.re)!; const params: Record<string, string> = {}; r.keys.forEach((k, i) => (params[k] = m[i + 1]));
    const idx = await loadIndex();
    const ctx: Ctx = { req, url, idx, user: null as any, s: null as any, dirty: false, dirtyIndex: false };
    if (r.auth) {
      const uid = readSession(SECRET(), cookieOf(req)); const user = uid ? idx.users.find((u) => u.id === uid) : null;
      if (!user) throw new HttpError(401, "Connectez-vous pour continuer");
      const s = await loadTenant(user.tenantId); if (!s) throw new HttpError(500, "Établissement introuvable");
      if (s.tenant.plan === "suspendu" && req.method !== "GET" && !path.startsWith("/api/auth")) throw new HttpError(402, "Abonnement suspendu : contactez Jotna pour réactiver l'établissement");
      ctx.user = user; ctx.s = s;
    }
    const out = await r.h(ctx, params);
    if (ctx.dirty) await saveTenant(ctx.s, ctx.dirtyIndex ? ctx.idx : undefined); else if (ctx.dirtyIndex) await save("index", ctx.idx);
    return out instanceof Response ? out : json(out);
  } catch (e: any) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Erreur interne : " + (e?.message || "inconnue") }, 500);
  }
};
export const config: Config = { path: "/api/*" };
