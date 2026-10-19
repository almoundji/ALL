# Délégations : visites officielles, compétitions, conférences

L'application **Délégations** (espace **e-Visa & voyageurs**) gère les groupes annoncés à l'avance : visites officielles, équipes sportives, participants à une conférence ou à un événement culturel. Elle permet de :

- **enregistrer** une délégation et la liste de ses membres, ou de recevoir celle déclarée par l'organisateur sur le portail voyageur ;
- **pré-contrôler** chaque membre dès l'enregistrement (listes de surveillance, règles de ciblage) ;
- **valider** ou **refuser** la délégation, avec ou sans **autorisation collective d'entrée** ;
- **reconnaître** les membres au guichet et **pointer** leur arrivée ;
- **clôturer** la délégation à la fin du séjour.

> L'autorisation collective remplace seulement l'e-Visa individuel. Elle ne dispense d'aucun contrôle : chaque membre passe au guichet (lecture du document, puce, biométrie, interrogation des fichiers) comme tout voyageur.

## Accès et droits

L'espace DPAF propose deux tuiles dans **e-Visa & voyageurs** :

| Tuile | Rôle | Indicateur |
|---|---|---|
| **Délégations** | Liste et fiches des délégations (route `#/delegations`) | Nombre de délégations **à valider** (orange s'il est non nul) |
| **Enregistrer une délégation** | Tuile de création : ouvre directement le formulaire **Nouvelle délégation** | — |

| Action | Droit nécessaire | Rôles |
|---|---|---|
| Consulter les délégations, leurs membres et le pré-contrôle, imprimer la liste | `read` | Tous les rôles de l'espace DPAF |
| **Nouvelle délégation**, **Ajouter des membres**, retirer un membre, **Valider**, **Refuser**, **Clôturer** | `evisa` | Analyste renseignement, Superviseur, Administrateur |
| **Pointer** l'arrivée d'un membre | `control` | Agent de contrôle, Superviseur, Administrateur |

Les organisateurs (ministères, ambassades, fédérations sportives, comités d'organisation) n'ont pas de compte : ils déclarent et suivent leur délégation depuis le portail voyageur, onglet **Délégations** (voir plus bas).

## Types et statuts

| Type | Code |
|---|---|
| Visite officielle | `VISITE_OFFICIELLE` |
| Compétition sportive | `COMPETITION` |
| Conférence / sommet | `CONFERENCE` |
| Événement culturel | `CULTUREL` |
| Autre | `AUTRE` |

| Statut | Signification | Actions possibles |
|---|---|---|
| **Soumise** (`SOUMISE`) | Enregistrée par la DPAF ou déclarée par l'organisateur, en attente de décision | Ajouter ou retirer des membres, **Valider**, **Refuser** |
| **Validée** (`VALIDEE`) | Acceptée, avec ou sans autorisation collective d'entrée ; les membres sont reconnus au guichet | Ajouter des membres, **Pointer** les arrivées, **Clôturer** |
| **Refusée** (`REFUSEE`) | Rejetée, avec un motif communiqué à l'organisateur | Aucune |
| **Clôturée** (`CLOTUREE`) | Séjour terminé ; les membres ne sont plus reconnus au guichet | Aucune |

## La liste des délégations

L'en-tête affiche quatre indicateurs :

- **À valider** : délégations soumises ;
- **Validées en cours ou à venir** : délégations validées dont la date de départ n'est pas passée, avec le nombre de membres attendus ;
- **Membres signalés** : membres dont le pré-contrôle atteint 60 ou plus ;
- **Arrivés** : membres dont l'arrivée a été pointée.

Les filtres **Statut** et **Type** affinent le tableau, qui affiche :

| Colonne | Contenu |
|---|---|
| **Référence** | Référence `DL…` et badge **VIP** pour un accueil protocolaire |
| **Délégation** | Nom, type et événement |
| **Séjour** | Dates d'arrivée et de départ, point d'entrée et vol |
| **Membres** | Nombre de membres, et nombre de membres signalés en rouge |
| **Statut** | Statut ; pour une délégation validée, **Autorisation collective** ou **e-Visa individuels** |

Cliquez sur une ligne pour ouvrir la fiche de la délégation.

## Enregistrer une délégation (DPAF)

1. Cliquez sur la tuile **Enregistrer une délégation**, ou sur **Nouvelle délégation** dans l'application **Délégations**.
2. Renseignez le **Nom de la délégation** (obligatoire), le **Type**, l'**Événement** et l'**Hôte / organisateur au Sénégal**.
3. Choisissez le **Pays de provenance**, les dates d'**Arrivée** et de **Départ** (obligatoires), le **Point d'entrée** (AIBD par défaut) et le **Vol / moyen de transport**.
4. Choisissez le **Protocole** : **Standard** ou **VIP (accueil protocolaire)**. Le niveau VIP n'est disponible que dans l'espace DPAF ; il s'affiche dans le bandeau du guichet.
5. Renseignez le contact (nom, e-mail, téléphone) de l'organisateur.
6. Saisissez les **Membres**, une ligne par personne (voir le format ci-dessous).
7. Cliquez sur **Enregistrer**.

WawID attribue une référence de la forme `DL` + année sur deux chiffres + numéro d'ordre (par exemple `DL260004`), pré-contrôle chaque membre et ouvre la fiche. La délégation est au statut **Soumise** : elle doit encore être validée.

### Format de la liste des membres

Une ligne par membre, champs séparés par un point-virgule (ou une tabulation) :

```
Nom;Prénoms;Nationalité;Sexe;Naissance;Passeport;Fonction;Type de passeport
```

| Champ | Format | Obligatoire |
|---|---|---|
| Nom | Texte | Oui |
| Prénoms | Texte | Non |
| Nationalité | Code ISO à 3 lettres (`SEN`, `JPN`, `NGA`…) | Oui |
| Sexe | `M` ou `F` | Non |
| Naissance | `AAAA-MM-JJ` | Recommandé |
| Passeport | Numéro du passeport (espaces supprimés) | Oui |
| Fonction | Chef de délégation, athlète, entraîneur, journaliste… (« Membre » par défaut) | Non |
| Type de passeport | `DIPLOMATIQUE`, `SERVICE` ou `ORDINAIRE` (`ORDINAIRE` par défaut) | Non |

Exemple :

```
Jallow;Mamadou;GMB;M;1968-03-14;GD0012345;Chef de délégation;DIPLOMATIQUE
Ceesay;Awa;GMB;F;1979-07-02;GD0012399;Conseillère;DIPLOMATIQUE
```

Conseils et contrôles :

- La liste peut être **copiée-collée depuis Excel** : les colonnes copiées sont séparées par des tabulations, que WawID reconnaît. Une ligne d'en-tête commençant par « Nom » est ignorée.
- Un membre sans nom, sans numéro de passeport ou sans nationalité valide bloque l'enregistrement, avec un message qui le désigne.
- Un même numéro de passeport ne peut figurer qu'une fois dans une délégation.
- Une délégation compte au plus 500 membres ; un ajout en compte au plus 200.

## Le pré-contrôle des membres

Dès l'enregistrement, et pour chaque membre ajouté ensuite, WawID calcule un score de risque (canal `DELEGATION`, sens entrée) à partir de la copie locale des **listes de surveillance** et des **règles de ciblage** actives. Le score est figé à ce moment : il n'est pas recalculé si les listes changent ensuite (le contrôle au guichet, lui, interroge les fichiers à jour).

- La colonne **Pré-contrôle** de la fiche affiche le score, le niveau et les deux premiers facteurs.
- Un membre dont le score atteint **60** est **signalé** : un bandeau rouge l'indique en haut de la fiche et une alerte de type **Délégation (pré-contrôle)** (`DELEGATION`) est créée dans le **Threat Monitor**, de gravité **Haute** (60 à 79) ou **Critique** (80 et plus). Son titre reprend la référence de la délégation (« Délégation DL… : Liste de surveillance », par exemple).
- Le résultat du pré-contrôle n'est **jamais communiqué à l'organisateur**, ni sur le portail ni dans la réponse de l'API publique.

## Instruire une délégation

### La fiche de la délégation

La fiche comprend :

- le tableau des **Membres** : nom et fonction, **Nationalité**, **Passeport** (numéro et type), **Naissance**, **Pré-contrôle** et **Arrivée** (date et heure de pointage, ou bouton **Pointer**) ;
- le panneau **Informations** : référence, séjour, point d'entrée et vol, provenance, hôte, protocole, régime d'**Entrée** (autorisation collective ou e-Visa individuels), contact, **Source** (**Espace DPAF** ou **Portail organisateurs**) et, le cas échéant, **Motif du refus** ;
- l'**Historique** horodaté : enregistrement, décisions, ajouts, retraits et arrivées pointées, avec leur auteur.

Le bouton **Imprimer la liste** imprime la fiche (liste des membres comprise) pour l'équipe d'accueil ou le chef de poste.

### Vérifier avant de décider

1. Ouvrez chaque alerte **Délégation (pré-contrôle)** liée dans le **Threat Monitor** et traitez-la comme une alerte ordinaire : **Prendre en charge**, vérifications, **Note**, puis **Clôturer** avec une résolution, ou **Ouvrir un dossier**.
2. Pour un membre dont le signalement est confirmé, retirez-le de la liste (icône corbeille de sa ligne, disponible tant que la délégation est **Soumise**) ou refusez la délégation, selon les instructions de la hiérarchie.
3. Vérifiez la cohérence de la liste : dates, fonctions, types de passeport, nombre de membres annoncé par l'organisateur.

### Valider

1. Cliquez sur **Valider**. La fenêtre rappelle le nombre de membres et de membres signalés.
2. Laissez cochée **Accorder une autorisation collective d'entrée** pour que la délégation vaille e-Visa pour chacun de ses membres, ou décochez-la pour exiger un e-Visa individuel de chaque membre soumis à visa.
3. Cliquez sur **Valider**. La délégation passe **Validée** et la décision est inscrite à l'historique et au journal d'audit.

### Refuser

1. Cliquez sur **Refuser**.
2. Saisissez le **Motif du refus** : il est affiché à l'organisateur sur le portail. Sans motif, WawID enregistre « Refus motivé par la DPAF ».

Seule une délégation **Soumise** peut être validée ou refusée.

### Ajouter ou retirer des membres

- **Ajouter des membres** (délégation **Soumise** ou **Validée**) : collez les nouvelles lignes au même format et cliquez sur **Ajouter**. Les nouveaux membres sont pré-contrôlés ; un passeport déjà présent est refusé. Ajoutés à une délégation validée, ils bénéficient de son régime d'entrée.
- **Retirer** un membre : icône corbeille de sa ligne, après confirmation (délégation **Soumise**).

### Clôturer

Après le départ de la délégation, cliquez sur **Clôturer**. La délégation passe **Clôturée** : ses membres ne sont plus reconnus au guichet et l'autorisation collective cesse immédiatement.

## L'autorisation collective d'entrée

Pour une délégation **Validée** avec autorisation collective, le moteur de risque considère chaque membre comme titulaire d'une autorisation de voyage approuvée pendant la fenêtre du séjour : **de 3 jours avant l'arrivée à 3 jours après le départ**. Au guichet, la ligne **Autorisation de voyage (e-Visa)** est alors **OK** et affiche la référence de la délégation (par exemple `DL260001 — APPROUVEE (jusqu'au …)`). Les eGates reconnaissent aussi cette autorisation ; les autres conditions d'éligibilité de la porte restent applicables.

Points à retenir :

- l'autorisation ne concerne que les nationalités soumises à visa ; pour une nationalité dispensée, elle ne change rien ;
- un e-Visa individuel approuvé reste prioritaire s'il existe ;
- hors de la fenêtre du séjour, ou après clôture, le membre redevient un voyageur ordinaire ;
- sans autorisation collective, la délégation reste reconnue au guichet (bandeau), mais chaque membre soumis à visa doit présenter un e-Visa individuel ;
- **les contrôles au guichet restent obligatoires** pour tous : listes de surveillance, document, puce, biométrie. Un membre signalé au guichet est traité comme tout voyageur.

## Au guichet : accueillir un membre

1. Contrôlez le membre normalement dans **Contrôle guichet** (document, puce, biométrie).
2. À l'étape **Vérifications**, un bandeau bleu s'affiche au-dessus des résultats si le passeport figure dans une délégation validée et que la date du jour est dans la fenêtre du séjour : **Membre de la délégation DL…** (avec la mention **(VIP — accueil protocolaire)** si besoin), nom et type de la délégation, fonction, type de passeport et, le cas échéant, **Autorisation collective d'entrée valide pendant le séjour.**
3. Lisez les vérifications et l'évaluation du risque comme pour tout voyageur, puis décidez. Le bandeau n'influence pas la recommandation, sauf par l'autorisation de voyage.
4. Cliquez sur **Voir la délégation** dans le bandeau (ou ouvrez la tuile **Délégations**), puis sur **Pointer** sur la ligne du membre pour enregistrer son arrivée.

Le pointage est manuel et distinct de la décision de passage : il sert à suivre l'arrivée du groupe (indicateur **Arrivés**, colonne **Arrivée**). Le bouton **Pointer** n'apparaît que pour une délégation **Validée** et pour un rôle disposant du droit de contrôle.

## Déclaration par l'organisateur (portail voyageur)

Les organisateurs déclarent leur délégation sur le portail voyageur, onglet **Délégations**, rubrique **Déclarer une délégation**, **au moins 72 h avant l'arrivée** (recommandé). Le formulaire reprend les champs de l'espace DPAF, sans le protocole, et exige la case de consentement (loi n° 2008-12). L'organisateur reçoit une référence `DL…` ; la délégation apparaît dans l'espace DPAF au statut **Soumise**, avec la source **Portail organisateurs**.

Dans la rubrique **Suivre une délégation**, l'organisateur saisit la **référence** et l'**e-mail du contact** pour voir le statut, les dates, le nombre de membres, le régime d'entrée accordé et, en cas de refus, le motif. Il ne voit jamais le résultat du pré-contrôle. Voir *Guide du voyageur (portail et app iPhone)*.

## Exemple complet : une équipe sportive pour un tournoi

L'équipe nationale de volley-ball du Japon (fictive) participe à un tournoi international à Dakar : 14 membres, arrivée le 12 à l'AIBD par un vol régulier, départ le 22. Les ressortissants japonais sont soumis à visa.

1. **J-10 — Déclaration.** Le comité d'organisation déclare la délégation sur le portail (type **Compétition sportive**, événement « Tournoi international de Dakar », hôte « Fédération sénégalaise de volley-ball »). Il colle la liste des 14 membres depuis son tableur et obtient la référence `DL260007`.
2. **J-10 — Pré-contrôle.** Un membre du staff obtient un score de 65 (correspondance nominative sur une liste de surveillance). Une alerte **Délégation (pré-contrôle)** de gravité **Haute** apparaît dans le Threat Monitor ; la tuile **Délégations** affiche « 1 à valider ».
3. **J-9 — Levée de doute.** L'analyste prend en charge l'alerte et compare la date de naissance et la nationalité avec la fiche de la liste : il s'agit d'un homonyme. Il clôture l'alerte avec « Fausse alerte — homonyme » et précise l'élément discriminant.
4. **J-8 — Membre supplémentaire.** Le comité signale par téléphone un kinésithérapeute oublié. L'analyste clique sur **Ajouter des membres** et colle sa ligne ; le nouveau membre est pré-contrôlé (score faible).
5. **J-8 — Validation.** L'analyste clique sur **Valider**, laisse cochée l'autorisation collective et confirme. La délégation est **Validée** ; elle vaut e-Visa du 9 au 25.
6. **J-7 — Suivi.** Le comité consulte **Suivre une délégation** : « Validée — Autorisation collective d'entrée accordée : présentez les passeports à l'arrivée. »
7. **J-1 — Préparation.** Le chef de poste de l'AIBD ouvre la fiche, clique sur **Imprimer la liste** et la remet aux agents des guichets dédiés.
8. **Jour J — Arrivée.** Chaque joueur passe au guichet. À l'étape **Vérifications**, le bandeau « Membre de la délégation DL260007 » s'affiche et la ligne **Autorisation de voyage (e-Visa)** est **OK**. L'agent décide, puis pointe l'arrivée sur la fiche. En fin de journée, la fiche affiche « 15 arrivé(s) ».
9. **J+11 — Clôture.** Après le départ du groupe, l'analyste clique sur **Clôturer**.

> Le jeu de démonstration contient trois délégations fictives : `DL260001` (visite officielle gambienne, VIP, validée avec autorisation collective), `DL260002` (équipe féminine de basket-ball du Nigeria, déclarée sur le portail et à valider, dont un membre signalé) et `DL260003` (délégation à une conférence, validée, un membre déjà arrivé).

## Journal d'audit

| Action | Code |
|---|---|
| Enregistrement (espace DPAF ou portail) | `DELEGATION_CREATION` |
| Validation | `DELEGATION_VALIDER` |
| Refus | `DELEGATION_REFUSER` |
| Clôture | `DELEGATION_CLOTURER` |
| Arrivée pointée | `DELEGATION_ARRIVEE` |
| Ajout de membres | `DELEGATION_AJOUTER` |
| Retrait d'un membre | `DELEGATION_RETIRER` |

## Questions fréquentes

### Un membre signalé empêche-t-il la validation ?

Non. La fenêtre de validation rappelle le nombre de membres signalés, mais la décision appartient à l'agent habilité. Traitez d'abord l'alerte du Threat Monitor, puis retirez le membre ou refusez la délégation si le signalement est confirmé. Au guichet, le membre est de toute façon contrôlé comme tout voyageur.

### L'organisateur peut-il savoir qu'un membre a été signalé ?

Non. Le portail et l'API publique ne renvoient ni score ni facteur. Ne communiquez jamais ce résultat à l'organisateur.

### Un membre arrive avant la délégation. Est-il reconnu ?

Oui, s'il arrive dans les 3 jours qui précèdent la date d'arrivée déclarée. Au-delà, il n'est pas reconnu : il doit disposer d'un e-Visa individuel si sa nationalité y est soumise.

### Un membre change de passeport après la validation.

Le membre est reconnu par son numéro de passeport. Ajoutez une nouvelle ligne avec le nouveau passeport (**Ajouter des membres**). L'ancienne ligne ne peut plus être retirée depuis l'interface une fois la délégation validée ; mentionnez le changement dans l'alerte ou le dossier si nécessaire.

### Faut-il pointer chaque arrivée ?

Oui, pour suivre l'arrivée du groupe et informer l'organisateur ou le protocole. Le pointage n'est pas fait automatiquement par la décision de passage.

### Une délégation refusée ou clôturée peut-elle être rouverte ?

Non. Enregistrez une nouvelle délégation (ou demandez à l'organisateur de la déclarer à nouveau) ; elle obtient une nouvelle référence.

### Le bandeau n'apparaît pas au guichet pour un membre.

Vérifiez que la délégation est **Validée** (et non **Soumise** ou **Clôturée**), que la date du jour est dans la fenêtre du séjour (arrivée − 3 jours à départ + 3 jours) et que le numéro de passeport lu correspond exactement à celui de la liste.
