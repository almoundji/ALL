"""Montants en unités mineures (entiers), jamais en flottants.

Règle du Sprint 0 : tout montant qui circule dans Yoon est un `Money` — un entier en unité mineure
(centimes, ou franc pour le XOF qui n'a pas de subdivision) accompagné d'un code devise ISO 4217.
Les flottants sont refusés à la construction pour éviter les erreurs d'arrondi.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal

# Nombre de décimales par devise (ISO 4217). Le XOF n'a pas de subdivision.
MINOR_UNITS: dict[str, int] = {"XOF": 0, "XAF": 0, "EUR": 2, "USD": 2, "GBP": 2, "MAD": 2, "NGN": 2, "GHS": 2, "KES": 2}


class MoneyError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class Money:
    minor: int
    currency: str

    def __post_init__(self) -> None:
        if isinstance(self.minor, bool) or not isinstance(self.minor, int):
            raise MoneyError(f"montant en unité mineure attendu (entier), reçu {type(self.minor).__name__}")
        if self.currency not in MINOR_UNITS:
            raise MoneyError(f"devise inconnue : {self.currency}")

    # --- construction ---------------------------------------------------
    @classmethod
    def zero(cls, currency: str) -> Money:
        return cls(0, currency)

    @classmethod
    def from_major(cls, amount: str | int | Decimal, currency: str) -> Money:
        """Construit depuis une valeur en unité majeure ("12.50", 1000). Les flottants sont refusés."""
        if isinstance(amount, float):
            raise MoneyError("flottant refusé : passer une chaîne ou un Decimal")
        if currency not in MINOR_UNITS:
            raise MoneyError(f"devise inconnue : {currency}")
        exp = Decimal(1).scaleb(-MINOR_UNITS[currency])
        d = Decimal(str(amount))
        q = d.quantize(exp, rounding=ROUND_HALF_EVEN)
        if q != d:
            raise MoneyError(f"{amount} a plus de décimales que la devise {currency} n'en admet")
        return cls(int(q.scaleb(MINOR_UNITS[currency])), currency)

    # --- arithmétique ---------------------------------------------------
    def _check(self, other: Money) -> None:
        if not isinstance(other, Money):
            raise MoneyError("opération entre Money uniquement")
        if other.currency != self.currency:
            raise MoneyError(f"devises différentes : {self.currency} / {other.currency}")

    def __add__(self, other: Money) -> Money:
        self._check(other)
        return Money(self.minor + other.minor, self.currency)

    def __sub__(self, other: Money) -> Money:
        self._check(other)
        return Money(self.minor - other.minor, self.currency)

    def __neg__(self) -> Money:
        return Money(-self.minor, self.currency)

    def __lt__(self, other: Money) -> bool:
        self._check(other)
        return self.minor < other.minor

    def __le__(self, other: Money) -> bool:
        self._check(other)
        return self.minor <= other.minor

    @property
    def is_negative(self) -> bool:
        return self.minor < 0

    @property
    def is_zero(self) -> bool:
        return self.minor == 0

    # --- affichage ------------------------------------------------------
    def to_major(self) -> Decimal:
        return Decimal(self.minor).scaleb(-MINOR_UNITS[self.currency])

    def __str__(self) -> str:
        digits = MINOR_UNITS[self.currency]
        major = self.to_major()
        s = f"{major:,.{digits}f}".replace(",", " ").replace(".", ",")
        return f"{s} {self.currency}"
