#!/usr/bin/env python3
"""Prépare les données de l'outil d'analyse du fichier électoral.

Lit les fichiers bruts de data/sources/ (CSV de la carte électorale, classeurs Excel
de l'analyse comparative et des transferts) et produit des fichiers JSON découpés :

  data/resume.json            agrégats nationaux, régionaux, départementaux et communaux
                              (chargé à l'ouverture de l'outil, quelques centaines de Ko)
  data/regions/<CODE>.json    détail d'une région : lieux et bureaux de vote, comparaison
                              des centres Locales/Législatives, transferts entre communes
                              (chargé à la demande)

Usage : python3 scripts/build_data.py   (depuis le dossier fichier-electoral)
Dépendance : openpyxl
"""
import csv
import io
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "sources"
OUT = ROOT / "data"

F_CARTE_SN = SRC / "carte_electorale_legislatives_2022_senegal.csv"
F_CARTE_ETR = SRC / "carte_electorale_legislatives_2022_etranger.csv"
F_COMPAR = SRC / "analyse_comparative_locales_legislatives_2022.xlsx"
F_TRANSF = SRC / "transferts_electeurs_entre_zones.xlsx"
F_ES = SRC / "departements_entrees_sorties.xlsx"
F_EVOL = SRC / "analyses_fichier_electoral_2019_2022.xlsx"

PETIT_BUREAU = 100  # bureaux de moins de 100 électeurs : signalés
FORTE_ABS = 200       # variation d'au moins 200 électeurs dans un centre de vote...
FORTE_REL = 0.25      # ...ou d'au moins 25 %
FORTE_REL_MIN = 40    # (variation relative retenue seulement à partir de 40 électeurs d'écart)


def forte(c):
    d = c["electeursLG"] - c["electeursL"]
    base = c["electeursL"] or 0
    return abs(d) >= FORTE_ABS or (base > 0 and abs(d) >= FORTE_REL_MIN and abs(d) / base >= FORTE_REL)


def key(s):
    """Clé de rapprochement : majuscules, sans accents ni ponctuation superflue."""
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", " ", s).upper().strip()
    return s


def code(s):
    return key(s).replace(" ", "-")


def clean(s):
    return re.sub(r"\s+", " ", str(s if s is not None else "")).strip()


def num(v):
    if v is None or v == "":
        return 0
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return 0


def read_csv(path):
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    rows = list(csv.reader(io.StringIO(text), delimiter=";"))
    head = [key(h) for h in rows[0]]
    idx = {h: i for i, h in enumerate(head)}
    out = []
    for r in rows[1:]:
        if not any(c.strip() for c in r):
            continue
        g = lambda k: clean(r[idx[k]]) if idx.get(k) is not None and idx[k] < len(r) else ""
        out.append({
            "region": g("REGION"), "dept": g("DEPARTEMENT"), "commune": g("COMMUNE"),
            "lieu": g("LIEU VOTE"), "bureau": g("BUREAU"), "electeurs": num(g("ELECTEURS")),
            "implantation": g("IMPLANTATION"),
        })
    return out


def sheet_rows(path, title):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[title]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    return [r for r in rows if any(c is not None and c != "" for c in r)]


def implantation_type(s):
    k = key(s)
    if not k:
        return "Non renseignée"
    if "ABRI" in k:
        return "Abri provisoire"
    if "CLASSE" in k or "SALLE" in k or "ECOLE" in k or k.startswith("CI ") or k.startswith("CP "):
        return "Salle de classe"
    if "MAIRIE" in k or "FOYER" in k or "CASE" in k or "MAISON" in k or "CENTRE" in k:
        return "Bâtiment communautaire"
    if "MOSQUEE" in k or "EGLISE" in k:
        return "Lieu de culte"
    return "Autre"


HISTO_BINS = list(range(0, 601, 50))  # 0-49, 50-99, ..., 550-600


def histo(values):
    h = [0] * (len(HISTO_BINS) - 1)
    for v in values:
        i = min(v // 50, len(h) - 1)
        h[i] += 1
    return h


def main():
    checks = []  # contrôles qualité : {id, titre, gravite, n, detail, lignes}

    # ------------------------------------------------------------------ Carte électorale
    sn = read_csv(F_CARTE_SN)
    etr = read_csv(F_CARTE_ETR)
    for r in sn:
        r["zone"] = "SN"
    for r in etr:
        r["zone"] = "ETR"
    bureaux = sn + etr

    def agg(rows, keyfn):
        d = {}
        for r in rows:
            k = keyfn(r)
            a = d.get(k)
            if a is None:
                a = d[k] = {"electeurs": 0, "bureaux": 0, "lieux": set(), "communes": set(), "depts": set(),
                            "petits": 0, "abris": 0, "max": 0, "min": 10**9, "zone": r["zone"]}
            a["electeurs"] += r["electeurs"]
            a["bureaux"] += 1
            a["lieux"].add((r["region"], r["dept"], r["commune"], r["lieu"]))
            a["communes"].add((r["region"], r["dept"], r["commune"]))
            a["depts"].add((r["region"], r["dept"]))
            a["petits"] += r["electeurs"] < PETIT_BUREAU
            a["abris"] += implantation_type(r["implantation"]) == "Abri provisoire"
            a["max"] = max(a["max"], r["electeurs"])
            a["min"] = min(a["min"], r["electeurs"])
        return d

    def finalize(a):
        return {"electeurs": a["electeurs"], "bureaux": a["bureaux"], "lieux": len(a["lieux"]),
                "communes": len(a["communes"]), "depts": len(a["depts"]), "petits": a["petits"],
                "abris": a["abris"], "max": a["max"], "min": a["min"], "zone": a["zone"]}

    tot = {z: finalize(a) for z, a in agg(bureaux, lambda r: r["zone"]).items()}
    regions = []
    for (z, reg), a in sorted(agg(bureaux, lambda r: (r["zone"], r["region"])).items(), key=lambda kv: -kv[1]["electeurs"]):
        regions.append({"code": code(reg) if z == "SN" else "ETR-" + code(reg), "nom": reg, **finalize(a)})
    depts = []
    for (z, reg, dep), a in agg(bureaux, lambda r: (r["zone"], r["region"], r["dept"])).items():
        depts.append({"region": reg, "nom": dep, **finalize(a)})
    communes = []
    for (z, reg, dep, com), a in agg(bureaux, lambda r: (r["zone"], r["region"], r["dept"], r["commune"])).items():
        f = finalize(a)
        communes.append({"region": reg, "dept": dep, "nom": com, **{k: f[k] for k in ("electeurs", "bureaux", "lieux", "petits", "abris", "max", "min", "zone")}})

    impl = Counter(implantation_type(r["implantation"]) for r in sn)

    # Libellés tronqués (les exports limitent souvent les champs à 20 caractères) :
    # on rapproche un département inconnu du département de la carte dont il est le début.
    carte_dep_names = {key(d["nom"]): d["nom"] for d in depts if d["zone"] == "SN"}
    alias = {}

    def fix_dept(name, source):
        k = key(name)
        if not k or k in carte_dep_names:
            return name
        cands = [v for kk, v in carte_dep_names.items() if kk.startswith(k)]
        if len(cands) == 1:
            alias.setdefault((source, name), cands[0])
            return cands[0]
        return name

    # Contrôles sur la carte
    by_lieu = defaultdict(list)
    for r in bureaux:
        by_lieu[(r["zone"], r["region"], r["dept"], r["commune"], r["lieu"])].append(r)
    doublons, trous = [], []
    for (z, reg, dep, com, lieu), rs in by_lieu.items():
        nums = [r["bureau"] for r in rs]
        c = Counter(nums)
        for n_, k_ in c.items():
            if k_ > 1:
                doublons.append([reg, dep, com, lieu, n_, k_])
        ints = sorted(int(n_) for n_ in nums if n_.isdigit())
        if ints and ints != list(range(1, len(ints) + 1)) and len(set(ints)) == len(ints):
            manquants = sorted(set(range(1, max(ints) + 1)) - set(ints))
            if manquants:
                trous.append([reg, dep, com, lieu, len(ints), ", ".join(map(str, manquants[:12]))])
    petits = sorted(([r["region"], r["dept"], r["commune"], r["lieu"], r["bureau"], r["electeurs"]] for r in bureaux if r["electeurs"] < PETIT_BUREAU), key=lambda x: x[5])
    sans_impl = [[r["region"], r["dept"], r["commune"], r["lieu"], r["bureau"]] for r in sn if not r["implantation"]]
    checks.append({"id": "bureaux-doublons", "titre": "Numéros de bureau en double", "gravite": "critique" if doublons else "ok",
                   "detail": "Même numéro de bureau répété dans un même lieu de vote.",
                   "colonnes": ["Région", "Département", "Commune", "Lieu de vote", "N° bureau", "Occurrences"], "lignes": doublons})
    checks.append({"id": "bureaux-trous", "titre": "Numérotation discontinue", "gravite": "attention" if trous else "ok",
                   "detail": "Lieux de vote dont les numéros de bureau ne se suivent pas (bureaux manquants).",
                   "colonnes": ["Région", "Département", "Commune", "Lieu de vote", "Nb bureaux", "N° manquants"], "lignes": trous})
    checks.append({"id": "bureaux-petits", "titre": f"Bureaux de moins de {PETIT_BUREAU} électeurs", "gravite": "info",
                   "detail": "Bureaux très peu chargés : possibles fusions ou erreurs de saisie (inclut l'étranger).",
                   "colonnes": ["Région / pays", "Département", "Commune", "Lieu de vote", "N° bureau", "Électeurs"], "lignes": petits})
    checks.append({"id": "implantation-vide", "titre": "Implantation non renseignée (Sénégal)", "gravite": "attention" if sans_impl else "ok",
                   "detail": "Bureaux du territoire national sans salle d'implantation précisée.",
                   "colonnes": ["Région", "Département", "Commune", "Lieu de vote", "N° bureau"], "lignes": sans_impl})

    # ------------------------------------------------------------------ Analyse comparative
    def table(title, ncols_geo):
        rows = sheet_rows(F_COMPAR, title)
        out = []
        for r in rows[1:]:
            geo = [clean(x) for x in r[:ncols_geo]]
            if not geo[0]:
                continue
            out.append((geo, r[ncols_geo:]))
        return out

    def cmp_row(geo_names, geo, vals, has_centres=True):
        d = dict(zip(geo_names, geo))
        if has_centres:
            d.update({"centresL": num(vals[0]), "centresLG": num(vals[1]), "bureauxL": num(vals[4]), "bureauxLG": num(vals[5]),
                      "electeursL": num(vals[8]), "electeursLG": num(vals[9])})
        else:
            d.update({"bureauxL": num(vals[0]), "bureauxLG": num(vals[1]), "electeursL": num(vals[4]), "electeursLG": num(vals[5])})
        return d

    cmp_regions = [cmp_row(["nom"], g, v) for g, v in table("Régions", 1)]
    cmp_depts = [cmp_row(["region", "nom"], g, v) for g, v in table("Départements", 2)]
    cmp_communes = [cmp_row(["region", "dept", "nom"], g, v) for g, v in table("Communes", 3)]
    cmp_centres = [cmp_row(["region", "dept", "commune", "nom"], g, v, has_centres=False) for g, v in table("Centres de Vote", 4)]
    for rows_ in (cmp_communes, cmp_centres):
        for c in rows_:
            c["dept"] = fix_dept(c["dept"], "Analyse comparative")
    for c in cmp_depts:
        c["nom"] = fix_dept(c["nom"], "Analyse comparative")
    sup_nv = []
    for r in sheet_rows(F_COMPAR, "Centres Vote Supprimés ou Nvx")[1:]:
        if not r[0]:
            continue
        sup_nv.append({"region": clean(r[0]), "dept": fix_dept(clean(r[1]), "Analyse comparative"), "commune": clean(r[2]), "nom": clean(r[3]),
                       "electeursL": num(r[4]) if r[4] is not None else None, "electeursLG": num(r[5]) if r[5] is not None else None})

    # Cohérence carte (CSV) / analyse comparative (Excel) au niveau commune
    carte_com = {(key(c["region"]), key(c["dept"]), key(c["nom"])): c for c in communes if c["zone"] == "SN"}
    ecarts = []
    for c in cmp_communes:
        k = (key(c["region"]), key(c["dept"]), key(c["nom"]))
        cc = carte_com.get(k)
        if cc is None:
            ecarts.append([c["region"], c["dept"], c["nom"], c["electeursLG"], "absente de la carte", ""])
        elif cc["electeurs"] != c["electeursLG"] or cc["bureaux"] != c["bureauxLG"]:
            ecarts.append([c["region"], c["dept"], c["nom"], c["electeursLG"], cc["electeurs"], f"{c['bureauxLG']} / {cc['bureaux']}"])
    cmp_keys = {(key(c["region"]), key(c["dept"]), key(c["nom"])) for c in cmp_communes}
    for k, cc in carte_com.items():
        if k not in cmp_keys:
            ecarts.append([cc["region"], cc["dept"], cc["nom"], "absente de l'analyse", cc["electeurs"], ""])
    checks.append({"id": "coherence-sources", "titre": "Écarts carte électorale / analyse comparative", "gravite": "critique" if ecarts else "ok",
                   "detail": "Communes dont le nombre d'électeurs ou de bureaux (Législatives 2022) diffère entre le CSV de la carte et le classeur comparatif.",
                   "colonnes": ["Région", "Département", "Commune", "Électeurs (analyse)", "Électeurs (carte)", "Bureaux analyse / carte"], "lignes": ecarts})

    # ------------------------------------------------------------------ Transferts
    reg_rows = sheet_rows(F_TRANSF, "Transferts entre Régions")
    reg_names = [clean(x) for x in reg_rows[0][1:] if x and not str(x).lower().startswith("total")]
    matrix = []
    for r in reg_rows[1:]:
        if not r[0] or str(r[0]).lower().startswith("total"):
            continue
        matrix.append([num(x) for x in r[1:1 + len(reg_names)]])

    tdep = []
    for r in sheet_rows(F_TRANSF, "Transferts entre Département")[1:]:
        if not r[0]:
            continue
        tdep.append([clean(r[0]), fix_dept(clean(r[1]), "Transferts"), clean(r[2]), fix_dept(clean(r[3]), "Transferts"), num(r[4])])
    tcom = []
    for r in sheet_rows(F_TRANSF, "Transferts entre Commune")[1:]:
        if not r[0]:
            continue
        tcom.append([clean(r[0]), fix_dept(clean(r[1]), "Transferts"), clean(r[2]), clean(r[3]), fix_dept(clean(r[4]), "Transferts"), clean(r[5]), num(r[6])])

    # Contrôle : matrice régionale fournie = somme des flux départementaux inter-régions
    derived = defaultdict(int)
    for ro, do, rd, dd, n_ in tdep:
        if key(ro) != key(rd):
            derived[(key(ro), key(rd))] += n_
    diff_mat = []
    for i, ro in enumerate(reg_names):
        for j, rd in enumerate(reg_names):
            if i != j and matrix[i][j] != derived.get((key(ro), key(rd)), 0):
                diff_mat.append([ro, rd, matrix[i][j], derived.get((key(ro), key(rd)), 0)])
    checks.append({"id": "coherence-transferts", "titre": "Écarts matrice régionale / flux départementaux", "gravite": "attention" if diff_mat else "ok",
                   "detail": "La feuille « Transferts entre Régions » est comparée à la somme des flux de la feuille « Transferts entre Département ».",
                   "colonnes": ["Région d'origine", "Région de destination", "Matrice", "Somme des flux"], "lignes": diff_mat})

    # Soldes par département (flux entre départements, toutes régions)
    es = defaultdict(lambda: {"entrees": 0, "sorties": 0})
    dep_region = {}
    for ro, do, rd, dd, n_ in tdep:
        if key(do) == key(dd):
            continue
        es[key(do)]["sorties"] += n_
        es[key(dd)]["entrees"] += n_
        dep_region.setdefault(key(do), (ro, do))
        dep_region.setdefault(key(dd), (rd, dd))
    soldes_dep = sorted(({"region": dep_region[k][0], "nom": dep_region[k][1], **v, "solde": v["entrees"] - v["sorties"]} for k, v in es.items()), key=lambda x: -x["solde"])

    # Contrôle : feuille ENTREE-SORTIE du second classeur
    es_sheet = {key(r[0]): (num(r[1]), num(r[2])) for r in sheet_rows(F_ES, "Département ENTREE-SORTIE")[1:] if r[0]}
    diff_es = []
    for d in soldes_dep:
        v = es_sheet.get(key(d["nom"]))
        if v is None:
            diff_es.append([d["region"], d["nom"], "absent", "", d["entrees"], d["sorties"]])
        elif v != (d["entrees"], d["sorties"]):
            diff_es.append([d["region"], d["nom"], v[0], v[1], d["entrees"], d["sorties"]])
    checks.append({"id": "coherence-entrees-sorties", "titre": "Écarts tableau Entrées/Sorties", "gravite": "attention" if diff_es else "ok",
                   "detail": "Le tableau « Département ENTREE-SORTIE » est recalculé à partir des flux entre départements.",
                   "colonnes": ["Région", "Département", "Entrées (tableau)", "Sorties (tableau)", "Entrées (recalcul)", "Sorties (recalcul)"], "lignes": diff_es})

    # Libellés de départements divergents entre sources
    carte_deps = {key(d["nom"]): d["nom"] for d in depts if d["zone"] == "SN"}
    autres = {}
    for ro, do, rd, dd, n_ in tdep:
        autres.setdefault(key(do), ("Transferts", ro, do))
        autres.setdefault(key(dd), ("Transferts", rd, dd))
    for d in cmp_depts:
        autres.setdefault(key(d["nom"]), ("Analyse comparative", d["region"], d["nom"]))
    libelles = [[src, reg, nom, "absent de la carte électorale"] for k, (src, reg, nom) in autres.items() if k not in carte_deps]
    grav = "attention" if libelles else ("info" if alias else "ok")
    libelles += [[src, "", nom, f"libellé tronqué, rapproché de « {v} »"] for (src, nom), v in alias.items()]
    checks.append({"id": "libelles", "titre": "Libellés de départements non reconnus ou tronqués", "gravite": grav,
                   "detail": "Départements cités dans les classeurs mais introuvables (orthographe différente) dans la carte électorale.",
                   "colonnes": ["Source", "Région", "Département", "Constat"], "lignes": libelles})

    # Soldes par commune (flux entre communes)
    ces = defaultdict(lambda: {"entrees": 0, "sorties": 0})
    com_label = {}
    for ro, do, co, rd, dd, cd, n_ in tcom:
        ko, kd = (key(ro), key(do), key(co)), (key(rd), key(dd), key(cd))
        if ko == kd:
            continue
        ces[ko]["sorties"] += n_
        ces[kd]["entrees"] += n_
        com_label.setdefault(ko, (ro, do, co))
        com_label.setdefault(kd, (rd, dd, cd))
    soldes_com = []
    for k, v in ces.items():
        ro, do, co = com_label[k]
        cc = carte_com.get(k)
        soldes_com.append({"region": ro, "dept": do, "nom": co, **v, "solde": v["entrees"] - v["sorties"],
                           "electeurs": cc["electeurs"] if cc else None})
    soldes_com.sort(key=lambda x: -x["solde"])

    # ------------------------------------------------------------------ Évolution 2019 -> 2022
    def opt(v):
        return None if v is None or str(v).strip() in (".", "") else num(v)

    def evol(title, ngeo, names):
        out = []
        for r in sheet_rows(F_EVOL, title)[1:]:
            if not r[0]:
                continue
            d = dict(zip(names, [clean(x) for x in r[:ngeo]]))
            if "dept" in d:
                d["dept"] = fix_dept(d["dept"], "Évolution 2019-2022")
            elif ngeo == 2:
                d["nom"] = fix_dept(d["nom"], "Évolution 2019-2022")
            v = r[ngeo:]
            d.update({"e2019": opt(v[0]), "disparus": opt(v[1]), "sortis": opt(v[2]), "venus": opt(v[3]),
                      "nouveaux": opt(v[4]), "e2022": opt(v[5])})
            out.append(d)
        return out

    ev_regions = evol("Région - Evolution Electeurs", 1, ["nom"])
    ev_depts = evol("Département - Evolution Electeu", 2, ["region", "nom"])
    ev_communes = evol("Commune - Evolution Electeurs", 3, ["region", "dept", "nom"])
    bilan = []
    for niveau, rows in (("Région", ev_regions), ("Département", ev_depts), ("Commune", ev_communes)):
        for d in rows:
            if d["e2019"] is None or d["e2022"] is None:
                continue
            calc = d["e2019"] - (d["disparus"] or 0) - (d["sortis"] or 0) + (d["venus"] or 0) + (d["nouveaux"] or 0)
            if calc != d["e2022"]:
                lib = " / ".join(x for x in (d.get("region"), d.get("dept"), d["nom"]) if x)
                bilan.append([niveau, lib, d["e2019"], d["e2022"], calc, d["e2022"] - calc])
    checks.append({"id": "bilan-2019-2022", "titre": "Bilan 2019 → 2022 non équilibré", "gravite": "attention" if bilan else "ok",
                   "detail": "Contrôle : électeurs 2019 − disparus − sortis + venus + nouveaux inscrits = électeurs 2022.",
                   "colonnes": ["Niveau", "Zone", "Électeurs 2019", "Électeurs 2022", "Recalcul", "Écart"], "lignes": bilan})
    cmp_com_idx = {(key(c["region"]), key(c["dept"]), key(c["nom"])): c for c in cmp_communes}
    ecart_l = []
    for d in ev_communes:
        c = cmp_com_idx.get((key(d["region"]), key(d["dept"]), key(d["nom"])))
        if c is None:
            ecart_l.append([d["region"], d["dept"], d["nom"], d["e2022"], "absente"])
        elif d["e2022"] is not None and d["e2022"] != c["electeursL"]:
            ecart_l.append([d["region"], d["dept"], d["nom"], d["e2022"], c["electeursL"]])
    checks.append({"id": "coherence-2022", "titre": "Écarts fichier 2022 / Locales 2022", "gravite": "info" if ecart_l else "ok",
                   "detail": "Électeurs 2022 du classeur d'évolution comparés aux électeurs des Locales 2022 de l'analyse comparative (écart possible selon la date d'arrêté des listes).",
                   "colonnes": ["Région", "Département", "Commune", "Électeurs 2022 (évolution)", "Locales 2022 (comparatif)"], "lignes": ecart_l})

    # ------------------------------------------------------------------ Fichiers régionaux
    (OUT / "regions").mkdir(parents=True, exist_ok=True)
    for old in (OUT / "regions").glob("*.json"):
        old.unlink()
    cmp_centre_idx = {(key(c["region"]), key(c["dept"]), key(c["commune"]), key(c["nom"])): c for c in cmp_centres}
    files = {}
    by_region_lieux = defaultdict(list)
    for (z, reg, dep, com, lieu), rs in by_lieu.items():
        rs_sorted = sorted(rs, key=lambda r: (int(r["bureau"]) if r["bureau"].isdigit() else 10**6, r["bureau"]))
        c = cmp_centre_idx.get((key(reg), key(dep), key(com), key(lieu)))
        fcode = code(reg) if z == "SN" else "ETRANGER"
        by_region_lieux[fcode].append({
            "region": reg, "dept": dep, "commune": com, "nom": lieu,
            "electeurs": sum(r["electeurs"] for r in rs), "bureaux": [[r["bureau"], r["electeurs"], r["implantation"]] for r in rs_sorted],
            "locales": {"bureaux": c["bureauxL"], "electeurs": c["electeursL"]} if c else None,
        })
    for fcode, lieux in by_region_lieux.items():
        lieux.sort(key=lambda l: (l["dept"], l["commune"], l["nom"]))
        rkey = None if fcode == "ETRANGER" else key(lieux[0]["region"])
        data = {"code": fcode, "lieux": lieux}
        if rkey:
            lieux_keys = {(key(l["dept"]), key(l["commune"]), key(l["nom"])) for l in lieux}
            data["centresDisparus"] = [c for c in cmp_centres if key(c["region"]) == rkey and (key(c["dept"]), key(c["commune"]), key(c["nom"])) not in lieux_keys]
            data["supprimesNouveaux"] = [s for s in sup_nv if key(s["region"]) == rkey]
            data["transfertsCommunes"] = [t for t in tcom if key(t[0]) == rkey or key(t[3]) == rkey]
        path = OUT / "regions" / f"{fcode}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        files[fcode] = path.stat().st_size

    # ------------------------------------------------------------------ Résumé
    resume = {
        "genere": date.today().isoformat(),
        "sources": [
            {"fichier": F_CARTE_SN.name, "contenu": "Carte électorale — Législatives 2022 — territoire national (1 ligne par bureau de vote)", "lignes": len(sn)},
            {"fichier": F_CARTE_ETR.name, "contenu": "Carte électorale — Législatives 2022 — étranger (1 ligne par bureau de vote)", "lignes": len(etr)},
            {"fichier": F_COMPAR.name, "contenu": "Analyse comparative Locales 2022 / Législatives 2022 (régions, départements, communes, centres)", "lignes": len(cmp_centres)},
            {"fichier": F_TRANSF.name, "contenu": "Transferts d'électeurs entre zones (régions, départements, communes)", "lignes": len(tcom)},
            {"fichier": F_ES.name, "contenu": "Entrées et sorties par département", "lignes": len(es_sheet)},
            {"fichier": F_EVOL.name, "contenu": "Évolution du fichier 2019 → 2022 : disparus, sortants, entrants, nouveaux inscrits", "lignes": len(ev_communes)},
        ],
        "seuilPetitBureau": PETIT_BUREAU,
        "carte": {
            "totaux": tot, "histo": {"bornes": HISTO_BINS, "SN": histo(r["electeurs"] for r in sn), "ETR": histo(r["electeurs"] for r in etr)},
            "implantation": impl.most_common(), "regions": regions, "departements": depts, "communes": communes,
        },
        "comparatif": {"regions": cmp_regions, "departements": cmp_depts, "communes": cmp_communes,
                       "supprimesNouveaux": sup_nv,
                       "seuilsForteVariation": {"absolu": FORTE_ABS, "relatif": FORTE_REL, "relatifMin": FORTE_REL_MIN},
                       "fortesVariations": sorted((c for c in cmp_centres if forte(c)), key=lambda c: -abs(c["electeursLG"] - c["electeursL"]))},
        "transferts": {"totaux": {"communes": sum(t[6] for t in tcom if (key(t[0]), key(t[1]), key(t[2])) != (key(t[3]), key(t[4]), key(t[5]))),
                                  "departements": sum(t[4] for t in tdep if key(t[1]) != key(t[3])),
                                  "regions": sum(map(sum, matrix))},
                       "regions": reg_names, "matrice": matrix, "departements": soldes_dep, "communes": soldes_com,
                       "fluxDepartements": sorted(tdep, key=lambda t: -t[4])},
        "evolution": {"regions": ev_regions, "departements": ev_depts, "communes": ev_communes},
        "qualite": checks,
        "fichiersRegionaux": files,
    }
    (OUT / "resume.json").write_text(json.dumps(resume, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"Carte : {len(sn)} bureaux SN, {len(etr)} bureaux étranger, {tot['SN']['electeurs'] + tot['ETR']['electeurs']} électeurs")
    print(f"Comparatif : {len(cmp_communes)} communes, {len(cmp_centres)} centres ; transferts : {len(tdep)} flux dép., {len(tcom)} flux communes")
    for c in checks:
        print(f"  contrôle {c['id']:28s} {c['gravite']:9s} {len(c['lignes'])}")
    print(f"resume.json : {(OUT / 'resume.json').stat().st_size // 1024} Ko ; {len(files)} fichiers régionaux, {sum(files.values()) // 1024} Ko")


if __name__ == "__main__":
    sys.exit(main())
