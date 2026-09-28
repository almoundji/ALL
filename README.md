# ⚽ Value Bets Football

Tableau de bord qui :

1. **récupère les cotes** 1N2 et plus/moins de buts de dizaines de bookmakers
   européens (Betclic, Unibet, Winamax, Bet365, Pinnacle…) via [The Odds API](https://the-odds-api.com) ;
2. **estime les vraies probabilités** avec un modèle statistique (Poisson / Dixon-Coles)
   entraîné sur les résultats des deux dernières saisons ([football-data.co.uk](https://www.football-data.co.uk)),
   combiné au consensus du marché (marge des bookmakers retirée) ;
3. **signale les « value bets »** : les paris dont la meilleure cote disponible est
   supérieure à la cote juste, avec une mise conseillée (Kelly fractionné, plafonné).

Championnats : Premier League, Championship, Ligue 1, Ligue 2, Liga, Bundesliga,
Serie A, Eredivisie, Liga Portugal.

## Installation

```bash
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
```

## Utilisation

```bash
streamlit run app.py
```

Sans clé, le tableau de bord démarre en **mode démo** (championnat fictif, hors ligne).
Pour les vraies données, crée une clé gratuite sur <https://the-odds-api.com>
(500 crédits/mois ; une actualisation coûte ~4 crédits par championnat, avec un cache de 15 min),
puis colle-la dans la barre latérale ou :

```bash
cp .streamlit/secrets.toml.example .streamlit/secrets.toml   # et y mettre ta clé
# ou : export ODDS_API_KEY=ta_cle
```

En ligne de commande :

```bash
python -m betdash --demo
python -m betdash --key TA_CLE --league "Ligue 1 (FRA)" --league "Premier League (ANG)"
```

Tests : `pip install pytest && pytest`

## Onglets

| Onglet | Contenu |
| --- | --- |
| 🎯 Paris conseillés | Value bets triés par confiance : cote, bookmaker, cote juste, probas, value, mise |
| 📅 Tous les matchs | Probas 1/N/2, +2.5 buts, les deux marquent, buts attendus, score probable ; détail des cotes |
| 📊 Force des équipes | Forces offensives / défensives estimées, avantage du terrain |
| 📖 Méthode | Explication du calcul et des limites |

## Structure

```
app.py               tableau de bord Streamlit
betdash/config.py    championnats et correspondance des noms d'équipes
betdash/data.py      téléchargement des résultats et des cotes, données démo
betdash/model.py     modèle de buts (forces des équipes -> probabilités)
betdash/value.py     consensus du marché, value, critère de Kelly
betdash/pipeline.py  enchaînement complet
```

## ⚠️ À lire avant de parier

- **Aucun modèle ne garantit un gain.** Les bookmakers sont très bons ; une « value »
  apparente vient souvent d'une information que le modèle ignore (blessures, rotation,
  motivation). Vérifie l'actualité des équipes.
- Les résultats ne se jugent que sur des **centaines de paris**. Note tes paris et compare
  ta cote à la cote de clôture : si tu la bats régulièrement, la méthode a de la valeur.
- Les bookmakers limitent souvent les comptes gagnants.
- Mise seulement ce que tu peux perdre. Aide : Joueurs Info Service — 09 74 75 13 13.
