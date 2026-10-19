# Administration (équipements, utilisateurs, audit, paramètres)

L'espace **Administration** regroupe la supervision des équipements, la gestion des comptes, le journal d'audit et les paramètres. La page **Projet (Scrum)** suit l'avancement du projet.

| Application | Droit nécessaire |
|---|---|
| **Supervision systèmes** | `read` |
| **Utilisateurs & rôles** | `users` (Administrateur) |
| **Journal d'audit** | `read` |
| **Paramètres** | `system` (Administrateur) |
| **Projet (Scrum)** | `read` |

Une application à laquelle votre rôle n'a pas accès affiche « Accès non autorisé pour le rôle … » ; sa tuile n'apparaît pas sur l'accueil.

## Supervision systèmes

La page affiche l'état de tous les équipements des postes frontière.

1. Ouvrez **Supervision systèmes**.
2. Choisissez un poste dans la liste **Tous les postes** pour restreindre l'affichage.
3. Lisez les cartes de synthèse : pour chaque type d'équipement, le nombre en ligne sur le total, et **Nominal** ou le nombre d'anomalies. La carte **eGates / ABC** donne le nombre de portes en service ; le lien **Superviser** ouvre la supervision des eGates.
4. Le tableau détaille chaque **Équipement** : **Type**, **Poste**, **Version**, **État**. Les équipements en anomalie sont triés en tête.

### Types d'équipement

| Préfixe | Type | Postes |
|---|---|---|
| `TRM-` | **Terminal guichet** | Tous (24 à l'AIBD) |
| `CCTV-` | **Caméra CCTV (reconnaissance faciale)** | Tous |
| `LGS-` | **Scanner bagages 3D** | Postes aériens et maritime |
| `ANPR-` | **Lecteur de plaques (VRS)** | Postes terrestres |
| `SRV-` | **Serveur local (mode dégradé)** | Un par poste |

### États

| État | Signification |
|---|---|
| **En ligne** | Équipement opérationnel |
| **Dégradé** | Fonctionne avec une anomalie |
| **Hors ligne** | Injoignable |

La tuile de l'accueil indique le nombre d'anomalies (équipements qui ne sont pas **En ligne**).

> Dans la démonstration, la liste des équipements et leurs états sont générés ; ils ne proviennent pas d'une remontée réelle des matériels.

## Utilisateurs & rôles

Les habilitations suivent le principe du moindre privilège. Les mots de passe sont hachés (scrypt) ; une session dure 12 heures ; chaque action est tracée.

Le tableau des comptes affiche **Nom** (et identifiant), **Rôle**, **Poste**, **Dernière connexion** et **État** (**Actif** ou **Désactivé**).

### Créer un utilisateur

1. Cliquez sur **Nouvel utilisateur** (ou sur la tuile **Créer un utilisateur**).
2. Saisissez le **Nom complet** et l'**Identifiant** : 3 à 40 caractères parmi a-z, 0-9, point, tiret bas et tiret ; il doit être unique.
3. Choisissez le **Rôle** et le **Poste** de rattachement.
4. Saisissez un **Mot de passe initial (10 caractères min.)**.
5. Cliquez sur **Créer**.

### Modifier ou désactiver un compte

1. Cliquez sur **Modifier** sur la ligne du compte.
2. Changez le **Rôle** ou le **Poste**, saisissez si besoin un nouveau mot de passe (laisser vide pour conserver l'actuel).
3. Décochez **Compte actif** pour désactiver le compte : l'utilisateur ne peut plus se connecter et sa session en cours est refusée. Cochez la case pour le réactiver.
4. Cliquez sur **Enregistrer**.

> Vous ne pouvez ni désactiver votre propre compte, ni lui retirer le rôle Administrateur. Un compte n'est jamais supprimé : il est désactivé, ce qui préserve la traçabilité.

### Matrice des droits

La matrice affichée sous le tableau reprend les droits de chaque rôle. Elle est complétée ici par le droit `finance`, qui n'y figure pas.

| Droit | Agent de contrôle | Analyste renseignement | Superviseur | Agent du Trésor (redevance) | Administrateur |
|---|---|---|---|---|---|
| Consultation (`read`) | Oui | Oui | Oui | Oui | Oui |
| Contrôle guichet (`control`) | Oui | — | Oui | — | Oui |
| Traitement des alertes (`alerts`) | Oui | Oui | Oui | — | Oui |
| Dossiers (`cases`) | Oui | Oui | Oui | — | Oui |
| Listes de surveillance (`watchlist`) | — | Oui | Oui | — | Oui |
| Règles de ciblage (`rules`) | — | Oui | Oui | — | Oui |
| APIS (`apis`) | — | Oui | Oui | — | Oui |
| Décisions e-Visa (`evisa`) | — | Oui | Oui | — | Oui |
| Pilotage eGates (`gates`) | — | — | Oui | — | Oui |
| Utilisateurs (`users`) | — | — | — | — | Oui |
| Paramètres système (`system`) | — | — | — | — | Oui |
| Redevance (`finance`) | — | — | — | Oui | Oui |

Le droit **Consultation** donne accès en lecture aux tableaux de bord, passages, listes, règles, connecteurs, vols, e-Visa, supervision, journal d'audit et projet.

## Journal d'audit

Le journal enregistre chaque action sensible. Chaque entrée contient un numéro d'ordre, l'horodatage, l'acteur, l'action, l'objet, des détails et l'**empreinte SHA-256** de l'entrée. Cette empreinte est calculée sur le contenu de l'entrée **et sur l'empreinte de l'entrée précédente** : les entrées forment une chaîne.

### Vérifier l'intégrité

À chaque ouverture du **Journal d'audit**, WawID recalcule toute la chaîne :

- **Chaîne intègre** : nombre d'entrées vérifiées et début de l'empreinte de tête (dernière entrée) ;
- **Intégrité rompue à l'entrée n° X**, avec l'un de ces motifs : « Empreinte invalide (entrée modifiée) », « Chaînage rompu (entrée supprimée ou insérée) » ou « Début de chaîne manquant (entrées anciennes supprimées) ».

Notez l'empreinte de tête à intervalles réguliers (rapport de vacation, par exemple) : toute modification ultérieure du passé devient détectable. Le journal n'est jamais tronqué automatiquement ; son archivage relève de l'exploitation.

Le tableau affiche les 1 000 dernières entrées, la plus récente en premier : **N°**, **Horodatage**, **Acteur**, **Action**, **Objet** (et détails), **Empreinte** (survolez-la pour la voir en entier).

### Actions journalisées

| Domaine | Codes d'action |
|---|---|
| Sessions | `CONNEXION`, `ECHEC_CONNEXION`, `DECONNEXION` |
| Contrôle | `PASSAGE_DECISION`, `EGATE_TRANSACTION`, `EGATE_REJET`, `EGATE_COMMANDE` |
| Renseignement | `ALERTE_ASSIGN`, `ALERTE_NOTE`, `ALERTE_CLOSE`, `ALERTE_REOPEN`, `DOSSIER_CREATION`, `DOSSIER_MAJ`, `SURVEILLANCE_AJOUT`, `SURVEILLANCE_ACTIVATION`, `SURVEILLANCE_DESACTIVATION`, `REGLE_CREATION`, `REGLE_MODIFICATION`, `REGLE_SUPPRESSION`, `CONNECTEUR_TEST`, `CONNECTEUR_ACTIVATION`, `CONNECTEUR_DESACTIVATION` |
| APIS | `APIS_PAXLST`, `APIS_PNR`, `APIS_MANIFESTE` |
| Portail et e-Visa | `EVISA_DEPOT`, `EVISA_REPONSE`, `EVISA_REQUEST_INFO`, `EVISA_APPROVE`, `EVISA_REJECT`, `WAWPASS_PAIEMENT`, `WAWPASS_VALIDATION`, `PREENROLEMENT` |
| Redevance | `REDEVANCE_ENCAISSEMENT`, `REDEVANCE_PARAMETRES` |
| Administration | `UTILISATEUR_CREATION`, `UTILISATEUR_MAJ`, `INITIALISATION`, `REINITIALISATION_DEMO` |

Les mots de passe ne sont jamais écrits dans le journal : une modification de mot de passe est seulement mentionnée.

## Paramètres

### Politique

La carte **Politique** présente les réglages en vigueur (consultation seule dans cette version) :

- **Dispense de visa** : nationalités dispensées (CEDEAO et accords bilatéraux) ; les autres nationalités déclenchent le contrôle e-Visa à l'entrée ;
- **Seuil facial (guichet)** : 80 % ;
- **Frais e-Visa** : 50 000 FCFA ;
- **Taxe de sécurité** (WawPass) : 15 000 FCFA ;
- **Conservation** : 5 ans (loi n° 2008-12 sur les données personnelles — CDP).

Les seuils des eGates se règlent porte par porte dans **eGates & ABC**.

### Lecteur NFC de ce poste

Au guichet, la puce des passeports est lue par un pont local (`tools/nfc-bridge.mjs`) relié au lecteur (PC/SC ou SDK du constructeur). Le réglage est propre au poste de travail (navigateur) :

1. Saisissez l'**Adresse du pont** (par défaut `http://127.0.0.1:8765`).
2. Cliquez sur **Enregistrer**.
3. Cliquez sur **Tester** : « Connecté — *nom du lecteur* » si le pont répond, sinon « Pont injoignable — lecture simulée ».

Sans pont joignable, la lecture de puce est simulée.

### Données de démonstration

**Réinitialiser la démonstration** régénère un jeu de données fictif complet (passages, alertes, e-Visa, vols, factures…).

1. Cliquez sur **Réinitialiser la démonstration**.
2. Confirmez avec **Réinitialiser**.

Les comptes utilisateurs sont conservés. Le journal d'audit repart d'une **nouvelle chaîne** (`INITIALISATION`, puis `REINITIALISATION_DEMO`). Cette action est réservée aux environnements de démonstration.

## Projet (Scrum)

La page **Projet (Scrum)** présente le pilotage du projet WawID en sprints de 2 semaines :

- indicateurs : **Avancement global**, **Points livrés**, **Sprint en cours**, **Vélocité moyenne** (points par sprint terminé) ;
- tableau du sprint sélectionné en trois colonnes (**À faire**, **En cours**, **Terminé**), avec l'objectif du sprint et les points de chaque récit ;
- graphique **Vélocité par sprint** ;
- liste des **Sprints** (S0 à S8) avec leur état (**Terminé**, **En cours**, **À venir**) ; cliquez sur un sprint pour afficher son tableau.

Le sprint en cours est le sprint 5, « Intégrations réelles » (Interpol I-24/7, WAPIS, fichier national, SDK biométrique, lecteurs de documents, eGates, PAXLST / PNRGOV). Le contenu de cette page est défini dans le code (source : `docs/SCRUM.md`) ; il n'est pas modifiable depuis l'interface.
