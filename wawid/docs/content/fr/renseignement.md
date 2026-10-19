# Threat Monitor, dossiers, listes, règles et connecteurs

L'espace **Renseignement** du back-office regroupe cinq applications : **Threat Monitor** (alertes), **Dossiers** (contrôles secondaires), **Listes de surveillance**, **Règles de ciblage** et **Connecteurs**. Elles s'adressent aux analystes, aux superviseurs et, pour le traitement des alertes et des dossiers, aux agents de contrôle.

| Application | Droit nécessaire pour consulter | Droit nécessaire pour agir |
|---|---|---|
| Threat Monitor | `alerts` | `alerts` (ouvrir un dossier : `cases`) |
| Dossiers | `cases` | `cases` |
| Listes de surveillance | `read` | `watchlist` |
| Règles de ciblage | `read` | `rules` |
| Connecteurs | `read` | **Tester** : `watchlist` · **Activer / Désactiver** : `system` |

> Les rôles qui portent ces droits sont décrits dans la page *Administration*. Toutes les actions ci-dessous sont inscrites au **Journal d'audit**.

## Threat Monitor

Le Threat Monitor est la vue unique de toutes les correspondances : passages au guichet, eGates et pré-contrôle APIS/PNR. Une alerte est créée automatiquement :

- pour un passage (guichet ou eGate) dont le score de risque atteint **35** ou dont la décision est **Refusé** ;
- pour un passager annoncé (message API/PNR ou manifeste) dont le score atteint **35** — une seule alerte non clôturée par passager et par vol.

La gravité de l'alerte dépend du score : **Critique** à partir de 80, **Haute** à partir de 60, **Moyenne** en dessous. Le type et le titre sont déduits des facteurs de risque (voir *Comprendre le score de risque*).

La cloche de la barre supérieure affiche le nombre d'alertes **Nouvelles** ; les données sont rafraîchies toutes les 30 secondes et un message signale l'arrivée de nouvelles alertes.

### Onglets et filtre

| Onglet | Contenu |
|---|---|
| **Ouvertes** | Toutes les alertes non clôturées (vue par défaut) |
| **Nouvelles** | Alertes non encore prises en charge |
| **En cours** | Alertes prises en charge ou rouvertes |
| **Clôturées** | Alertes résolues |
| **Toutes** | L'ensemble des alertes |

La liste déroulante **Tous les types** filtre par type : **Document perdu / volé**, **Liste de surveillance**, **Fraude biométrique**, **Fraude documentaire**, **Document expiré**, **Règle de ciblage**, **Sans autorisation**, **APIS / PNR**, **Risque élevé**.

### Vue maître-détail

La liste (colonnes **Gravité**, **Alerte**, **Reçue**, **Statut**) occupe la partie gauche. Un clic sur une ligne ouvre le détail à droite :

- voyageur, document, poste, statut et agent responsable, résolution éventuelle ;
- lien vers le **Passage** (avec son score) ou vers le **Vol** pour une alerte APIS ;
- la liste des **Facteurs** du score, avec leurs points ;
- l'**Historique** horodaté de toutes les actions.

### Traiter une alerte

1. Dans l'onglet **Nouvelles**, sélectionnez l'alerte.
2. Cliquez sur **Prendre en charge** : votre nom est enregistré comme responsable et l'alerte passe **En cours**. Ce bouton n'apparaît que pour une alerte nouvelle.
3. Pour consigner une vérification, cliquez sur **Note**, saisissez le texte, puis **Ajouter**. Une note vide est refusée.
4. Pour un contrôle approfondi, cliquez sur **Ouvrir un dossier** (droit `cases`). Si un dossier ouvert existe déjà pour cette alerte, WawID l'affiche au lieu d'en créer un second.
5. Une fois le doute levé, cliquez sur **Clôturer**. Choisissez une **Résolution** :
   - Fausse alerte — homonyme
   - Levée de doute — documents complémentaires
   - Remis à la police aux frontières
   - Refus d'entrée notifié
   - Signalement transmis à Interpol (BCN)
   - Document saisi
   - Autre…
6. Complétez si besoin le champ **Précisions**, puis cliquez sur **Clôturer**. La résolution enregistrée combine le choix et les précisions (« choix — précisions »). Une résolution est obligatoire.

Pour revenir sur une alerte clôturée, ouvrez-la et cliquez sur **Rouvrir** : elle repasse **En cours** et l'événement est ajouté à l'historique.

## Dossiers

Un dossier documente un contrôle secondaire : entretien, notes et décision. Il reprend le titre de l'alerte, sa gravité comme **Priorité**, le voyageur, le poste et le passage lié ; vous en devenez le **Responsable**.

La liste affiche **Dossier**, **Objet**, **Priorité**, **Responsable**, **Ouvert** et **Statut** (**Ouvert** ou **Clos**). Un clic ouvre la page du dossier.

### Mener l'entretien structuré

1. Ouvrez le dossier.
2. Dans la carte **Entretien structuré**, renseignez les quatre rubriques : **Motif du voyage**, **Hébergement / adresse au Sénégal**, **Ressources et billet de retour**, **Observations de l'agent**.
3. Cliquez sur **Enregistrer**.

### Ajouter une note

Dans la carte **Notes**, saisissez le texte dans **Ajouter une note…** puis cliquez sur **Ajouter**. Chaque note est horodatée et signée. Les ouvertures, clôtures et réouvertures y sont aussi tracées automatiquement.

### Clore ou rouvrir

Cliquez sur **Clore le dossier**. L'entretien passe en lecture seule et le bouton **Enregistrer** est désactivé. Le bouton **Rouvrir** permet de reprendre le dossier. Le bouton **Passage** ouvre la fiche du passage d'origine.

## Listes de surveillance

WawID tient une copie locale synchronisée des fichiers de recherche. Elle est interrogée à chaque passage au guichet, à chaque transaction eGate, à chaque demande e-Visa et à chaque passager annoncé (APIS/PNR).

### Sources

| Onglet (source) | Contenu |
|---|---|
| **Interpol — notices** | Notices (rouge, jaune…) |
| **Interpol — diffusions** | Diffusions (par ex. bleue) |
| **Interpol SLTD** | Documents de voyage perdus ou volés |
| **WAPIS** | Données policières régionales d'Afrique de l'Ouest |
| **Personnes recherchées (FPR)** | Fichier national des personnes recherchées |
| **Interdictions judiciaires** | Interdictions judiciaires du territoire |
| **Documents nationaux invalidés** | Passeports annulés par l'autorité nationale |
| **Personnes d'intérêt** | POI désignées par les analystes |

S'y ajoute la **liste noire de coordonnées** (« Liste noire — coordonnées ») : adresses e-mail, numéros de téléphone et identifiants d'appareil associés à des réseaux de fraude. Ces entrées apparaissent dans l'onglet **Toutes**. Dans cette version, la fenêtre d'ajout ne propose que **Personne** et **Document** : les entrées e-mail, téléphone ou appareil sont créées par l'API (`POST /api/watchlist` avec `kind` = `email`, `phone` ou `device` et le champ `value`).

Chaque onglet n'apparaît que s'il contient au moins une entrée. Le tableau indique **Type**, **Identité / document**, **Source** (avec la référence), **Gravité**, **Motif** et **État**.

### Ajouter une entrée

1. Cliquez sur **Ajouter** (ou sur la tuile **Ajouter une entrée** de l'accueil).
2. Choisissez le **Type** : **Personne** ou **Document**.
3. Choisissez la **Source** (par défaut **Personnes d'intérêt**).
4. Pour une personne, saisissez **Nom** et **Prénoms** (obligatoires), si possible la **Date de naissance** et la **Nationalité**. Pour un document, saisissez le **N° de document** (obligatoire) et l'**État émetteur**.
5. Indiquez la **Gravité** (**Critique**, **Haute**, **Moyenne**, **Basse**), la **Référence** (numéro de notice, de mandat…) et le **Motif**.
6. Cliquez sur **Ajouter**. L'entrée est appliquée immédiatement aux contrôles suivants.

> Depuis la fiche d'un passage, le bouton **Ajouter comme personne d'intérêt** crée directement une entrée POI de gravité moyenne.

### Désactiver ou réactiver une entrée

Dans la colonne **État**, cliquez sur **Désactiver**. Une entrée inactive est conservée mais n'est plus prise en compte. Cliquez sur **Activer** pour la rétablir.

### Tester une correspondance nominative

1. Cliquez sur **Tester une correspondance**.
2. Saisissez un nom (au moins 3 caractères), dans n'importe quel ordre.
3. Les six entrées « personne » les plus proches s'affichent avec leur similarité : en rouge à partir de 90 %, en orange à partir de 80 %.

Le testeur compare seulement les noms ; il ne tient pas compte de la date de naissance ni de l'état actif de l'entrée.

### Fonctionnement de la correspondance

- **Normalisation** : majuscules, translittération ICAO (Ä → AE, Ø → OE…), accents, apostrophes et traits d'union neutralisés. Les préfixes « ABD », « ABDEL », « ABDUL », « ABD AL », « ABD EL » sont unifiés.
- **Variantes** : les graphies courantes sont regroupées, par exemple Mohamed / Mohammed / Muhammad / Mamadou / Mahamadou, Abdoulaye / Abdullahi / Abdallah, Ousmane / Usman.
- **Par jetons, sans ordre** : chaque élément du nom le plus court doit trouver un équivalent proche dans l'autre nom. La proximité de deux éléments est la moyenne de Jaro-Winkler et d'une distance d'édition. Le score retenu est la moyenne entre la similarité moyenne et la plus faible, pour qu'un nom de famille courant ne suffise pas (NDIAYE AWA ≠ NDIAYE ADAMA). Un nom réduit à un seul élément est plafonné à 85 %.
- **Date de naissance** : +6 points de similarité si elle concorde, −8 points si les deux dates sont connues et différentes.
- **Seuil** : une correspondance est retenue à partir de **90 %**.
- **Documents** : le numéro (lettres et chiffres seulement) doit être identique ; l'État émetteur doit aussi concorder lorsqu'il est connu des deux côtés.
- **Liste noire** : égalité exacte de l'e-mail (sans espaces, insensible à la casse), du téléphone (chiffres seulement) ou de l'identifiant d'appareil.

## Règles de ciblage

Une règle de ciblage ajoute des points au score lorsque **toutes** ses conditions sont vraies. Chaque carte affiche la règle sous la forme « SI … ALORS +N points », son état, le nombre de déclenchements sur les passages enregistrés, l'auteur et la date de modification.

### Champs et opérateurs

| Champ | Valeur comparée |
|---|---|
| **Nationalité** | Code ISO à 3 lettres (ex. `NGA`) |
| **État émetteur** | Code ISO du document |
| **Provenance / destination** | Code aéroport ou poste saisi (ex. `IST`, `ROS`) |
| **Âge** | Âge en années |
| **Sexe** | `M`, `F` ou `X` |
| **Sens** | `ENTREE` ou `SORTIE` |
| **Canal** | `GUICHET`, `EGATE`, `APIS` ou `EVISA` |
| **Passages sur 30 jours** | Nombre de passages du document sur 30 jours |
| **Validité restante du document (jours)** | Jours avant expiration |

Opérateurs : **est parmi**, **n'est pas parmi** (listes, valeurs séparées par des espaces ou des virgules, insensibles à la casse), **supérieur à**, **inférieur à** (nombres). Une condition sur une donnée inconnue est fausse.

### Créer ou modifier une règle

1. Cliquez sur **Nouvelle règle** (ou **Modifier** sur une carte).
2. Saisissez le **Nom** et les **Points ajoutés** (0 à 100, 10 par défaut).
3. Pour chaque condition, choisissez le champ, l'opérateur et la valeur. **Condition** ajoute une ligne (8 au maximum) ; la croix en supprime une.
4. Cliquez sur **Enregistrer**. Un nom et au moins une condition sont obligatoires.

**Activer** / **Désactiver** change l'état sans perdre la règle. L'icône corbeille la supprime après confirmation ; les passages déjà évalués conservent leur score.

## Connecteurs

Les connecteurs relient WawID aux fichiers nationaux et internationaux. Chaque carte indique le **Protocole**, le **Mode**, le nombre d'**Enregistrements**, la **Dernière synchro** et la variable d'environnement attendue.

| Connecteur | Source | Variables |
|---|---|---|
| Interpol I-24/7 — SLTD | Interpol SLTD | `WAWID_CONNECTOR_INTERPOL_SLTD_URL` / `_TOKEN` |
| Interpol I-24/7 — Nominal & notices | Interpol — notices | `WAWID_CONNECTOR_INTERPOL_NOM_URL` / `_TOKEN` |
| WAPIS | WAPIS | `WAWID_CONNECTOR_WAPIS_URL` / `_TOKEN` |
| Fichier national des personnes recherchées | FPR | `WAWID_CONNECTOR_FPR_URL` / `_TOKEN` |
| Interdictions judiciaires du territoire | Interdictions judiciaires | `WAWID_CONNECTOR_JUD_URL` / `_TOKEN` |
| Registre national des passeports (DAF) | Documents nationaux invalidés | `WAWID_CONNECTOR_ETATCIVIL_URL` / `_TOKEN` |
| Passerelle transporteurs API/PNR | APIS | `WAWID_CONNECTOR_PAXLST_URL` / `_TOKEN` |

### États

| État | Signification |
|---|---|
| **Simulé (copie locale)** | Aucune URL configurée : seule la copie locale des listes est utilisée. C'est l'état de tous les connecteurs dans la démonstration. |
| **Connecté** | La variable `…_URL` est définie : le service est interrogé en temps réel. |
| **Désactivé** | Connecteur arrêté par un administrateur ; les entrées locales de sa source sont ignorées lors des contrôles guichet et eGate. |

### Contrat d'échange

À chaque contrôle guichet ou eGate, WawID interroge en parallèle les connecteurs **Connecté** (délai maximal 2,5 s), avec l'en-tête `Authorization: Bearer <TOKEN>` si un jeton est défini :

```json
POST <URL>
{ "surname": "…", "given": "…", "dob": "AAAA-MM-JJ", "nat": "SEN", "docNo": "…", "issuer": "SEN" }
```

Réponse attendue :

```json
{ "hits": [ { "list": "…", "severity": "critique|haute|moyenne|basse", "reason": "…", "reference": "…", "kind": "person|document" } ] }
```

Sans gravité, une correspondance est traitée comme **haute**. Les réponses s'ajoutent à la copie locale, qui est toujours consultée : si un service est injoignable ou répond en erreur, le contrôle se poursuit sur la copie locale (mode dégradé) et l'erreur est signalée à l'agent. Les pré-contrôles e-Visa et APIS utilisent uniquement la copie locale.

### Tester un connecteur

Cliquez sur **Tester**. En mode simulé, le message est « Mode simulé : copie locale synchronisée utilisée. ». En mode connecté, WawID envoie `{ "ping": true }` (délai 4 s) et affiche « Service joignable. » avec la latence, ou le motif de l'échec.

> L'accès réel à Interpol I-24/7 passe par le Bureau central national (BCN) ; l'accès à WAPIS passe par la plateforme nationale.
