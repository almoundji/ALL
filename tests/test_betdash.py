import numpy as np
import pandas as pd
import pytest

from betdash.data import demo_data, match_team, parse_odds, season_codes
from betdash.model import fit_ratings, predict, score_matrix
from betdash.pipeline import run
from betdash.value import Settings, consensus, kelly


def simulate(n_teams=12, rounds=6, seed=0):
    rng = np.random.default_rng(seed)
    att = np.exp(rng.normal(0, 0.3, n_teams))
    dfn = np.exp(rng.normal(0, 0.2, n_teams))
    att /= att.mean()
    dfn /= dfn.mean()
    rows = []
    for _ in range(rounds):
        for i in range(n_teams):
            for j in range(n_teams):
                if i != j:
                    rows.append({"Date": pd.Timestamp("2026-01-01"), "HomeTeam": f"T{i:02d}",
                                 "AwayTeam": f"T{j:02d}",
                                 "FTHG": rng.poisson(1.3 * 1.25 * att[i] * dfn[j]),
                                 "FTAG": rng.poisson(1.3 * att[j] * dfn[i])})
    return pd.DataFrame(rows), att, dfn


def test_model_recovers_true_strengths():
    results, att, dfn = simulate()
    r = fit_ratings(results, prior_strength=0)
    assert np.corrcoef(r.attack, att)[0, 1] > 0.9
    assert np.corrcoef(r.defense, dfn)[0, 1] > 0.8
    assert r.home_adv == pytest.approx(1.25, abs=0.1)


def test_probabilities_are_consistent():
    m = score_matrix(1.6, 1.1)
    assert m.sum() == pytest.approx(1)
    results, _, _ = simulate(rounds=2)
    p = predict(fit_ratings(results), "T00", "T01")
    assert p["home"] + p["draw"] + p["away"] == pytest.approx(1)
    assert p["over"] + p["under"] == pytest.approx(1)


def test_consensus_removes_margin_and_finds_best_price():
    events = [{
        "id": "e1", "commence_time": "2026-10-01T18:00:00Z",
        "home_team": "A", "away_team": "B",
        "bookmakers": [
            {"title": "X", "markets": [{"key": "h2h", "outcomes": [
                {"name": "A", "price": 2.0}, {"name": "B", "price": 3.5}, {"name": "Draw", "price": 3.2}]}]},
            {"title": "Y", "markets": [{"key": "h2h", "outcomes": [
                {"name": "A", "price": 2.1}, {"name": "B", "price": 3.3}, {"name": "Draw", "price": 3.1}]}]},
        ],
    }]
    c = consensus(parse_odds(events)).set_index("outcome")
    assert c["market_prob"].sum() == pytest.approx(1)
    assert c.loc["home", "best_odds"] == 2.1 and c.loc["home", "best_bookmaker"] == "Y"


def test_kelly():
    assert kelly(0.5, 2.0) == 0
    assert kelly(0.6, 2.0) == pytest.approx(0.2)
    assert kelly(0.3, 2.0) == 0


def test_team_matching():
    known = ["Man United", "Man City", "Paris SG", "Lens", "Marseille", "Ath Madrid"]
    assert match_team("Manchester United", known) == "Man United"
    assert match_team("Paris Saint Germain", known) == "Paris SG"
    assert match_team("RC Lens", known) == "Lens"
    assert match_team("Olympique Marseille", known) == "Marseille"
    assert match_team("Atletico Madrid", known) == "Ath Madrid"
    assert match_team("Unknown Town", known) is None


def test_season_codes():
    from datetime import date
    assert season_codes(date(2026, 9, 28)) == ["2627", "2526"]
    assert season_codes(date(2027, 3, 1)) == ["2627", "2526"]


def test_demo_pipeline_end_to_end():
    res = run([], Settings(model_weight=0.3, min_edge=0.03), demo=True)
    assert not res.warnings
    assert len(res.matches) == 9
    assert not res.picks.empty
    assert (res.picks["edge"] >= 0.03).all()
    assert (res.picks["stake_pct"] <= 0.05).all()
