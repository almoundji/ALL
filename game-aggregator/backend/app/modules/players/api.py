"""M4 Joueurs — S1-5 création avec contrôle d'âge (≥ 18 ans), unicité de l'identifiant externe par opérateur."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.db import get_db
from ...core.security import require_operator
from ..audit import service as audit
from ..operators.models import Operator
from ..wallet.service import balance_of
from .models import Player

router = APIRouter(prefix="/api/players", tags=["Joueurs"])


class PlayerIn(BaseModel):
    external_id: str = Field(min_length=1, max_length=80)
    display_name: str = ""
    birth_date: date


def age_on(birth: date, today: date) -> int:
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


def public(db: Session, p: Player) -> dict:
    return {"id": p.id, "operator_id": p.operator_id, "external_id": p.external_id, "display_name": p.display_name,
            "birth_date": p.birth_date, "currency": p.currency, "status": p.status, "created_at": p.created_at,
            "balance_minor": balance_of(db, p.id).minor}


def get_player_for(db: Session, op: Operator, player_id: int) -> Player:
    p = db.get(Player, player_id)
    if not p or p.operator_id != op.id:
        raise HTTPException(404, "Joueur introuvable")
    return p


@router.post("", status_code=201)
def create_player(body: PlayerIn, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    if age_on(body.birth_date, date.today()) < settings.min_age:
        audit.record(db, f"operator:{op.slug}", "PLAYER_REFUSED_UNDERAGE", "player", body.external_id)
        db.commit()
        raise HTTPException(422, f"Joueur mineur : {settings.min_age} ans minimum")
    if db.scalar(select(Player).where(Player.operator_id == op.id, Player.external_id == body.external_id)):
        raise HTTPException(409, "Identifiant externe déjà utilisé pour cet opérateur")
    p = Player(operator_id=op.id, external_id=body.external_id, display_name=body.display_name, birth_date=body.birth_date, currency=op.currency)
    db.add(p)
    db.flush()
    audit.record(db, f"operator:{op.slug}", "PLAYER_CREATED", "player", p.id, {"external_id": p.external_id})
    db.commit()
    return public(db, p)


@router.get("")
def list_players(op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    return [public(db, p) for p in db.scalars(select(Player).where(Player.operator_id == op.id).order_by(Player.id.desc()).limit(200))]


@router.get("/{player_id}")
def get_player(player_id: int, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    return public(db, get_player_for(db, op, player_id))
