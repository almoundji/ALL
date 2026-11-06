"""Résolution d'entités : normalisation, clés de blocage et appariement flou.

Objectif : une personne, un téléphone ou un véhicule signalé par trois sources différentes
ne doit exister qu'une fois dans le graphe, avec la provenance de chaque affirmation.
"""
import re
import unicodedata

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Entity

FUZZY_THRESHOLD = 90.0


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = re.sub(r"[^a-z0-9 ]+", " ", value.lower())
    return re.sub(r"\s+", " ", value).strip()


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 9 and digits[0] in "73":  # numéro mobile sénégalais sans indicatif
        digits = "221" + digits
    return digits


def normalize_plate(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


def build_key(entity_type: str, label: str, attributes: dict) -> str:
    """Clé de blocage déterministe par type (identité forte quand elle existe)."""
    attributes = attributes or {}
    if entity_type == "PHONE":
        return "phone:" + normalize_phone(attributes.get("number") or label)
    if entity_type == "VEHICLE":
        plate = attributes.get("plate") or label
        return "plate:" + normalize_plate(plate)
    if entity_type == "PERSON":
        national_id = attributes.get("national_id") or attributes.get("passport")
        if national_id:
            return "id:" + normalize_text(str(national_id))
        birth = normalize_text(str(attributes.get("birth_date", "")))
        return f"person:{normalize_text(label)}|{birth}"
    if entity_type == "ACCOUNT":
        return "iban:" + normalize_text(str(attributes.get("iban") or attributes.get("number") or label))
    if entity_type == "DEVICE":
        return "imei:" + normalize_text(str(attributes.get("imei") or attributes.get("mac") or label))
    if entity_type == "LOCATION" and attributes.get("lat") is not None and attributes.get("lon") is not None:
        return f"geo:{round(float(attributes['lat']), 4)},{round(float(attributes['lon']), 4)}"
    return f"{entity_type.lower()}:{normalize_text(label)}"


def find_match(db: Session, entity_type: str, label: str, attributes: dict) -> tuple[Entity | None, float, str]:
    """Renvoie (entité existante, score, méthode) ou (None, 0, 'none')."""
    key = build_key(entity_type, label, attributes)
    exact = db.execute(select(Entity).where(Entity.type == entity_type, Entity.normalized_key == key)).scalars().first()
    if exact:
        return exact, 100.0, "key"

    # Les identifiants forts (téléphone, plaque, pièce d'identité) ne s'apparient jamais de façon floue.
    if entity_type in ("PHONE", "VEHICLE", "ACCOUNT", "DEVICE") or key.startswith("id:"):
        return None, 0.0, "none"

    norm_label = normalize_text(label)
    candidates = db.execute(select(Entity).where(Entity.type == entity_type)).scalars().all()
    best, best_score = None, 0.0
    n_tokens = max(1, len(norm_label.split()))
    for cand in candidates:
        cand_norm = normalize_text(cand.label)
        c_tokens = max(1, len(cand_norm.split()))
        # Garde-fou : « Dakar » ne doit pas s'apparier avec « Port autonome de Dakar » (sous-ensemble de jetons).
        if min(n_tokens, c_tokens) / max(n_tokens, c_tokens) < 0.6:
            continue
        score = fuzz.token_set_ratio(norm_label, cand_norm)
        if entity_type == "PERSON":
            # Date de naissance contradictoire => pas le même individu.
            b1 = str(attributes.get("birth_date", "") or "")
            b2 = str((cand.attributes or {}).get("birth_date", "") or "")
            if b1 and b2 and b1 != b2:
                continue
        if score > best_score:
            best, best_score = cand, score
    if best and best_score >= FUZZY_THRESHOLD:
        return best, float(best_score), "fuzzy"
    return None, 0.0, "none"


def merge_attributes(existing: dict, incoming: dict) -> dict:
    """Fusion conservatrice : on n'écrase jamais une valeur connue, on garde les variantes."""
    merged = dict(existing or {})
    for k, v in (incoming or {}).items():
        if v in (None, "", []):
            continue
        if k not in merged or merged[k] in (None, ""):
            merged[k] = v
        elif merged[k] != v:
            alts = merged.setdefault("_variants", {})
            lst = alts.setdefault(k, [])
            if v not in lst and v != merged[k]:
                lst.append(v)
    return merged
