# Référence de l'API

Base : `/api`. Échanges en JSON. Les erreurs renvoient `{"detail": "message"}` avec le code HTTP adapté (401 session, 403 droits, 404 introuvable, 409 conflit, 422 données invalides).

Authentification par jeton signé (HMAC-SHA256) dans l'en-tête `Authorization: Bearer <jeton>` : jeton **artisan** (2 h) obtenu par `/public/suivi` ou `/public/enrolement`, jeton **administration** (8 h) obtenu par `/admin/login`.

## Public (sans jeton)

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/public/referentiels` | Régions et départements, filières et métiers, statuts juridiques, formations, besoins, instruments, acheteurs, statuts fonciers, catégories, prescriptions |
| GET | `/public/stats` | Indicateurs agrégés (artisans, commande publique, Fonds, infrastructures) |
| GET | `/public/actualites` | Articles publiés (sans le contenu) |
| GET | `/public/actualites/{id}` | Article complet |
| GET | `/public/marches` | Marchés et nombre de candidatures |
| GET | `/public/sites` | Chambres et villages (sans budget ni références foncières) |
| GET | `/public/annuaire?q=&region=&filiere=` | Artisans validés et consentants (60 max., téléphone masqué) |
| POST | `/public/enrolement` | Création d'un dossier (`consentement: true` requis) → `{numero, statut, token}` |
| POST | `/public/suivi` | `{numero, telephone}` → `{token}` |
| POST | `/admin/login` | `{username, password}` → `{token, user}` |

## Espace artisan (jeton artisan)

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/me` | Dossier, site, candidatures, financements, apports |
| PATCH | `/me` | Téléphone, e-mail, adresse, enseigne, besoins, présence dans l'annuaire |
| POST | `/me/candidatures` | `{marche_id, montant, delai_jours, note}` (dossier validé, filière et zone compatibles) |
| POST | `/me/financements` | `{instrument, objet, montant_demande, apport_personnel, duree_mois}` |
| POST | `/me/contributions` | `{montant}` — apport solidaire |

## Administration (jeton administration)

Le rôle *lecteur* n'a accès qu'aux requêtes GET. Les agents régionaux ne voient que les artisans et sites de leur région.

| Méthode | Chemin | Rôles |
| --- | --- | --- |
| GET | `/admin/me`, `/admin/dashboard` | tous |
| GET | `/admin/artisans?q=&statut=&region=&filiere=&canal=&sexe=&statut_juridique=&sort=&offset=&limit=` (`format=csv` pour l'export) | tous |
| POST | `/admin/artisans` | admin, agent |
| GET | `/admin/artisans/{id}` | tous |
| PATCH | `/admin/artisans/{id}` | admin, agent |
| POST | `/admin/artisans/{id}/decision` — `{statut: valide, rejete, en_attente; motif}` | admin, agent |
| POST | `/admin/artisans/decision-groupee` — `{ids: []}` | admin, agent |
| GET | `/admin/marches`, `/admin/marches/{id}` | tous |
| POST, PATCH | `/admin/marches`, `/admin/marches/{id}` | admin |
| POST | `/admin/candidatures/{id}/decision` — `{statut: retenue, non_retenue, soumise}` | admin |
| GET | `/admin/financements?statut=` | tous |
| POST | `/admin/financements/{id}/decision` — `{statut: instruction, accordee, rejetee, decaissee; montant_accorde; motif}` | admin |
| POST | `/admin/contributions` — `{source, montant, libelle}` | admin |
| GET | `/admin/sites` | tous |
| PATCH | `/admin/sites/{id}` | admin, agent |
| GET, POST | `/admin/actualites` ; PATCH, DELETE `/admin/actualites/{id}` | lecture : tous ; écriture : admin |
| GET, POST | `/admin/utilisateurs` ; PATCH `/admin/utilisateurs/{id}` | admin |
| GET | `/admin/audit` | admin |
| POST | `/admin/reinitialiser` | admin |

## Exemple

```bash
curl -s -X POST https://<site>/api/public/suivi -H 'content-type: application/json' \
  -d '{"numero":"ART-2026-THI-00001","telephone":"771234567"}'
```
