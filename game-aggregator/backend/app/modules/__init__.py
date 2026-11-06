"""Registre des modules de Yoon.

Chaque module est un paquet `app.modules.<clé>` exposant un `router` FastAPI. Au Sprint 0 les routeurs sont
vides : le registre sert à afficher la feuille de route (`GET /api/modules`) et à fixer la structure.
"""
from dataclasses import dataclass
from importlib import import_module

from fastapi import APIRouter


@dataclass(frozen=True)
class Module:
    key: str
    name: str
    sprint: int
    status: str  # planifié | en cours | livré
    router: APIRouter


def _router(key: str, name: str) -> APIRouter:
    try:
        return import_module(f"app.modules.{key}.api").router
    except ModuleNotFoundError:
        return APIRouter(prefix=f"/api/{key}", tags=[name])


_SPEC: list[tuple[str, str, int]] = [
    ("operators", "Opérateurs", 1),
    ("providers", "Fournisseurs", 1),
    ("catalog", "Catalogue", 1),
    ("players", "Joueurs", 1),
    ("wallet", "Portefeuille", 1),
    ("sessions", "Sessions", 1),
    ("rounds", "Tours de jeu", 1),
    ("rng", "RNG équitable", 1),
    ("audit", "Journal d'audit", 1),
    ("responsible", "Jeu responsable", 2),
    ("bonus", "Bonus", 5),
    ("reporting", "Reporting et facturation", 6),
]

MODULES: list[Module] = [Module(k, n, s, "planifié", _router(k, n)) for k, n, s in _SPEC]
