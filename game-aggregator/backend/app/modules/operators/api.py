"""M1 Opérateurs — S1-1 création avec clé d'API affichée une fois, S1-2 authentification, statistiques du lanceur."""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.money import MINOR_UNITS
from ...core.security import generate_api_key, hash_api_key, key_prefix, require_admin, require_operator
from ..audit import service as audit
from .models import Operator

router = APIRouter(prefix="/api/operators", tags=["Opérateurs"])


class OperatorIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    currency: str = "XOF"


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:60]


def _public(op: Operator) -> dict:
    return {"id": op.id, "name": op.name, "slug": op.slug, "currency": op.currency, "status": op.status,
            "api_key_prefix": op.api_key_prefix, "created_at": op.created_at}


@router.post("", status_code=201, dependencies=[Depends(require_admin)])
def create_operator(body: OperatorIn, db: Session = Depends(get_db)):
    if body.currency not in MINOR_UNITS:
        raise HTTPException(422, f"Devise inconnue : {body.currency}")
    if db.scalar(select(Operator).where(Operator.name == body.name)):
        raise HTTPException(409, "Un opérateur porte déjà ce nom")
    key = generate_api_key()
    op = Operator(name=body.name, slug=_slug(body.name), currency=body.currency, api_key_prefix=key_prefix(key), api_key_hash=hash_api_key(key))
    db.add(op)
    db.flush()
    audit.record(db, "admin", "OPERATOR_CREATED", "operator", op.id, {"name": op.name, "currency": op.currency})
    db.commit()
    # La clé complète n'est renvoyée qu'ici, une seule fois.
    return {**_public(op), "api_key": key}


@router.get("", dependencies=[Depends(require_admin)])
def list_operators(db: Session = Depends(get_db)):
    return [_public(o) for o in db.scalars(select(Operator).order_by(Operator.id))]


@router.post("/{operator_id}/rotate-key", dependencies=[Depends(require_admin)])
def rotate_key(operator_id: int, db: Session = Depends(get_db)):
    op = db.get(Operator, operator_id)
    if not op:
        raise HTTPException(404, "Opérateur introuvable")
    key = generate_api_key()
    op.api_key_prefix, op.api_key_hash = key_prefix(key), hash_api_key(key)
    audit.record(db, "admin", "OPERATOR_KEY_ROTATED", "operator", op.id)
    db.commit()
    return {**_public(op), "api_key": key}


@router.get("/me")
def me(op: Operator = Depends(require_operator)):
    return _public(op)


@router.get("/me/stats")
def my_stats(op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    """Chiffres du lanceur (S1-10)."""
    from ..catalog.models import OperatorGame
    from ..players.models import Player
    from ..rounds.models import Round
    from ..sessions.models import GameSession

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    games_active = db.scalar(select(func.count()).select_from(OperatorGame).where(OperatorGame.operator_id == op.id, OperatorGame.active.is_(True))) or 0
    players = db.scalar(select(func.count()).select_from(Player).where(Player.operator_id == op.id)) or 0
    sessions_open = db.scalar(select(func.count()).select_from(GameSession).where(GameSession.operator_id == op.id, GameSession.status == "open", GameSession.expires_at > now)) or 0
    rounds_today = db.scalar(select(func.count()).select_from(Round).where(Round.operator_id == op.id, Round.created_at >= today)) or 0
    stake = db.scalar(select(func.coalesce(func.sum(Round.stake_minor), 0)).where(Round.operator_id == op.id, Round.created_at >= today, Round.status == "closed")) or 0
    win = db.scalar(select(func.coalesce(func.sum(Round.win_minor), 0)).where(Round.operator_id == op.id, Round.created_at >= today, Round.status == "closed")) or 0
    return {"games_active": games_active, "players": players, "sessions_open": sessions_open, "rounds_today": rounds_today,
            "ggr_today_minor": int(stake) - int(win), "stake_today_minor": int(stake), "win_today_minor": int(win), "currency": op.currency}
