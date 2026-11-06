import os
import tempfile

os.environ["FC_DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["FC_SEED_DEMO"] = "true"
os.environ["FC_SECRET_KEY"] = "test-secret"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, username, password):
    r = client.post("/api/auth/login", data={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _login(client, "admin", "admin123")


@pytest.fixture(scope="session")
def analyst(client):
    return _login(client, "analyste", "analyste123")


@pytest.fixture(scope="session")
def officer(client):
    return _login(client, "officier", "officier123")


@pytest.fixture(scope="session")
def viewer(client):
    return _login(client, "lecteur", "lecteur123")
