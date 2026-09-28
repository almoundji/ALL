"""Étape 2 du backtest : rejoue chaque réglage de l'app sur les prédictions de predict.py.

Mesures pour chaque stratégie (mise fixe de 1 € par pari) :
  - ROI : bénéfice / somme misée ;
  - CLV : avantage de la cote prise sur la cote de clôture Pinnacle sans marge,
    le meilleur indicateur d'un avantage réel (beaucoup moins de hasard que le ROI) ;
  - saisons gagnantes sur 5, pire perte cumulée (drawdown).

Usage : python backtest/strategies.py
"""

import itertools
from pathlib import Path

import numpy as np
import pandas as pd

CACHE = Path(__file__).parent / ".cache"
OUT = Path(__file__).parent / "results"
OUTCOMES = {  # issue -> (colonne proba modèle, colonnes de cotes par source, colonnes clôture, gagnant ?)
    "home": ("m_home", {"max": "MaxH", "b365": "B365H", "avg": "AvgH"}),
    "draw": ("m_draw", {"max": "MaxD", "b365": "B365D", "avg": "AvgD"}),
    "away": ("m_away", {"max": "MaxA", "b365": "B365A", "avg": "AvgA"}),
    "over": ("m_over", {"max": "Max>2.5", "b365": "B365>2.5", "avg": "Avg>2.5"}),
    "under": ("m_under", {"max": "Max<2.5", "b365": "B365<2.5", "avg": "Avg<2.5"}),
}


def fair(df, cols):
    """Probabilités sans marge à partir d'un jeu de cotes complet."""
    inv = 1 / df[cols].astype(float)
    return inv.div(inv.sum(axis=1), axis=0)


def long_format(pred: pd.DataFrame) -> pd.DataFrame:
    """Une ligne par (match, issue) avec proba marché, clôture et résultat."""
    mk_h2h = fair(pred, ["AvgH", "AvgD", "AvgA"])
    mk_tot = fair(pred, ["Avg>2.5", "Avg<2.5"])
    cl_h2h = fair(pred, ["PSCH", "PSCD", "PSCA"]).fillna(fair(pred, ["AvgCH", "AvgCD", "AvgCA"]))
    cl_tot = fair(pred, ["PC>2.5", "PC<2.5"]).fillna(fair(pred, ["AvgC>2.5", "AvgC<2.5"]))
    goals = pred["hg"] + pred["ag"]
    won = {"home": pred["hg"] > pred["ag"], "draw": pred["hg"] == pred["ag"], "away": pred["hg"] < pred["ag"],
           "over": goals > 2.5, "under": goals < 2.5}
    frames = []
    for i, (k, (mcol, prices)) in enumerate(OUTCOMES.items()):
        h2h = k in ("home", "draw", "away")
        mk = (mk_h2h if h2h else mk_tot).iloc[:, i if h2h else i - 3]
        cl = (cl_h2h if h2h else cl_tot).iloc[:, i if h2h else i - 3]
        frames.append(pd.DataFrame({
            "match": pred.index, "league": pred["league"], "season": pred["season"], "date": pred["date"],
            "market": "h2h" if h2h else "totals", "outcome": k, "model": pred[mcol], "rel": pred["reliability"],
            "mkt": mk, "close": cl, "won": won[k].astype(float),
            **{f"odds_{s}": pred[c] for s, c in prices.items()},
        }))
    return pd.concat(frames, ignore_index=True)


def select(lf, w, min_edge, src, lo=1.3, hi=6.0):
    """Paris que l'app aurait conseillés : value >= seuil, un par marché et par match."""
    p = np.where(lf["model"].notna(), w * lf["rel"] * lf["model"] + (1 - w * lf["rel"]) * lf["mkt"], lf["mkt"])
    odds = lf[f"odds_{src}"]
    d = lf.assign(p=p, odds=odds, edge=p * odds - 1)
    d = d[(d["edge"] >= min_edge) & d["odds"].between(lo, hi) & d["close"].notna() & d["mkt"].notna()]
    return d.sort_values("edge", ascending=False).drop_duplicates(["match", "market"])


def metrics(b: pd.DataFrame) -> dict:
    if b.empty:
        return {"paris": 0}
    profit = np.where(b["won"] == 1, b["odds"] - 1, -1.0)
    cum = pd.Series(profit[np.argsort(b["date"].values, kind="stable")]).cumsum()
    by_season = pd.Series(profit, index=b["season"].values).groupby(level=0).sum()
    return {
        "paris": len(b), "réussite": b["won"].mean(), "cote moy.": b["odds"].mean(),
        "ROI": profit.mean(), "CLV": (b["odds"] * b["close"] - 1).mean(),
        "bénéfice (1€/pari)": profit.sum(), "saisons gagnantes": f"{(by_season > 0).sum()}/{len(by_season)}",
        "pire série (€)": (cum - cum.cummax()).min(),
        "z": profit.mean() / (profit.std(ddof=1) / np.sqrt(len(profit))) if len(profit) > 1 else np.nan,
    }


def logloss(pred):
    y = np.select([pred.hg > pred.ag, pred.hg == pred.ag], [0, 1], 2)
    out = {}
    for name, cols in {"Modèle seul": ["m_home", "m_draw", "m_away"], "Marché (moyenne avant-match)": None,
                       "Pinnacle clôture": None}.items():
        if name.startswith("Marché"):
            P = fair(pred, ["AvgH", "AvgD", "AvgA"]).values
        elif name.startswith("Pinnacle"):
            P = fair(pred, ["PSCH", "PSCD", "PSCA"]).values
        else:
            P = pred[cols].values
        ok = ~np.isnan(P).any(axis=1)
        out[name] = -np.log(P[ok, :][np.arange(ok.sum()), y[ok]]).mean()
    for w in (0.15, 0.3, 0.5):
        mk = fair(pred, ["AvgH", "AvgD", "AvgA"]).values
        m = pred[["m_home", "m_draw", "m_away"]].values
        ww = (w * pred["reliability"].values)[:, None]
        P = np.where(np.isnan(m), mk, ww * m + (1 - ww) * mk)
        ok = ~np.isnan(P).any(axis=1)
        out[f"Mélange {int(w * 100)} % modèle"] = -np.log(P[ok, :][np.arange(ok.sum()), y[ok]]).mean()
    return out


def combos(lf, src="b365"):
    """Combiné 3 matchs par week-end (ven.-dim.) selon les règles de l'onglet Combiné."""
    res = {}
    rules = {"prudent": (0.55, 1.2, 1.9), "equilibre": (0.42, 1.4, 2.6), "audacieux": (0.3, 1.8, 4.5)}
    d = lf.copy()
    d["p"] = np.where(d["model"].notna(), 0.3 * d["rel"] * d["model"] + (1 - 0.3 * d["rel"]) * d["mkt"], d["mkt"])
    d["odds"] = d[f"odds_{src}"]
    d["edge"] = d["p"] * d["odds"] - 1
    d = d[d["date"].dt.dayofweek.isin([4, 5, 6]) & d["odds"].notna()]
    d["week"] = (d["date"] - pd.to_timedelta((d["date"].dt.dayofweek - 4) % 7, unit="D")).dt.date
    for name, (mp, lo, hi) in rules.items():
        for fill in (False, True):
            profits = []
            for _, g in d[(d["p"] >= mp) & d["odds"].between(lo, hi)].groupby("week"):
                g = g if fill else g[g["edge"] >= 0]
                legs = g.sort_values("edge", ascending=False).drop_duplicates("match").head(3)
                if len(legs) < 3:
                    continue
                profits.append(legs["odds"].prod() - 1 if legs["won"].all() else -1.0)
            if profits:
                pr = np.array(profits)
                res[f"{name} ({'complété' if fill else 'value seule'})"] = {
                    "combinés": len(pr), "gagnés": int((pr > 0).sum()), "ROI": pr.mean(), "bénéfice (1€)": pr.sum()}
    return res


def main():
    pred = pd.read_csv(CACHE / "predictions.csv", parse_dates=["date"])
    lf = long_format(pred)
    OUT.mkdir(exist_ok=True)

    print("== Précision des probabilités 1N2 (log-loss, plus bas = meilleur) ==")
    for k, v in logloss(pred).items():
        print(f"  {k:32s} {v:.4f}")

    rows = []
    for w, e, src in itertools.product([0, 0.15, 0.3, 0.5, 0.7, 1.0], [0, 0.02, 0.03, 0.05, 0.08, 0.12], ["max", "b365"]):
        rows.append({"poids modèle": w, "value min": e, "cotes": src, **metrics(select(lf, w, e, src))})
    grid = pd.DataFrame(rows)
    grid.to_csv(OUT / "grille.csv", index=False)
    pd.set_option("display.width", 200, "display.max_columns", 20, "display.float_format", "{:.3f}".format)
    print("\n== Grille de réglages (mise 1 € par pari) ==")
    print(grid.to_string(index=False))

    default = select(lf, 0.3, 0.03, "max")
    for col in ("outcome", "league"):
        t = pd.DataFrame({k: metrics(g) for k, g in default.groupby(col)}).T
        t.to_csv(OUT / f"defaut_par_{col}.csv")
        print(f"\n== Réglage actuel de l'app (30 %, 3 %, meilleure cote) par {col} ==")
        print(t.to_string())

    print("\n== Combinés 3 matchs par week-end (cotes Bet365, 1 € par combiné) ==")
    c = pd.DataFrame(combos(lf)).T
    c.to_csv(OUT / "combines.csv")
    print(c.to_string())


if __name__ == "__main__":
    main()
