# Analyse du fichier électoral (Sénégal)

Outil web en tuiles pour analyser la carte électorale et l'évolution du fichier électoral :

| Onglet | Contenu |
| --- | --- |
| Mon accueil | Tuiles de synthèse de tous les modules, filtrables par région / département |
| Carte électorale 2022 | Électeurs, bureaux et lieux de vote (national + diaspora), taille des bureaux, implantation |
| Évolution 2019 → 2022 | Bilan : électeurs 2019 − disparus − sortis + venus + nouveaux inscrits = 2022 |
| Locales → Législatives | Variation des centres, bureaux et électeurs entre janvier et juillet 2022 |
| Transferts d'électeurs | Matrice inter-régions, soldes par département et commune, principaux flux |
| Stratégie électorale | Rapport de force par département, simulateur de sièges (165 : 112 majoritaires + 53 proportionnels), priorités de mobilisation, historique des scrutins, cadre réglementaire et calendrier |
| Qualité des données | Contrôles de cohérence automatiques (doublons, numérotation, écarts entre sources…) |
| Fiches | Région, département, commune, lieu de vote (bureaux), pays — accessibles par clic ou recherche (Ctrl K) |

## Lancer en local

```bash
cd fichier-electoral
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000. (L'ouverture directe du fichier `index.html` ne fonctionne pas :
le navigateur bloque la lecture des fichiers de données en `file://`.)

## Données

- `data/sources/` : fichiers bruts (CSV de la carte électorale, classeurs Excel).
- `scripts/build_data.py` : prépare les données (nécessite `openpyxl`) et les découpe :
  - `data/resume.json` — agrégats nationaux à communaux, chargés à l'ouverture ;
  - `data/regions/<REGION>.json` — détail par région (lieux et bureaux, transferts entre communes), chargé à la demande.

- `scripts/build_strategie.py` : prépare `data/strategie.json` à partir de `data/sources/elections/` (résultats,
  `config.json` = familles politiques et scissions) et `data/sources/reglementation/` (sièges, calendrier, cadre juridique).

- `scripts/build_resultats_fins.py` : résultats par commune et par bureau (Législatives 2024, source SAGE,
  couverture partielle : 27 départements sur 46) -> `data/resultats/L2024/` (un fichier par département).

Pour ajouter ou mettre à jour des données : déposer les fichiers dans `data/sources/` puis lancer
`python3 scripts/build_data.py`.

## Déploiement

Site statique : sur Netlify, choisir `fichier-electoral` comme *Base directory* (voir `netlify.toml`).
