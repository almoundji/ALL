"""M5 Portefeuille interne — S1-6. Toute opération passe par `post_entry` ; aucun montant en flottant."""
import hashlib
import json

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...core.money import Money
from ..audit import service as audit
from .models import LedgerEntry


class IdempotentReplay(Exception):
    """La même clé a déjà été traitée : renvoyer la réponse d'origine."""

    def __init__(self, entry: LedgerEntry):
        self.entry = entry


def balance_of(db: Session, player_id: int) -> Money:
    from ..players.models import Player

    p = db.get(Player, player_id)
    total = db.scalar(select(func.coalesce(func.sum(LedgerEntry.amount_minor), 0)).where(LedgerEntry.player_id == player_id))
    return Money(int(total or 0), p.currency if p else "XOF")


def _req_hash(player_id: int, kind: str, amount_minor: int, reference: str) -> str:
    return hashlib.sha256(json.dumps([player_id, kind, amount_minor, reference]).encode()).hexdigest()


def post_entry(db: Session, *, operator, player, kind: str, amount: Money, idempotency_key: str, reference: str = "", actor: str | None = None) -> LedgerEntry:
    """Écrit une ligne au grand livre.

    - crédit / gain : montant positif ; débit / mise : montant négatif.
    - rejouer la même clé d'idempotence renvoie l'écriture d'origine (IdempotentReplay) ;
    - la même clé avec un contenu différent est refusée (409) ;
    - un débit supérieur au solde est refusé (402).
    """
    if amount.currency != player.currency:
        raise HTTPException(422, f"Devise {amount.currency} différente de celle du joueur ({player.currency})")
    if amount.is_zero:
        raise HTTPException(422, "Montant nul")
    signed = amount.minor if kind in ("credit", "win", "rollback") else -abs(amount.minor)
    rh = _req_hash(player.id, kind, signed, reference)
    existing = db.scalar(select(LedgerEntry).where(LedgerEntry.operator_id == operator.id, LedgerEntry.idempotency_key == idempotency_key))
    if existing:
        if existing.request_hash != rh:
            raise HTTPException(409, "Clé d'idempotence déjà utilisée avec un contenu différent")
        raise IdempotentReplay(existing)
    current = balance_of(db, player.id)
    new_balance = current + Money(signed, player.currency)
    if new_balance.is_negative:
        raise HTTPException(402, f"Solde insuffisant : {current} disponible")
    e = LedgerEntry(operator_id=operator.id, player_id=player.id, kind=kind, amount_minor=signed, currency=player.currency,
                    balance_after_minor=new_balance.minor, idempotency_key=idempotency_key, request_hash=rh, reference=reference)
    db.add(e)
    db.flush()
    audit.record(db, actor or f"operator:{operator.slug}", f"LEDGER_{kind.upper()}", "player", player.id,
                 {"amount_minor": signed, "currency": player.currency, "balance_after_minor": new_balance.minor, "reference": reference, "key": idempotency_key})
    return e
