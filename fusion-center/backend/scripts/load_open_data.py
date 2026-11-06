"""Charge les données ouvertes de référence dans un Centre de Fusion (local ou Netlify) via l'API.

Sources :
  - lieux_reference_senegal.csv : points de passage, ports, aéroports, infrastructures, chefs-lieux (OpenStreetMap / Nominatim, ODbL)
  - sanctions_onu_individus.csv / sanctions_onu_entites.csv : liste consolidée du Conseil de sécurité de l'ONU (périmètre Afrique)

Usage : python scripts/load_open_data.py --url http://localhost:8000 --user admin --password admin123 [--only lieux|onu]
"""
import argparse, json, pathlib, sys, urllib.parse, urllib.request

HERE = pathlib.Path(__file__).resolve().parent.parent / "data" / "open"

SOURCES = {
    "OSM-NOMINATIM": {"type": "OSINT", "reliability": "B", "description": "Référentiel géographique OpenStreetMap (géocodage Nominatim, licence ODbL)", "classification": 0},
    "ONU-SANCTIONS": {"type": "PARTNER", "reliability": "A", "description": "Liste consolidée du Conseil de sécurité des Nations unies (scsanctions.un.org), périmètre Afrique", "classification": 0},
}
JOBS = [
    ("lieux", "lieux_reference_senegal.csv", "OSM-NOMINATIM", {"entities": [{"ref": "l", "type": "LOCATION", "label": "{libelle}", "attributes": {"kind": "{type}", "osm": "{osm}", "address": "{adresse}"}, "lat": "{lat}", "lon": "{lon}", "classification": 0}], "relations": []}),
    ("onu", "sanctions_onu_individus.csv", "ONU-SANCTIONS", {"entities": [{"ref": "p", "type": "PERSON", "label": "{nom_complet}", "attributes": {"birth_date": "{date_naissance}", "birth_place": "{lieu_naissance}", "nationality": "{nationalite}", "alias": "{alias}", "address": "{adresse}", "un_list": "{liste}", "un_reference": "{reference}", "listed_on": "{inscrit_le}", "designation": "{fonction}", "summary": "{resume}", "list": "ONU"}, "classification": 0}], "relations": []}),
    ("onu", "sanctions_onu_entites.csv", "ONU-SANCTIONS", {"entities": [{"ref": "o", "type": "ORGANIZATION", "label": "{nom}", "attributes": {"alias": "{alias}", "address": "{adresse}", "un_list": "{liste}", "un_reference": "{reference}", "listed_on": "{inscrit_le}", "summary": "{resume}", "list": "ONU"}, "classification": 0}], "relations": []}),
]


def call(base, path, token=None, data=None, form=None, files=None):
    url = base.rstrip("/") + path
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    if files:
        boundary = "----fusion" + "x" * 16
        body = b""
        for k, v in (form or {}).items():
            body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        for k, (fname, content) in files.items():
            body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{fname}\"\r\nContent-Type: text/csv\r\n\r\n".encode() + content + b"\r\n"
        body += f"--{boundary}--\r\n".encode()
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    elif form is not None:
        req = urllib.request.Request(url, data=urllib.parse.urlencode(form).encode(), headers=headers, method="POST")
    elif data is not None:
        headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method="POST")
    else:
        req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--url", default="http://localhost:8000"); ap.add_argument("--user", default="admin"); ap.add_argument("--password", default="admin123"); ap.add_argument("--only", default=None)
    a = ap.parse_args()
    st, tok = call(a.url, "/api/auth/login", form={"username": a.user, "password": a.password})
    if st != 200: sys.exit(f"connexion refusée : {tok}")
    token = tok["access_token"]
    _, sources = call(a.url, "/api/ingest/sources", token)
    by_name = {s["name"]: s for s in sources}
    for name, spec in SOURCES.items():
        if name not in by_name:
            st, src = call(a.url, "/api/ingest/sources", token, data={"name": name, **spec}); by_name[name] = src
            print("source créée :", name)
    for tag, fname, source, mapping in JOBS:
        if a.only and a.only != tag: continue
        path = HERE / fname
        st, job = call(a.url, "/api/ingest/upload", token, form={"source_id": by_name[source]["id"], "mapping": json.dumps(mapping), "classification": 0}, files={"file": (fname, path.read_bytes())})
        if st not in (200, 201): sys.exit(f"échec {fname} : {job}")
        print(f"{fname}: {job['status']} · {job['rows_total']} lignes · {job['entities_created']} créées · {job['entities_merged']} fusionnées · {job['alerts_raised']} alertes" + (f" · erreurs : {job['errors'][:3]}" if job["errors"] else ""))


if __name__ == "__main__":
    main()
