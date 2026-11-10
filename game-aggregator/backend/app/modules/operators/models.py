from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ...core.clock import utcnow
from ...core.db import Base


class Operator(Base):
    """Compte B2B (casino, site de paris). La clé d'API n'est stockée que hachée."""

    __tablename__ = "operators"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    currency: Mapped[str] = mapped_column(String(3), default="XOF")
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | suspended
    api_key_prefix: Mapped[str] = mapped_column(String(8), index=True)
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
