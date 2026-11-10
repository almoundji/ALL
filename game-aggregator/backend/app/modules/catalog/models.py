from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ...core.db import Base


class Game(Base):
    """Jeu normalisé du catalogue unifié. Mises en unités mineures, RTP en points de base."""

    __tablename__ = "games"
    __table_args__ = (UniqueConstraint("provider_id", "key"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"), index=True)
    key: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(20), index=True)
    rtp_bp: Mapped[int] = mapped_column(Integer)
    volatility: Mapped[str] = mapped_column(String(10))
    currency: Mapped[str] = mapped_column(String(3))
    min_stake_minor: Mapped[int] = mapped_column(Integer)
    max_stake_minor: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="active")

    def public(self, provider=None, active: bool | None = None) -> dict:
        d = {"id": self.id, "provider_id": self.provider_id, "key": self.key, "name": self.name, "category": self.category,
             "rtp_bp": self.rtp_bp, "rtp_percent": self.rtp_bp / 100, "volatility": self.volatility, "currency": self.currency,
             "min_stake_minor": self.min_stake_minor, "max_stake_minor": self.max_stake_minor, "status": self.status}
        if provider is not None:
            d["provider"] = {"id": provider.id, "key": provider.key, "name": provider.name}
        if active is not None:
            d["active"] = active
        return d


class OperatorGame(Base):
    """Activation d'un jeu pour un opérateur."""

    __tablename__ = "operator_games"
    __table_args__ = (UniqueConstraint("operator_id", "game_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
