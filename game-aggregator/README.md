# Yoon — agrégateur de jeux de hasard

*Un seul chemin vers tous les jeux.* Yoon relie les opérateurs (casinos, sites de paris) à tous les fournisseurs
de jeux via une seule intégration : catalogue unifié, portefeuille, sessions, tours de jeu, jeu responsable, audit,
reporting.

| Document | Contenu |
| --- | --- |
| [docs/SCRUM.md](docs/SCRUM.md) | Démarrage Scrum, modules, feuille de route sur 8 sprints |
| [docs/BACKLOG_SPRINT1.md](docs/BACKLOG_SPRINT1.md) | Stories estimées du Sprint 1 |
| [docs/UX_UI.md](docs/UX_UI.md) | Nom, principes UX (SAP Fiori), charte graphique |
| [mockup/launchpad.html](mockup/launchpad.html) | Maquette statique du lanceur |

## État : Sprint 0 livré

- API FastAPI avec `GET /api/health` et `GET /api/modules` (feuille de route), 12 modules enregistrés (routeurs vides).
- Montants en **unités mineures entières** (`app/core/money.py`), flottants refusés, XOF sans subdivision.
- Interface React : jetons de la charte (`frontend/src/tokens.css`), shell bar, lanceur branché sur l'API,
  gabarits Fiori *List Report* et *Object Page* vides, mode sombre.
- Tests backend (`pytest`), CI GitHub Actions (backend + build frontend), Docker + PostgreSQL pour la recette.

## Lancer en local

```bash
make setup
```

```bash
make dev
```

API et interface sur <http://localhost:8000>, documentation sur `/docs`. Tests : `make test`.
Variables d'environnement : préfixe `YOON_`, voir `backend/.env.example`. Recette avec PostgreSQL : `make docker`.

## Structure

```
backend/app/core/      config, base de données, Money
backend/app/modules/   un paquet par module (operators, providers, catalog, players, wallet, sessions, rounds, rng, audit, responsible, bonus, reporting)
backend/tests/         tests pytest
frontend/src/          React + Vite : tokens.css, Shell, Tile, Launchpad, ListReport, ObjectPage
```
