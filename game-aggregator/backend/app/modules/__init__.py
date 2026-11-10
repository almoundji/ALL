"""Registre des modules de Yoon.

Chaque module est un paquet `app.modules.<clé>` exposant un `router` FastAPI dans `api.py` et ses tables dans `models.py`.
Le registre alimente `GET /api/modules` (feuille de route) et garantit l'import des modèles avant `create_all`.
"""
from dataclasses import dataclass
from importlib import import_module

from fastapi import APIRouter


@dataclass(frozen=True)
class Module:
    key: str
    name: str
    name_en: str
    sprint: int
    status: str  # planifié | en cours | livré
    router: APIRouter


def _load(key: str, name: str) -> APIRouter:
    try:
        import_module(f"app.modules.{key}.models")
    except ModuleNotFoundError:
        pass
    try:
        return import_module(f"app.modules.{key}.api").router
    except ModuleNotFoundError:
        return APIRouter(prefix=f"/api/{key}", tags=[name])


# clé, nom FR, nom EN, sprint, état
_SPEC: list[tuple[str, str, str, int, str]] = [
    ("audit", "Journal d'audit", "Audit log", 1, "livré"),
    ("operators", "Opérateurs", "Operators", 1, "livré"),
    ("providers", "Fournisseurs", "Providers", 1, "livré"),
    ("catalog", "Catalogue", "Catalogue", 1, "livré"),
    ("players", "Joueurs", "Players", 1, "livré"),
    ("wallet", "Portefeuille", "Wallet", 1, "livré"),
    ("sessions", "Sessions", "Sessions", 1, "livré"),
    ("rng", "RNG équitable", "Provably fair RNG", 1, "livré"),
    ("rounds", "Tours de jeu", "Game rounds", 1, "livré"),
    ("responsible", "Jeu responsable", "Responsible gaming", 2, "planifié"),
    ("bonus", "Bonus", "Bonuses", 5, "planifié"),
    ("reporting", "Reporting et facturation", "Reporting and invoicing", 6, "planifié"),
]

MODULES: list[Module] = [Module(k, n, en, s, st, _load(k, n)) for k, n, en, s, st in _SPEC]
