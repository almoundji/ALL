"""M2 Fournisseurs — S1-3 enregistrement d'un fournisseur et de ses jeux."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.money import MINOR_UNITS
from ...core.security import require_admin
from ..audit import service as audit
from ..catalog.models import Game
from .models import Provider

router = APIRouter(prefix="/api/providers", tags=["Fournisseurs"])

ADAPTERS = {"internal_demo"}
CATEGORIES = {"dice", "slots", "table", "instant", "crash", "lottery"}
VOLATILITIES = {"low", "medium", "high"}


class ProviderIn(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9_-]{2,40}$")
    name: str = Field(min_length=2, max_length=120)
    adapter: str = "internal_demo"


class GameIn(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9_-]{2,60}$")
    name: str = Field(min_length=2, max_length=120)
    category: str
    rtp_bp: int = Field(ge=5000, le=10000, description="RTP en points de base : 9600 = 96,00 %")
    volatility: str = "medium"
    currency: str = "XOF"
    min_stake_minor: int = Field(ge=1)
    max_stake_minor: int = Field(ge=1)


def _pub(p: Provider) -> dict:
    return {"id": p.id, "key": p.key, "name": p.name, "adapter": p.adapter, "status": p.status}


@router.get("")
def list_providers(db: Session = Depends(get_db)):
    return [_pub(p) for p in db.scalars(select(Provider).order_by(Provider.id))]


@router.post("", status_code=201, dependencies=[Depends(require_admin)])
def create_provider(body: ProviderIn, db: Session = Depends(get_db)):
    if body.adapter not in ADAPTERS:
        raise HTTPException(422, f"Adaptateur inconnu : {body.adapter}")
    if db.scalar(select(Provider).where(Provider.key == body.key)):
        raise HTTPException(409, "Clé de fournisseur déjà utilisée")
    p = Provider(**body.model_dump())
    db.add(p)
    db.flush()
    audit.record(db, "admin", "PROVIDER_CREATED", "provider", p.id, {"key": p.key})
    db.commit()
    return _pub(p)


@router.post("/{provider_id}/games", status_code=201, dependencies=[Depends(require_admin)])
def create_game(provider_id: int, body: GameIn, db: Session = Depends(get_db)):
    p = db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "Fournisseur introuvable")
    if body.category not in CATEGORIES or body.volatility not in VOLATILITIES or body.currency not in MINOR_UNITS:
        raise HTTPException(422, "Catégorie, volatilité ou devise invalide")
    if body.min_stake_minor > body.max_stake_minor:
        raise HTTPException(422, "Mise minimale supérieure à la mise maximale")
    if db.scalar(select(Game).where(Game.provider_id == p.id, Game.key == body.key)):
        raise HTTPException(409, "Ce fournisseur a déjà un jeu avec cette clé")
    g = Game(provider_id=p.id, **body.model_dump())
    db.add(g)
    db.flush()
    audit.record(db, "admin", "GAME_CREATED", "game", g.id, {"provider": p.key, "key": g.key, "rtp_bp": g.rtp_bp})
    db.commit()
    return g.public(p)
