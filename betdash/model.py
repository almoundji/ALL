"""Modèle de buts de Poisson (Maher / Dixon-Coles) avec pondération temporelle.

Chaque équipe a une force offensive et une force défensive estimées sur les
résultats passés, les matchs récents pesant plus lourd. On en déduit le nombre
de buts attendu de chaque équipe, puis la probabilité de chaque score exact,
et enfin la probabilité de chaque pari (1N2, plus/moins de buts, les deux
équipes marquent).
"""

from dataclasses import dataclass
from math import lgamma, log

import numpy as np
import pandas as pd


@dataclass
class Ratings:
    teams: list
    attack: np.ndarray
    defense: np.ndarray
    home_adv: float
    mu: float
    weight: np.ndarray  # poids cumulé des matchs de chaque équipe (fiabilité)

    def __post_init__(self):
        self.index = {t: i for i, t in enumerate(self.teams)}

    def __contains__(self, team):
        return team in self.index

    def table(self) -> pd.DataFrame:
        df = pd.DataFrame(
            {
                "Équipe": self.teams,
                "Attaque": self.attack,
                "Défense": self.defense,
                "Matchs (pondérés)": self.weight,
            }
        )
        # Indice de force = buts marqués attendus / buts encaissés attendus.
        df["Force"] = df["Attaque"] / df["Défense"]
        return df.sort_values("Force", ascending=False).reset_index(drop=True)


def fit_ratings(
    results: pd.DataFrame,
    half_life_days: float = 180,
    prior_strength: float = 3.0,
    iterations: int = 200,
    ref_date=None,
) -> Ratings:
    """Estime les forces des équipes par maximum de vraisemblance pondéré.

    `results` doit contenir Date, HomeTeam, AwayTeam, FTHG, FTAG.
    `prior_strength` tire les équipes avec peu de matchs vers la moyenne.
    """
    df = results.dropna(subset=["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"])
    if df.empty:
        raise ValueError("Aucun résultat pour estimer le modèle")
    ref_date = pd.Timestamp(ref_date) if ref_date is not None else df["Date"].max()
    age = (ref_date - df["Date"]).dt.days.clip(lower=0).to_numpy(dtype=float)
    w = 0.5 ** (age / half_life_days)

    teams = sorted(set(df["HomeTeam"]) | set(df["AwayTeam"]))
    idx = {t: i for i, t in enumerate(teams)}
    h = df["HomeTeam"].map(idx).to_numpy()
    a = df["AwayTeam"].map(idx).to_numpy()
    hg = df["FTHG"].to_numpy(dtype=float)
    ag = df["FTAG"].to_numpy(dtype=float)
    n = len(teams)

    att = np.ones(n)
    dfn = np.ones(n)
    mu = np.sum(w * (hg + ag)) / (2 * np.sum(w))
    home = 1.0
    for _ in range(iterations):
        prev = att.copy()
        scored = np.bincount(h, w * hg, n) + np.bincount(a, w * ag, n)
        exp_scored = np.bincount(h, w * mu * home * dfn[a], n) + np.bincount(a, w * mu * dfn[h], n)
        att = (scored + prior_strength * mu) / (exp_scored + prior_strength * mu)
        att /= att.mean()

        conceded = np.bincount(a, w * hg, n) + np.bincount(h, w * ag, n)
        exp_conceded = np.bincount(a, w * mu * home * att[h], n) + np.bincount(h, w * mu * att[a], n)
        dfn = (conceded + prior_strength * mu) / (exp_conceded + prior_strength * mu)
        dfn /= dfn.mean()

        mu = np.sum(w * ag) / np.sum(w * att[a] * dfn[h])
        home = np.sum(w * hg) / np.sum(w * mu * att[h] * dfn[a])
        if np.max(np.abs(att - prev)) < 1e-7:
            break

    weight = np.bincount(h, w, n) + np.bincount(a, w, n)
    return Ratings(teams, att, dfn, float(home), float(mu), weight)


def _poisson_pmf(lam: float, max_goals: int) -> np.ndarray:
    k = np.arange(max_goals + 1)
    return np.exp(k * log(lam) - lam - np.array([lgamma(i + 1) for i in k]))


def score_matrix(lam_home: float, lam_away: float, rho: float = -0.05, max_goals: int = 10) -> np.ndarray:
    """Probabilités des scores exacts, avec la correction Dixon-Coles des petits scores."""
    m = np.outer(_poisson_pmf(lam_home, max_goals), _poisson_pmf(lam_away, max_goals))
    m[0, 0] *= 1 - lam_home * lam_away * rho
    m[0, 1] *= 1 + lam_home * rho
    m[1, 0] *= 1 + lam_away * rho
    m[1, 1] *= 1 - rho
    return m / m.sum()


def expected_goals(r: Ratings, home: str, away: str) -> tuple:
    i, j = r.index[home], r.index[away]
    lam_h = r.mu * r.home_adv * r.attack[i] * r.defense[j]
    lam_a = r.mu * r.attack[j] * r.defense[i]
    return lam_h, lam_a


def market_probs(m: np.ndarray, total_line: float = 2.5) -> dict:
    goals = np.add.outer(np.arange(m.shape[0]), np.arange(m.shape[1]))
    over = float(m[goals > total_line].sum())
    return {
        "home": float(np.tril(m, -1).sum()),
        "draw": float(np.trace(m)),
        "away": float(np.triu(m, 1).sum()),
        "over": over,
        "under": 1 - over,
        "btts_yes": float(m[1:, 1:].sum()),
    }


def predict(r: Ratings, home: str, away: str, total_line: float = 2.5) -> dict:
    lam_h, lam_a = expected_goals(r, home, away)
    m = score_matrix(lam_h, lam_a)
    probs = market_probs(m, total_line)
    i, j = np.unravel_index(np.argmax(m), m.shape)
    probs.update(xg_home=lam_h, xg_away=lam_a, likely_score=f"{i}-{j}")
    return probs


