// Noyau métier de Jotna : établissements (locataires du SaaS), payeurs, contrats récurrents, échéances,
// paiements, rapprochement, relances, authentification. Aucune dépendance Netlify ici : testable avec Node seul.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// ---------- Types ----------
export type TenantType = "ecole" | "bailleur" | "salle" | "autre";
export type Plan = "essai" | "actif" | "suspendu";
export type Role = "gestionnaire" | "direction" | "comptable";

export interface Tenant {
  id: string; slug: string; name: string; type: TenantType; alias: string; dueDay: number; city: string;
  plan: Plan; trialEnds: string; createdAt: string; demo: boolean;
  templates: { relance: string; demande: string; recu: string };
}
export interface User { id: string; email: string; name: string; passwordHash: string; role: Role; tenantId: string; createdAt: string }
export interface Payer { id: string; nom: string; tel: string; alias: string; email: string; note: string; createdAt: string }
export interface Contract { id: string; payerId: string; ref: string; label: string; group: string; amount: number; startMonth: string; endMonth: string | null; active: boolean }
export type PaymentStatus = "associe" | "a_verifier" | "ignore";
export interface Payment {
  id: string; date: string; amount: number; channel: string; ref: string; sender: string; label: string;
  contractId: string | null; month: string | null; status: PaymentStatus; motif: string; suggestedContractId: string | null;
  source: "manuel" | "import" | "api"; createdBy: string; createdAt: string;
}
export interface Reminder { id: string; payerId: string; contractId: string; month: string; date: string; channel: string; message: string; status: "envoye"; by: string }
export interface AuditEntry { ts: string; user: string; action: string; details: string }
export interface TenantState { tenant: Tenant; payers: Payer[]; contracts: Contract[]; payments: Payment[]; reminders: Reminder[]; audit: AuditEntry[] }
export interface Index { users: User[]; tenants: { id: string; slug: string; name: string; type: TenantType; plan: Plan; createdAt: string; demo: boolean }[] }

export type InstallmentStatus = "paye" | "partiel" | "retard" | "avenir";
export interface Installment { contractId: string; payerId: string; month: string; due: string; amount: number; paid: number; status: InstallmentStatus; daysLate: number }

// ---------- Utilitaires ----------
export const now = () => new Date().toISOString();
export const uid = () => randomBytes(6).toString("base64url");
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const currentMonth = () => todayISO().slice(0, 7);
export const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
export const normalizePhone = (v: string) => { let d = (v || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("221")) d = d.slice(3); return d; };
export const normalizeAlias = (v: string) => (v || "").trim().toLowerCase().replace(/^alias\s+/, "");
export const fmtAmount = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/\s/g, " ") + " FCFA";
export const addMonths = (month: string, n: number) => { const [y, m] = month.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
export const monthLabel = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }); };
export const dueDate = (month: string, day: number) => { const [y, m] = month.split("-").map(Number); const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export const VOCAB: Record<TenantType, { payer: string; payers: string; contract: string; contracts: string; group: string; amount: string; example: string }> = {
  ecole: { payer: "Parent", payers: "Parents", contract: "Élève", contracts: "Élèves", group: "Classe", amount: "Mensualité", example: "KX" },
  bailleur: { payer: "Locataire", payers: "Locataires", contract: "Logement", contracts: "Logements", group: "Immeuble", amount: "Loyer", example: "LO" },
  salle: { payer: "Adhérent", payers: "Adhérents", contract: "Abonnement", contracts: "Abonnements", group: "Formule", amount: "Cotisation", example: "AB" },
  autre: { payer: "Payeur", payers: "Payeurs", contract: "Contrat", contracts: "Contrats", group: "Groupe", amount: "Échéance", example: "CT" },
};

export const DEFAULT_TEMPLATES = {
  relance: "Bonjour {prenom}, l'échéance de {mois} pour {contrat} ({groupe}) est attendue depuis le {echeance} : {montant}. Vous pouvez payer depuis Wave, Orange Money ou votre banque vers l'alias PI-SPI {alias}, libellé « {ref} ». Merci, {etablissement}.",
  demande: "{etablissement} – {contrat} – {mois} – réf. {ref}",
  recu: "Reçu pour {montant} – {contrat} – {mois}. Merci de votre confiance, {etablissement}.",
};

// ---------- Mots de passe et sessions ----------
export function hashPassword(pwd: string, salt = randomBytes(16).toString("hex")): string { return `${salt}$${scryptSync(pwd, salt, 32).toString("hex")}`; }
export function verifyPassword(pwd: string, stored: string): boolean {
  const [salt, h] = (stored || "").split("$"); if (!salt || !h) return false;
  const cand = scryptSync(pwd, salt, 32); const ref = Buffer.from(h, "hex");
  return cand.length === ref.length && timingSafeEqual(cand, ref);
}
const b64 = (s: string) => Buffer.from(s).toString("base64url");
export function signSession(secret: string, userId: string, days = 30): string {
  const payload = `${b64(userId)}.${Math.floor(Date.now() / 1000) + days * 86400}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function readSession(secret: string, token: string | undefined): string | null {
  if (!token) return null; const [u, exp, sig] = token.split("."); if (!u || !exp || !sig) return null;
  const expected = createHmac("sha256", secret).update(`${u}.${exp}`).digest(); const given = Buffer.from(sig, "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given) || Number(exp) < Date.now() / 1000) return null;
  return Buffer.from(u, "base64url").toString();
}

// ---------- Création d'un établissement ----------
export function createTenant(input: { name: string; type: TenantType; city?: string; alias?: string; dueDay?: number; demo?: boolean }, existingSlugs: string[]): TenantState {
  let slug = slugify(input.name) || "etablissement"; let n = 2; const base = slug;
  while (existingSlugs.includes(slug)) slug = `${base}-${n++}`;
  const trial = new Date(); trial.setDate(trial.getDate() + 30);
  return {
    tenant: { id: uid(), slug, name: input.name.trim(), type: input.type, alias: (input.alias || slug).trim(), dueDay: input.dueDay || 5, city: input.city || "", plan: "essai", trialEnds: trial.toISOString().slice(0, 10), createdAt: now(), demo: Boolean(input.demo), templates: { ...DEFAULT_TEMPLATES } },
    payers: [], contracts: [], payments: [], reminders: [], audit: [],
  };
}
export function audit(s: TenantState, user: string, action: string, details = "") { s.audit.unshift({ ts: now(), user, action, details }); if (s.audit.length > 2000) s.audit.length = 2000; }

// ---------- Références de contrat ----------
export function nextRef(s: TenantState): string {
  const prefix = VOCAB[s.tenant.type].example;
  let n = s.contracts.length + 1; let ref = `${prefix}-${String(n).padStart(4, "0")}`;
  while (s.contracts.some((c) => c.ref === ref)) ref = `${prefix}-${String(++n).padStart(4, "0")}`;
  return ref;
}

// ---------- Échéances ----------
export const contractActiveIn = (c: Contract, month: string) => c.active && c.startMonth <= month && (!c.endMonth || c.endMonth >= month);
export function paidFor(s: TenantState, contractId: string, month: string) { return s.payments.filter((p) => p.status === "associe" && p.contractId === contractId && p.month === month).reduce((a, p) => a + p.amount, 0); }
export function installment(s: TenantState, c: Contract, month: string, today = todayISO()): Installment {
  const due = dueDate(month, s.tenant.dueDay); const paid = paidFor(s, c.id, month);
  let status: InstallmentStatus = paid >= c.amount ? "paye" : paid > 0 ? "partiel" : today > due ? "retard" : "avenir";
  return { contractId: c.id, payerId: c.payerId, month, due, amount: c.amount, paid, status, daysLate: status === "retard" || status === "partiel" ? Math.max(0, daysBetween(due, today)) : 0 };
}
export const installments = (s: TenantState, month: string, today = todayISO()) => s.contracts.filter((c) => contractActiveIn(c, month)).map((c) => installment(s, c, month, today));
export function firstUnpaidMonth(s: TenantState, c: Contract, upTo = currentMonth()): string {
  let m = c.startMonth; while (m < upTo) { if (paidFor(s, c.id, m) < c.amount) return m; m = addMonths(m, 1); } return upTo;
}
export function dashboard(s: TenantState, month: string, today = todayISO()) {
  const list = installments(s, month, today);
  const expected = list.reduce((a, i) => a + i.amount, 0), received = list.reduce((a, i) => a + Math.min(i.paid, i.amount), 0);
  const count = (st: InstallmentStatus) => list.filter((i) => i.status === st).length;
  const dueLate = list.filter((i) => i.status === "retard" || i.status === "partiel").reduce((a, i) => a + i.amount - i.paid, 0);
  const toVerify = s.payments.filter((p) => p.status === "a_verifier").length;
  const monthReminders = s.reminders.filter((r) => r.month === month).length;
  const received30 = s.payments.filter((p) => p.status === "associe" && daysBetween(p.date, today) <= 30).reduce((a, p) => a + p.amount, 0);
  return { month, expected, received, rate: expected ? Math.round((received / expected) * 100) : 0, paye: count("paye"), partiel: count("partiel"), retard: count("retard"), avenir: count("avenir"), dueLate, toVerify, monthReminders, received30, contracts: list.length, payers: s.payers.length, dueDate: dueDate(month, s.tenant.dueDay) };
}

// ---------- Rapprochement ----------
export interface IncomingLine { date: string; amount: number; sender: string; label: string; channel: string; ref: string }
export function matchLine(s: TenantState, line: IncomingLine, upTo = currentMonth()): { contract: Contract | null; month: string | null; status: PaymentStatus; motif: string; suggested: Contract | null } {
  const text = `${line.label} ${line.sender}`.toUpperCase();
  const byRef = s.contracts.find((c) => c.ref && text.includes(c.ref.toUpperCase()));
  if (byRef) {
    if (!contractActiveIn(byRef, upTo) && !s.contracts.some((c) => c.id === byRef.id && c.active)) return { contract: null, month: null, status: "a_verifier", motif: `Référence ${byRef.ref} reconnue mais contrat inactif`, suggested: byRef };
    const month = firstUnpaidMonth(s, byRef, upTo); const rest = byRef.amount - paidFor(s, byRef.id, month);
    if (line.amount <= rest || line.amount === byRef.amount) return { contract: byRef, month, status: "associe", motif: `Référence ${byRef.ref} dans le libellé`, suggested: null };
    return { contract: null, month: null, status: "a_verifier", motif: `Référence ${byRef.ref} reconnue, montant supérieur au reste dû (${fmtAmount(rest)})`, suggested: byRef };
  }
  const alias = normalizeAlias(line.sender); const phone = normalizePhone(line.sender);
  let payer = alias ? s.payers.find((p) => p.alias && normalizeAlias(p.alias) === alias) : undefined;
  let how = "Alias reconnu";
  if (!payer && phone.length >= 9) { payer = s.payers.find((p) => normalizePhone(p.tel) === phone); how = "Numéro reconnu"; }
  if (!payer) {
    const last = (line.sender || "").split(/[\s·.,;:()\-]+/).filter((w) => w.length > 2 && /^[a-zà-ÿ]+$/i.test(w)).pop();
    const sameName = last ? s.payers.filter((p) => p.nom.toUpperCase().includes(last.toUpperCase())) : [];
    const sug = sameName.length === 1 ? s.contracts.find((c) => c.payerId === sameName[0].id && c.active) || null : null;
    return { contract: null, month: null, status: "a_verifier", motif: sameName.length ? `Émetteur inconnu, même nom de famille que ${sameName[0].nom}` : "Émetteur inconnu (ni alias, ni numéro, ni référence)", suggested: sug };
  }
  const contracts = s.contracts.filter((c) => c.payerId === payer!.id && contractActiveIn(c, upTo));
  if (!contracts.length) return { contract: null, month: null, status: "a_verifier", motif: `${how} (${payer.nom}) mais aucun contrat actif`, suggested: null };
  const exact = contracts.filter((c) => { const m = firstUnpaidMonth(s, c, upTo); return c.amount - paidFor(s, c.id, m) === line.amount || c.amount === line.amount; });
  if (exact.length === 1) return { contract: exact[0], month: firstUnpaidMonth(s, exact[0], upTo), status: "associe", motif: how, suggested: null };
  const total = contracts.reduce((a, c) => a + c.amount, 0);
  if (contracts.length > 1 && line.amount === total) return { contract: null, month: null, status: "a_verifier", motif: `${how} (${payer.nom}) : montant égal à ${contracts.length} échéances (fratrie ou plusieurs lots), à répartir`, suggested: contracts[0] };
  if (contracts.length === 1) {
    const c = contracts[0]; const m = firstUnpaidMonth(s, c, upTo);
    if (line.amount < c.amount) return { contract: c, month: m, status: "associe", motif: `${how}, paiement partiel`, suggested: null };
    return { contract: null, month: null, status: "a_verifier", motif: `${how} (${payer.nom}) : montant ${fmtAmount(line.amount)} différent de l'échéance ${fmtAmount(c.amount)}`, suggested: c };
  }
  return { contract: null, month: null, status: "a_verifier", motif: `${how} (${payer.nom}) : plusieurs contrats possibles`, suggested: contracts[0] };
}
export function recordPayment(s: TenantState, line: IncomingLine, source: Payment["source"], by: string, forced?: { contractId: string; month: string }): Payment {
  const dup = s.payments.find((p) => p.ref && line.ref && p.ref === line.ref && p.channel === line.channel);
  if (dup) return dup;
  const m = forced ? { contract: s.contracts.find((c) => c.id === forced.contractId) || null, month: forced.month, status: "associe" as PaymentStatus, motif: "Saisie manuelle", suggested: null } : matchLine(s, line);
  const p: Payment = { id: uid(), date: line.date, amount: line.amount, channel: line.channel, ref: line.ref || `${line.channel.slice(0, 2).toUpperCase()}${Date.now().toString(36).toUpperCase()}`, sender: line.sender, label: line.label, contractId: m.contract?.id || null, month: m.contract ? m.month : null, status: m.status, motif: m.motif, suggestedContractId: m.suggested?.id || null, source, createdBy: by, createdAt: now() };
  s.payments.unshift(p); return p;
}

// ---------- CSV ----------
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const split = (l: string) => { const out: string[] = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((v) => v.trim().replace(/^"|"$/g, "")); };
  const headers = split(lines[0]).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return lines.slice(1).map((l) => { const cells = split(l); const row: Record<string, string> = {}; headers.forEach((h, i) => (row[h] = cells[i] ?? "")); return row; });
}
const pickCol = (row: Record<string, string>, ...names: string[]) => { for (const n of names) { const k = Object.keys(row).find((k) => k === n || k.startsWith(n)); if (k && row[k] !== "") return row[k]; } return ""; };
export const parseAmount = (v: string) => Number(String(v || "0").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) || 0;
export function parseDate(v: string): string {
  const s = (v || "").trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  return todayISO();
}
export function linesFromCSV(text: string, defaultChannel = "Relevé"): IncomingLine[] {
  return parseCSV(text).map((r) => ({
    date: parseDate(pickCol(r, "date", "jour", "created")), amount: parseAmount(pickCol(r, "montant", "amount", "credit", "somme")),
    sender: pickCol(r, "emetteur", "expediteur", "sender", "de", "from", "client", "payeur", "telephone", "numero", "alias"),
    label: pickCol(r, "libelle", "label", "motif", "description", "reference_client", "message"), channel: pickCol(r, "canal", "channel", "operateur") || defaultChannel, ref: pickCol(r, "reference", "ref", "transaction", "id"),
  })).filter((l) => l.amount > 0);
}
export function payersFromCSV(text: string, s: TenantState): { payer: Omit<Payer, "id" | "createdAt">; contract: Omit<Contract, "id" | "payerId" | "ref"> }[] {
  return parseCSV(text).map((r) => {
    const nom = pickCol(r, "parent", "payeur", "locataire", "adherent", "responsable", "nom_parent", "nom"); if (!nom) return null;
    const label = pickCol(r, "eleve", "enfant", "logement", "lot", "abonnement", "contrat", "libelle") || nom;
    return { payer: { nom, tel: pickCol(r, "telephone", "tel", "phone", "mobile", "whatsapp"), alias: pickCol(r, "alias", "alias_pi_spi", "pispi"), email: pickCol(r, "email", "mail"), note: "" },
      contract: { label, group: pickCol(r, "classe", "immeuble", "formule", "groupe", "niveau"), amount: parseAmount(pickCol(r, "montant", "mensualite", "loyer", "cotisation", "tarif")) || 0, startMonth: (pickCol(r, "debut", "depuis", "start") || currentMonth()).slice(0, 7), endMonth: null, active: true } };
  }).filter(Boolean) as any;
}

// ---------- Messages ----------
export function renderTemplate(tpl: string, s: TenantState, c: Contract, p: Payer, month: string, extra: Record<string, string> = {}): string {
  const inst = installment(s, c, month); const rest = Math.max(0, inst.amount - inst.paid);
  const vars: Record<string, string> = { prenom: p.nom.split(" ")[0], nom: p.nom, contrat: c.label, groupe: c.group, mois: monthLabel(month), echeance: inst.due.split("-").reverse().join("/"), montant: fmtAmount(rest || c.amount), alias: s.tenant.alias, ref: c.ref, etablissement: s.tenant.name, ...extra };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
export const waLink = (tel: string, message: string) => { const d = normalizePhone(tel); return d ? `https://wa.me/221${d}?text=${encodeURIComponent(message)}` : ""; };
