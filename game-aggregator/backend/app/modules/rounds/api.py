"""M7 Tours de jeu — S1-8 : mise → tirage RNG → gain → clôture ; solde final = initial − mise + gain.

Le jeu de démonstration « Dés de Yoon » (fournisseur interne) : tirage dans [0, 10000) ; le joueur gagne si le
tirage est inférieur à 5000 et touche 1,92 × sa mise, soit un RTP de 96 %.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.money import Money
from ..audit import service as audit
from ..catalog.models import Game
from ..operators.models import Operator
from ..players.models import Player
from ..rng import service as rng
from ..sessions.api import get_open_session, touch, utcnow
from ..wallet import service as wallet
from .models import Round

router = APIRouter(prefix="/api/rounds", tags=["Tours de jeu"])

DEMO_WIN_BELOW = 5000           # probabilité de gain 50 %
DEMO_PAYOUT_BP = 19_200         # 1,92 × la mise → RTP 96 %


class PlayIn(BaseModel):
    session_token: str
    stake_minor: int = Field(gt=0)
    client_seed: str = Field(default="", max_length=64)


def demo_outcome(r: int, stake: int) -> tuple[int, dict]:
    won = r < DEMO_WIN_BELOW
    win = (stake * DEMO_PAYOUT_BP) // 10_000 if won else 0
    return win, {"game": "des-de-yoon", "roll": r, "range": rng.RANGE, "win_below": DEMO_WIN_BELOW, "payout_bp": DEMO_PAYOUT_BP, "won": won}


@router.post("", status_code=201)
def play(body: PlayIn, db: Session = Depends(get_db)):
    s = get_open_session(db, body.session_token)
    op = db.get(Operator, s.operator_id)
    player = db.get(Player, s.player_id)
    game = db.get(Game, s.game_id)
    if player.status != "active":
        raise HTTPException(403, "Joueur suspendu ou auto-exclu")
    if not (game.min_stake_minor <= body.stake_minor <= game.max_stake_minor):
        raise HTTPException(422, f"Mise hors limites : entre {game.min_stake_minor} et {game.max_stake_minor} {game.currency}")

    s.nonce += 1
    touch(s)
    seed = rng.new_server_seed()
    client_seed = body.client_seed or s.token[:16]
    r = Round(session_id=s.id, operator_id=op.id, player_id=player.id, game_id=game.id, mode=s.mode, stake_minor=body.stake_minor,
              currency=player.currency, server_seed=seed, server_seed_hash=rng.commitment(seed), client_seed=client_seed, nonce=s.nonce)
    db.add(r)
    db.flush()
    actor = f"session:{s.id}"
    stake = Money(body.stake_minor, player.currency)
    if s.mode == "real":
        wallet.post_entry(db, operator=op, player=player, kind="stake", amount=stake, idempotency_key=f"round:{r.id}:stake", reference=f"round:{r.id}", actor=actor)

    roll = rng.roll(seed, client_seed, s.nonce)
    win_minor, result = demo_outcome(roll, body.stake_minor)
    r.win_minor, r.result = win_minor, result
    if s.mode == "real" and win_minor > 0:
        wallet.post_entry(db, operator=op, player=player, kind="win", amount=Money(win_minor, player.currency), idempotency_key=f"round:{r.id}:win", reference=f"round:{r.id}", actor=actor)
    r.status, r.closed_at = "closed", utcnow()
    audit.record(db, actor, "ROUND_CLOSED", "round", r.id, {"stake_minor": r.stake_minor, "win_minor": r.win_minor, "roll": roll, "mode": s.mode})
    db.commit()
    balance = wallet.balance_of(db, player.id) if s.mode == "real" else None
    return {**r.public(), "balance_minor": balance.minor if balance else None}


@router.get("/{round_id}")
def get_round(round_id: int, db: Session = Depends(get_db)):
    r = db.get(Round, round_id)
    if not r:
        raise HTTPException(404, "Tour introuvable")
    return r.public()


@router.get("/{round_id}/verify")
def verify_round(round_id: int, db: Session = Depends(get_db)):
    """Vérification publique : recalcule l'engagement et le tirage depuis les graines révélées."""
    r = db.get(Round, round_id)
    if not r or r.status != "closed":
        raise HTTPException(404, "Tour introuvable ou non clôturé")
    recomputed = rng.roll(r.server_seed, r.client_seed, r.nonce)
    return {"round_id": r.id, "server_seed": r.server_seed, "server_seed_hash": r.server_seed_hash, "client_seed": r.client_seed, "nonce": r.nonce,
            "commitment_ok": rng.commitment(r.server_seed) == r.server_seed_hash, "roll_ok": recomputed == r.result.get("roll"),
            "roll": recomputed, "result": r.result}


@router.get("")
def list_rounds(player_id: int | None = None, limit: int = 50, db: Session = Depends(get_db), token: str | None = None):
    q = select(Round).order_by(Round.id.desc()).limit(min(limit, 200))
    if player_id:
        q = q.where(Round.player_id == player_id)
    return [r.public() for r in db.scalars(q)]
