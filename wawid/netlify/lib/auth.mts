// Comptes (mots de passe scrypt), session signée HMAC en cookie HttpOnly, rôles et permissions.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { load, save } from "./store.mts";

const COOKIE = "wawid_session";
const MAX_AGE = 12 * 3600; // une vacation

export const env = (k: string): string | undefined => (globalThis as any).Netlify?.env.get(k) ?? process.env[k];

function secret(): string {
  const s = env("SESSION_SECRET");
  if (s) return s;
  if ((globalThis as any).Netlify) throw new Error("SESSION_SECRET non configuré");
  return "dev-only-secret";
}

export const ROLES: Record<string, { label: string; perms: string[] }> = {
  agent: { label: "Agent de contrôle", perms: ["read", "control", "alerts", "cases"] },
  analyste: { label: "Analyste renseignement", perms: ["read", "alerts", "cases", "watchlist", "rules", "apis", "evisa"] },
  superviseur: { label: "Superviseur", perms: ["read", "control", "alerts", "cases", "watchlist", "rules", "apis", "evisa", "gates"] },
  admin: { label: "Administrateur", perms: ["read", "control", "alerts", "cases", "watchlist", "rules", "apis", "evisa", "gates", "users", "system"] },
};

export const hashPassword = (password: string, salt = randomBytes(16).toString("hex")) =>
  ({ salt, hash: scryptSync(password, salt, 32).toString("hex") });

function passwordMatches(user: any, password: string) {
  const { hash } = hashPassword(password, user.salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.hash, "hex"));
}

/** Crée les comptes initiaux à partir des variables d'environnement si aucun compte n'existe. */
async function bootstrapUsers(): Promise<any[]> {
  const users = (await load<any[]>("users")) || [];
  if (users.length) return users;
  const adminPwd = env("WAWID_ADMIN_PASSWORD") || ((globalThis as any).Netlify ? undefined : "admin");
  if (!adminPwd) return [];
  const mk = (username: string, name: string, role: string, pwd: string, posteId = "AIBD") =>
    ({ id: `U-${username}`, username, name, role, posteId, active: true, createdAt: new Date().toISOString(), lastLogin: null, ...hashPassword(pwd) });
  const created = [mk("admin", "Administrateur WawID", "admin", adminPwd)];
  const demo = env("WAWID_DEMO_PASSWORD") || ((globalThis as any).Netlify ? undefined : "demo");
  if (demo) created.push(
    mk("agent", "Awa Ndiaye", "agent", demo), mk("analyste", "Moussa Diallo", "analyste", demo), mk("superviseur", "Fatou Sarr", "superviseur", demo),
  );
  await save("users", created);
  return created;
}

export const publicUser = ({ salt, hash, ...u }: any) => ({ ...u, roleLabel: ROLES[u.role]?.label, perms: ROLES[u.role]?.perms ?? [] });

export async function login(username: string, password: string) {
  const users = await bootstrapUsers();
  const user = users.find((u) => u.username === username.trim().toLowerCase() && u.active);
  if (!user || !passwordMatches(user, password)) return null;
  user.lastLogin = new Date().toISOString();
  await save("users", users);
  return user;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function sessionCookie(userId: string): string {
  const payload = `${Buffer.from(userId).toString("base64url")}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}
export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function currentUser(req: Request): Promise<any | null> {
  const raw = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [uid, exp, sig] = raw.split(".");
  if (!uid || !exp || !sig) return null;
  const expected = sign(`${uid}.${exp}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) || Number(exp) < Date.now() / 1000) return null;
  const id = Buffer.from(uid, "base64url").toString();
  const user = ((await load<any[]>("users")) || []).find((u) => u.id === id && u.active);
  return user ? publicUser(user) : null;
}

/** Les eGates / kiosques s'authentifient par clé d'équipement (en-tête X-Gate-Key). */
export function gateKeyValid(req: Request): boolean {
  const key = env("WAWID_GATE_KEY") || ((globalThis as any).Netlify ? "" : "dev-gate-key");
  const given = req.headers.get("x-gate-key") || "";
  if (!key || given.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(key));
}

/** Jeton signé (e-Visa, WawPass) présenté sous forme de QR code et vérifiable à la frontière. */
export const signToken = (kind: string, ref: string) => `${kind}.${ref}.${sign(`${kind}.${ref}`).slice(0, 16)}`;
export function verifyToken(token: string): { kind: string; ref: string } | null {
  const [kind, ref, sig] = String(token).trim().split(".");
  if (!kind || !ref || !sig) return null;
  const expected = sign(`${kind}.${ref}`).slice(0, 16);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? { kind, ref } : null;
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
