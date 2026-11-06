import io
import json


def find(client, headers, label, q=None):
    items = client.get("/api/entities", params={"q": q or label}, headers=headers).json()["items"]
    return next(i for i in items if i["label"] == label)


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_login_failure_is_audited(client, admin):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "wrong"})
    assert r.status_code == 401
    log = client.get("/api/audit", params={"action": "LOGIN_FAILED"}, headers=admin).json()
    assert log and log[0]["username"] == "admin"


def test_clearance_filters_entities(client, admin, officer, viewer):
    total_admin = client.get("/api/entities", headers=admin).json()["total"]
    total_officer = client.get("/api/entities", headers=officer).json()["total"]
    total_viewer = client.get("/api/entities", headers=viewer).json()["total"]
    assert total_admin > total_officer > total_viewer > 0
    for item in client.get("/api/entities", headers=viewer).json()["items"]:
        assert item["classification"] == 0


def test_compartment_need_to_know(client, admin, analyst):
    # L'analyste (CD, OPS/FIN) ne doit pas voir le compartiment CYBER même au niveau CD.
    cyber = [e for e in client.get("/api/entities", params={"q": "Liberté 6"}, headers=admin).json()["items"]]
    assert cyber and cyber[0]["compartment"] == "CYBER"
    r = client.get(f"/api/entities/{cyber[0]['id']}", headers=analyst)
    assert r.status_code == 404  # existence non révélée
    assert client.get("/api/entities", params={"q": "Liberté 6"}, headers=analyst).json()["total"] == 0


def test_entity_resolution_merges_duplicates(client, analyst):
    body = {"type": "PERSON", "label": "Abdou-Karim Ndour", "attributes": {"birth_date": "1984-03-12", "alias": "Karim"}, "classification": 1}
    r = client.post("/api/entities", json=body, headers=analyst)
    assert r.status_code == 201
    merged = r.json()
    assert merged["label"] == "Abdou Karim NDOUR"  # fusionné avec l'existant
    assert merged["attributes"]["alias"] == "AK" and "Karim" in merged["attributes"]["_variants"]["alias"]
    # Téléphone : même numéro écrit différemment => une seule entité.
    r1 = client.post("/api/entities", json={"type": "PHONE", "label": "00221771234567", "attributes": {"number": "00221771234567"}}, headers=analyst)
    r2 = client.post("/api/entities", json={"type": "PHONE", "label": "77 123 45 67", "attributes": {"number": "77 123 45 67"}}, headers=analyst)
    assert r1.json()["id"] == r2.json()["id"]
    # Date de naissance différente => personne différente.
    r3 = client.post("/api/entities", json={"type": "PERSON", "label": "Abdou Karim Ndour", "attributes": {"birth_date": "1991-01-01"}}, headers=analyst)
    assert r3.json()["id"] != merged["id"]


def test_cannot_create_above_clearance(client, officer):
    r = client.post("/api/entities", json={"type": "PERSON", "label": "Test SD", "classification": 3}, headers=officer)
    assert r.status_code == 403


def test_viewer_cannot_write(client, viewer):
    assert client.post("/api/entities", json={"type": "PERSON", "label": "X Y"}, headers=viewer).status_code == 403
    assert client.post("/api/cases", json={"title": "x"}, headers=viewer).status_code == 403


def test_graph_expand_and_path(client, admin):
    ak = find(client, admin, "Abdou Karim NDOUR")
    oumar = client.get("/api/entities", params={"q": "Oumar BA"}, headers=admin).json()["items"][0]
    g = client.get(f"/api/entities/{ak['id']}/graph", params={"depth": 2}, headers=admin).json()
    assert len(g["nodes"]) > 5 and len(g["edges"]) > 5
    p = client.get("/api/graph/path", params={"a": ak["id"], "b": oumar["id"]}, headers=admin).json()
    assert p["found"] and p["path"][0] == ak["id"] and p["path"][-1] == oumar["id"]
    an = client.get("/api/graph/analytics", headers=admin).json()
    assert an["pagerank"] and an["communities"]


def test_graph_respects_clearance(client, officer, admin):
    ak_admin = find(client, admin, "Abdou Karim NDOUR")
    # L'officier DR ne voit pas AK (CD/OPS) => 404 sur son graphe.
    assert client.get(f"/api/entities/{ak_admin['id']}/graph", headers=officer).status_code == 404
    mf = client.get("/api/entities", params={"q": "Mamadou FAYE"}, headers=officer).json()["items"][0]
    g = client.get(f"/api/entities/{mf['id']}/graph", params={"depth": 3}, headers=officer).json()
    assert all(n["classification"] <= 1 for n in g["nodes"])
    assert all(e["classification"] <= 1 for e in g["edges"])


def test_ingestion_csv_with_template_and_alert(client, analyst, admin):
    sources = client.get("/api/ingest/sources", headers=analyst).json()
    src = next(s for s in sources if s["name"] == "DEMO-ADMIN")
    tpl = client.get("/api/ingest/templates", headers=analyst).json()["annuaire_personnes"]["mapping"]
    csv_data = "nom;prenom;naissance;telephone;ville;lat;lon\n" \
               "NDOUR;Abdou Karim;1984-03-12;+221771234567;Dakar;14.69;-17.44\n" \
               "DIENG;Pape;1980-02-02;+221701112233;Rosso;16.51;-15.80\n" \
               "DIENG;Pape;1980-02-02;+221701112233;Rosso;16.51;-15.80\n"
    files = {"file": ("annuaire.csv", io.BytesIO(csv_data.encode()), "text/csv")}
    r = client.post("/api/ingest/upload", files=files, data={"source_id": src["id"], "mapping": json.dumps(tpl), "classification": 1}, headers=analyst)
    assert r.status_code == 201, r.text
    job = r.json()
    assert job["rows_total"] == 3 and job["status"] == "DONE"
    assert job["entities_merged"] >= 4  # AK + son téléphone + doublon Pape (3 entités)
    assert job["entities_created"] >= 3
    assert job["alerts_raised"] >= 1  # "Rosso" déclenche la veille
    alerts = client.get("/api/alerts", params={"status": "NEW"}, headers=admin).json()
    assert any("Rosso" in a["title"] for a in alerts)
    # La provenance est conservée sur l'entité fusionnée.
    ak = find(client, admin, "Abdou Karim NDOUR")
    detail = client.get(f"/api/entities/{ak['id']}", headers=admin).json()
    assert len(detail["provenance"]) >= 2 and detail["degree"] > 0


def test_cases_workflow(client, analyst):
    r = client.post("/api/cases", json={"title": "Dossier test", "priority": "P1", "classification": 1}, headers=analyst)
    assert r.status_code == 201
    case = r.json()
    assert case["reference"].startswith("DRN-")
    ent = client.get("/api/entities", params={"q": "Mamadou FAYE"}, headers=analyst).json()["items"][0]
    d = client.post(f"/api/cases/{case['id']}/entities", json={"entity_id": ent["id"], "role": "SUBJECT"}, headers=analyst).json()
    assert d["entities"][0]["entity"]["label"] == "Mamadou FAYE"
    d = client.post(f"/api/cases/{case['id']}/notes", json={"content": "Hypothèse A", "kind": "HYPOTHESIS"}, headers=analyst).json()
    assert d["notes"][0]["kind"] == "HYPOTHESIS"
    upd = client.patch(f"/api/cases/{case['id']}", json={"status": "CLOSED"}, headers=analyst).json()
    assert upd["status"] == "CLOSED"


def test_case_compartment_hidden(client, officer, analyst):
    refs_officer = {c["reference"] for c in client.get("/api/cases", headers=officer).json()}
    refs_analyst = {c["reference"] for c in client.get("/api/cases", headers=analyst).json()}
    assert any(r.endswith("0001") for r in refs_analyst)
    assert not any(r.endswith("0001") for r in refs_officer)


def test_watchlist_retroactive(client, analyst, admin):
    r = client.post("/api/watchlists", json={"name": "Test véhicule", "entity_type": "VEHICLE", "field": "attributes.plate", "operator": "contains", "value": "8890", "severity": "CRITICAL"}, headers=analyst)
    assert r.status_code == 201
    alerts = client.get("/api/alerts", headers=admin).json()
    hit = next(a for a in alerts if a["title"].startswith("[Test véhicule]"))
    ack = client.patch(f"/api/alerts/{hit['id']}", json={"status": "ACK", "assigned_to": "analyste"}, headers=analyst).json()
    assert ack["status"] == "ACK"


def test_dashboard(client, analyst):
    d = client.get("/api/dashboard", headers=analyst).json()
    assert d["entities"] > 0 and d["by_type"] and d["top_pagerank"]


def test_audit_chain_valid_and_admin_only(client, admin, analyst):
    assert client.get("/api/audit", headers=analyst).status_code == 403
    v = client.get("/api/audit/verify", headers=admin).json()
    assert v["valid"] is True and v["checked"] > 10
    mine = client.get("/api/audit/mine", headers=analyst).json()
    assert mine and all(e["username"] == "analyste" for e in mine)


def test_audit_chain_detects_tampering(client, admin):
    from sqlalchemy import select
    from app.core.db import SessionLocal
    from app.models import AuditLog
    from app.services.audit import verify_chain
    with SessionLocal() as db:
        row = db.execute(select(AuditLog).order_by(AuditLog.id).offset(3).limit(1)).scalar_one()
        original = row.action
        row.action = "FALSIFIÉ"
        db.flush()
        assert verify_chain(db)["valid"] is False
        row.action = original
        db.rollback()
        assert verify_chain(db)["valid"] is True


def test_user_admin(client, admin):
    r = client.post("/api/users", json={"username": "nouvel", "password": "motdepasse1", "role": "viewer", "clearance": 0}, headers=admin)
    assert r.status_code == 201
    uid = r.json()["id"]
    r = client.patch(f"/api/users/{uid}", json={"clearance": 2, "compartments": "OPS"}, headers=admin)
    assert r.json()["clearance"] == 2
