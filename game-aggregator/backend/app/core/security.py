"""Authentification Sprint 1 : clé d'administration (en-tête X-Admin-Key) et clés d'API opérateur (X-Api-Key).

Une clé d'API est affichée une seule fois à sa création ; seul son hachage SHA-256 est stocké, avec un préfixe
en clair (8 caractères) pour la retrouver.
"""
import hashlib
import hmac
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db

API_KEY_PREFIX_LEN = 8


def generate_api_key() -> str:
    return "yk_" + secrets.token_urlsafe(32)


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def key_prefix(key: str) -> str:
    return key[:API_KEY_PREFIX_LEN]


def require_admin(x_admin_key: str | None = Header(default=None)) -> str:
    if not x_admin_key or not hmac.compare_digest(x_admin_key, settings.admin_key):
        raise HTTPException(401, "Clé d'administration requise")
    return "admin"


def require_operator(x_api_key: str | None = Header(default=None), db: Session = Depends(get_db)):
    from ..modules.operators.models import Operator  # import tardif : évite le cycle

    if not x_api_key:
        raise HTTPException(401, "Clé d'API requise (en-tête X-Api-Key)")
    op = db.scalar(select(Operator).where(Operator.api_key_prefix == key_prefix(x_api_key)))
    if not op or not hmac.compare_digest(op.api_key_hash, hash_api_key(x_api_key)):
        raise HTTPException(401, "Clé d'API invalide")
    if op.status != "active":
        raise HTTPException(403, "Opérateur suspendu")
    return op
