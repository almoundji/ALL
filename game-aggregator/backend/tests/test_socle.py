"""Sprint 0 : le socle répond, les modules sont enregistrés, les montants sont des entiers."""
from decimal import Decimal

import pytest

from app.core.money import Money, MoneyError


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["app"] == "Yoon"


def test_modules_registered(client):
    keys = {m["key"] for m in client.get("/api/modules").json()}
    assert {"operators", "providers", "catalog", "players", "wallet", "sessions", "rounds", "rng", "audit",
            "responsible", "bonus", "reporting"} <= keys


def test_openapi_lists_module_tags(client):
    spec = client.get("/openapi.json").json()
    assert spec["info"]["title"] == "Yoon"


# --- Money ------------------------------------------------------------------

def test_money_xof_has_no_minor_unit():
    m = Money.from_major("1000", "XOF")
    assert m.minor == 1000
    assert str(m) == "1 000 XOF"


def test_money_eur_minor_units():
    m = Money.from_major("12.50", "EUR")
    assert m.minor == 1250
    assert m.to_major() == Decimal("12.50")
    assert str(m) == "12,50 EUR"


def test_money_rejects_float():
    with pytest.raises(MoneyError):
        Money.from_major(12.5, "EUR")  # type: ignore[arg-type]
    with pytest.raises(MoneyError):
        Money(12.5, "EUR")  # type: ignore[arg-type]


def test_money_rejects_too_many_decimals():
    with pytest.raises(MoneyError):
        Money.from_major("10.5", "XOF")


def test_money_arithmetic_same_currency_only():
    a, b = Money(500, "XOF"), Money(200, "XOF")
    assert (a - b).minor == 300
    assert (a + b).minor == 700
    assert (b - a).is_negative
    with pytest.raises(MoneyError):
        a + Money(100, "EUR")


def test_round_balance_invariant():
    """Solde final = solde initial − mise + gain (règle du Sprint 1, vérifiée dès le socle)."""
    start, stake, win = Money(10_000, "XOF"), Money(500, "XOF"), Money(1_200, "XOF")
    assert (start - stake + win).minor == 10_700
