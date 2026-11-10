// Cœur métier de Yoon en TypeScript — port fidèle du backend Python (Sprint 1) pour la fonction Netlify.
// Montants : entiers en unité mineure. Toute écriture financière passe par postEntry (idempotente).
import { createHash, createHmac, randomBytes } from "node:crypto";

export const VERSION = "0.1.0-sprint1";
export const MINOR_UNITS: Record<string, number> = { XOF: 0, XAF: 0, EUR: 2, USD: 2, GBP: 2, MAD: 2, NGN: 2, GHS: 2, KES: 2 };
export const SESSION_MINUTES = 30;
export const MIN_AGE = 18;
export const RNG_RANGE = 10_000;
const DEMO_WIN_BELOW = 5000, DEMO_PAYOUT_BP = 19_200;

export class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

export type Operator = { id: number; name: string; slug: string; currency: string; status: string; api_key_prefix: string; api_key_hash: string; created_at: string };
export type Provider = { id: number; key: string; name: string; adapter: string; status: string };
export type Game = { id: number; provider_id: number; key: string; name: string; category: string; rtp_bp: number; volatility: string; currency: string; min_stake_minor: number; max_stake_minor: number; status: string };
export type OperatorGame = { operator_id: number; game_id: number; active: boolean };
export type Player = { id: number; operator_id: number; external_id: string; display_name: string; birth_date: string; currency: string; status: string; created_at: string };
export type Ledger = { id: number; operator_id: number; player_id: number; kind: string; amount_minor: number; currency: string; balance_after_minor: number; idempotency_key: string; request_hash: string; reference: string; created_at: string };
export type GameSession = { id: number; token: string; operator_id: number; player_id: number; game_id: number; mode: string; status: string; nonce: number; created_at: string; last_activity: string; expires_at: string };
export type Round = { id: number; session_id: number; operator_id: number; player_id: number; game_id: number; mode: string; status: string; stake_minor: number; win_minor: number; currency: string; server_seed: string; server_seed_hash: string; client_seed: string; nonce: number; result: Record<string, unknown>; created_at: string; closed_at: string | null };
export type Audit = { id: number; created_at: string; actor: string; action: string; target_type: string; target_id: string; detail: Record<string, unknown>; prev_hash: string; hash: string };
export type State = { operators: Operator[]; providers: Provider[]; games: Game[]; operator_games: OperatorGame[]; players: Player[]; ledger: Ledger[]; sessions: GameSession[]; rounds: Round[]; audit: Audit[]; seq: Record<string, number> };

export const now = () => new Date().toISOString().replace("Z", "");
export const nextId = (s: State, k: string) => (s.seq[k] = (s.seq[k] ?? 0) + 1);
const sha256 = (x: string) => createHash("sha256").update(x).digest("hex");
export const hashKey = sha256;
export const keyPrefix = (k: string) => k.slice(0, 8);
export const newApiKey = () => "yk_" + randomBytes(32).toString("base64url");
export const slugify = (n: string) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// ---------- Audit chaîné ----------
const GENESIS = "0".repeat(64);
const canon = (t: string, actor: string, action: string, tt: string, tid: string, d: unknown, p: string) =>
  JSON.stringify({ actor, action, d, p, t, tid, tt });
export function audit(s: State, actor: string, action: string, tt: string, tid: string | number, detail: Record<string, unknown> = {}) {
  const prev = s.audit.length ? s.audit[s.audit.length - 1].hash : GENESIS;
  const t = now();
  const e: Audit = { id: nextId(s, "audit"), created_at: t, actor, action, target_type: tt, target_id: String(tid), detail, prev_hash: prev, hash: sha256(canon(t, actor, action, tt, String(tid), detail, prev)) };
  s.audit.push(e); return e;
}
export function verifyChain(s: State) {
  let prev = GENESIS;
  for (const e of s.audit) {
    if (e.prev_hash !== prev || e.hash !== sha256(canon(e.created_at, e.actor, e.action, e.target_type, e.target_id, e.detail, prev))) return { status: "corrupted", first_bad_id: e.id };
    prev = e.hash;
  }
  return { status: "ok", entries: s.audit.length, head: prev };
}

// ---------- RNG prouvablement équitable ----------
export const newServerSeed = () => randomBytes(32).toString("hex");
export const commitment = (seed: string) => sha256(seed);
export const roll = (seed: string, client: string, nonce: number) => parseInt(createHmac("sha256", seed).update(`${client}:${nonce}`).digest("hex").slice(0, 8), 16) % RNG_RANGE;

// ---------- Portefeuille ----------
export const balanceOf = (s: State, playerId: number) => s.ledger.filter((e) => e.player_id === playerId).reduce((a, e) => a + e.amount_minor, 0);
export class Replay { entry: Ledger; constructor(entry: Ledger) { this.entry = entry; } }
export function postEntry(s: State, op: Operator, player: Player, kind: string, amountMinor: number, key: string, reference = "", actor?: string): Ledger {
  if (!Number.isInteger(amountMinor)) throw new HttpError(422, "Montant en unité mineure attendu (entier)");
  if (amountMinor === 0) throw new HttpError(422, "Montant nul");
  const signed = ["credit", "win", "rollback"].includes(kind) ? Math.abs(amountMinor) : -Math.abs(amountMinor);
  const rh = sha256(JSON.stringify([player.id, kind, signed, reference]));
  const existing = s.ledger.find((e) => e.operator_id === op.id && e.idempotency_key === key);
  if (existing) { if (existing.request_hash !== rh) throw new HttpError(409, "Clé d'idempotence déjà utilisée avec un contenu différent"); throw new Replay(existing); }
  const current = balanceOf(s, player.id), after = current + signed;
  if (after < 0) throw new HttpError(402, `Solde insuffisant : ${fmt(current, player.currency)} disponible`);
  const e: Ledger = { id: nextId(s, "ledger"), operator_id: op.id, player_id: player.id, kind, amount_minor: signed, currency: player.currency, balance_after_minor: after, idempotency_key: key, request_hash: rh, reference, created_at: now() };
  s.ledger.push(e);
  audit(s, actor ?? `operator:${op.slug}`, `LEDGER_${kind.toUpperCase()}`, "player", player.id, { amount_minor: signed, currency: player.currency, balance_after_minor: after, reference, key });
  return e;
}
export function fmt(minor: number, cur: string) {
  const d = MINOR_UNITS[cur] ?? 2; const v = (minor / 10 ** d).toFixed(d).replace(".", ",");
  const [i, f] = v.split(","); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${f ? "," + f : ""} ${cur}`;
}

// ---------- Vues publiques ----------
export const pubOperator = ({ api_key_hash, ...o }: Operator) => o;
export const pubGame = (s: State, g: Game, op?: Operator) => {
  const p = s.providers.find((x) => x.id === g.provider_id);
  const act = op ? s.operator_games.find((x) => x.operator_id === op.id && x.game_id === g.id)?.active ?? false : undefined;
  return { ...g, rtp_percent: g.rtp_bp / 100, provider: p ? { id: p.id, key: p.key, name: p.name } : undefined, ...(act === undefined ? {} : { active: act }) };
};
export const pubPlayer = (s: State, p: Player) => ({ ...p, balance_minor: balanceOf(s, p.id) });
export const pubLedger = ({ request_hash, operator_id, ...e }: Ledger) => e;
export const pubSession = (x: GameSession) => ({ ...x, launch_url: `/play/${x.token}` });
export const pubRound = (r: Round) => ({ ...r, server_seed: r.status === "closed" ? r.server_seed : null });

export const ageOn = (birth: string, today: Date) => { const b = new Date(birth); let a = today.getUTCFullYear() - b.getUTCFullYear(); if ((today.getUTCMonth() - b.getUTCMonth() || today.getUTCDate() - b.getUTCDate()) < 0) a--; return a; };
export const isActiveFor = (s: State, op: Operator, gameId: number) => !!s.operator_games.find((x) => x.operator_id === op.id && x.game_id === gameId && x.active);
export const openSession = (s: State, token: string) => {
  const x = s.sessions.find((y) => y.token === token);
  if (!x) throw new HttpError(404, "Session introuvable");
  if (x.status !== "open" || x.expires_at <= now()) { x.status = "closed"; throw new HttpError(410, "Session expirée"); }
  return x;
};
export const touch = (x: GameSession) => { x.last_activity = now(); x.expires_at = new Date(Date.now() + SESSION_MINUTES * 60_000).toISOString().replace("Z", ""); };

export function playRound(s: State, token: string, stakeMinor: number, clientSeed: string) {
  const sess = openSession(s, token);
  const op = s.operators.find((o) => o.id === sess.operator_id)!, player = s.players.find((p) => p.id === sess.player_id)!, game = s.games.find((g) => g.id === sess.game_id)!;
  if (player.status !== "active") throw new HttpError(403, "Joueur suspendu ou auto-exclu");
  if (!Number.isInteger(stakeMinor) || stakeMinor <= 0) throw new HttpError(422, "Mise entière positive attendue");
  if (stakeMinor < game.min_stake_minor || stakeMinor > game.max_stake_minor) throw new HttpError(422, `Mise hors limites : entre ${game.min_stake_minor} et ${game.max_stake_minor} ${game.currency}`);
  sess.nonce += 1; touch(sess);
  const seed = newServerSeed(), client = clientSeed || sess.token.slice(0, 16);
  const r: Round = { id: nextId(s, "round"), session_id: sess.id, operator_id: op.id, player_id: player.id, game_id: game.id, mode: sess.mode, status: "open", stake_minor: stakeMinor, win_minor: 0, currency: player.currency, server_seed: seed, server_seed_hash: commitment(seed), client_seed: client, nonce: sess.nonce, result: {}, created_at: now(), closed_at: null };
  s.rounds.push(r);
  const actor = `session:${sess.id}`;
  if (sess.mode === "real") postEntry(s, op, player, "stake", stakeMinor, `round:${r.id}:stake`, `round:${r.id}`, actor);
  const rl = roll(seed, client, sess.nonce), won = rl < DEMO_WIN_BELOW, win = won ? Math.floor((stakeMinor * DEMO_PAYOUT_BP) / 10_000) : 0;
  r.win_minor = win; r.result = { game: "des-de-yoon", roll: rl, range: RNG_RANGE, win_below: DEMO_WIN_BELOW, payout_bp: DEMO_PAYOUT_BP, won };
  if (sess.mode === "real" && win > 0) postEntry(s, op, player, "win", win, `round:${r.id}:win`, `round:${r.id}`, actor);
  r.status = "closed"; r.closed_at = now();
  audit(s, actor, "ROUND_CLOSED", "round", r.id, { stake_minor: r.stake_minor, win_minor: r.win_minor, roll: rl, mode: sess.mode });
  return { ...pubRound(r), balance_minor: sess.mode === "real" ? balanceOf(s, player.id) : null };
}

export function statsFor(s: State, op: Operator) {
  const t = now(), today = t.slice(0, 10);
  const closed = s.rounds.filter((r) => r.operator_id === op.id && r.created_at.startsWith(today) && r.status === "closed");
  const stake = closed.reduce((a, r) => a + r.stake_minor, 0), win = closed.reduce((a, r) => a + r.win_minor, 0);
  return { games_active: s.operator_games.filter((x) => x.operator_id === op.id && x.active).length, players: s.players.filter((p) => p.operator_id === op.id).length,
    sessions_open: s.sessions.filter((x) => x.operator_id === op.id && x.status === "open" && x.expires_at > t).length,
    rounds_today: s.rounds.filter((r) => r.operator_id === op.id && r.created_at.startsWith(today)).length,
    ggr_today_minor: stake - win, stake_today_minor: stake, win_today_minor: win, currency: op.currency };
}

// ---------- État initial (fournisseur, jeu et opérateur de démonstration) ----------
export function createState(demoKey: string): State {
  const s: State = { operators: [], providers: [], games: [], operator_games: [], players: [], ledger: [], sessions: [], rounds: [], audit: [], seq: {} };
  const prov: Provider = { id: nextId(s, "provider"), key: "yoon-demo", name: "Yoon Studio (démonstration)", adapter: "internal_demo", status: "active" };
  s.providers.push(prov);
  const game: Game = { id: nextId(s, "game"), provider_id: prov.id, key: "des-de-yoon", name: "Dés de Yoon", category: "dice", rtp_bp: 9600, volatility: "low", currency: "XOF", min_stake_minor: 100, max_stake_minor: 100_000, status: "active" };
  s.games.push(game);
  const op: Operator = { id: nextId(s, "operator"), name: "Opérateur démo", slug: "operateur-demo", currency: "XOF", status: "active", api_key_prefix: keyPrefix(demoKey), api_key_hash: hashKey(demoKey), created_at: now() };
  s.operators.push(op);
  s.operator_games.push({ operator_id: op.id, game_id: game.id, active: true });
  return s;
}
