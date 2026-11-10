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

## État : Sprint 1 livré — une partie de bout en bout

- API FastAPI : opérateurs et clés d'API (hachées, affichées une fois), fournisseurs, catalogue unifié avec activation par opérateur,
  joueurs (18 ans minimum), portefeuille à grand livre **idempotent**, sessions à jeton, tours de jeu avec **RNG prouvablement
  équitable** (engagement sha256, vérification publique), journal d'audit **chaîné**. Documentation OpenAPI sur `/api/docs`.
- Montants en **unités mineures entières** (`app/core/money.py`), flottants refusés, XOF sans subdivision.
- Interface React (Fiori) : connexion par clé d'API, lanceur à chiffres réels, catalogue et fiche jeu, joueurs et portefeuille,
  client de jeu « Dés de Yoon » (`/play/<jeton>`), onglet Documentation FR/EN, mode sombre.
- 34 tests backend (`pytest`), test de bout en bout de la fonction Netlify (`npm run test:netlify`), CI GitHub Actions, Docker + PostgreSQL.

**Comptes de démonstration (hors production)** : clé d'administration `admin-dev-key` (en-tête `X-Admin-Key`), clé de l'opérateur
démo `yk_demo-operator-key-change-me` (en-tête `X-Api-Key`, proposée sur la page de connexion). À remplacer par `YOON_ADMIN_KEY`
et `YOON_DEMO_OPERATOR_KEY` en recette.

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

## Version en ligne (Netlify)

Recette publique : <https://yoon-agregateur-jeux.netlify.app> (protégée par mot de passe, réglable dans
*Project configuration → Access & security*). `netlify.toml` construit l'interface (`frontend/dist`) et expose l'API
Sprint 0 en fonction serverless (`netlify/functions/api.mts`), port du socle FastAPI. Le backend Python reste la
référence ; la fonction est réalignée à chaque sprint.

Déployer : depuis `game-aggregator/`, `npx netlify-cli deploy --prod --build` (projet `yoon-agregateur-jeux`).

## Documentation intégrée

L'onglet **Documentation** de l'interface (`/documentation`) est bilingue français / anglais dès le Sprint 0 :
présentation, modules, feuille de route Scrum, API, charte, glossaire. La langue est mémorisée par navigateur et
bascule aussi la shell bar (`frontend/src/lib/i18n.ts`).
