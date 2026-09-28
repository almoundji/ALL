"""Enchaîne collecte -> modèle -> détection de value, pour un ou plusieurs championnats."""

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import data
from .config import LEAGUES
from .model import fit_ratings, predict
from .value import Settings, consensus, evaluate, pick_value_bets


@dataclass
class Analysis:
    picks: pd.DataFrame
    outcomes: pd.DataFrame
    matches: pd.DataFrame
    ratings: dict = field(default_factory=dict)
    warnings: list = field(default_factory=list)
    credits_remaining: str | None = None


def analyse_league(league: str, results: pd.DataFrame, odds: pd.DataFrame,
                   s: Settings, half_life_days: float = 180):
    ratings = fit_ratings(results, half_life_days=half_life_days)
    warnings = []
    model_probs, match_rows = {}, []
    events = odds.drop_duplicates("event_id")
    for ev in events.itertuples():
        home = data.match_team(ev.home_team, ratings.teams)
        away = data.match_team(ev.away_team, ratings.teams)
        row = {"league": league, "event_id": ev.event_id, "commence_time": ev.commence_time,
               "home_team": ev.home_team, "away_team": ev.away_team}
        if home is None or away is None:
            missing = [t for t, m in ((ev.home_team, home), (ev.away_team, away)) if m is None]
            warnings.append(f"{league} : pas d'historique pour {', '.join(missing)} "
                            "(analyse basée sur le marché uniquement)")
            match_rows.append(row)
            continue
        lines = odds.loc[(odds["event_id"] == ev.event_id) & (odds["market"] == "totals"), "point"]
        for line in {2.5, *lines.dropna().astype(float).unique()}:
            p = predict(ratings, home, away, total_line=line)
            model_probs[(ev.event_id, line)] = p
            model_probs.setdefault((ev.event_id, None), p)
        row.update(model_probs[(ev.event_id, 2.5)])
        match_rows.append(row)

    ev_out = evaluate(consensus(odds), model_probs, s) if len(odds) else pd.DataFrame()
    if len(ev_out):
        ev_out.insert(0, "league", league)
    return ev_out, pd.DataFrame(match_rows), ratings, warnings


def run(leagues: list, s: Settings, api_key: str | None = None, demo: bool = False,
        half_life_days: float = 180, loaders=None) -> Analysis:
    """`loaders` permet d'injecter des fonctions de chargement (cache Streamlit)."""
    load_results = (loaders or {}).get("results", data.load_results)
    fetch_odds = (loaders or {}).get("odds", data.fetch_odds)

    all_outcomes, all_matches, ratings, warnings = [], [], {}, []
    credits = None
    targets = ["Championnat démo"] if demo else leagues
    for league in targets:
        try:
            if demo:
                results, odds = data.demo_data()
            else:
                if not api_key:
                    raise RuntimeError("clé The Odds API manquante")
                cfg = LEAGUES[league]
                odds, credits = fetch_odds(cfg["odds"], api_key)
                if odds.empty:
                    warnings.append(f"{league} : aucun match à venir coté")
                    continue
                results = load_results(cfg["fd"])
            outcomes, matches, r, w = analyse_league(league, results, odds, s, half_life_days)
        except Exception as exc:  # une ligue en échec ne bloque pas les autres
            warnings.append(f"{league} : {exc}")
            continue
        all_outcomes.append(outcomes)
        all_matches.append(matches)
        ratings[league] = r
        warnings.extend(w)

    outcomes = pd.concat(all_outcomes, ignore_index=True) if all_outcomes else pd.DataFrame()
    matches = pd.concat(all_matches, ignore_index=True) if all_matches else pd.DataFrame()
    picks = pick_value_bets(outcomes, s) if len(outcomes) else pd.DataFrame()
    return Analysis(picks, outcomes, matches, ratings, warnings, credits)
