from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.money import Money
from ...core.security import require_operator
from ..operators.models import Operator
from ..players.api import get_player_for
from . import service
from .models import LedgerEntry

router = APIRouter(prefix="/api/wallet", tags=["Portefeuille"])


class TransactionIn(BaseModel):
    player_id: int
    kind: str = Field(pattern="^(credit|debit)$")
    amount_minor: int = Field(gt=0, description="Unités mineures (entier) ; XOF sans subdivision")
    idempotency_key: str = Field(min_length=8, max_length=120)
    reference: str = ""


@router.post("/transactions", status_code=201)
def post_transaction(body: TransactionIn, response: Response, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    player = get_player_for(db, op, body.player_id)
    try:
        e = service.post_entry(db, operator=op, player=player, kind=body.kind, amount=Money(body.amount_minor, player.currency),
                               idempotency_key=body.idempotency_key, reference=body.reference)
        db.commit()
        return {**e.public(), "replayed": False}
    except service.IdempotentReplay as r:
        response.status_code = 200
        return {**r.entry.public(), "replayed": True}


@router.get("/players/{player_id}/balance")
def get_balance(player_id: int, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    p = get_player_for(db, op, player_id)
    b = service.balance_of(db, p.id)
    return {"player_id": p.id, "balance_minor": b.minor, "currency": b.currency, "display": str(b)}


@router.get("/players/{player_id}/ledger")
def get_ledger(player_id: int, op: Operator = Depends(require_operator), db: Session = Depends(get_db)):
    p = get_player_for(db, op, player_id)
    rows = db.scalars(select(LedgerEntry).where(LedgerEntry.player_id == p.id).order_by(LedgerEntry.id.desc()).limit(200))
    return [e.public() for e in rows]
