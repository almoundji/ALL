"""Collecte des données : résultats historiques et cotes des bookmakers.

- Résultats : football-data.co.uk (CSV gratuits, sans clé).
- Cotes : The Odds API (des dizaines de bookmakers EU/UK, clé gratuite
  500 crédits/mois ; chaque appel coûte marchés x régions crédits).
"""

import io
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from difflib import get_close_matches

import numpy as np
import pandas as pd
import requests

from .config import TEAM_ALIASES

FD_URL = "https://www.football-data.co.uk/mmz4281/{season}/{code}.csv"
ODDS_URL = "https://api.the-odds-api.com/v4/sports/{sport}/odds"
TIMEOUT = 20


# --------------------------------------------------------------------------
# Résultats historiques
# --------------------------------------------------------------------------

def season_codes(today: date, n: int = 2) -> list:
    """Codes de saison football-data (ex. '2627') : saison en cours + précédentes."""
    start = today.year if today.month >= 7 else today.year - 1
    return [f"{(start - k) % 100:02d}{(start - k + 1) % 100:02d}" for k in range(n)]


def load_results(fd_code: str, seasons: int = 2, today: date | None = None) -> pd.DataFrame:
    frames = []
    for season in season_codes(today or date.today(), seasons):
        resp = requests.get(FD_URL.format(season=season, code=fd_code), timeout=TIMEOUT)
        if resp.status_code != 200 or not resp.content.strip():
            continue
        df = pd.read_csv(io.BytesIO(resp.content), encoding="latin-1", on_bad_lines="skip")
        if not {"Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"} <= set(df.columns):
            continue
        df = df[["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"]].copy()
        df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
        frames.append(df)
    if not frames:
        raise RuntimeError(f"Aucun résultat téléchargé pour {fd_code}")
    return pd.concat(frames, ignore_index=True).dropna()


# --------------------------------------------------------------------------
# Cotes
# --------------------------------------------------------------------------

def fetch_odds(sport_key: str, api_key: str, regions: str = "eu,uk") -> tuple:
    """Renvoie (cotes au format long, crédits API restants)."""
    resp = requests.get(
        ODDS_URL.format(sport=sport_key),
        params={
            "apiKey": api_key,
            "regions": regions,
            "markets": "h2h,totals",
            "oddsFormat": "decimal",
        },
        timeout=TIMEOUT,
    )
    if resp.status_code == 401:
        raise RuntimeError("Clé The Odds API invalide")
    if resp.status_code == 429:
        raise RuntimeError("Quota The Odds API épuisé")
    resp.raise_for_status()
    remaining = resp.headers.get("x-requests-remaining")
    return parse_odds(resp.json()), remaining


def parse_odds(events: list) -> pd.DataFrame:
    rows = []
    for ev in events:
        home, away = ev["home_team"], ev["away_team"]
        for bk in ev.get("bookmakers", []):
            for mk in bk.get("markets", []):
                for out in mk.get("outcomes", []):
                    if mk["key"] == "h2h":
                        outcome = {home: "home", away: "away"}.get(out["name"], "draw")
                        point = np.nan
                    elif mk["key"] == "totals":
                        outcome = out["name"].lower()
                        point = out.get("point")
                    else:
                        continue
                    rows.append(
                        {
                            "event_id": ev["id"],
                            "commence_time": ev["commence_time"],
                            "home_team": home,
                            "away_team": away,
                            "bookmaker": bk.get("title", bk.get("key")),
                            "market": mk["key"],
                            "outcome": outcome,
                            "point": point,
                            "price": float(out["price"]),
                        }
                    )
    df = pd.DataFrame(rows, columns=[
        "event_id", "commence_time", "home_team", "away_team",
        "bookmaker", "market", "outcome", "point", "price",
    ])
    df["commence_time"] = pd.to_datetime(df["commence_time"], utc=True)
    return df


# --------------------------------------------------------------------------
# Appariement des noms d'équipes entre les deux sources
# --------------------------------------------------------------------------

def _norm(name: str) -> str:
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    name = name.replace("&", "and")
    name = re.sub(r"[^a-z0-9. ]", " ", name)
    name = re.sub(r"\b(fc|afc|cf|sc|ac|as|ss|sv|vfb|vfl|us|rc|ogc|stade|club)\b", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def match_team(name: str, known: list) -> str | None:
    alias = TEAM_ALIASES.get(name.lower())
    if alias in known:
        return alias
    if name in known:
        return name
    normed = {_norm(k): k for k in known}
    target = _norm(name)
    if target in normed:
        return normed[target]
    for n, k in normed.items():
        if len(n) >= 4 and len(target) >= 4 and (n in target or target in n):
            return k
    close = get_close_matches(target, list(normed), n=1, cutoff=0.75)
    return normed[close[0]] if close else None


# --------------------------------------------------------------------------
# Jeu de données de démonstration (hors ligne)
# --------------------------------------------------------------------------

DEMO_TEAMS = [
    "Olympique Nord", "Racing Est", "Stade Ouest", "AS Littoral", "FC Montagne",
    "US Vallée", "Sporting Plaine", "Athletic Port", "Union Forêt", "Real Colline",
    "Dynamo Rivière", "Inter Capitale", "Etoile Sud", "Red Star Lac",
    "Royal Plateau", "Juventus Île", "Atlético Cap", "Celtic Bocage",
]
DEMO_BOOKMAKERS = ["Betclic", "Unibet", "Winamax", "PMU", "Bet365", "Pinnacle", "Betfair"]


def demo_data(seed: int = 7, now: datetime | None = None) -> tuple:
    """Simule une saison et demie de résultats et les cotes des prochains matchs.

    Les bookmakers fictifs estiment les vraies probabilités avec du bruit et
    une marge : certaines cotes sont donc réellement « value ».
    """
    from .model import market_probs, score_matrix

    rng = np.random.default_rng(seed)
    now = now or datetime.now(timezone.utc)
    n = len(DEMO_TEAMS)
    att = np.exp(rng.normal(0, 0.25, n))
    dfn = np.exp(rng.normal(0, 0.2, n))
    mu, home = 1.25, 1.2

    pairs = [(i, j) for i in range(n) for j in range(n) if i != j]
    rows = []
    start = now - timedelta(days=420)
    for season_start in (start, start + timedelta(days=365)):
        order = rng.permutation(len(pairs))
        span = 280 if season_start == start else 55
        take = len(pairs) if season_start == start else 54
        for k, p in enumerate(order[:take]):
            i, j = pairs[p]
            d = season_start + timedelta(days=int(span * k / take))
            rows.append({
                "Date": pd.Timestamp(d.date()),
                "HomeTeam": DEMO_TEAMS[i],
                "AwayTeam": DEMO_TEAMS[j],
                "FTHG": rng.poisson(mu * home * att[i] * dfn[j]),
                "FTAG": rng.poisson(mu * att[j] * dfn[i]),
            })
    results = pd.DataFrame(rows)

    odds_rows = []
    shuffled = rng.permutation(n)
    for k in range(n // 2):
        i, j = int(shuffled[2 * k]), int(shuffled[2 * k + 1])
        kickoff = now + timedelta(days=1 + k % 4, hours=int(rng.integers(0, 8)))
        true = market_probs(score_matrix(mu * home * att[i] * dfn[j], mu * att[j] * dfn[i]))
        for bk in DEMO_BOOKMAKERS:
            margin = 1.03 if bk in ("Pinnacle", "Betfair") else 1.06
            for market, outs, point in (("h2h", ("home", "draw", "away"), np.nan),
                                        ("totals", ("over", "under"), 2.5)):
                noisy = np.array([true[o] for o in outs]) * np.exp(rng.normal(0, 0.025, len(outs)))
                noisy = noisy / noisy.sum() * margin
                for o, p in zip(outs, noisy):
                    odds_rows.append({
                        "event_id": f"demo-{k}",
                        "commence_time": pd.Timestamp(kickoff),
                        "home_team": DEMO_TEAMS[i],
                        "away_team": DEMO_TEAMS[j],
                        "bookmaker": bk,
                        "market": market,
                        "outcome": o,
                        "point": point,
                        "price": round(max(1.01, 1 / p), 2),
                    })
    return results, pd.DataFrame(odds_rows)
