"""Détection des « value bets ».

Un pari a de la valeur quand   probabilité réelle x cote > 1.
La probabilité « réelle » est estimée en combinant :
  - le modèle statistique (forces des équipes),
  - le consensus du marché (cotes de tous les bookmakers, marge retirée),
qui est lui-même un très bon estimateur. On compare ensuite à la MEILLEURE
cote disponible parmi tous les bookmakers.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd

OUTCOME_LABELS = {
    "home": "Victoire {home}",
    "draw": "Match nul",
    "away": "Victoire {away}",
    "over": "Plus de {point} buts",
    "under": "Moins de {point} buts",
}


@dataclass
class Settings:
    model_weight: float = 0.3   # 0 = marché seul, 1 = modèle seul
    min_edge: float = 0.03      # value minimale (3 %)
    min_odds: float = 1.30
    max_odds: float = 6.0
    min_bookmakers: int = 3
    bankroll: float = 100.0
    kelly_fraction: float = 0.25
    max_stake_pct: float = 0.05


def consensus(odds: pd.DataFrame) -> pd.DataFrame:
    """Probabilités « justes » du marché et meilleure cote par issue.

    Pour chaque bookmaker on retire sa marge (normalisation des 1/cote),
    puis on fait la moyenne entre bookmakers.
    """
    keys = ["event_id", "market", "point"]
    df = odds.copy()
    df["point"] = df["point"].fillna(-1.0)
    df["implied"] = 1 / df["price"]
    book_total = df.groupby(keys + ["bookmaker"])["implied"].transform("sum")
    n_out = df.groupby(keys + ["bookmaker"])["outcome"].transform("nunique")
    df["fair"] = df["implied"] / book_total
    df["margin"] = book_total - 1
    expected = np.where(df["market"] == "h2h", 3, 2)
    df = df[n_out == expected]  # ne garder que les marchés complets

    best_idx = df.groupby(keys + ["outcome"])["price"].idxmax()
    best = df.loc[best_idx, keys + ["outcome", "price", "bookmaker"]].rename(
        columns={"price": "best_odds", "bookmaker": "best_bookmaker"}
    )
    agg = df.groupby(keys + ["outcome"]).agg(
        market_prob=("fair", "mean"),
        avg_odds=("price", "mean"),
        n_bookmakers=("bookmaker", "nunique"),
        avg_margin=("margin", "mean"),
    ).reset_index()
    info = df.groupby("event_id")[["commence_time", "home_team", "away_team"]].first().reset_index()
    out = agg.merge(best, on=keys + ["outcome"]).merge(info, on="event_id")
    out["point"] = out["point"].replace(-1.0, np.nan)
    return out


def kelly(prob, odds):
    """Fraction de Kelly : part de bankroll qui maximise la croissance à long terme."""
    return np.clip((prob * odds - 1) / (odds - 1), 0, None)


def evaluate(cons: pd.DataFrame, model_probs: dict, s: Settings) -> pd.DataFrame:
    """Ajoute proba modèle, proba retenue, value et mise conseillée à chaque issue.

    `model_probs` : {(event_id, point): dict de probabilités du modèle}.
    """
    df = cons.copy()

    def lookup(row):
        key = row["point"] if row["market"] == "totals" else np.nan
        probs = model_probs.get((row["event_id"], None if pd.isna(key) else float(key)))
        return np.nan if probs is None else probs.get(row["outcome"], np.nan)

    df["model_prob"] = df.apply(lookup, axis=1) if len(df) else np.nan
    has_model = df["model_prob"].notna()
    df["prob"] = np.where(
        has_model,
        s.model_weight * df["model_prob"] + (1 - s.model_weight) * df["market_prob"],
        df["market_prob"],
    )
    df["fair_odds"] = 1 / df["prob"]
    df["edge"] = df["prob"] * df["best_odds"] - 1
    df["model_edge"] = df["model_prob"] * df["best_odds"] - 1
    df["market_edge"] = df["market_prob"] * df["best_odds"] - 1
    stake_pct = np.minimum(kelly(df["prob"], df["best_odds"]) * s.kelly_fraction, s.max_stake_pct)
    df["stake"] = (stake_pct * s.bankroll).round(2)
    df["stake_pct"] = stake_pct
    df["confidence"] = df.apply(_confidence, axis=1)
    df["label"] = df.apply(_label, axis=1)
    return df


def _label(row) -> str:
    point = "" if pd.isna(row["point"]) else f"{row['point']:g}"
    return OUTCOME_LABELS[row["outcome"]].format(home=row["home_team"], away=row["away_team"], point=point)


def _confidence(row) -> int:
    """Note de 1 à 5 : le modèle et le marché sont-ils d'accord, value solide, marché liquide."""
    score = 1
    if pd.notna(row["model_edge"]) and row["model_edge"] > 0:
        score += 1
    if row["market_edge"] > 0:
        score += 1
    if row["edge"] > 0.06:
        score += 1
    if row["n_bookmakers"] >= 8 and row["best_odds"] <= 3.5:
        score += 1
    return score


def pick_value_bets(evaluated: pd.DataFrame, s: Settings) -> pd.DataFrame:
    df = evaluated[
        (evaluated["edge"] >= s.min_edge)
        & evaluated["best_odds"].between(s.min_odds, s.max_odds)
        & (evaluated["n_bookmakers"] >= s.min_bookmakers)
        & (evaluated["stake"] > 0)
    ]
    # Une seule recommandation par marché d'un match (la meilleure value).
    df = df.sort_values("edge", ascending=False).drop_duplicates(["event_id", "market"])
    return df.sort_values(["confidence", "edge"], ascending=False).reset_index(drop=True)
