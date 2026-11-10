from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ...core.clock import utcnow
from ...core.db import Base


class Player(Base):
    """Joueur rattaché à un opérateur ; `external_id` est l'identifiant côté opérateur, unique par opérateur."""

    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("operator_id", "external_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    external_id: Mapped[str] = mapped_column(String(80))
    display_name: Mapped[str] = mapped_column(String(120), default="")
    birth_date: Mapped[date] = mapped_column(Date)
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | suspended | self_excluded (S2)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
