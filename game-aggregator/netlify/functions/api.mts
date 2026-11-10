// API de Yoon en fonction serverless Netlify — port du backend FastAPI (Sprint 1).
// L'état complet est conservé en un document JSON dans Netlify Blobs (recette) ; en mémoire si Blobs est indisponible.
import type { Config } from "@netlify/functions";
import {
  ageOn, audit, balanceOf, createState, fmt, hashKey, HttpError, isActiveFor, keyPrefix, MIN_AGE, MINOR_UNITS, newApiKey, nextId, now,
  openSession, playRound, postEntry, pubGame, pubLedger, pubOperator, pubPlayer, pubRound, pubSession, Replay, roll, commitment, RNG_RANGE,
  SESSION_MINUTES, slugify, statsFor, verifyChain, VERSION, type Operator, type State,
} from "../lib/core.mts";

const env = (k: string, d = "") => (globalThis as any).Netlify?.env.get(k) ?? process.env[k] ?? d;
const ADMIN_KEY = () => env("YOON_ADMIN_KEY", "admin-dev-key");
const DEMO_KEY = () => env("YOON_DEMO_OPERATOR_KEY", "yk_demo-operator-key-change-me");
const STORE_KEY = "state-v1";

// Même registre que backend/app/modules/__init__.py
const MODULES = [
  ["audit", "Journal d'audit", "Audit log", 1, "livré"], ["operators", "Opérateurs", "Operators", 1, "livré"], ["providers", "Fournisseurs", "Providers", 1, "livré"],
  ["catalog", "Catalogue", "Catalogue", 1, "livré"], ["players", "Joueurs", "Players", 1, "livré"], ["wallet", "Portefeuille", "Wallet", 1, "livré"],
  ["sessions", "Sessions", "Sessions", 1, "livré"], ["rng", "RNG équitable", "Provably fair RNG", 1, "livré"], ["rounds", "Tours de jeu", "Game rounds", 1, "livré"],
  ["responsible", "Jeu responsable", "Responsible gaming", 2, "planifié"], ["bonus", "Bonus", "Bonuses", 5, "planifié"], ["reporting", "Reporting et facturation", "Reporting and invoicing", 6, "planifié"],
].map(([key, name, name_en, sprint, status]) => ({ key, name, name_en, sprint, status }));

// ---------- Persistance ----------
let memory: State | null = null;
async function store() { try { const { getStore } = await import("@netlify/blobs"); return getStore({ name: "yoon", consistency: "strong" }); } catch { return null; } }
async function loadState(): Promise<State> {
  const st = await store();
  if (st) { try { const s = (await st.get(STORE_KEY, { type: "json" })) as State | null; if (s) return s; } catch { /* premier démarrage */ } }
  if (memory) return memory;
  memory = createState(DEMO_KEY());
  if (st) { try { await st.setJSON(STORE_KEY, memory); } catch { /* ignore */ } }
  return memory;
}
async function saveState(s: State) { memory = s; const st = await store(); if (st) { try { await st.setJSON(STORE_KEY, s); } catch { /* ignore */ } } }

// ---------- Utilitaires ----------
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const body = async (req: Request) => { try { return await req.json(); } catch { return {}; } };
const requireAdmin = (req: Request) => { if (req.headers.get("x-admin-key") !== ADMIN_KEY()) throw new HttpError(401, "Clé d'administration requise"); };
const requireOperator = (s: State, req: Request): Operator => {
  const k = req.headers.get("x-api-key"); if (!k) throw new HttpError(401, "Clé d'API requise (en-tête X-Api-Key)");
  const op = s.operators.find((o) => o.api_key_prefix === keyPrefix(k) && o.api_key_hash === hashKey(k));
  if (!op) throw new HttpError(401, "Clé d'API invalide"); if (op.status !== "active") throw new HttpError(403, "Opérateur suspendu"); return op;
};
const playerFor = (s: State, op: Operator, id: number) => { const p = s.players.find((x) => x.id === id && x.operator_id === op.id); if (!p) throw new HttpError(404, "Joueur introuvable"); return p; };
const int = (v: unknown, msg: string) => { if (typeof v !== "number" || !Number.isInteger(v)) throw new HttpError(422, msg); return v; };

type Ctx = { s: State; req: Request; url: URL; dirty: boolean };
type Handler = (c: Ctx, p: Record<string, string>) => Promise<unknown> | unknown;
const routes: { method: string; re: RegExp; keys: string[]; h: Handler }[] = [];
const route = (method: string, path: string, h: Handler) => { const keys: string[] = []; routes.push({ method, keys, h, re: new RegExp("^" + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$") }); };
/** Route de création : réponse 201 comme le backend FastAPI. */
const create = (path: string, h: Handler) => route("POST", path, async (c, p) => json(await h(c, p), 201));

// ---------- Socle ----------
route("GET", "/api/health", () => ({ status: "ok", app: "Yoon", version: VERSION, environment: env("YOON_ENVIRONMENT", "recette") }));
route("GET", "/api/modules", () => MODULES);

// ---------- Opérateurs ----------
create("/api/operators", async (c) => {
  requireAdmin(c.req); const b = await body(c.req);
  if (typeof b.name !== "string" || b.name.length < 2) throw new HttpError(422, "Nom requis"); const cur = b.currency ?? "XOF";
  if (!(cur in MINOR_UNITS)) throw new HttpError(422, `Devise inconnue : ${cur}`);
  if (c.s.operators.some((o) => o.name === b.name)) throw new HttpError(409, "Un opérateur porte déjà ce nom");
  const key = newApiKey();
  const op: Operator = { id: nextId(c.s, "operator"), name: b.name, slug: slugify(b.name), currency: cur, status: "active", api_key_prefix: keyPrefix(key), api_key_hash: hashKey(key), created_at: now() };
  c.s.operators.push(op); audit(c.s, "admin", "OPERATOR_CREATED", "operator", op.id, { name: op.name, currency: cur }); c.dirty = true;
  return { ...pubOperator(op), api_key: key };
});
route("GET", "/api/operators", (c) => { requireAdmin(c.req); return c.s.operators.map(pubOperator); });
route("POST", "/api/operators/:id/rotate-key", (c, p) => {
  requireAdmin(c.req); const op = c.s.operators.find((o) => o.id === Number(p.id)); if (!op) throw new HttpError(404, "Opérateur introuvable");
  const key = newApiKey(); op.api_key_prefix = keyPrefix(key); op.api_key_hash = hashKey(key); audit(c.s, "admin", "OPERATOR_KEY_ROTATED", "operator", op.id); c.dirty = true;
  return { ...pubOperator(op), api_key: key };
});
route("GET", "/api/operators/me", (c) => pubOperator(requireOperator(c.s, c.req)));
route("GET", "/api/operators/me/stats", (c) => statsFor(c.s, requireOperator(c.s, c.req)));

// ---------- Fournisseurs ----------
route("GET", "/api/providers", (c) => c.s.providers);
create("/api/providers", async (c) => {
  requireAdmin(c.req); const b = await body(c.req);
  if (!/^[a-z0-9_-]{2,40}$/.test(b.key ?? "") || typeof b.name !== "string") throw new HttpError(422, "Clé ou nom invalide");
  if (c.s.providers.some((x) => x.key === b.key)) throw new HttpError(409, "Clé de fournisseur déjà utilisée");
  const p = { id: nextId(c.s, "provider"), key: b.key, name: b.name, adapter: b.adapter ?? "internal_demo", status: "active" };
  c.s.providers.push(p); audit(c.s, "admin", "PROVIDER_CREATED", "provider", p.id, { key: p.key }); c.dirty = true; return p;
});
create("/api/providers/:id/games", async (c, p) => {
  requireAdmin(c.req); const prov = c.s.providers.find((x) => x.id === Number(p.id)); if (!prov) throw new HttpError(404, "Fournisseur introuvable");
  const b = await body(c.req);
  if (!/^[a-z0-9_-]{2,60}$/.test(b.key ?? "") || typeof b.name !== "string") throw new HttpError(422, "Clé ou nom invalide");
  if (!["dice", "slots", "table", "instant", "crash", "lottery"].includes(b.category) || !["low", "medium", "high"].includes(b.volatility ?? "medium") || !((b.currency ?? "XOF") in MINOR_UNITS)) throw new HttpError(422, "Catégorie, volatilité ou devise invalide");
  const rtp = int(b.rtp_bp, "rtp_bp entier"), mn = int(b.min_stake_minor, "min_stake_minor entier"), mx = int(b.max_stake_minor, "max_stake_minor entier");
  if (rtp < 5000 || rtp > 10000 || mn < 1 || mn > mx) throw new HttpError(422, "RTP ou mises hors bornes");
  if (c.s.games.some((g) => g.provider_id === prov.id && g.key === b.key)) throw new HttpError(409, "Ce fournisseur a déjà un jeu avec cette clé");
  const g = { id: nextId(c.s, "game"), provider_id: prov.id, key: b.key, name: b.name, category: b.category, rtp_bp: rtp, volatility: b.volatility ?? "medium", currency: b.currency ?? "XOF", min_stake_minor: mn, max_stake_minor: mx, status: "active" };
  c.s.games.push(g); audit(c.s, "admin", "GAME_CREATED", "game", g.id, { provider: prov.key, key: g.key, rtp_bp: rtp }); c.dirty = true; return pubGame(c.s, g);
});

// ---------- Catalogue ----------
route("GET", "/api/catalog/games", (c) => {
  const op = requireOperator(c.s, c.req); const q = c.url.searchParams;
  return c.s.games.filter((g) => g.status === "active").map((g) => pubGame(c.s, g, op))
    .filter((g) => (!q.get("category") || g.category === q.get("category")) && (!q.get("provider") || g.provider?.key === q.get("provider")) && (q.get("active") == null || String(g.active) === q.get("active")))
    .sort((a, b) => a.name.localeCompare(b.name));
});
route("GET", "/api/catalog/games/:id", (c, p) => { const op = requireOperator(c.s, c.req); const g = c.s.games.find((x) => x.id === Number(p.id) && x.status === "active"); if (!g) throw new HttpError(404, "Jeu introuvable"); return pubGame(c.s, g, op); });
const setActive = (active: boolean): Handler => (c, p) => {
  const op = requireOperator(c.s, c.req); const g = c.s.games.find((x) => x.id === Number(p.id) && x.status === "active"); if (!g) throw new HttpError(404, "Jeu introuvable");
  const a = c.s.operator_games.find((x) => x.operator_id === op.id && x.game_id === g.id); if (a) a.active = active; else c.s.operator_games.push({ operator_id: op.id, game_id: g.id, active });
  audit(c.s, `operator:${op.slug}`, active ? "GAME_ACTIVATED" : "GAME_DEACTIVATED", "game", g.id); c.dirty = true; return pubGame(c.s, g, op);
};
route("POST", "/api/catalog/games/:id/activate", setActive(true));
route("POST", "/api/catalog/games/:id/deactivate", setActive(false));

// ---------- Joueurs ----------
create("/api/players", async (c) => {
  const op = requireOperator(c.s, c.req); const b = await body(c.req);
  if (typeof b.external_id !== "string" || !b.external_id || !/^\d{4}-\d{2}-\d{2}$/.test(b.birth_date ?? "")) throw new HttpError(422, "external_id et birth_date (AAAA-MM-JJ) requis");
  if (ageOn(b.birth_date, new Date()) < MIN_AGE) { audit(c.s, `operator:${op.slug}`, "PLAYER_REFUSED_UNDERAGE", "player", b.external_id); c.dirty = true; throw new HttpError(422, `Joueur mineur : ${MIN_AGE} ans minimum`); }
  if (c.s.players.some((x) => x.operator_id === op.id && x.external_id === b.external_id)) throw new HttpError(409, "Identifiant externe déjà utilisé pour cet opérateur");
  const pl = { id: nextId(c.s, "player"), operator_id: op.id, external_id: b.external_id, display_name: b.display_name ?? "", birth_date: b.birth_date, currency: op.currency, status: "active", created_at: now() };
  c.s.players.push(pl); audit(c.s, `operator:${op.slug}`, "PLAYER_CREATED", "player", pl.id, { external_id: pl.external_id }); c.dirty = true; return pubPlayer(c.s, pl);
});
route("GET", "/api/players", (c) => { const op = requireOperator(c.s, c.req); return c.s.players.filter((p) => p.operator_id === op.id).slice(-200).reverse().map((p) => pubPlayer(c.s, p)); });
route("GET", "/api/players/:id", (c, p) => pubPlayer(c.s, playerFor(c.s, requireOperator(c.s, c.req), Number(p.id))));

// ---------- Portefeuille ----------
route("POST", "/api/wallet/transactions", async (c) => {
  const op = requireOperator(c.s, c.req); const b = await body(c.req);
  if (!["credit", "debit"].includes(b.kind)) throw new HttpError(422, "kind : credit | debit");
  const amount = int(b.amount_minor, "amount_minor entier (unités mineures)"); if (amount <= 0) throw new HttpError(422, "Montant positif requis");
  if (typeof b.idempotency_key !== "string" || b.idempotency_key.length < 8) throw new HttpError(422, "idempotency_key (≥ 8 caractères) requise");
  const pl = playerFor(c.s, op, Number(b.player_id));
  try { const e = postEntry(c.s, op, pl, b.kind, amount, b.idempotency_key, b.reference ?? ""); c.dirty = true; return json({ ...pubLedger(e), replayed: false }, 201); }
  catch (e) { if (e instanceof Replay) return json({ ...pubLedger(e.entry), replayed: true }, 200); throw e; }
});
route("GET", "/api/wallet/players/:id/balance", (c, p) => { const pl = playerFor(c.s, requireOperator(c.s, c.req), Number(p.id)); const b = balanceOf(c.s, pl.id); return { player_id: pl.id, balance_minor: b, currency: pl.currency, display: fmt(b, pl.currency) }; });
route("GET", "/api/wallet/players/:id/ledger", (c, p) => { const pl = playerFor(c.s, requireOperator(c.s, c.req), Number(p.id)); return c.s.ledger.filter((e) => e.player_id === pl.id).slice(-200).reverse().map(pubLedger); });

// ---------- Sessions ----------
route("POST", "/api/sessions", async (c) => {
  const op = requireOperator(c.s, c.req); const b = await body(c.req); const pl = playerFor(c.s, op, Number(b.player_id));
  if (pl.status !== "active") throw new HttpError(403, "Joueur suspendu ou auto-exclu");
  const g = c.s.games.find((x) => x.id === Number(b.game_id) && x.status === "active"); if (!g) throw new HttpError(404, "Jeu introuvable");
  if (!isActiveFor(c.s, op, g.id)) throw new HttpError(403, "Jeu non activé pour cet opérateur");
  const mode = b.mode ?? "real"; if (!["demo", "real"].includes(mode)) throw new HttpError(422, "mode : demo | real");
  const { randomBytes } = await import("node:crypto");
  const x = { id: nextId(c.s, "session"), token: randomBytes(32).toString("base64url"), operator_id: op.id, player_id: pl.id, game_id: g.id, mode, status: "open", nonce: 0, created_at: now(), last_activity: now(), expires_at: new Date(Date.now() + SESSION_MINUTES * 60_000).toISOString().replace("Z", "") };
  c.s.sessions.push(x); audit(c.s, `operator:${op.slug}`, "SESSION_OPENED", "session", x.id, { player_id: pl.id, game_id: g.id, mode }); c.dirty = true; return json(pubSession(x), 201);
});
route("GET", "/api/sessions/:token", (c, p) => { c.dirty = true; const x = openSession(c.s, p.token); const g = c.s.games.find((y) => y.id === x.game_id); return { ...pubSession(x), game: g ? pubGame(c.s, g) : null }; });
route("POST", "/api/sessions/:token/close", (c, p) => { const x = openSession(c.s, p.token); x.status = "closed"; audit(c.s, `session:${x.id}`, "SESSION_CLOSED", "session", x.id); c.dirty = true; return pubSession(x); });

// ---------- Tours et RNG ----------
route("POST", "/api/rounds", async (c) => { const b = await body(c.req); c.dirty = true; return json(playRound(c.s, String(b.session_token ?? ""), b.stake_minor, String(b.client_seed ?? "").slice(0, 64)), 201); });
route("GET", "/api/rounds", (c) => { const pid = c.url.searchParams.get("player_id"); return c.s.rounds.filter((r) => !pid || r.player_id === Number(pid)).slice(-50).reverse().map(pubRound); });
route("GET", "/api/rounds/:id", (c, p) => { const r = c.s.rounds.find((x) => x.id === Number(p.id)); if (!r) throw new HttpError(404, "Tour introuvable"); return pubRound(r); });
route("GET", "/api/rounds/:id/verify", (c, p) => {
  const r = c.s.rounds.find((x) => x.id === Number(p.id)); if (!r || r.status !== "closed") throw new HttpError(404, "Tour introuvable ou non clôturé");
  const rl = roll(r.server_seed, r.client_seed, r.nonce);
  return { round_id: r.id, server_seed: r.server_seed, server_seed_hash: r.server_seed_hash, client_seed: r.client_seed, nonce: r.nonce, commitment_ok: commitment(r.server_seed) === r.server_seed_hash, roll_ok: rl === r.result.roll, roll: rl, result: r.result };
});
route("POST", "/api/rng/verify", async (c) => { const b = await body(c.req); return { commitment: commitment(String(b.server_seed)), roll: roll(String(b.server_seed), String(b.client_seed), Number(b.nonce)), range: RNG_RANGE }; });

// ---------- Audit et administration ----------
route("GET", "/api/audit", (c) => { requireAdmin(c.req); const n = Math.min(Number(c.url.searchParams.get("limit") ?? 100), 5000); return c.s.audit.slice(-n).reverse(); });
route("GET", "/api/audit/verify", (c) => { requireAdmin(c.req); return verifyChain(c.s); });
route("POST", "/api/admin/reset", async (c) => { requireAdmin(c.req); const fresh = createState(DEMO_KEY()); await saveState(fresh); return { status: "reset" }; });

export default async (req: Request) => {
  const url = new URL(req.url);
  try {
    const path = url.pathname.replace(/\/$/, "");
    const m = routes.find((r) => r.method === req.method && r.re.test(path));
    if (!m) return json({ detail: routes.some((r) => r.re.test(path)) ? "Méthode non autorisée" : "Route inconnue" }, routes.some((r) => r.re.test(path)) ? 405 : 404);
    const s = await loadState();
    const mm = path.match(m.re)!; const params = Object.fromEntries(m.keys.map((k, i) => [k, decodeURIComponent(mm[i + 1])]));
    const ctx: Ctx = { s, req, url, dirty: false };
    let out: unknown;
    try { out = await m.h(ctx, params); } finally { if (ctx.dirty) await saveState(s); }
    return out instanceof Response ? out : json(out);
  } catch (e: any) {
    if (e instanceof HttpError) return json({ detail: e.message }, e.status);
    console.error(e); return json({ detail: "Erreur interne" }, 500);
  }
};

export const config: Config = { path: ["/api", "/api/*"] };
