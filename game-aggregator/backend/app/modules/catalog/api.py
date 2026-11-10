"""M3 Catalogue — S1-3 liste unifiée, S1-4 activation par opérateur."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.security import require_operator
from ..audit import service as audit
from ..operators.models import Operator
from ..providers.models import Provider
from .models import Game, OperatorGame

router = APIRouter(prefix="/api/catalog", tags=["Catalogue"])


def _activation(db: Session, op: Operator, game_id: int) -> OperatorGame | None:
    return db.scalar(select(OperatorGame).where(OperatorGame.operator_id == op.id, OperatorGame.game_id == game_id))


def is_active_for(db: Session, op: Operator, game_id: int) -> bool:
    a = _activation(db, op, game_id)
    return bool(a and a.active)


@router.get("/games")
def list_games(category: str | None = None, provider: str | None = None, active: bool | None = None,
               op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    q = select(Game, Provider).join(Provider, Provider.id == Game.provider_id).where(Game.status == "active").order_by(Game.name)
    if category:
        q = q.where(Game.category == category)
    if provider:
        q = q.where(Provider.key == provider)
    activations = {a.game_id: a.active for a in db.scalars(select(OperatorGame).where(OperatorGame.operator_id == op.id))}
    out = []
    for g, p in db.execute(q):
        act = activations.get(g.id, False)
        if active is not None and act != active:
            continue
        out.append(g.public(p, act))
    return out


@router.get("/games/{game_id}")
def get_game(game_id: int, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    g = db.get(Game, game_id)
    if not g or g.status != "active":
        raise HTTPException(404, "Jeu introuvable")
    return g.public(db.get(Provider, g.provider_id), is_active_for(db, op, g.id))


@router.post("/games/{game_id}/activate")
def activate(game_id: int, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    return _set_active(game_id, True, op, db)


@router.post("/games/{game_id}/deactivate")
def deactivate(game_id: int, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    return _set_active(game_id, False, op, db)


def _set_active(game_id: int, active: bool, op: Operator, db: Session):
    g = db.get(Game, game_id)
    if not g or g.status != "active":
        raise HTTPException(404, "Jeu introuvable")
    a = _activation(db, op, game_id)
    if a is None:
        a = OperatorGame(operator_id=op.id, game_id=game_id, active=active)
        db.add(a)
    else:
        a.active = active
    audit.record(db, f"operator:{op.slug}", "GAME_ACTIVATED" if active else "GAME_DEACTIVATED", "game", game_id)
    db.commit()
    return g.public(db.get(Provider, g.provider_id), active)
