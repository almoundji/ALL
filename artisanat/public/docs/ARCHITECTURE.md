# Architecture et déploiement

## Vue d'ensemble

```
artisanat/
├── netlify.toml                 publication de public/, fonctions, en-têtes de sécurité (CSP), redirections /admin et /documentation
├── netlify/functions/api.mts    API REST (fonction serverless, route /api/*)
├── netlify/lib/data.mts         modèle de données, référentiels, jetons, mots de passe, jeu de démonstration
├── public/                      site statique sans compilation
│   ├── index.html               portail usagers (charte presidence.sn)
│   ├── admin.html               console d'administration (SAP Fiori)
│   ├── docs.html + docs/*.md    documentation
│   └── assets/                  app.css, common.js, usager.js, admin.js, docs.js
└── tests/                       api.test.mts (scénarios de bout en bout), serve.mts (prévisualisation locale)
```

- **Interface** : HTML, CSS et JavaScript natifs (modules ES), sans framework ni dépendance externe (pas de CDN, pas de police distante). Les graphiques et illustrations sont générés en SVG.
- **API** : une fonction TypeScript Netlify (Node 22) avec un routeur interne, validation des entrées, contrôle des rôles et du périmètre régional, journal d'audit.
- **Persistance** : l'état est un document JSON unique dans **Netlify Blobs** (magasin `artisanat`, cohérence forte). C'est adapté à une démonstration ou à un pilote, pas à une exploitation nationale : pas de transactions ni d'écritures concurrentes sûres.

## Sécurité

- Mots de passe salés et hachés (SHA-256), comparaison en temps constant ; jetons signés HMAC-SHA256 avec expiration.
- Contrôle d'accès côté serveur : rôle (admin, agent, lecteur), périmètre régional, lecture seule du lecteur ; services de l'espace artisan réservés aux dossiers validés.
- Données publiques minimisées : l'annuaire ne publie ni nom complet, ni CNI, ni téléphone complet ; les budgets et références foncières ne sont pas exposés au public.
- En-têtes : `Content-Security-Policy` stricte (scripts du site uniquement), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag: noindex` (démonstration).
- Échappement systématique des contenus affichés (pas d'injection HTML).

## Variables d'environnement Netlify

| Variable | Rôle |
| --- | --- |
| `ART_SECRET_KEY` | Clé de signature des jetons (longue chaîne aléatoire). La changer déconnecte toutes les sessions. |
| `ART_ADMIN_PASSWORD` | Mot de passe du compte `admin` lors de l'initialisation du jeu de données (défaut : `admin123`). |
| `ART_STORAGE` | `memory` pour désactiver Netlify Blobs (tests locaux). |

## Développement local

```bash
cd artisanat
npm install
npm test          # scénarios de bout en bout de l'API (Node 22)
npm run serve     # http://localhost:8888 — portail, /admin, /documentation, API en mémoire
```

## Déploiement Netlify

Le dossier `artisanat/` est autonome. Sur Netlify : *Base directory* = `artisanat`, *Publish directory* = `public`, fonctions dans `netlify/functions` (déjà déclarés dans `netlify.toml`). Ou en ligne de commande :

```bash
cd artisanat
npx netlify deploy --prod
```

## Passage en production (recommandations)

1. **Base de données relationnelle** (PostgreSQL hébergé dans un centre de données souverain) à la place du document JSON ; numérotation des artisans par séquence transactionnelle.
2. **Vérification d'identité** : interconnexion avec le fichier national des CNI (DAF) et envoi d'un code SMS de confirmation du téléphone à l'enrôlement et à la connexion à l'espace artisan.
3. **Paiement mobile** des apports solidaires (Wave, Orange Money) avec rapprochement automatique.
4. **Authentification des agents** via l'annuaire de l'administration (SSO) et double facteur ; politique de mots de passe.
5. **Interconnexions** : NINEA (ANSD/DGID), plateforme des marchés publics (ARCOP), système d'information du FONGIP/DER-FJ, cadastre (DGID) pour le foncier.
6. **Carte d'artisan** : QR code signé vérifiable en ligne.
7. Sauvegardes chiffrées, journal d'audit chaîné, déclaration du traitement auprès de la CDP.
