// Session signée (HMAC) stockée dans un cookie HttpOnly. Identifiants dans les variables d'environnement.
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "vb_session";
const MAX_AGE = 30 * 24 * 3600; // 30 jours

const env = (k: string) => (globalThis as any).Netlify?.env.get(k) ?? process.env[k];

function secret(): string {
  const s = env("SESSION_SECRET");
  if (!s) throw new Error("SESSION_SECRET non configuré");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  // Compare des empreintes de même longueur pour ne pas révéler la longueur du mot de passe.
  const h = (s: string) => createHmac("sha256", "cmp").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

export function checkCredentials(user: string, password: string): boolean {
  const u = env("APP_USERNAME"), p = env("APP_PASSWORD");
  if (!u || !p) return false;
  return safeEqual(user, u) && safeEqual(password, p);
}

export function sessionCookie(user: string): string {
  const payload = `${Buffer.from(user).toString("base64url")}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function currentUser(req: Request): string | null {
  const raw = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [user, exp, sig] = raw.split(".");
  if (!user || !exp || !sig) return null;
  if (!safeEqual(sig, sign(`${user}.${exp}`)) || Number(exp) < Date.now() / 1000) return null;
  return Buffer.from(user, "base64url").toString();
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
