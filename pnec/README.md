# PNEC — Plateforme du Programme national d'Engagement citoyen

Prototype de la plateforme qui relie les entreprises volontaires, le Ministère de la Formation
professionnelle, la Direction de l'Emploi, la Primature et les jeunes candidats.
Charte inspirée de presidence.sn (vert `#008f36`, jaune `#ffeb00`, rouge `#e1001a`, bandeau drapeau),
accueil à tuiles par profil.

## Parcours couvert

| # | Étape | Qui | Où dans l'application |
|---|---|---|---|
| 1 | Inscription de l'entreprise volontaire | Entreprise | `#/inscription/entreprise` |
| 2 | Validation + convention cadre Ministère – Entreprise (signature électronique des 2 parties) | Ministère, Entreprise | `#/entreprises`, `#/convention/:id` |
| 3 | Publication des offres (bloquée tant que la convention cadre n'est pas signée) | Entreprise | `#/offre-nouvelle` |
| 4 | Candidature des jeunes (profil, offres classées par adéquation) | Stagiaire | `#/inscription/stagiaire`, `#/offres` |
| 5 | Premier tri des CV par moteur IA (noms masqués, repêchage possible) | Entreprise | `#/offre/:id/candidats` |
| 6 | Planification de l'entretien | Entreprise | idem |
| 7 | Entretien en ligne (salle de visio générée) + grille d'évaluation /20 | Entreprise, Stagiaire | `#/entretien/:id`, `#/entretiens` |
| 8 | Sélection finale (dans la limite des places) | Entreprise | `#/selection` |
| 9 | Convention de prise en charge Entreprise – Direction de l'Emploi : 50 % État / 50 % entreprise | Entreprise, DE | `#/conventions` |
| 10 | Convention de stage Stagiaire – Entreprise (générée à la signature de la prise en charge) | Entreprise, Stagiaire | idem |
| 11 | Administration : comptes, rôles & habilitations, paramètres (taux, seuil IA, visio), journal d'audit | Admin | `#/admin/*` |
| 12 | Tableau de bord national (entonnoir, régions, secteurs, budget État) | Primature, Ministère, DE | `#/pilotage` |

## Démonstration

La page **Connexion** propose de choisir un profil (stagiaire, entreprise, Ministère, DE, Primature,
administrateur). Les données de démonstration sont fictives et stockées dans le navigateur
(localStorage) ; *Administration → Paramètres → Réinitialiser* les régénère.

## Tri IA

- **Moteur local** (`public/js/ia.js`), toujours disponible : score explicable sur 100
  (compétences 50, niveau 20, domaine 15, expérience 10, mobilité 5).
- **Moteur Claude** (`netlify/functions/tri-cv.mts`), utilisé automatiquement si la variable
  d'environnement `ANTHROPIC_API_KEY` est définie sur Netlify (modèle modifiable via `PNEC_MODEL`).
- Dans les deux cas, seuls des profils **anonymisés** sont évalués (ni nom, ni sexe, ni âge) et
  l'entreprise garde la décision.

## Déploiement Netlify

Site dont le **dossier de base** est `pnec/` (publication : `public`, fonctions : `netlify/functions`).

```bash
cd pnec && npx netlify deploy --prod
```

## Pour passer en production

Le prototype garde tout dans le navigateur. Les étapes suivantes sont nécessaires avant une mise en service réelle :
remplacer `public/js/store.js` par une API et une base de données, mettre en place une authentification réelle
(mot de passe + OTP SMS, SSO pour les agents de l'État), utiliser une signature électronique qualifiée,
héberger la visioconférence (par ex. Jitsi auto-hébergé) et déclarer le traitement auprès de la CDP (loi n° 2008-12).
