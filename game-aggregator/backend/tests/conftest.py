import os
import tempfile

os.environ["YOON_DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["YOON_SECRET_KEY"] = "test-secret"
os.environ["YOON_ADMIN_KEY"] = "test-admin"
os.environ["YOON_SEED_DEMO"] = "true"

import pytest
from fastapi.testclient import TestClient

from app.main import app

ADMIN = {"X-Admin-Key": "test-admin"}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin():
    return ADMIN


@pytest.fixture(scope="session")
def operator(client):
    """Un opérateur créé via l'API : renvoie (en-têtes, fiche, clé)."""
    r = client.post("/api/operators", json={"name": "Casino Test", "currency": "XOF"}, headers=ADMIN)
    assert r.status_code == 201, r.text
    data = r.json()
    return {"X-Api-Key": data["api_key"]}, data, data["api_key"]


@pytest.fixture(scope="session")
def demo_game(client, operator):
    headers, _, _ = operator
    games = client.get("/api/catalog/games", headers=headers).json()
    g = next(x for x in games if x["key"] == "des-de-yoon")
    client.post(f"/api/catalog/games/{g['id']}/activate", headers=headers)
    return g


@pytest.fixture()
def player(client, operator):
    headers, _, _ = operator
    import uuid
    r = client.post("/api/players", json={"external_id": f"p-{uuid.uuid4().hex[:8]}", "display_name": "Awa", "birth_date": "1990-05-10"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()
