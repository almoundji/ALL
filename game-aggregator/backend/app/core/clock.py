"""Horloge unique : UTC naïf (stocké tel quel en base, affiché en UTC)."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
