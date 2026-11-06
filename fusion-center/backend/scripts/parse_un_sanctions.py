# Liste consolidée du Conseil de sécurité de l'ONU (XML public, version française) -> CSV individus / entités.
# Périmètre retenu pour la démo : Afrique (listes régionales africaines + entrées Al-Qaida/autres liées à un pays africain).
import csv, re, sys, xml.etree.ElementTree as ET

AFRICA = {"Mali","Niger","Burkina Faso","Mauritanie","Sénégal","Senegal","Nigéria","Nigeria","Algérie","Algeria","Libye","Libya","Tchad","Chad","Guinée","Guinea","Gambie","Gambia","Guinée-Bissau","Guinea-Bissau","Côte d'Ivoire","Ghana","Togo","Bénin","Benin","Maroc","Morocco","Tunisie","Tunisia","Égypte","Egypt","Soudan","Sudan","Somalie","Somalia","Kenya","Éthiopie","Ethiopia","Érythrée","Eritrea","Cameroun","Cameroon","République centrafricaine","Central African Republic","République démocratique du Congo","Democratic Republic of the Congo","Congo","Ouganda","Uganda","Tanzanie","Tanzania","Mozambique","Afrique du Sud","South Africa","Djibouti","Sierra Leone","Libéria","Liberia","Cabo Verde","Cap-Vert","Sahara","Soudan du Sud","South Sudan","Rwanda","Burundi","Angola","Zambie","Madagascar","Comores","Seychelles","Maurice","Gabon","Guinée équatoriale"}
AFRICAN_LISTS = {"Libya","Somalia","CAR","DRC","Sudan","SouthSudan","GB","Mali"}

def t(el, path):
    x = el.find(path); return re.sub(r"\s+", " ", x.text).strip() if x is not None and x.text else ""

def africa_related(el, list_type):
    if list_type in AFRICAN_LISTS: return True
    blob = " ".join([t(n, "VALUE") for n in el.findall("NATIONALITY")] + [t(a, "COUNTRY") for a in el.findall("INDIVIDUAL_ADDRESS")] + [t(a, "COUNTRY") for a in el.findall("ENTITY_ADDRESS")] + [t(p, "COUNTRY") for p in el.findall("INDIVIDUAL_PLACE_OF_BIRTH")] + [t(el, "COMMENTS1")[:400]])
    return any(c in blob for c in AFRICA)

tree = ET.parse(sys.argv[1]); root = tree.getroot()
ind_rows, ent_rows = [], []
for el in root.iter("INDIVIDUAL"):
    lt = t(el, "UN_LIST_TYPE")
    if not africa_related(el, lt): continue
    names = [t(el, f) for f in ("FIRST_NAME","SECOND_NAME","THIRD_NAME","FOURTH_NAME")]
    full = " ".join(n for n in names if n)
    dob = ""
    for d in el.findall("INDIVIDUAL_DATE_OF_BIRTH"):
        dob = t(d, "DATE") or t(d, "YEAR") or dob
        if dob: break
    pob = "; ".join(filter(None, [", ".join(filter(None, [t(p,"CITY"), t(p,"STATE_PROVINCE"), t(p,"COUNTRY")])) for p in el.findall("INDIVIDUAL_PLACE_OF_BIRTH")]))
    nat = "; ".join(filter(None, [t(n,"VALUE") for n in el.findall("NATIONALITY")]))
    aliases = "; ".join(filter(None, [t(a,"ALIAS_NAME") for a in el.findall("INDIVIDUAL_ALIAS") if t(a,"QUALITY") in ("Good","Bon","a.k.a.","")][:6]))
    addr = "; ".join(filter(None, [", ".join(filter(None, [t(a,"CITY"), t(a,"COUNTRY")])) for a in el.findall("INDIVIDUAL_ADDRESS")]))
    ind_rows.append({"nom_complet": full, "date_naissance": dob, "lieu_naissance": pob, "nationalite": nat, "alias": aliases, "adresse": addr, "liste": lt, "reference": t(el,"REFERENCE_NUMBER"), "inscrit_le": t(el,"LISTED_ON")[:10], "fonction": "; ".join(filter(None,[t(d,"VALUE") for d in el.findall("DESIGNATION")]))[:200], "resume": re.sub(r"\s+"," ", t(el,"COMMENTS1"))[:600]})
for el in root.iter("ENTITY"):
    lt = t(el, "UN_LIST_TYPE")
    if not africa_related(el, lt): continue
    aliases = "; ".join(filter(None, [t(a,"ALIAS_NAME") for a in el.findall("ENTITY_ALIAS")][:6]))
    addr = "; ".join(filter(None, [", ".join(filter(None, [t(a,"STREET"), t(a,"CITY"), t(a,"COUNTRY")])) for a in el.findall("ENTITY_ADDRESS")]))
    ent_rows.append({"nom": t(el,"FIRST_NAME"), "alias": aliases, "adresse": addr, "liste": lt, "reference": t(el,"REFERENCE_NUMBER"), "inscrit_le": t(el,"LISTED_ON")[:10], "resume": re.sub(r"\s+"," ", t(el,"COMMENTS1"))[:600]})
for name, rows in (("sanctions_onu_individus.csv", ind_rows), ("sanctions_onu_entites.csv", ent_rows)):
    with open("opendata/"+name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";"); w.writeheader(); w.writerows(rows)
print("individus", len(ind_rows), "entités", len(ent_rows)); print({r["liste"] for r in ind_rows}); print(ind_rows[0]); print(ent_rows[0])
