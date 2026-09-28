"""Usage : python -m betdash --demo   |   python -m betdash --key CLE --league "Ligue 1 (FRA)" """

import argparse
import os

from .config import DEFAULT_LEAGUES, LEAGUES
from .pipeline import run
from .value import Settings


def main():
    ap = argparse.ArgumentParser(description="Value bets football en ligne de commande")
    ap.add_argument("--demo", action="store_true", help="données simulées, sans internet")
    ap.add_argument("--key", default=os.environ.get("ODDS_API_KEY"), help="clé The Odds API")
    ap.add_argument("--league", action="append", choices=list(LEAGUES), help="répétable")
    ap.add_argument("--min-edge", type=float, default=0.03)
    ap.add_argument("--bankroll", type=float, default=100.0)
    args = ap.parse_args()

    s = Settings(min_edge=args.min_edge, bankroll=args.bankroll)
    res = run(args.league or DEFAULT_LEAGUES, s, api_key=args.key, demo=args.demo)
    for w in res.warnings:
        print("!", w)
    if res.picks.empty:
        print("Aucun value bet trouvé avec ces critères.")
        return
    for p in res.picks.itertuples():
        print(f"{p.commence_time:%d/%m %H:%M}  {p.home_team} - {p.away_team}\n"
              f"   -> {p.label} @ {p.best_odds:.2f} ({p.best_bookmaker})"
              f"  value {p.edge:+.1%}  proba {p.prob:.0%}  mise {p.stake:.2f}  {'★' * p.confidence}")
    if res.credits_remaining:
        print(f"Crédits The Odds API restants : {res.credits_remaining}")


if __name__ == "__main__":
    main()
