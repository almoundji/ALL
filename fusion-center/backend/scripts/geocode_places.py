# Référentiel géographique du Sénégal : points de passage, ports, aéroports, infrastructures, chefs-lieux.
# Géocodage via Nominatim (OpenStreetMap, ODbL), 1 requête/seconde, résultat en CSV prêt pour l'ingestion.
import csv, json, sys, time, urllib.parse, urllib.request

PLACES = [
    # (libellé, requête Nominatim, type)
    ("Poste frontière Rosso", "Rosso, Saint-Louis, Sénégal", "Point de passage"),
    ("Poste frontière Karang", "Karang, Foundiougne, Sénégal", "Point de passage"),
    ("Poste frontière Kidira", "Kidira, Tambacounda, Sénégal", "Point de passage"),
    ("Poste frontière Moussala", "Moussala, Kédougou, Sénégal", "Point de passage"),
    ("Poste frontière Diaobé-Pakour", "Pakour, Kolda, Sénégal", "Point de passage"),
    ("Poste frontière Mpack", "Mpack, Ziguinchor, Sénégal", "Point de passage"),
    ("Poste frontière Séléti", "Séléti, Bignona, Sénégal", "Point de passage"),
    ("Poste frontière Keur Ayip", "Keur Ayip, Nioro du Rip, Sénégal", "Point de passage"),
    ("Poste frontière Bakel", "Bakel, Sénégal", "Point de passage"),
    ("Poste frontière Diama", "Diama, Saint-Louis, Sénégal", "Point de passage"),
    ("Aéroport international Blaise Diagne (AIBD)", "Aéroport international Blaise Diagne, Diass, Sénégal", "Infrastructure critique"),
    ("Aéroport de Ziguinchor", "Aéroport de Ziguinchor, Sénégal", "Infrastructure critique"),
    ("Aéroport de Saint-Louis", "Aéroport de Saint-Louis, Sénégal", "Infrastructure critique"),
    ("Aéroport de Cap Skirring", "Cap Skirring, Sénégal", "Infrastructure critique"),
    ("Port autonome de Dakar", "Port autonome de Dakar, Sénégal", "Infrastructure critique"),
    ("Port de Ziguinchor", "Port de Ziguinchor, Sénégal", "Infrastructure critique"),
    ("Port de Kaolack", "Kaolack, Sénégal", "Infrastructure critique"),
    ("Quai de pêche de Mbour", "Mbour, Sénégal", "Quai"),
    ("Quai de pêche de Joal", "Joal-Fadiouth, Sénégal", "Quai"),
    ("Quai de pêche de Saint-Louis (Guet Ndar)", "Guet Ndar, Saint-Louis, Sénégal", "Quai"),
    ("Quai de pêche de Kayar", "Kayar, Sénégal", "Quai"),
    ("Barrage de Diama", "Barrage de Diama, Sénégal", "Infrastructure critique"),
    ("Centrale électrique du Cap des Biches", "Cap des Biches, Rufisque, Sénégal", "Infrastructure critique"),
    ("Raffinerie SAR de Mbao", "Mbao, Pikine, Sénégal", "Infrastructure critique"),
    ("Gare de Dakar", "Gare de Dakar, Sénégal", "Infrastructure critique"),
    ("Palais de la République", "Palais de la République, Dakar, Sénégal", "Site sensible"),
    ("Place de l'Indépendance Dakar", "Place de l'Indépendance, Dakar, Sénégal", "Site sensible"),
    ("Marché Sandaga", "Marché Sandaga, Dakar, Sénégal", "Marché"),
    ("Marché Colobane", "Colobane, Dakar, Sénégal", "Marché"),
    ("Gare routière des Baux Maraîchers", "Baux Maraîchers, Pikine, Sénégal", "Gare routière"),
    ("Université Cheikh Anta Diop", "Université Cheikh Anta Diop, Dakar, Sénégal", "Site sensible"),
] + [(f"Chef-lieu de région : {r}", f"{r}, Sénégal", "Chef-lieu") for r in
     ["Dakar", "Thiès", "Diourbel", "Fatick", "Kaolack", "Kaffrine", "Kolda", "Kédougou", "Louga", "Matam", "Saint-Louis", "Sédhiou", "Tambacounda", "Ziguinchor"]]

out = []
for label, q, kind in PLACES:
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "json", "limit": 1, "countrycodes": "sn"})
    req = urllib.request.Request(url, headers={"User-Agent": "CentreFusionDemo/0.1 (geocodage referentiel; contact: equipe projet)"})
    try:
        data = json.load(urllib.request.urlopen(req, timeout=30))
    except Exception as e:
        print("ERREUR", label, e, file=sys.stderr); data = []
    if data:
        out.append({"libelle": label, "type": kind, "lat": round(float(data[0]["lat"]), 5), "lon": round(float(data[0]["lon"]), 5), "osm": f"{data[0]['osm_type']}/{data[0]['osm_id']}", "adresse": data[0].get("display_name", "")[:120]})
        print("OK ", label, out[-1]["lat"], out[-1]["lon"])
    else:
        print("NON TROUVÉ", label)
    time.sleep(1.1)
with open("opendata/lieux_reference_senegal.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["libelle", "type", "lat", "lon", "osm", "adresse"], delimiter=";"); w.writeheader(); w.writerows(out)
print(len(out), "lieux écrits")
