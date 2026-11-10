from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ...core.clock import utcnow
from ...core.db import Base


class GameSession(Base):
    """Session de jeu : jeton opaque remis au client de jeu, expirant après inactivité."""

    __tablename__ = "game_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"))
    mode: Mapped[str] = mapped_column(String(10))  # demo | real
    status: Mapped[str] = mapped_column(String(10), default="open")  # open | closed
    nonce: Mapped[int] = mapped_column(Integer, default=0)  # compteur de tours pour le RNG
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_activity: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    def public(self) -> dict:
        return {"id": self.id, "token": self.token, "operator_id": self.operator_id, "player_id": self.player_id, "game_id": self.game_id,
                "mode": self.mode, "status": self.status, "nonce": self.nonce, "created_at": self.created_at, "expires_at": self.expires_at,
                "launch_url": f"/play/{self.token}"}
