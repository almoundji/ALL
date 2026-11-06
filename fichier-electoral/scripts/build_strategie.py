#!/usr/bin/env python3
"""Prépare les données de l'onglet « Stratégie électorale » -> data/strategie.json

Entrées (data/sources/) :
  elections/*.csv           résultats électoraux, format long séparé par « ; » :
                            election;niveau;region;departement;liste_ou_candidat;voix;inscrits;votants;exprimes;sieges
                            (niveau = national | diaspora | region | departement)
  elections/config.json     métadonnées des scrutins et familles politiques (rattachement des listes)
  reglementation/sieges_legislatives.csv   sièges par circonscription (décret de répartition)
  reglementation/calendrier.csv            calendrier électoral
  reglementation/cadre_juridique.md        synthèse du cadre juridique (affichée telle quelle)
  reglementation/inscrits_2024.csv         référence d'inscrits 2024 (région / département), facultatif
"""
import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "sources"
OUT = ROOT / "data" / "strategie.json"

# Orthographes divergentes entre sources -> libellé de la carte électorale
ALIAS = {"BIRKELANE": "BIRKILANE", "KOUNGUEL": "KOUNGHEUL", "MALEM HODDAR": "MALEM HODAR", "NIORO": "NIORO DU RIP",
         "MEDINA YORO FOULA": "MEDINA YORO FOULAH", "RANEROU": "RANEROU FERLO",
         # Départements de l'extérieur : libellés des résultats -> libellés du décret de répartition
         "AFRIQUE CENTRALE": "AFRIQUE DU CENTRE", "EUROPE OUEST CENTRE NORD": "EUROPE DE L OUEST DU CENTRE ET DU NORD",
         "AMERIQUE OCEANIE": "AMERIQUES OCEANIE"}


def key(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    k = re.sub(r"[^A-Za-z0-9]+", " ", s).upper().strip()
    return ALIAS.get(k, k)


def num(v):
    v = str(v or "").replace(" ", "").replace("\xa0", "").replace(" ", "").replace(",", ".")
    try:
        return int(round(float(v)))
    except ValueError:
        return None


def read_csv(path):
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    return list(csv.DictReader(text.splitlines(), delimiter=";"))


def load_elections(config):
    elections = {}
    for path in sorted((SRC / "elections").glob("*.csv")):
        for r in read_csv(path):
            eid = (r.get("election") or "").strip()
            if not eid:
                continue
            e = elections.setdefault(eid, {"id": eid, "national": None, "diaspora": None, "diasporaZones": {}, "regions": {}, "depts": {}, "fichier": path.name})
            niveau = (r.get("niveau") or "").strip().lower()
            if niveau == "national":
                z = e["national"] = e["national"] or {"voix": {}, "sieges": {}}
            elif niveau == "diaspora":
                k = key(r.get("departement"))
                if k and k != "TOTAL DIASPORA":
                    z = e["diasporaZones"].setdefault(k, {"nom": r.get("departement", "").strip(), "voix": {}, "sieges": {}})
                else:
                    z = e["diaspora"] = e["diaspora"] or {"voix": {}, "sieges": {}}
            elif niveau == "region":
                k = key(r.get("region"))
                z = e["regions"].setdefault(k, {"nom": r.get("region", "").strip(), "voix": {}, "sieges": {}})
            elif niveau in ("departement", "département"):
                k = key(r.get("departement"))
                if not k:
                    continue
                z = e["depts"].setdefault(k, {"nom": r.get("departement", "").strip(), "region": r.get("region", "").strip(), "voix": {}, "sieges": {}})
            else:
                continue
            for f in ("inscrits", "votants", "exprimes"):
                v = num(r.get(f))
                if v is not None:
                    z[f] = v
            liste = (r.get("liste_ou_candidat") or "").strip()
            if liste:
                v = num(r.get("voix"))
                if v is not None:
                    z["voix"][liste] = v
                s = num(r.get("sieges"))
                if s is not None:
                    z["sieges"][liste] = s
    meta = config.get("elections", {})
    out = []
    for eid, e in elections.items():
        e.update(meta.get(eid, {}))
        e.setdefault("label", eid)
        e.setdefault("type", "legislatives" if "L" in eid[:2].upper() else "presidentielle")
        e.setdefault("date", "")
        # Exprimés manquants : somme des voix
        for z in [e["national"], e["diaspora"], *e["diasporaZones"].values(), *e["regions"].values(), *e["depts"].values()]:
            if z and "exprimes" not in z and z["voix"]:
                z["exprimes_calc"] = sum(z["voix"].values())
        out.append(e)
    out.sort(key=lambda e: e.get("date") or e["id"])
    return out


def main():
    cfg_path = SRC / "elections" / "config.json"
    config = json.loads(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
    elections = load_elections(config)

    sieges = []
    for r in read_csv(SRC / "reglementation" / "sieges_legislatives.csv"):
        sieges.append({"nom": r["circonscription"].strip(), "key": key(r["circonscription"]), "type": r["type"].strip(),
                       "region": r["region"].strip(), "sieges": num(r["sieges"]), "source": r.get("source", "").strip()})
    calendrier = []
    for r in read_csv(SRC / "reglementation" / "calendrier.csv"):
        extra = r.pop(None, None)  # champ « source » contenant des « ; »
        row = {k: (v or "").strip() for k, v in r.items()}
        if extra:
            row["source"] = " ; ".join([row.get("source", "")] + [x.strip() for x in extra if x.strip()])
        calendrier.append(row)
    cadre = (SRC / "reglementation" / "cadre_juridique.md").read_text(encoding="utf-8")
    inscrits2024 = []
    p = SRC / "reglementation" / "inscrits_2024.csv"
    if p.exists():
        inscrits2024 = [{"niveau": r["niveau"], "nom": r["nom"], "key": key(r["nom"]), "inscrits": num(r["inscrits"]), "approx": r.get("approx", "") == "1", "source": r.get("source", "")} for r in read_csv(p)]

    data = {
        "elections": elections,
        "familles": config.get("familles", []),
        "sieges": sieges,
        "calendrier": calendrier,
        "cadreJuridique": cadre,
        "inscrits2024": inscrits2024,
        "sources": config.get("sources", []),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tot = sum(s["sieges"] or 0 for s in sieges)
    print(f"strategie.json : {len(elections)} scrutins ({', '.join(e['id'] for e in elections)}), {len(sieges)} circonscriptions ({tot} sièges), {OUT.stat().st_size // 1024} Ko")
    for e in elections:
        print(f"  {e['id']:26s} national={'oui' if e['national'] else 'non'} diaspora={'oui' if e['diaspora'] else 'non'} zones={len(e['diasporaZones'])} départements={len(e['depts'])}")
    connus = {s["key"] for s in sieges}
    for e in elections:
        for k in list(e["depts"]) + list(e["diasporaZones"]):
            if k not in connus:
                print(f"  ! {e['id']} : circonscription « {k} » absente du décret de répartition")


if __name__ == "__main__":
    main()
