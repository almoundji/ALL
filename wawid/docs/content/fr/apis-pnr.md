# APIS et PNR

L'application **APIS Monitor** (espace **APIS & PNR**) est le guichet unique des données passagers transmises par les compagnies aériennes :

- **API** (Advance Passenger Information) : identité et document de chaque passager, au format UN/EDIFACT **PAXLST** ;
- **PNR** (Passenger Name Record) : données de réservation (localisateur, itinéraire, moyen de paiement, coordonnées).

Chaque passager annoncé est confronté aux listes de surveillance, aux règles de ciblage et aux autorisations de voyage **avant** l'arrivée ou le départ du vol.

| Action | Droit nécessaire |
|---|---|
| Consulter les vols, la passerelle et la conformité | `read` |
| **Recevoir un message API / PNR**, **Manifeste CSV** | `apis` (analyste, superviseur, administrateur) |

Trois tuiles de l'accueil mènent directement aux onglets : **Vols annoncés**, **Passerelle transporteurs**, **Conformité transporteurs**. La tuile d'action **Recevoir un message** ouvre la fenêtre de dépôt manuel.

## Vols annoncés et pré-contrôle

L'onglet **Vols annoncés** liste les vols triés par horaire, avec les colonnes **Vol** (et compagnie), **Trajet** (et sens **Arrivée** / **Départ**), **Horaire**, **Passagers** et **Signalés**. Un passager est **signalé** lorsque son score de pré-contrôle atteint 30.

### Consulter le manifeste d'un vol

1. Cliquez sur un vol. Le manifeste s'ouvre à droite.
2. L'en-tête indique la source des données (**API**, **PNR**, **API + PNR** ou chargement manuel), la date de réception et, le cas échéant, la mention **transmission tardive**.
3. Les passagers sont triés par score décroissant : **Siège**, **Passager** (nationalité et numéro de document), **Réservation** (localisateur PNR, paiement, aller simple, présence d'un téléphone ou d'un e-mail), **Pré-contrôle** (score et niveau), **Motifs** (facteurs d'au moins 10 points).

### Fiche d'un passager

Cliquez sur une ligne pour ouvrir la fiche :

- **Données API** : vol, siège, type et numéro de document, émetteur, naissance, sexe, nationalité, expiration, embarquement → débarquement, mention **Équipage** le cas échéant ;
- **Données PNR** : localisateur, **Réservé le**, **Paiement** (Espèces, Carte…), **E-mail**, **Téléphone**, **Itinéraire** complet (un segment par ligne) ;
- **Pré-contrôle** : score, niveau et liste détaillée des facteurs avec leurs points.

Une alerte de type **APIS / PNR** est créée dans le Threat Monitor pour chaque passager dont le score atteint **35** (une seule alerte ouverte par passager et par vol). Aucun résultat n'est renvoyé à la compagnie.

## Fusion des données API et PNR d'un même vol

Les messages API et PNR d'un vol arrivent séparément et à des moments différents. WawID les fusionne :

1. Le vol est identifié par son numéro (ex. `HC404`) et sa **date** (même jour). S'il n'existe pas, il est créé ; le sens est **Arrivée** si la destination est `DSS` ou `ZIG`, sinon **Départ**.
2. Chaque passager est rapproché d'un passager déjà connu par son **numéro de document** ou, à défaut, par son **nom et ses prénoms** normalisés.
3. Les champs renseignés du nouveau message complètent ou remplacent ceux déjà connus ; les champs vides n'effacent rien.
4. La source du vol devient **API + PNR** dès que les deux types de message ont été reçus.
5. Le pré-contrôle est **recalculé pour tous les passagers du vol** après chaque message.

## Indicateurs PNR

Les données de réservation ajoutent des indicateurs explicables au score :

| Indicateur | Points | Détection |
|---|---|---|
| Billet payé en espèces | 10 | Élément `FP CASH` |
| Aller simple sans retour réservé | 5 | Aucun segment ne repart de la destination |
| Réservation de dernière minute | 10 | Moins de 48 h entre la date de réservation (`BKD`) et le vol |
| Coordonnées partagées | 15 + 10 par passager lié, max. 45 | Même e-mail ou même téléphone (8 chiffres au moins) que d'autres passagers du vol porteurs d'autres documents |

Le téléphone et l'e-mail sont aussi comparés à la **liste noire de coordonnées** (facteur Liste noire).

## Passerelle transporteurs

L'onglet **Passerelle transporteurs** présente le journal des messages reçus et la fiche **Raccordement des compagnies**.

### Journal des messages

Colonnes : **Reçu**, **Format** (`PAXLST`, `PNR` ou `INCONNU`), **Vol** (et source : passerelle de la compagnie, plateforme des compagnies — « Portail compagnie » — ou dépôt manuel), **Passagers**, **Signalés** (score ≥ 35, visible uniquement dans l'espace DPAF), **Complétude**, **Statut**. Un clic sur un message accepté ouvre le vol.

| Statut | Signification |
|---|---|
| **ACCEPTÉ** | Message décodé et intégré sans remarque |
| **ACCEPTÉ AVEC AVERTISSEMENTS** | Intégré, mais des anomalies sont listées (ex. en-tête UNH absent, passager sans SSR DOCS, PNR sans segment) |
| **REJETÉ** | Format non reconnu, vol absent, aucun passager ou vol d'une autre compagnie que celle de la clé |

La **complétude** est la part des passagers ayant un numéro de document, une date de naissance et une nationalité.

### Raccordement des compagnies

- **Point d'accès** : `POST https://<domaine>/api/carrier/messages`
- **Authentification** : en-tête `X-Carrier-Key`, une clé par compagnie, définie par la variable `WAWID_CARRIER_KEYS` (ex. `HC:clé1,AF:clé2`). La clé est liée au code IATA : un message portant sur le vol d'une autre compagnie est rejeté.
- **Réponses** : 202 et accusé (référence `MSG-…`, vol, passagers, complétude, ponctualité, avertissements) ; 422 en cas de rejet ; 401 si la clé est invalide. L'accusé ne contient **ni le nombre de passagers signalés, ni l'identifiant interne du vol** : aucun résultat de pré-contrôle n'est communiqué à la compagnie.
- **Plateforme des compagnies** (`/compagnies/`) : chaque compagnie dispose aussi de comptes du rôle **Compagnie aérienne** pour transmettre des messages à la main, relire ses accusés, suivre la complétude de ses vols et sa redevance. Les messages envoyés depuis la plateforme apparaissent dans ce journal avec la source « Portail compagnie » et sont traités exactement comme ceux de la passerelle.

La spécification complète destinée aux compagnies se trouve dans `docs/API-TRANSPORTEURS.md` et dans les pages *Référence API* et *Plateforme des compagnies aériennes*.

### Recevoir un message API / PNR manuellement

Utilisez cette fonction pour un message reçu hors passerelle ou pour une démonstration. Le traitement est identique à celui de la passerelle.

1. Cliquez sur **Recevoir un message API / PNR**.
2. Collez le message, ou cliquez sur **Exemple PAXLST** ou **Exemple PNR** pour charger un exemple conforme.
3. Cliquez sur **Traiter le message**.
4. Un message indique le statut, le vol, le nombre de passagers et de signalés ; le vol s'ouvre.

Les exemples fournis montrent le fonctionnement complet :

- **Exemple PAXLST** : vol HC404 CDG → DSS avec trois passagers, dont un qui correspond à une notice rouge Interpol fictive ;
- **Exemple PNR** : deux réservations. La première (TK597 IST → DSS) est payée en espèces, réservée moins de 48 h avant le vol, en aller simple, et ses deux passagers partagent un même téléphone, inscrit sur la liste noire. La seconde complète le vol HC404 avec un aller-retour payé par carte.

Format PNR accepté (une ligne par élément, plusieurs PNR séparés par une ligne `END`) :

```text
RLOC ABC123
BKD 18OCT26
FP CASH
1.MARTIN/PAUL MR
HC 404 Y 25OCT CDGDSS
SSR DOCS HC HK1 P/FRA/19AB12345/FRA/01JAN80/M/01JAN32/MARTIN/PAUL/P1
SSR CTCE HC HK1 PAUL//MARTIN.FR/P1
SSR CTCM HC HK1 33612345678/P1
```

### Charger un manifeste CSV

Pour un transporteur non raccordé, chargez un manifeste :

1. Cliquez sur **Manifeste CSV**.
2. Renseignez **Vol** et **Transporteur** (obligatoires), **Trajet**, **Sens** (**Arrivée** ou **Départ**) et **Horaire prévu**.
3. Collez les passagers, une ligne par passager : `siège;nom;prénoms;naissance;nationalité;document;expiration`. Les séparateurs `;`, `,` et tabulation sont acceptés ; une ligne d'en-tête contenant « nom » est ignorée.
4. Cliquez sur **Pré-contrôler**.

Chaque ligne doit contenir un nom, un numéro de document, une nationalité ISO à 3 lettres et une date de naissance `AAAA-MM-JJ` ; sinon les numéros des lignes invalides sont affichés. Un manifeste crée toujours un **nouveau** vol (600 passagers au maximum) ; il n'est pas fusionné avec les messages API/PNR et ne calcule pas les indicateurs PNR.

## Conformité transporteurs

L'onglet **Conformité transporteurs** évalue chaque compagnie :

| Colonne | Calcul |
|---|---|
| **Vols** | Nombre de vols annoncés |
| **Passagers** | Nombre total de passagers |
| **Transmission dans les délais** | Part des vols sans transmission tardive |
| **Complétude des données** | Part des passagers avec date de naissance, numéro de document et nationalité |
| **Messages rejetés** | Messages rejetés rattachés aux vols de la compagnie |
| **Statut** | **Conforme** si ponctualité ≥ 95 % et complétude ≥ 98 %, sinon **À relancer** |

**Délais appliqués** : un message API doit arriver au plus tard à l'heure de départ du vol ; un message PNR au plus tard 24 h avant l'heure prévue du vol. Un seul message hors délai marque le vol **transmission tardive**. La norme attendue des compagnies (OACI annexe 9) est l'API à la clôture du vol et le PNR à H-48 puis H-24.

> Dans la démonstration, les vols, passagers et compagnies sont fictifs et le connecteur « Passerelle transporteurs API/PNR » est en mode simulé. En local, la clé `dev-carrier-key` est acceptée pour toutes les compagnies.
