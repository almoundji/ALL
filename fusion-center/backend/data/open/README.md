# Données ouvertes de référence

Jeux de données publics, collectés le 6 novembre 2026, chargés par `python backend/scripts/load_open_data.py --url <api>`.

| Fichier | Source | Licence / statut | Contenu | Usage dans l'outil |
| --- | --- | --- | --- | --- |
| `lieux_reference_senegal.csv` | OpenStreetMap via Nominatim (`scripts/geocode_places.py`) | ODbL | 45 lieux : 10 postes frontières, 4 aéroports, 3 ports, 4 quais de pêche, infrastructures critiques et sites sensibles, 14 chefs-lieux de région, avec coordonnées et identifiant OSM | Carte, règles de veille géographiques, raccrochage des observations terrain |
| `sanctions_onu_individus.csv` | Liste consolidée du Conseil de sécurité de l'ONU, version française (`scripts/parse_un_sanctions.py`) | Document public des Nations unies | 232 personnes inscrites, périmètre Afrique : nom, date et lieu de naissance, nationalité, alias, adresse, liste, référence, date d'inscription, résumé | Rapprochement automatique à l'ingestion (une personne importée depuis une autre source qui correspond hérite de la provenance ONU), recherche, veille |
| `sanctions_onu_entites.csv` | Idem | Idem | 42 organisations inscrites : nom, alias, adresse, liste, référence, résumé | Idem |

Les trois jeux sont classifiés **Non protégé** et rattachés à des sources cotées (OSM-NOMINATIM : B, ONU-SANCTIONS : A).
Rafraîchissement conseillé : liste ONU chaque semaine (le XML est régénéré quotidiennement), référentiel géographique chaque trimestre.

## Sources envisagées mais non chargées

- **Notices rouges publiques d'Interpol** : l'API publique refuse les accès automatisés depuis un serveur (erreur 403). À collecter via le Bureau central national ou depuis un poste autorisé.
- **Données nominatives de l'État** (état civil, immatriculations, abonnés, relevés d'appels, CENTIF) : accessibles uniquement par protocole d'échange et après avis de la CDP ; voir `docs/MISE_EN_PRODUCTION.md`, chantiers A et D.
