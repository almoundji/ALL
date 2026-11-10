"""Données de démonstration (dev / recette) : fournisseur interne, jeu « Dés de Yoon », opérateur de démo."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .core.config import settings
from .core.security import hash_api_key, key_prefix
from .modules.catalog.models import Game, OperatorGame
from .modules.operators.models import Operator
from .modules.providers.models import Provider


def seed_demo(db: Session) -> None:
    prov = db.scalar(select(Provider).where(Provider.key == "yoon-demo"))
    if not prov:
        prov = Provider(key="yoon-demo", name="Yoon Studio (démonstration)", adapter="internal_demo")
        db.add(prov)
        db.flush()
    game = db.scalar(select(Game).where(Game.provider_id == prov.id, Game.key == "des-de-yoon"))
    if not game:
        game = Game(provider_id=prov.id, key="des-de-yoon", name="Dés de Yoon", category="dice", rtp_bp=9600, volatility="low",
                    currency=settings.default_currency, min_stake_minor=100, max_stake_minor=100_000)
        db.add(game)
        db.flush()
    op = db.scalar(select(Operator).where(Operator.slug == "operateur-demo"))
    if not op:
        k = settings.demo_operator_key
        op = Operator(name="Opérateur démo", slug="operateur-demo", currency=settings.default_currency, api_key_prefix=key_prefix(k), api_key_hash=hash_api_key(k))
        db.add(op)
        db.flush()
    if not db.scalar(select(OperatorGame).where(OperatorGame.operator_id == op.id, OperatorGame.game_id == game.id)):
        db.add(OperatorGame(operator_id=op.id, game_id=game.id, active=True))
    db.commit()
