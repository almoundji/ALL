"""Authentification JWT, mots de passe, niveaux d'habilitation et compartiments."""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from .config import settings

ALGORITHM = "HS256"

# Niveaux de classification (ordre croissant). Un utilisateur voit tout ce qui est <= son habilitation.
CLASSIFICATIONS = {0: "NP", 1: "DR", 2: "CD", 3: "SD"}
CLASSIFICATION_LABELS = {
    0: "Non protégé",
    1: "Diffusion restreinte",
    2: "Confidentiel Défense",
    3: "Secret Défense",
}

ROLES = ("admin", "analyst", "viewer")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": subject, "exp": expire, **(extra or {})}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None


def parse_compartments(raw: str | None) -> set[str]:
    return {c.strip().upper() for c in (raw or "").split(",") if c.strip()}


def can_access(user_clearance: int, user_compartments: set[str], classification: int, compartment: str | None) -> bool:
    """Règle du besoin d'en connaître : niveau suffisant ET compartiment détenu (si l'objet en a un)."""
    if classification > user_clearance:
        return False
    if compartment and compartment.strip().upper() not in user_compartments:
        return False
    return True
