from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ...core.clock import utcnow
from ...core.db import Base


class Round(Base):
    """Tour de jeu : mise → résultat → gain → clôture. Les graines permettent la vérification publique."""

    __tablename__ = "rounds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("game_sessions.id"), index=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    mode: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(10), default="open")  # open | closed | rolled_back (S2)
    stake_minor: Mapped[int] = mapped_column(Integer)
    win_minor: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3))
    server_seed: Mapped[str] = mapped_column(String(64))
    server_seed_hash: Mapped[str] = mapped_column(String(64))
    client_seed: Mapped[str] = mapped_column(String(64))
    nonce: Mapped[int] = mapped_column(Integer)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def public(self, reveal: bool = True) -> dict:
        return {"id": self.id, "session_id": self.session_id, "player_id": self.player_id, "game_id": self.game_id, "mode": self.mode,
                "status": self.status, "stake_minor": self.stake_minor, "win_minor": self.win_minor, "currency": self.currency,
                "server_seed_hash": self.server_seed_hash, "server_seed": self.server_seed if reveal and self.status == "closed" else None,
                "client_seed": self.client_seed, "nonce": self.nonce, "result": self.result, "created_at": self.created_at, "closed_at": self.closed_at}
