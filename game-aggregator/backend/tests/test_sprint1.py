"""Sprint 1 : une partie de bout en bout. Chaque test correspond à une story du backlog (docs/BACKLOG_SPRINT1.md)."""
import uuid

from app.modules.audit import service as audit_service
from app.modules.audit.models import AuditEntry
from app.core.db import SessionLocal


# ---------- S1-1 / S1-2 : opérateurs et clés d'API ----------

def test_s1_1_create_operator_key_shown_once(client, admin):
    r = client.post("/api/operators", json={"name": "Casino Dakar", "currency": "XOF"}, headers=admin)
    assert r.status_code == 201
    body = r.json()
    assert body["api_key"].startswith("yk_")
    listed = client.get("/api/operators", headers=admin).json()
    me = next(o for o in listed if o["id"] == body["id"])
    assert "api_key" not in me and me["api_key_prefix"] == body["api_key"][:8]


def test_s1_1_requires_admin(client):
    assert client.post("/api/operators", json={"name": "X", "currency": "XOF"}).status_code == 401
    assert client.post("/api/operators", json={"name": "X", "currency": "XOF"}, headers={"X-Admin-Key": "wrong"}).status_code == 401


def test_s1_2_operator_auth(client, operator):
    headers, data, _ = operator
    assert client.get("/api/operators/me", headers=headers).json()["id"] == data["id"]
    assert client.get("/api/operators/me").status_code == 401
    assert client.get("/api/operators/me", headers={"X-Api-Key": "yk_inconnue"}).status_code == 401


def test_s1_2_rotated_key_revokes_old(client, admin):
    created = client.post("/api/operators", json={"name": "Rotation", "currency": "XOF"}, headers=admin).json()
    rotated = client.post(f"/api/operators/{created['id']}/rotate-key", headers=admin).json()
    assert client.get("/api/operators/me", headers={"X-Api-Key": created["api_key"]}).status_code == 401
    assert client.get("/api/operators/me", headers={"X-Api-Key": rotated["api_key"]}).status_code == 200


# ---------- S1-3 / S1-4 : fournisseur, catalogue, activation ----------

def test_s1_3_demo_provider_and_game_in_catalog(client, operator):
    headers, _, _ = operator
    provs = client.get("/api/providers").json()
    assert any(p["key"] == "yoon-demo" for p in provs)
    games = client.get("/api/catalog/games", headers=headers).json()
    g = next(x for x in games if x["key"] == "des-de-yoon")
    assert g["rtp_percent"] == 96.0 and g["currency"] == "XOF" and g["category"] == "dice"
    assert g["min_stake_minor"] == 100 and g["max_stake_minor"] == 100_000


def test_s1_3_admin_creates_provider_and_game(client, admin, operator):
    headers, _, _ = operator
    p = client.post("/api/providers", json={"key": "studio-nord", "name": "Studio Nord"}, headers=admin)
    assert p.status_code == 201
    g = client.post(f"/api/providers/{p.json()['id']}/games", json={"key": "fortune", "name": "Fortune", "category": "slots", "rtp_bp": 9550,
                                                                       "volatility": "high", "currency": "XOF", "min_stake_minor": 50, "max_stake_minor": 5000}, headers=admin)
    assert g.status_code == 201
    by_provider = client.get("/api/catalog/games?provider=studio-nord", headers=headers).json()
    assert [x["key"] for x in by_provider] == ["fortune"]


def test_s1_4_activation_filters(client, operator):
    headers, _, _ = operator
    games = client.get("/api/catalog/games", headers=headers).json()
    g = next(x for x in games if x["key"] == "des-de-yoon")
    client.post(f"/api/catalog/games/{g['id']}/deactivate", headers=headers)
    assert all(not x["active"] for x in client.get("/api/catalog/games?active=false", headers=headers).json() if x["id"] == g["id"])
    r = client.post(f"/api/catalog/games/{g['id']}/activate", headers=headers)
    assert r.json()["active"] is True
    assert any(x["id"] == g["id"] for x in client.get("/api/catalog/games?active=true", headers=headers).json())


# ---------- S1-5 : joueurs ----------

def test_s1_5_underage_refused(client, operator):
    headers, _, _ = operator
    r = client.post("/api/players", json={"external_id": "kid-1", "birth_date": "2015-01-01"}, headers=headers)
    assert r.status_code == 422 and "mineur" in r.json()["detail"]


def test_s1_5_external_id_unique_per_operator(client, operator, admin):
    headers, _, _ = operator
    ext = f"dup-{uuid.uuid4().hex[:6]}"
    assert client.post("/api/players", json={"external_id": ext, "birth_date": "1980-01-01"}, headers=headers).status_code == 201
    assert client.post("/api/players", json={"external_id": ext, "birth_date": "1980-01-01"}, headers=headers).status_code == 409
    other = client.post("/api/operators", json={"name": f"Autre {ext}", "currency": "XOF"}, headers=admin).json()
    assert client.post("/api/players", json={"external_id": ext, "birth_date": "1980-01-01"}, headers={"X-Api-Key": other["api_key"]}).status_code == 201


def test_s1_5_player_isolation_between_operators(client, operator, player, admin):
    other = client.post("/api/operators", json={"name": f"Isolé {uuid.uuid4().hex[:6]}", "currency": "XOF"}, headers=admin).json()
    assert client.get(f"/api/players/{player['id']}", headers={"X-Api-Key": other["api_key"]}).status_code == 404


# ---------- S1-6 : portefeuille idempotent ----------

def _tx(client, headers, player_id, kind, amount, key, **extra):
    return client.post("/api/wallet/transactions", json={"player_id": player_id, "kind": kind, "amount_minor": amount, "idempotency_key": key, **extra}, headers=headers)


def test_s1_6_credit_debit_and_balance(client, operator, player):
    headers, _, _ = operator
    assert _tx(client, headers, player["id"], "credit", 10_000, f"c-{uuid.uuid4()}").status_code == 201
    assert _tx(client, headers, player["id"], "debit", 2_500, f"d-{uuid.uuid4()}").status_code == 201
    b = client.get(f"/api/wallet/players/{player['id']}/balance", headers=headers).json()
    assert b["balance_minor"] == 7_500 and b["display"] == "7 500 XOF"
    ledger = client.get(f"/api/wallet/players/{player['id']}/ledger", headers=headers).json()
    assert [e["amount_minor"] for e in ledger] == [-2_500, 10_000]


def test_s1_6_replay_does_not_debit_twice(client, operator, player):
    headers, _, _ = operator
    _tx(client, headers, player["id"], "credit", 5_000, f"c-{uuid.uuid4()}")
    key = f"debit-{uuid.uuid4()}"
    first = _tx(client, headers, player["id"], "debit", 1_000, key)
    second = _tx(client, headers, player["id"], "debit", 1_000, key)
    assert first.status_code == 201 and first.json()["replayed"] is False
    assert second.status_code == 200 and second.json()["replayed"] is True
    assert second.json()["id"] == first.json()["id"]
    assert client.get(f"/api/wallet/players/{player['id']}/balance", headers=headers).json()["balance_minor"] == 4_000


def test_s1_6_same_key_different_payload_rejected(client, operator, player):
    headers, _, _ = operator
    key = f"k-{uuid.uuid4()}"
    assert _tx(client, headers, player["id"], "credit", 100, key).status_code == 201
    assert _tx(client, headers, player["id"], "credit", 200, key).status_code == 409


def test_s1_6_overdraft_refused(client, operator, player):
    headers, _, _ = operator
    r = _tx(client, headers, player["id"], "debit", 1, f"o-{uuid.uuid4()}")
    assert r.status_code == 402


def test_s1_6_amounts_are_integers(client, operator, player):
    headers, _, _ = operator
    r = client.post("/api/wallet/transactions", json={"player_id": player["id"], "kind": "credit", "amount_minor": 12.5, "idempotency_key": f"f-{uuid.uuid4()}"}, headers=headers)
    assert r.status_code == 422


# ---------- S1-7 / S1-8 : session et tour de jeu ----------

def _session(client, headers, player, game, mode="real"):
    r = client.post("/api/sessions", json={"player_id": player["id"], "game_id": game["id"], "mode": mode}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_s1_7_launch_session(client, operator, player, demo_game):
    headers, _, _ = operator
    s = _session(client, headers, player, demo_game)
    assert s["token"] and s["launch_url"].endswith(s["token"]) and s["status"] == "open"
    public = client.get(f"/api/sessions/{s['token']}").json()
    assert public["game"]["key"] == "des-de-yoon"
    closed = client.post(f"/api/sessions/{s['token']}/close").json()
    assert closed["status"] == "closed"
    assert client.get(f"/api/sessions/{s['token']}").status_code == 410


def test_s1_7_session_requires_active_game(client, operator, player, demo_game, admin):
    headers, _, _ = operator
    other = client.post("/api/operators", json={"name": f"Sans jeu {uuid.uuid4().hex[:6]}", "currency": "XOF"}, headers=admin).json()
    oh = {"X-Api-Key": other["api_key"]}
    p = client.post("/api/players", json={"external_id": "x1", "birth_date": "1990-01-01"}, headers=oh).json()
    r = client.post("/api/sessions", json={"player_id": p["id"], "game_id": demo_game["id"], "mode": "real"}, headers=oh)
    assert r.status_code == 403


def test_s1_8_round_balance_invariant(client, operator, player, demo_game):
    headers, _, _ = operator
    _tx(client, headers, player["id"], "credit", 10_000, f"c-{uuid.uuid4()}")
    s = _session(client, headers, player, demo_game)
    r = client.post("/api/rounds", json={"session_token": s["token"], "stake_minor": 500, "client_seed": "awa-2026"})
    assert r.status_code == 201, r.text
    rd = r.json()
    assert rd["status"] == "closed" and rd["stake_minor"] == 500
    assert rd["win_minor"] in (0, 960)                       # 1,92 × 500
    assert rd["balance_minor"] == 10_000 - 500 + rd["win_minor"]
    ledger = client.get(f"/api/wallet/players/{player['id']}/ledger", headers=headers).json()
    kinds = [e["kind"] for e in ledger if e["reference"] == f"round:{rd['id']}"]
    assert "stake" in kinds and (("win" in kinds) == (rd["win_minor"] > 0))


def test_s1_8_round_is_verifiable(client, operator, player, demo_game):
    headers, _, _ = operator
    _tx(client, headers, player["id"], "credit", 1_000, f"c-{uuid.uuid4()}")
    s = _session(client, headers, player, demo_game)
    rd = client.post("/api/rounds", json={"session_token": s["token"], "stake_minor": 100}).json()
    assert rd["server_seed"]  # révélée après clôture
    v = client.get(f"/api/rounds/{rd['id']}/verify").json()
    assert v["commitment_ok"] and v["roll_ok"] and v["roll"] == rd["result"]["roll"]
    public = client.post("/api/rng/verify", json={"server_seed": rd["server_seed"], "client_seed": rd["client_seed"], "nonce": rd["nonce"]}).json()
    assert public["roll"] == rd["result"]["roll"] and public["commitment"] == rd["server_seed_hash"]


def test_s1_8_stake_limits_and_insufficient_balance(client, operator, player, demo_game):
    headers, _, _ = operator
    s = _session(client, headers, player, demo_game)
    assert client.post("/api/rounds", json={"session_token": s["token"], "stake_minor": 10}).status_code == 422
    assert client.post("/api/rounds", json={"session_token": s["token"], "stake_minor": 500}).status_code == 402


def test_s1_8_demo_mode_does_not_touch_wallet(client, operator, player, demo_game):
    headers, _, _ = operator
    s = _session(client, headers, player, demo_game, mode="demo")
    rd = client.post("/api/rounds", json={"session_token": s["token"], "stake_minor": 500}).json()
    assert rd["status"] == "closed" and rd["balance_minor"] is None
    assert client.get(f"/api/wallet/players/{player['id']}/balance", headers=headers).json()["balance_minor"] == 0


def test_s1_8_rtp_over_many_rounds(client, operator, player, demo_game):
    """Sur 400 tours, le RTP observé reste dans une fourchette plausible autour de 96 %."""
    headers, _, _ = operator
    _tx(client, headers, player["id"], "credit", 1_000_000, f"c-{uuid.uuid4()}")
    s = _session(client, headers, player, demo_game)
    stake, wins = 0, 0
    for _ in range(400):
        rd = client.post("/api/rounds", json={"session_token": s["token"], "stake_minor": 100}).json()
        stake += rd["stake_minor"]; wins += rd["win_minor"]
    assert 0.80 < wins / stake < 1.12


# ---------- S1-9 : audit chaîné ----------

def test_s1_9_audit_covers_sensitive_actions(client, admin):
    actions = {e["action"] for e in client.get("/api/audit?limit=5000", headers=admin).json()}
    assert {"OPERATOR_CREATED", "PLAYER_CREATED", "LEDGER_CREDIT", "LEDGER_STAKE", "ROUND_CLOSED", "SESSION_OPENED", "GAME_ACTIVATED"} <= actions
    assert client.get("/api/audit/verify", headers=admin).json()["status"] == "ok"


def test_s1_9_tampering_is_detected(client, admin):
    with SessionLocal() as db:
        e = db.query(AuditEntry).order_by(AuditEntry.id).first()
        e.detail = {**e.detail, "altered": True}
        db.commit()
        assert audit_service.verify(db)["status"] == "corrupted"
        e.detail = {k: v for k, v in e.detail.items() if k != "altered"}
        db.commit()
        assert audit_service.verify(db)["status"] == "ok"


# ---------- S1-10 : chiffres du lanceur ----------

def test_s1_10_operator_stats(client, operator, player, demo_game):
    headers, _, _ = operator
    st = client.get("/api/operators/me/stats", headers=headers).json()
    assert st["games_active"] >= 1 and st["players"] >= 1 and st["rounds_today"] >= 1
    assert st["ggr_today_minor"] == st["stake_today_minor"] - st["win_today_minor"]
