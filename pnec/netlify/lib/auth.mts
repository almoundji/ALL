// Authentification côté serveur du PNEC.
// - Mots de passe hachés avec scrypt (sel aléatoire par compte), jamais stockés en clair.
// - Session : jeton signé HMAC-SHA256 dans un cookie HttpOnly, Secure, SameSite=Strict.
// - Deux portails étanches : « public » (stagiaires, entreprises) et « agents » (État).
// - Verrouillage du compte après plusieurs échecs, réponses d'erreur génériques.
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getStore } from '@netlify/blobs';
import comptesTest from './test-users.json' with { type: 'json' };

const scrypt = promisify(_scrypt) as (pwd: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const ROLES_PUBLICS = ['stagiaire', 'entreprise'] as const;
export const ROLES_AGENTS = ['admin', 'mfp', 'de', 'primature'] as const;
export type Portail = 'public' | 'agents';

export type Compte = {
  id: string; email: string; nom: string; role: string; orgId?: string;
  sel: string; hash: string; actif?: boolean; creeLe?: string;
};
export type Session = { sub: string; email: string; nom: string; role: string; orgId?: string; portail: Portail; exp: number };

const COOKIE = 'pnec_session';
const DUREE = { public: 8 * 3600, agents: 2 * 3600 }; // les sessions des agents expirent plus vite
const MAX_ECHECS = 5;
const VERROU_MS = 15 * 60 * 1000;

export const env = (k: string): string | undefined =>
  (globalThis as { Netlify?: { env: { get(k: string): string | undefined } } }).Netlify?.env.get(k) ?? process.env[k];

export const portailDuRole = (role: string): Portail => ((ROLES_AGENTS as readonly string[]).includes(role) ? 'agents' : 'public');

// ---------- Stockage serveur (Netlify Blobs) ----------
export type Kv = {
  get(k: string): Promise<unknown>;
  set(k: string, v: unknown, onlyIfNew?: boolean): Promise<boolean>;
  del(k: string): Promise<void>;
  list(prefixe: string): Promise<string[]>;
};
const memoires = new Map<string, Map<string, unknown>>();
export function magasin(nom: string): Kv {
  // PNEC_BLOBS_MEMOIRE=1 : stockage en mémoire pour les tests locaux uniquement.
  if (env('PNEC_BLOBS_MEMOIRE') === '1') {
    if (!memoires.has(nom)) memoires.set(nom, new Map());
    const m = memoires.get(nom)!;
    return {
      get: async (k) => structuredClone(m.get(k) ?? null),
      set: async (k, v, onlyIfNew) => { if (onlyIfNew && m.has(k)) return false; m.set(k, structuredClone(v)); return true; },
      del: async (k) => { m.delete(k); },
      list: async (p) => [...m.keys()].filter((k) => k.startsWith(p)).sort(),
    };
  }
  const store = getStore({ name: nom, consistency: 'strong' });
  return {
    get: (k) => store.get(k, { type: 'json' }),
    set: async (k, v, onlyIfNew) => (await store.setJSON(k, v, onlyIfNew ? { onlyIfNew: true } : {})).modified,
    del: (k) => store.delete(k),
    list: async (p) => (await store.list({ prefix: p })).blobs.map((b) => b.key).sort(),
  };
}
const kv = () => magasin('pnec-comptes');
const cleCompte = (email: string) => `compte/${email.trim().toLowerCase()}`;
const cleVerrou = (email: string) => `verrou/${email.trim().toLowerCase()}`;

export async function trouverCompte(email: string): Promise<Compte | null> {
  const e = email.trim().toLowerCase();
  const enLigne = (await kv().get(cleCompte(e))) as Compte | null;
  if (enLigne) return enLigne;
  return (comptesTest as Compte[]).find((c) => c.email.toLowerCase() === e) ?? null;
}

// ---------- Mots de passe ----------
export async function hacher(motDePasse: string, sel = randomBytes(16)): Promise<{ sel: string; hash: string }> {
  const h = await scrypt(motDePasse.normalize('NFKC'), sel, 32, SCRYPT);
  return { sel: sel.toString('base64'), hash: h.toString('base64') };
}
export async function verifier(motDePasse: string, c: Pick<Compte, 'sel' | 'hash'>): Promise<boolean> {
  const h = await scrypt(motDePasse.normalize('NFKC'), Buffer.from(c.sel, 'base64'), 32, SCRYPT);
  const attendu = Buffer.from(c.hash, 'base64');
  return attendu.length === h.length && timingSafeEqual(h, attendu);
}
export function politiqueMotDePasse(mdp: string): string | null {
  if (typeof mdp !== 'string' || mdp.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.';
  if (!/[a-zA-Z]/.test(mdp) || !/[0-9]/.test(mdp)) return 'Le mot de passe doit contenir des lettres et des chiffres.';
  if (mdp.length > 200) return 'Mot de passe trop long.';
  return null;
}

// ---------- Verrouillage après échecs ----------
export async function estVerrouille(email: string): Promise<boolean> {
  const v = (await kv().get(cleVerrou(email))) as { echecs: number; jusqua: number } | null;
  return Boolean(v && v.jusqua > Date.now());
}
export async function noterEchec(email: string): Promise<void> {
  const k = cleVerrou(email);
  const v = ((await kv().get(k)) as { echecs: number; jusqua: number } | null) ?? { echecs: 0, jusqua: 0 };
  const echecs = v.jusqua && v.jusqua < Date.now() ? 1 : v.echecs + 1;
  await kv().set(k, { echecs, jusqua: echecs >= MAX_ECHECS ? Date.now() + VERROU_MS : 0 });
}
export async function effacerEchecs(email: string): Promise<void> { await kv().del(cleVerrou(email)); }

export async function creerCompte(c: Omit<Compte, 'sel' | 'hash'>, motDePasse: string): Promise<boolean> {
  if ((comptesTest as Compte[]).some((x) => x.email.toLowerCase() === c.email.toLowerCase())) return false;
  const { sel, hash } = await hacher(motDePasse);
  return kv().set(cleCompte(c.email), { ...c, email: c.email.trim().toLowerCase(), sel, hash, actif: true, creeLe: new Date().toISOString() }, true);
}

// ---------- Sessions ----------
function secret(): string {
  const s = env('SESSION_SECRET');
  if (!s || s.length < 32) throw new Error('SESSION_SECRET manquant ou trop court');
  return s;
}
const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const signer = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');

export function creerJeton(c: Compte, portail: Portail): { jeton: string; maxAge: number } {
  const maxAge = DUREE[portail];
  const s: Session = { sub: c.id, email: c.email, nom: c.nom, role: c.role, orgId: c.orgId, portail, exp: Math.floor(Date.now() / 1000) + maxAge };
  const corps = b64(JSON.stringify(s));
  return { jeton: `${corps}.${signer(corps)}`, maxAge };
}

export function lireSession(req: Request): Session | null {
  const brut = req.headers.get('cookie')?.split(/;\s*/).find((x) => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!brut) return null;
  const [corps, sig] = brut.split('.');
  if (!corps || !sig) return null;
  const attendu = Buffer.from(signer(corps));
  const recu = Buffer.from(sig);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;
  try {
    const s = JSON.parse(Buffer.from(corps, 'base64url').toString()) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch { return null; }
}

export const cookieSession = (jeton: string, maxAge: number) =>
  `${COOKIE}=${jeton}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
export const cookieEffacement = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// ---------- Réponses ----------
export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });

// Protection CSRF : les requêtes qui modifient l'état doivent venir du site lui-même, en JSON.
export function origineValide(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host === host && (req.headers.get('content-type') ?? '').includes('application/json'); } catch { return false; }
}

export const publicDe = (c: Compte | Session) => ({
  id: 'sub' in c ? c.sub : c.id, email: c.email, nom: c.nom, role: c.role, orgId: c.orgId,
});
