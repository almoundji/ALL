# Backtest — l'app aurait-elle gagné de l'argent ?

Rejoue 5 saisons passées (2021-22 à 2025-26) sur 9 championnats (16 478 matchs) :
pour chaque journée, le modèle est ré-estimé **uniquement avec les matchs déjà joués**,
puis on applique les règles de l'app aux cotes d'avant-match et on compte les résultats réels.
Données : football-data.co.uk (résultats, cotes d'avant-match et de clôture).

```bash
python backtest/predict.py      # prédictions à l'aveugle (~1 min 30)
python backtest/strategies.py   # rejoue tous les réglages -> backtest/results/*.csv
```

Mesures (mise fixe de 1 € par pari) :
- **ROI** : bénéfice par euro misé ;
- **CLV** : avantage de la cote prise sur la cote de clôture Pinnacle sans marge — l'indicateur
  le plus fiable d'un avantage réel, bien moins soumis au hasard que le ROI.

## Résultats (septembre 2026)

**1. Le modèle statistique seul prédit moins bien que les bookmakers.**
Log-loss 1N2 (plus bas = meilleur) : modèle 1,001 ; consensus du marché 0,981 ;
Pinnacle à la clôture 0,975. Chaque dose de modèle ajoutée au marché dégrade la précision.

**2. L'ancien réglage de l'app perdait de l'argent.**
Poids du modèle 30 %, value ≥ 3 %, meilleure cote : 9 974 paris, ROI −6,2 %, CLV −1,0 %,
0 saison gagnante sur 5.

**3. Ce qui marche : comparer les bookmakers (poids du modèle = 0).**

| Value minimale | Paris | ROI | CLV | Saisons gagnantes |
|---|---|---|---|---|
| 3 % | 1 878 | −3,6 % | +2,1 % | 1/5 |
| 5 % | 494 | +6,3 % | +4,6 % | 4/5 |
| 8 % | 77 | +27 % | +12,1 % | 3/5 |

La CLV est positive chaque saison au seuil de 5 % (+2,5 % à +19,6 %) : la meilleure cote
du marché, quand elle s'écarte nettement du consensus, bat la clôture. Le ROI n'est pas
encore statistiquement significatif (trop peu de paris), mais va dans le même sens.
Nouveaux réglages par défaut de l'app : **poids du modèle 0, value minimale 5 %**.

**4. Combinés 3 matchs par week-end (cotes Bet365).**
Prudent −15 %, équilibré −12 %, audacieux +14 % mais seulement 12 combinés gagnés sur 189 :
résultat dû au hasard autant qu'à la méthode, non démontré.

## Limites
- Les cotes « max » de football-data couvrent de nombreux bookmakers, dont certains
  inaccessibles depuis la France ou le Sénégal ; chez un seul bookmaker à forte marge
  (Betclic, Winamax…), il y a beaucoup moins d'occasions.
- Les bookmakers limitent les comptes qui battent régulièrement la clôture.
- Le passé ne garantit pas l'avenir.
