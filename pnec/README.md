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

## Connexion et sécurité

| Portail | Adresse | Profils |
|---|---|---|
| Public | `#/connexion` (lien « Connexion » du site) | jeunes, entreprises |
| Privé | `#/portail-agents` (non référencé sur le site) | administrateur, Primature, Ministère, Direction de l'Emploi |

- Identifiants vérifiés **côté serveur** (`netlify/functions/auth.mts`) : mots de passe hachés avec scrypt,
  session dans un cookie `HttpOnly; Secure; SameSite=Strict` signé HMAC-SHA256 (8 h public, 2 h agents).
- Un compte ne peut se connecter que sur son portail ; message d'erreur identique dans tous les cas.
- Verrouillage 15 min après 5 échecs, limitation par IP, contrôle d'origine (CSRF) sur toutes les requêtes d'écriture.
- Inscription libre uniquement pour les jeunes et les entreprises ; comptes d'agents créés par un administrateur
  (mot de passe provisoire affiché une seule fois).
- Politique de sécurité du contenu (CSP) stricte, HSTS, `X-Frame-Options: DENY` (`netlify.toml`).
- Les routes IA (`/api/tri-cv`, `/api/assistant`) sont réservées aux recruteurs connectés.

Variables d'environnement Netlify : `SESSION_SECRET` (obligatoire, ≥ 32 caractères), `ANTHROPIC_API_KEY` (facultatif).
Les comptes créés en ligne sont stockés dans Netlify Blobs (`pnec-comptes`).

### Comptes de test

`node scripts/generer-comptes-test.mjs <dossier-hors-dépôt>` régénère les 89 comptes de démonstration :
les empreintes vont dans `netlify/lib/test-users.json` (versionné), les mots de passe en clair dans le dossier
indiqué (à ne jamais versionner). Les données métier de démonstration restent dans le navigateur (localStorage).

## Espace recruteur (ATS)

Inspiré des outils du marché (Socium Job…) :
- **Pipeline Kanban** par offre (Nouveaux → Présélection → Entretien → Évalués → Retenus / Non retenus),
  glisser-déposer avec contrôle des transitions, filtres, sélection multiple et actions groupées.
- **Score IA en étoiles** avec « Analyse du recruteur IA », compétences attendues vs. actuelles, détail du score.
- **Fiche candidat collaborative** : évaluations multi-évaluateurs, notes internes avec @mentions, étiquettes,
  messages, historique complet.
- **Recrutement à l'aveugle** (noms et coordonnées masqués).
- **CVthèque / sourcing** : profils anonymisés, classement par adéquation à une offre, vivier, invitation à postuler.
- **Modèles de messages** avec variables et envoi en masse ; messagerie côté jeune.
- **Fiche de poste rédigée par IA**, **rapport de fin de recrutement** (synthèse IA), **page carrière** publique.

## Entretiens vidéo et agenda

- **Agenda des entretiens** (`#/agenda`, entreprises) : vues semaine, mois et liste ; planification avec détection des
  chevauchements, reprogrammation, annulation (candidat prévenu), export `.ics` vers Outlook / Google Agenda.
- **Registre partagé** (`/api/entretiens`, Netlify Blobs `pnec-entretiens`) : l'entretien planifié par l'entreprise
  apparaît dans « Mes entretiens » du candidat, sur n'importe quel appareil.
- **Visioconférence intégrée** (`#/visio/:salle`) en WebRTC : salle d'attente avec test caméra / micro et choix
  des périphériques, appel chiffré de navigateur à navigateur, micro, caméra, partage d'écran, discussion,
  minuteur, indicateur de qualité, grille d'évaluation à côté de la vidéo pour le recruteur.
- **Accès contrôlé par le serveur** (`/api/visio/*`) : seuls l'entreprise propriétaire et le candidat convoqué
  peuvent ouvrir la salle (identifiants de salle aléatoires de 128 bits). Aucun enregistrement.
- Réseaux restrictifs : renseigner un relais TURN avec `PNEC_TURN_URL`, `PNEC_TURN_USERNAME`, `PNEC_TURN_CREDENTIAL` ;
  une salle de secours externe reste paramétrable (*Administration → Paramètres*).

## Photo de la page d'accueil

`python3 scripts/preparer-photo.py <photo> public/img/mobilisation.jpg` recadre, retouche, compresse et
supprime les métadonnées. Sans fichier, la page affiche un dégradé aux couleurs du programme.

## Développement local

```bash
SESSION_SECRET=$(openssl rand -hex 32) PNEC_BLOBS_MEMOIRE=1 node --experimental-strip-types scripts/serveur-local.mjs
```

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
déplacer les données métier de `public/js/store.js` vers une base de données côté serveur (Netlify DB) avec
contrôle d'accès par rôle, ajouter un second facteur (OTP SMS) pour les agents, utiliser une signature électronique qualifiée,
héberger la visioconférence (par ex. Jitsi auto-hébergé) et déclarer le traitement auprès de la CDP (loi n° 2008-12).
