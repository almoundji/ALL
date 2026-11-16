# Développement et promotion de l'Artisanat national

Plateforme de mise en œuvre des orientations du Conseil des ministres du 28 octobre 2026 (lettre du SGG du 6 novembre 2026) :
recensement et enrôlement des artisans, accès à la commande publique (APDA, Mobilier national), Fonds spécial pour le financement
de l'Artisanat, infrastructures des Chambres de métiers et régularisation foncière des villages artisanaux.

> Les données de démonstration (artisans, marchés, montants, statuts fonciers) sont **fictives**.

| Espace | URL | Style |
| --- | --- | --- |
| Portail usagers | `/` | Charte inspirée de presidence.sn (actualités, bandeau tricolore, capitales, pied de page noir) |
| Administration | `/admin` | SAP Fiori : tuiles par prescription, List Report, Object Page, barre d'actions |
| Documentation | `/documentation` | Présentation, guide de l'usager, guide de l'administrateur, API, architecture (`public/docs/*.md`) |

Comptes de démonstration : `admin / admin123`, `cm.thies / agent123` (agent, région de Thiès), `lecteur / lecteur123`.
Espace artisan de démonstration : bouton « Remplir avec un compte de démonstration » (Awa Diop, `77 123 45 67`).

```bash
npm install
npm test          # scénarios de bout en bout de l'API
npm run serve     # prévisualisation locale sur http://localhost:8888
```

Déploiement Netlify : *Base directory* `artisanat` (le reste est dans `netlify.toml`). Variables : `ART_SECRET_KEY` (obligatoire en ligne),
`ART_ADMIN_PASSWORD` (optionnelle). Détails : `public/docs/ARCHITECTURE.md`.
