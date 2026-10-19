# Comprendre le score de risque

WawID attribue à chaque voyageur contrôlé un **score de risque explicable** de 0 à 100. Le même moteur est utilisé au guichet, aux eGates, pour les demandes e-Visa et pour le pré-contrôle des passagers annoncés (APIS/PNR). Chaque point du score provient d'un **facteur** affiché avec son libellé, son détail et ses points : rien n'est caché à l'agent.

Cette page sert de référence aux agents, analystes et superviseurs pour lire un score, comprendre une recommandation et expliquer une décision.

## Calcul en bref

1. Le moteur liste les facteurs déclenchés (listes de surveillance, puce, MRZ, biométrie, eKYC, réseau, visa, âge, règles de ciblage).
2. Le score est la **somme des points**, bornée entre 0 et 100.
3. Le **niveau** est déduit du score.
4. La **recommandation** est déduite du score et du caractère **critique** de certains facteurs.
5. Le drapeau **fraude** est levé si au moins un facteur de fraude est présent.

Un même code peut apparaître plusieurs fois (par exemple deux correspondances sur deux listes) : chaque occurrence ajoute ses points.

## Référence des facteurs

### Listes de surveillance

| Code | Libellé affiché | Points | Remarques |
|---|---|---|---|
| `WATCHLIST` | Correspondance *nom de la liste* | Critique 80 · Haute 60 · Moyenne 35 · Basse 15 · gravité absente 40 | Personne (nom approché ≥ 90 %). Une gravité **Critique** rend le cas critique. |
| `SLTD` | Document signalé perdu / volé | 85 | Numéro de document trouvé (Interpol SLTD ou documents nationaux invalidés). Toujours **critique**. |
| `LISTE_NOIRE` | Liste noire : e-mail / téléphone / appareil signalé | Critique 80 · Haute 60 · Moyenne 35 · Basse 15 · gravité absente 40 | Coordonnées ou appareil figurant sur la liste noire. |

### Puce électronique et document

| Code | Libellé affiché | Points | Condition |
|---|---|---|---|
| `PUCE_ABSENTE` | Puce non lue (lecture NFC impossible) | 10 | Lecture NFC tentée mais impossible |
| `PUCE_PA` | Authentification passive de la puce échouée | 60 | Signature du SOD invalide |
| `PUCE_MRZ` | Données de la puce différentes de la MRZ imprimée | 60 | DG1 incohérent avec la MRZ (numéro, dates, nom, nationalité) |
| `MRZ` | Chiffres de contrôle MRZ invalides | 40 | Au moins un chiffre de contrôle faux |
| `EXPIRE` | Document expiré | 35 | Date d'expiration dépassée |
| `EXPIRE_PROCHE` | Document proche de l'expiration | 5 | Moins de 90 jours de validité |

### Biométrie

| Code | Libellé affiché | Points | Condition |
|---|---|---|---|
| `FACE` | Correspondance faciale insuffisante | 40 | Score facial sous le seuil (80 % au guichet par défaut ; seuil propre à chaque eGate, 82 % par défaut) |
| `FACE_LIMITE` | Correspondance faciale limite | 10 | Score entre le seuil et seuil + 7 points |
| `LIVENESS` | Détection du vivant échouée (suspicion d'usurpation) | 50 | Détection du vivant négative |
| `ATTAQUE` | Attaque de présentation détectée : masque 3D / rejeu sur écran / photo imprimée / deepfake / injection vidéo | 60 | Attaque signalée par le terminal |
| `IRIS` | Correspondance iris insuffisante | 25 | Score iris inférieur à 80 % |

### eKYC à distance (e-Visa)

| Code | Libellé affiché | Points |
|---|---|---|
| `EKYC_DOC` | Document : photo d'écran (recapture) détectée | 50 |
| `EKYC_DOC` | Document : copie imprimée détectée | 50 |
| `EKYC_DOC` | Document altéré ou généré par IA | 60 |
| `EKYC_FACE` | Selfie différent de la photo du document (score < 80 %) | 40 |
| `ATTAQUE` | Défis de vivacité échoués (selfie) | 50 |
| `ATTAQUE` | Deepfake détecté (visage généré ou permuté) | 60 |
| `INJECTION` | Attaque par injection vidéo (caméra virtuelle) | 60 |
| `EKYC_QUALITE` | Qualité d'image insuffisante | 5 |

> Dans la démonstration, l'authenticité du document, la comparaison faciale et la détection de contenus générés par IA sont **simulées** (fournisseur « simulation »). La qualité d'image et la détection de caméras virtuelles sont mesurées réellement par le navigateur.

### Identité, voyage et règles

| Code | Libellé affiché | Points | Condition |
|---|---|---|---|
| `RESEAU` | Coordonnées ou appareil partagés avec *n* autre(s) identité(s) | 15 + 10 × *n*, plafonné à 45 | Même e-mail, téléphone ou appareil (e-Visa), ou mêmes coordonnées de réservation dans un vol (PNR) |
| `DOC_REUTILISE` | Document déjà présenté sous une autre identité | 70 | Même numéro de document, nom ou date de naissance différents dans l'historique |
| `MULTI_DOCS` | Même identité présentée avec plusieurs documents | 15 | Autres documents pour le même nom et la même date de naissance sur 90 jours |
| `VISA` | Aucune autorisation de voyage (e-Visa) valide | 30 | Nationalité soumise à visa, à l'entrée, sans e-Visa (ou e-Visa refusé) |
| `VISA` | e-Visa non valide (*statut*) | 30 | e-Visa existant mais non approuvé ou expiré |
| `MINEUR` | Voyageur mineur — vérifier l'autorisation de sortie | 5 | Moins de 18 ans |
| `REGLE` | Règle de ciblage : *nom de la règle* | Points de la règle (0 à 100) | Toutes les conditions de la règle actives sont vraies |

Le facteur `VISA` n'est jamais appliqué à la sortie. Les contrôles `DOC_REUTILISE` et `MULTI_DOCS` reposent sur l'historique des passages ; ils ne s'appliquent qu'au guichet et aux eGates.

### Indicateurs de réservation (PNR)

Ajoutés au pré-contrôle des passagers annoncés par un message PNR (fonction `pnrFactors`) :

| Code | Libellé affiché | Points | Condition |
|---|---|---|---|
| `PNR_ESPECES` | Billet payé en espèces | 10 | Élément `FP CASH` |
| `PNR_ALLER_SIMPLE` | Aller simple sans retour réservé | 5 | Aucun segment repartant de la destination |
| `PNR_DERNIERE_MINUTE` | Réservation de dernière minute | 10 | Réservation moins de 48 h avant le vol |

## Niveaux

| Niveau | Score |
|---|---|
| **Faible** | 0 à 29 |
| **Modéré** | 30 à 59 |
| **Élevé** | 60 à 100 |

## Recommandations

| Recommandation | Condition | Libellé au guichet |
|---|---|---|
| **Refusé** | Cas **critique** ou score ≥ 80 | Refuser et retenir — escalade superviseur |
| **Contrôle secondaire** | Score de 30 à 79 | Orienter en contrôle secondaire |
| **Autorisé** | Score ≤ 29 et aucun facteur critique | Autoriser le passage |

Un cas est **critique** lorsque le document figure dans une liste de documents perdus ou volés (`SLTD`) ou que le voyageur correspond à une entrée de gravité **Critique** (`WATCHLIST`). Il est alors recommandé de refuser, quel que soit le score.

Au guichet, l'agent reste décideur. S'il choisit une décision différente de la recommandation, un **motif est obligatoire** et il est enregistré avec le passage.

## Drapeau fraude

Le passage est compté comme **fraude** (tableau de bord, statistiques) si au moins l'un de ces facteurs est présent : `SLTD`, `MRZ`, `LIVENESS`, `FACE`, `PUCE_PA`, `PUCE_MRZ`, `ATTAQUE`, `DOC_REUTILISE`, `EKYC_DOC`, `EKYC_FACE`, `INJECTION`.

## Types d'alerte

Le Threat Monitor attribue à chaque alerte un type et un titre, selon le premier facteur trouvé dans cet ordre de priorité :

| Priorité | Facteur | Type | Titre |
|---|---|---|---|
| 1 | `SLTD` | Document perdu / volé | Document signalé perdu / volé |
| 2 | `WATCHLIST` | Liste de surveillance | Libellé de la correspondance |
| 3 | `DOC_REUTILISE` | Fraude documentaire | Document réutilisé sous une autre identité |
| 4 | `ATTAQUE` | Fraude biométrique | Libellé de l'attaque |
| 5 | `INJECTION` | Fraude biométrique | Attaque par injection vidéo (caméra virtuelle) |
| 6 | `EKYC_DOC` | Fraude documentaire | Libellé du facteur |
| 7 | `EKYC_FACE` | Fraude biométrique | Selfie différent de la photo du document |
| 8 | `RESEAU` | `RESEAU` (sans libellé dans le filtre) | Libellé du facteur |
| 9 | `LISTE_NOIRE` | Liste de surveillance | Libellé de la liste noire |
| 10 | `PUCE_PA` ou `PUCE_MRZ` | Fraude documentaire | Puce électronique invalide (document falsifié) |
| 11 | `LIVENESS` ou `FACE` | Fraude biométrique | Suspicion d'usurpation d'identité (biométrie) |
| 12 | `MRZ` | Fraude documentaire | Document suspect (MRZ) |
| 13 | `EXPIRE` | Document expiré | Document expiré présenté |
| 14 | `REGLE` | Règle de ciblage | Libellé de la règle |
| 15 | `VISA` | Sans autorisation | Entrée sans autorisation de voyage |
| 16 | autre | Risque élevé | Score de risque élevé |

Les alertes issues des vols annoncés ont le type **APIS / PNR** ; leur titre commence par « API : », « PNR : » ou « APIS : » suivi du titre ci-dessus.

Gravité de l'alerte : **Critique** si score ≥ 80, **Haute** si ≥ 60, **Moyenne** sinon. Une alerte est créée à partir d'un score de 35 (ou d'une décision **Refusé** au guichet).

## Décision des eGates

Une eGate ouvre ses portes ou oriente le voyageur vers un guichet. Les vérifications s'enchaînent dans cet ordre ; la première qui échoue provoque l'orientation, avec le code indiqué :

1. `ILLISIBLE` : document illisible.
2. `MRZ` : chiffres de contrôle invalides.
3. `AGE` : voyageur sous l'âge minimal de la porte (18 ans par défaut).
4. `ELIGIBILITE` : nationalité non éligible (réglage **Ressortissants CEDEAO** ou **Liste personnalisée**).
5. `BIOMETRIE` : visage non capturé ; `LIVENESS` : détection du vivant absente alors qu'elle est obligatoire.
6. `PUCE` : tout facteur de puce (`PUCE_ABSENTE`, `PUCE_PA`, `PUCE_MRZ`).
7. `FRAUDE` : facteur `ATTAQUE` ou `DOC_REUTILISE`.
8. `LIVENESS` puis `FACE` : facteurs biométriques correspondants.
9. `EXPIRE` : document expiré.
10. `VISA` : facteur `VISA`, si la porte vérifie l'autorisation de voyage.
11. `RISQUE` : cas critique, recommandation autre que **Autorisé**, ou toute correspondance `SLTD` ou `WATCHLIST`, quel que soit le seuil.
12. `RISQUE` : score supérieur au **Score de risque maximal accepté** de la porte (29 par défaut).

Si tout est conforme, les portes s'ouvrent et le passage est enregistré **Autorisé** ; sinon il est enregistré **Contrôle secondaire** avec le motif de l'orientation.

> Dans la démonstration, les scores faciaux des passages générés sont simulés ; en production, ils sont fournis par le SDK biométrique du terminal.
