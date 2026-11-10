// Test de la fonction Netlify en local : `npm run test:netlify` (sans Blobs → état en mémoire).
import assert from "node:assert/strict";
import handler from "./functions/api.mts";

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await handler(new Request(`http://local${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined }));
  return { status: r.status, json: await r.json() };
};
const ADMIN = { "x-admin-key": "admin-dev-key" };

const h = await call("GET", "/api/health"); assert.equal(h.json.status, "ok");
const created = await call("POST", "/api/operators", { name: "Casino Test", currency: "XOF" }, ADMIN);
assert.equal(created.status, 201); const OP = { "x-api-key": created.json.api_key };
assert.equal((await call("GET", "/api/operators/me")).status, 401);
assert.equal((await call("GET", "/api/operators/me", undefined, OP)).json.id, created.json.id);

const games = (await call("GET", "/api/catalog/games", undefined, OP)).json; const g = games.find((x: any) => x.key === "des-de-yoon");
assert.equal(g.active, false); assert.equal((await call("POST", `/api/catalog/games/${g.id}/activate`, {}, OP)).json.active, true);

assert.equal((await call("POST", "/api/players", { external_id: "kid", birth_date: "2015-01-01" }, OP)).status, 422);
const p = (await call("POST", "/api/players", { external_id: "awa", display_name: "Awa", birth_date: "1990-05-10" }, OP)).json;

const k = "credit-0001";
assert.equal((await call("POST", "/api/wallet/transactions", { player_id: p.id, kind: "credit", amount_minor: 10000, idempotency_key: k }, OP)).status, 201);
const replay = await call("POST", "/api/wallet/transactions", { player_id: p.id, kind: "credit", amount_minor: 10000, idempotency_key: k }, OP);
assert.equal(replay.status, 200); assert.equal(replay.json.replayed, true);
assert.equal((await call("POST", "/api/wallet/transactions", { player_id: p.id, kind: "credit", amount_minor: 999, idempotency_key: k }, OP)).status, 409);
assert.equal((await call("POST", "/api/wallet/transactions", { player_id: p.id, kind: "debit", amount_minor: 99999, idempotency_key: "over-0001" }, OP)).status, 402);
assert.equal((await call("POST", "/api/wallet/transactions", { player_id: p.id, kind: "credit", amount_minor: 12.5, idempotency_key: "float-001" }, OP)).status, 422);
assert.equal((await call("GET", `/api/wallet/players/${p.id}/balance`, undefined, OP)).json.balance_minor, 10000);

const s = (await call("POST", "/api/sessions", { player_id: p.id, game_id: g.id, mode: "real" }, OP)).json; assert.ok(s.token);
let stake = 0, win = 0, bal = 10000;
for (let i = 0; i < 50; i++) { const r = (await call("POST", "/api/rounds", { session_token: s.token, stake_minor: 100, client_seed: "t" })).json; stake += r.stake_minor; win += r.win_minor; bal = r.balance_minor; }
assert.equal(bal, 10000 - stake + win);
const last = (await call("GET", "/api/rounds")).json[0]; const v = (await call("GET", `/api/rounds/${last.id}/verify`)).json;
assert.ok(v.commitment_ok && v.roll_ok);
assert.equal((await call("POST", "/api/rounds", { session_token: s.token, stake_minor: 10 })).status, 422);

const stats = (await call("GET", "/api/operators/me/stats", undefined, OP)).json; assert.equal(stats.rounds_today, 50); assert.equal(stats.ggr_today_minor, stake - win);
const audit = (await call("GET", "/api/audit/verify", undefined, ADMIN)).json; assert.equal(audit.status, "ok"); assert.ok(audit.entries > 100);
console.log(`OK — fonction Netlify : ${audit.entries} entrées d'audit, solde final ${bal}, GGR ${stake - win}`);
