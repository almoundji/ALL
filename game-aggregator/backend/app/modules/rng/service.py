"""M8 RNG prouvablement équitable (S1-8).

Avant le tour, le serveur publie `sha256(server_seed)`. Le résultat est `HMAC-SHA256(server_seed, f"{client_seed}:{nonce}")`
réduit en un entier dans [0, 10000). Après clôture, `server_seed` est révélé : n'importe qui peut recalculer.
Les vrais fournisseurs (Sprint 3) apportent leur propre RNG certifié ; celui-ci sert au fournisseur de démonstration.
"""
import hashlib
import hmac
import secrets

RANGE = 10_000


def new_server_seed() -> str:
    return secrets.token_hex(32)


def commitment(server_seed: str) -> str:
    return hashlib.sha256(server_seed.encode()).hexdigest()


def roll(server_seed: str, client_seed: str, nonce: int) -> int:
    digest = hmac.new(server_seed.encode(), f"{client_seed}:{nonce}".encode(), hashlib.sha256).hexdigest()
    return int(digest[:8], 16) % RANGE
