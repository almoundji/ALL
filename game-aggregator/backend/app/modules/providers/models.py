from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ...core.db import Base


class Provider(Base):
    """Fournisseur de jeux (studio). `adapter` désigne le connecteur : `internal_demo` au Sprint 1, callbacks signés au Sprint 3."""

    __tablename__ = "providers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    adapter: Mapped[str] = mapped_column(String(40), default="internal_demo")
    status: Mapped[str] = mapped_column(String(20), default="active")
