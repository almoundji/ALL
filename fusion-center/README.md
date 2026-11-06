# Centre de Fusion National — plateforme de fusion de données pour le renseignement

Prototype souverain d'un **centre de fusion de données** (classe Palantir Gotham / Data Fusion / Euler), construit en réponse
au compte rendu de la mission de benchmark de Dubaï (22–25 septembre 2024, MCTN / Senum / DRN / CCDOC).

> **Toutes les données de démonstration sont fictives** (personnes, organisations, numéros, comptes).

## Ce que fait l'outil

| Capacité | Détail |
| --- | --- |
| **Ontologie unifiée** | 10 types d'objets (personne, organisation, véhicule, téléphone, lieu, événement, compte, appareil, document, navire) et 13 types de relations, attributs libres (JSON). |
| **Résolution d'identité** | Dédoublonnage automatique à l'ingestion : clés fortes (téléphone normalisé, plaque, pièce d'identité, IBAN, IMEI) puis appariement flou (RapidFuzz) avec garde-fous (date de naissance contradictoire, sous-ensemble de jetons). Les variantes sont conservées, jamais écrasées. |
| **Provenance** | Chaque affirmation est rattachée à sa source, cotée A–F (échelle OTAN), avec score d'appariement et horodatage. La confiance agrégée monte avec le nombre de sources indépendantes. |
| **Habilitations** | 4 niveaux (NP, DR, CD, SD) **et** compartiments de besoin d'en connaître (ex. OPS, FIN, CYBER). Le filtrage est appliqué dans la couche d'accès : un objet hors habilitation renvoie 404 (existence non révélée), y compris dans le graphe, les chemins, les alertes et les dossiers. |
| **Analyse de liens** | Expansion de voisinage (profondeur 1–4), plus court chemin, centralité (degré, intermédiarité, PageRank), détection de communautés ; visualisation Cytoscape avec 4 dispositions. |
| **Carte** | Entités géolocalisées, popups vers les fiches, fond de carte substituable par un serveur de tuiles interne. |
| **Dossiers d'enquête** | Référence `DRN-AAAA-NNNN`, statut, priorité, classification, entités avec rôle, journal d'analyse typé (note, hypothèse, décision, action), graphe du dossier. |
| **Veille & alertes** | Règles (égal / contient / flou / regex) sur tout champ, évaluées à l'ingestion **et** rétroactivement à la création ; workflow nouvelle → prise en compte → close. |
| **Ingestion** | CSV / JSON → entités + relations via un mapping déclaratif ; 4 modèles fournis (annuaire, relevés d'appels, immatriculations, virements) ; prévisualisation ; rapport créé / fusionné / alertes. |
| **Journal d'audit chaîné** | Chaque lecture de fiche, expansion de graphe, connexion, écriture est journalisée ; les entrées sont chaînées par SHA-256, l'intégrité est vérifiable en un clic. |
| **Administration** | Utilisateurs, rôles (admin / analyst / viewer), niveaux, compartiments, désactivation. |

## Interface

- **Structure** inspirée des portails métier en tuiles : en-tête fixe avec recherche globale (`Ctrl K`), salutation datée, onglets
  horizontaux par domaine, page d'accueil en sections de tuiles (titre, sous-titre, pictogramme, indicateur, légende) et tuiles
  d'action en pointillé (« Créer un dossier », « Importer un fichier »).
- **Charte graphique** alignée sur le site de la Présidence de la République (presidence.sn) : fond blanc, texte `#272727`,
  titres noirs en capitales, vert `#008f36`, jaune `#ffeb00`, rouge `#e1001a`, boutons en pilule, cartes plates, bandeau tricolore
  étoilé sous l'en-tête, pied de page noir. Les variables sont centralisées dans `frontend/src/styles.css` (`:root`).
- **Bandeau de classification** permanent, coloré selon l'habilitation de la session (NP vert, DR bleu, CD ocre, SD rouge).

## Démarrage rapide (démo locale, 5 minutes)

```bash
cd fusion-center
make setup           # venv Python + dépendances
make ui              # npm install + build de l'interface dans backend/app/static
make api             # http://localhost:8000  (API docs : /docs)
```

Comptes de démonstration : `admin/admin123` (SD, tous compartiments) · `analyste/analyste123` (CD, OPS+FIN) ·
`officier/officier123` (DR) · `lecteur/lecteur123` (NP, lecture seule). Connectez-vous successivement avec chacun pour
constater le cloisonnement.

Fichiers d'exemple pour tester l'ingestion : `backend/data/exemple_annuaire.csv` (modèle *annuaire_personnes*) et
`backend/data/exemple_cdr.csv` (modèle *cdr_appels*). La première ligne de l'annuaire fusionne avec une personne existante.

Tests : `make test` (17 tests : habilitations, compartiments, résolution d'identité, ingestion, graphe, audit).

Déploiement de référence avec PostgreSQL : `FC_SECRET_KEY=$(openssl rand -hex 32) docker compose up --build`.

## Structure

```
fusion-center/
├── backend/app/
│   ├── core/        config, base de données, sécurité (JWT, niveaux, compartiments)
│   ├── models/      ontologie SQLAlchemy (entités, relations, provenance, dossiers, veille, audit)
│   ├── services/    access (filtrage), resolution (identité), ingestion, graph (NetworkX), alerts, audit (chaîne)
│   ├── api/         routes REST : auth, entities, graph, cases, ingest, alerts, admin
│   └── seed.py      jeu de données fictif
├── backend/tests/   tests d'intégration API
├── frontend/src/    React + TypeScript (Cytoscape, Leaflet, Recharts)
└── docs/            ARCHITECTURE.md · SCRUM.md · GOUVERNANCE.md
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture cible, modèle de sécurité, montée en charge, trajectoire vers Neo4j / OpenSearch / Kafka.
- [docs/SCRUM.md](docs/SCRUM.md) — **méthode Scrum** proposée : équipe composite, rôles, cadence, backlog produit priorisé, 12 sprints, définition de prêt / de fini, indicateurs.
- [docs/GOUVERNANCE.md](docs/GOUVERNANCE.md) — cadre juridique et éthique, conduite du changement, exigences de souveraineté, contrôles.

## Limites du prototype (assumées)

SQLite par défaut (PostgreSQL via `FC_DATABASE_URL`), recherche par `LIKE` (OpenSearch prévu au sprint 5), graphe en mémoire
NetworkX (adapté à ~10⁵ nœuds ; Neo4j / JanusGraph au-delà), pas de SSO ni de MFA (prévus sprint 3), fond de carte Internet par défaut.
Voir la feuille de route dans `docs/SCRUM.md`.
