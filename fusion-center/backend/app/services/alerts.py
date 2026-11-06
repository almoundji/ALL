"""Moteur de veille : évalue les listes de surveillance sur chaque entité créée ou modifiée."""
import re

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Alert, Entity, Watchlist
from .resolution import normalize_text


def _field_value(entity: Entity, field: str) -> str:
    if field == "label":
        return entity.label or ""
    if field.startswith("attributes."):
        return str((entity.attributes or {}).get(field.split(".", 1)[1], "") or "")
    return str(getattr(entity, field, "") or "")


def matches(rule: Watchlist, entity: Entity) -> bool:
    if rule.entity_type and rule.entity_type != entity.type:
        return False
    value = _field_value(entity, rule.field)
    if rule.operator == "equals":
        return normalize_text(value) == normalize_text(rule.value)
    if rule.operator == "contains":
        return normalize_text(rule.value) in normalize_text(value)
    if rule.operator == "fuzzy":
        return fuzz.token_set_ratio(normalize_text(value), normalize_text(rule.value)) >= 85
    if rule.operator == "regex":
        try:
            return re.search(rule.value, value, flags=re.IGNORECASE) is not None
        except re.error:
            return False
    return False


def evaluate(db: Session, entity: Entity) -> list[Alert]:
    raised = []
    rules = db.execute(select(Watchlist).where(Watchlist.is_active.is_(True))).scalars().all()
    for rule in rules:
        if not matches(rule, entity):
            continue
        already = db.execute(
            select(Alert).where(Alert.watchlist_id == rule.id, Alert.entity_id == entity.id, Alert.status != "CLOSED")
        ).scalars().first()
        if already:
            continue
        alert = Alert(
            watchlist_id=rule.id, entity_id=entity.id, severity=rule.severity,
            title=f"[{rule.name}] correspondance : {entity.label}",
            message=f"L'entité {entity.type} « {entity.label} » correspond à la règle « {rule.name} » "
                    f"({rule.field} {rule.operator} '{rule.value}').",
        )
        db.add(alert)
        raised.append(alert)
    db.flush()
    return raised
