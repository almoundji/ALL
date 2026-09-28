"""Étape 1 du backtest : prédictions « à l'aveugle » sur 5 saisons passées.

Pour chaque journée, le modèle est ré-estimé uniquement avec les matchs joués
AVANT cette date (aucune information du futur), exactement comme l'app le fait
en direct. On enregistre ses probabilités à côté des cotes d'avant-match et de
clôture, pour que l'étape 2 (strategies.py) puisse simuler n'importe quel réglage.

Usage : python backtest/predict.py            (≈ quelques minutes)
"""

import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from betdash.model import fit_ratings, market_probs, score_matrix  # noqa: E402

CACHE = Path(__file__).parent / ".cache"
URL = "https://www.football-data.co.uk/mmz4281/{season}/{code}.csv"
LEAGUES = {"E0": "Premier League", "E1": "Championship", "F1": "Ligue 1", "F2": "Ligue 2", "SP1": "La Liga",
           "D1": "Bundesliga", "I1": "Serie A", "N1": "Eredivisie", "P1": "Liga Portugal"}
WARMUP, TESTS = "2021", ["2122", "2223", "2324", "2425", "2526"]
HALF_LIFE = 180
HISTORY_DAYS = 730  # le site charge 2 saisons de résultats

ODDS_COLS = [
    "B365H", "B365D", "B365A", "PSH", "PSD", "PSA", "MaxH", "MaxD", "MaxA", "AvgH", "AvgD", "AvgA",
    "B365>2.5", "B365<2.5", "Max>2.5", "Max<2.5", "Avg>2.5", "Avg<2.5",
    "PSCH", "PSCD", "PSCA", "AvgCH", "AvgCD", "AvgCA", "AvgC>2.5", "AvgC<2.5", "PC>2.5", "PC<2.5",
]


def load(code: str) -> pd.DataFrame:
    frames = []
    for season in [WARMUP, *TESTS]:
        path = CACHE / f"{season}_{code}.csv"
        if not path.exists():
            CACHE.mkdir(exist_ok=True)
            import requests
            path.write_bytes(requests.get(URL.format(season=season, code=code), timeout=30).content)
        df = pd.read_csv(path, encoding="latin-1", on_bad_lines="skip")
        df = df.assign(Season=season)
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
    df = df.dropna(subset=["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"])
    for c in ODDS_COLS:
        if c not in df.columns:
            df[c] = np.nan
    return df.sort_values("Date").reset_index(drop=True)


def reliability(weight: float) -> float:
    """Même règle que l'app : 0 sous ~8 matchs pondérés, 1 au-delà de ~16."""
    return float(min(1.0, max(0.0, (weight - 8) / 8)))


def predict_league(code: str) -> pd.DataFrame:
    df = load(code)
    rows = []
    for date in sorted(df.loc[df["Season"].isin(TESTS), "Date"].unique()):
        past = df[(df["Date"] < date) & (df["Date"] >= date - pd.Timedelta(days=HISTORY_DAYS))]
        if len(past) < 100:
            continue
        r = fit_ratings(past, half_life_days=HALF_LIFE, ref_date=date)
        for m in df[df["Date"] == date].to_dict("records"):
            home, away = m["HomeTeam"], m["AwayTeam"]
            if home not in r or away not in r:
                rel, p = 0.0, {}
            else:
                i, j = r.index[home], r.index[away]
                lh = r.mu * r.home_adv * r.attack[i] * r.defense[j]
                la = r.mu * r.attack[j] * r.defense[i]
                p = market_probs(score_matrix(lh, la))
                rel = min(reliability(r.weight[i]), reliability(r.weight[j]))
            rows.append({
                "league": LEAGUES[code], "season": m["Season"], "date": date, "home_team": home, "away_team": away,
                "hg": m["FTHG"], "ag": m["FTAG"], "reliability": rel,
                **{f"m_{k}": p.get(k, np.nan) for k in ("home", "draw", "away", "over", "under")},
                **{c: m[c] for c in ODDS_COLS},
            })
    return pd.DataFrame(rows)


def main():
    out = []
    for code in LEAGUES:
        t = time.time()
        pred = predict_league(code)
        out.append(pred)
        print(f"{LEAGUES[code]:15s} {len(pred):5d} matchs  ({time.time() - t:.0f} s)", flush=True)
    res = pd.concat(out, ignore_index=True)
    res.to_csv(CACHE / "predictions.csv", index=False)
    print(f"Total : {len(res)} matchs -> {CACHE / 'predictions.csv'}")


if __name__ == "__main__":
    main()
