from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ...core.clock import utcnow
from ...core.db import Base


class LedgerEntry(Base):
    """Écriture du grand livre. Le solde d'un joueur est la somme de ses écritures (montants signés, unités mineures).

    L'idempotence est garantie par (operator_id, idempotency_key) unique ; `request_hash` détecte une réutilisation
    de clé avec un contenu différent.
    """

    __tablename__ = "ledger_entries"
    __table_args__ = (UniqueConstraint("operator_id", "idempotency_key"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # credit | debit | win | stake | rollback
    amount_minor: Mapped[int] = mapped_column(Integer)  # signé : + crédit, − débit
    currency: Mapped[str] = mapped_column(String(3))
    balance_after_minor: Mapped[int] = mapped_column(Integer)
    idempotency_key: Mapped[str] = mapped_column(String(120))
    request_hash: Mapped[str] = mapped_column(String(64))
    reference: Mapped[str] = mapped_column(String(80), default="")  # ex. round:12
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    def public(self) -> dict:
        return {"id": self.id, "player_id": self.player_id, "kind": self.kind, "amount_minor": self.amount_minor, "currency": self.currency,
                "balance_after_minor": self.balance_after_minor, "idempotency_key": self.idempotency_key, "reference": self.reference,
                "created_at": self.created_at}
