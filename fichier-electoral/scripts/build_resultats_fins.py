#!/usr/bin/env python3
"""Résultats par commune et par bureau de vote -> data/resultats/<SCRUTIN>/

Source actuelle : Législatives du 17/11/2024, archive SAGE (Small-Area Global Elections Archive,
licence MIT), d'après les résultats du Conseil constitutionnel. Couverture partielle : 27 départements
sur 46, pas de diaspora, et la liste Takku Wallu Sénégal absente de 26 de ces 27 départements
(voir data/sources/resultats/inventaire_sources.md).

Sorties :
  data/resultats/L2024/index.json        listes, couverture par département, agrégats par commune
  data/resultats/L2024/<DEPT>.json       détail par lieu de vote et par bureau (chargé à la demande)
"""
import csv
import gzip
import io
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "sources" / "resultats"
OUT = ROOT / "data" / "resultats" / "L2024"

# Libellés SAGE (partiellement traduits en anglais) -> libellés officiels
NOMS = {
    "Patriots of Senegal": "PASTEF",
    "Takku Wallu Sénégal": "Takku Wallu Sénégal",
    "Jàmm ak Njariñ": "Jàmm ak Njariñ",
    "Sàmm Sa Kàddu": "Sàmm Sa Kàddu",
    "The March of the Territories / Andu Nawlé": "La Marche des Territoires / Andu Nawlé",
    "The Nationalists / Jël Linu Moom": "Les Nationalistes / Jël Linu Moom",
    "Together for Senegal": "Ensemble pour le Sénégal (PEPS)",
    "National Alliance for the Fatherland": "Alliance nationale pour la patrie",
    "Union of Patriotic Groups": "Union des groupements patriotiques",
    "Great Rally of Artisans of Senegal": "Grand rassemblement des artisans du Sénégal",
    "Reincarnation of Values / Naataange": "Réincarnation des valeurs / Naataange",
    "Private Sector": "Secteur privé",
    "Sopi Coalition": "Coalition Sopi",
    "Sopi Senegal": "Sopi Sénégal",
    "Kiraay ak Natangue": "Pôle alternatif 3e voie Kiraay ak Natangue",
}


def key(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", " ", s).upper().strip()


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def main():
    with gzip.open(SRC / "legislatives2024_bureaux_SAGE.csv.gz", "rt", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter=";"))
    listes = sorted({NOMS.get(r["liste_ou_candidat"], r["liste_ou_candidat"]) for r in rows})
    li = {n: i for i, n in enumerate(listes)}
    # dept -> commune -> lieu -> bureau -> {inscrits, voix[]}
    tree = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    region_of = {}
    for r in rows:
        d, c, l, b = r["departement"].strip(), r["commune"].strip(), r["lieu_vote"].strip(), r["bureau"].strip()
        region_of[d] = r["region"].strip()
        bur = tree[d][c][l].setdefault(b, {"i": num(r["inscrits"]), "v": [None] * len(listes)})
        v = num(r["voix"])
        if v is not None:
            bur["v"][li[NOMS.get(r["liste_ou_candidat"], r["liste_ou_candidat"])]] = v
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*.json"):
        f.unlink()
    communes, depts = [], []
    for d, cs in sorted(tree.items()):
        detail = []
        dtot = {"bureaux": 0, "inscrits": 0, "inscritsManquants": 0, "voix": [0] * len(listes)}
        for c, ls in sorted(cs.items()):
            ctot = {"bureaux": 0, "inscrits": 0, "inscritsManquants": 0, "voix": [0] * len(listes)}
            lieux = []
            for l, bs in sorted(ls.items()):
                bl = []
                for b, x in sorted(bs.items(), key=lambda kv: (int(kv[0]) if kv[0].isdigit() else 10**6, kv[0])):
                    bl.append([b, x["i"], x["v"]])
                    for t in (ctot, dtot):
                        t["bureaux"] += 1
                        if x["i"] is None:
                            t["inscritsManquants"] += 1
                        else:
                            t["inscrits"] += x["i"]
                        for k, v in enumerate(x["v"]):
                            if v:
                                t["voix"][k] += v
                lieux.append({"nom": l, "bureaux": bl})
            detail.append({"commune": c, "lieux": lieux})
            communes.append({"region": region_of[d], "dept": d, "nom": c, **ctot})
        code = key(d).replace(" ", "-")
        (OUT / f"{code}.json").write_text(json.dumps({"dept": d, "region": region_of[d], "communes": detail}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        depts.append({"region": region_of[d], "nom": d, "code": code, **dtot})
    couverture = list(csv.DictReader((SRC / "couverture_par_departement.csv").open(encoding="utf-8"), delimiter=";"))
    manquants = [{"region": c["REGION"], "nom": c["DEPARTEMENT"], "bureaux": num(c["bureaux_carte_presid2024"]), "electeurs": num(c["electeurs_carte_presid2024"])}
                 for c in couverture if not num(c["bureaux_sage"])]
    index = {
        "scrutin": "Législatives du 17 novembre 2024",
        "source": {"label": "Small-Area Global Elections Archive (SAGE), v1.4 — d'après les résultats du Conseil constitutionnel",
                   "url": "https://storage.googleapis.com/sage-archive/parquet/country=Senegal/year=2024/part-0.parquet"},
        "national": {"PASTEF": 1991770, "exprimes": 3623633, "Takku Wallu Sénégal": 531466},
        "listes": listes, "departements": depts, "manquants": manquants, "communes": communes,
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.glob("*.json"))
    print(f"{len(listes)} listes, {len(depts)} départements, {len(communes)} communes, {sum(d['bureaux'] for d in depts)} bureaux ; {size // 1024} Ko")


if __name__ == "__main__":
    main()
