"""M6 Sessions — S1-7 lancement d'une session (jeton + URL), expiration après inactivité."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.db import get_db
from ...core.security import require_operator
from ..audit import service as audit
from ..catalog.api import is_active_for
from ..catalog.models import Game
from ..operators.models import Operator
from ..players.api import get_player_for
from .models import GameSession

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


class SessionIn(BaseModel):
    player_id: int
    game_id: int
    mode: str = Field(default="real", pattern="^(demo|real)$")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_open_session(db: Session, token: str) -> GameSession:
    s = db.scalar(select(GameSession).where(GameSession.token == token))
    if not s:
        raise HTTPException(404, "Session introuvable")
    if s.status != "open" or s.expires_at <= utcnow():
        s.status = "closed"
        db.commit()
        raise HTTPException(410, "Session expirée")
    return s


def touch(s: GameSession) -> None:
    s.last_activity = utcnow()
    s.expires_at = s.last_activity + timedelta(minutes=settings.session_minutes)


@router.post("", status_code=201)
def create_session(body: SessionIn, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    player = get_player_for(db, op, body.player_id)
    if player.status != "active":
        raise HTTPException(403, "Joueur suspendu ou auto-exclu")
    game = db.get(Game, body.game_id)
    if not game or game.status != "active":
        raise HTTPException(404, "Jeu introuvable")
    if not is_active_for(db, op, game.id):
        raise HTTPException(403, "Jeu non activé pour cet opérateur")
    s = GameSession(token=secrets.token_urlsafe(32), operator_id=op.id, player_id=player.id, game_id=game.id, mode=body.mode,
                    expires_at=utcnow() + timedelta(minutes=settings.session_minutes))
    db.add(s)
    db.flush()
    audit.record(db, f"operator:{op.slug}", "SESSION_OPENED", "session", s.id, {"player_id": player.id, "game_id": game.id, "mode": body.mode})
    db.commit()
    return s.public()


@router.get("/{token}")
def get_session(token: str, db: Session = Depends(get_db)):
    """Lecture par le client de jeu : le jeton vaut authentification."""
    s = get_open_session(db, token)
    g = db.get(Game, s.game_id)
    return {**s.public(), "game": g.public() if g else None}


@router.post("/{token}/close")
def close_session(token: str, db: Session = Depends(get_db)):
    s = get_open_session(db, token)
    s.status = "closed"
    audit.record(db, f"session:{s.id}", "SESSION_CLOSED", "session", s.id)
    db.commit()
    return s.public()
