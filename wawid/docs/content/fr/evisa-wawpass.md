# e-Visa et pré-enrôlements eGate

L'espace **e-Visa & voyageurs** du back-office traite les demandes déposées sur le portail voyageur :

- **e-Visa** : instruction des demandes d'autorisation de voyage (Visa Management System) ;
- **Pré-enrôlements eGate** : pré-enrôlements au programme eGate et, dans un second onglet, historique des anciens reçus WawPass ;
- **Vérifier un QR** (espace **Contrôle frontière**) : contrôle à la frontière des QR codes e-Visa.

> La redevance de sécurité (12 USD par passager) est incluse dans le prix du billet d'avion et perçue par les compagnies aériennes (voir *Redevance de sécurité*). Le voyageur n'a rien à payer à part : l'ancien paiement en ligne WawPass a été supprimé du portail.

| Action | Droit nécessaire |
|---|---|
| Consulter les demandes, les reçus et les pré-enrôlements, vérifier un QR | `read` |
| **Demander une information**, **Approuver**, **Refuser** | `evisa` (analyste, superviseur, administrateur) |

## Instruire les demandes e-Visa

### Onglets

| Onglet | Statuts affichés |
|---|---|
| **À instruire** | **Soumise** et **En examen** |
| **Info. demandée** | En attente d'une réponse du demandeur |
| **Approuvées** | e-Visa délivrés |
| **Refusées** | Demandes refusées |
| **Toutes** | Toutes les demandes |

Le tableau affiche **Référence** (`EV…`), **Demandeur** (nationalité et passeport), **Séjour** (motif, date d'arrivée, nombre de nuits), **Pré-contrôle** (score et niveau), **Déposée** et **Statut**. Le badge **Santé** signale qu'aucune vaccination contre la fièvre jaune n'a été déclarée.

### Page de la demande

Cliquez sur une ligne pour ouvrir la page de la demande. Elle comprend :

- **Demandeur et document** : nom, prénoms, naissance, sexe, nationalité, passeport, expiration, e-mail, téléphone, **Canal** de dépôt (Web, app…) et **Puce (NFC)** ;
- **Séjour, santé et paiement** : motif, arrivée et durée, **Point d'entrée**, adresse au Sénégal, **Fièvre jaune**, **Symptômes**, **Pays visités**, montant, moyen et reçu de paiement ;
- **Échanges avec le demandeur** : historique des messages entre l'agent et le demandeur ;
- **Passages antérieurs** : les derniers passages enregistrés avec le même passeport (8 au maximum), avec leur décision ;
- **Pré-contrôle automatique** : score, niveau et facteurs ;
- **e-Visa délivré** : pour une demande approuvée, le QR code signé, le numéro d'e-Visa, la date de fin de validité et l'agent décideur.

#### Champ Puce (NFC)

Si le demandeur a lu la puce de son passeport avec son téléphone (NFC), le champ affiche :

| Affichage | Signification |
|---|---|
| **Passeport authentifié** | Authentification passive réussie et données de la puce (DG1) conformes à la saisie |
| **Vérification échouée** | Signature de la puce invalide ou données différentes de la saisie |
| **Non lue** | Aucune lecture de puce |

La source de lecture est indiquée à côté.

#### Pré-contrôle automatique

Au dépôt, WawID calcule un score de risque (canal `EVISA`, sens entrée) à partir de :

- la copie locale des **listes de surveillance**, y compris la liste noire d'e-mails, de téléphones et d'appareils ;
- les **règles de ciblage** actives ;
- la **puce NFC** (authentification passive, cohérence avec la saisie) ;
- l'**eKYC à distance** : authenticité du document (recapture d'écran, copie imprimée, altération ou génération par IA), comparaison selfie / photo du document, défis de vivacité, deepfake, injection vidéo par caméra virtuelle, qualité d'image ;
- le **réseau d'identités** (voir plus bas).

Le score est figé au dépôt ; il n'est pas recalculé si les listes changent ensuite. Le détail des points figure dans *Comprendre le score de risque*.

> Dans la démonstration, le fournisseur eKYC est « simulation » : l'authenticité du document, la comparaison faciale et la détection de contenus générés par IA sont simulées. La qualité d'image et la détection des caméras virtuelles sont mesurées réellement par le navigateur du demandeur. Le paiement est lui aussi simulé (montant par défaut : 50 000 FCFA).

### Demander une information

1. Sur la page de la demande, cliquez sur **Demander une information**.
2. Précisez la pièce attendue (ex. réservation d'hôtel, lettre d'invitation) ; le texte est obligatoire.
3. Cliquez sur **Envoyer**. La demande passe **Info. demandée** et le message apparaît dans **Échanges avec le demandeur**.

Le demandeur répond depuis le portail voyageur (référence et numéro de passeport) ; sa réponse s'ajoute aux échanges et la demande repasse **En examen**.

### Approuver

1. Vérifiez le pré-contrôle, la puce, la déclaration sanitaire et les échanges.
2. Cliquez sur **Approuver**.

WawID attribue un numéro `SN-EV-…`, fixe la validité à **90 jours** à compter de l'approbation et génère un **QR code signé** (signature HMAC côté serveur). Le demandeur voit la décision et télécharge son e-Visa sur le portail.

### Refuser

1. Cliquez sur **Refuser**.
2. Saisissez le **Motif du refus** (obligatoire) ; il est communiqué au demandeur.
3. Cliquez sur **Envoyer**.

Une demande **Approuvée** ou **Refusée** ne peut plus être modifiée : les boutons d'action disparaissent. Chaque décision est inscrite au journal d'audit.

### Effet à la frontière

Au guichet et aux eGates, le moteur de risque recherche l'e-Visa du passeport présenté. Un e-Visa approuvé et en cours de validité ne génère aucun facteur ; une demande non approuvée, expirée ou absente pour une nationalité soumise à visa ajoute 30 points (facteur `VISA`) à l'entrée.

## Vérifier un QR code

1. Ouvrez **Vérifier un QR** depuis l'espace **Contrôle frontière**.
2. Collez le contenu du QR code (ou utilisez une douchette), ou cliquez sur **Scanner** pour lire avec la caméra (navigateurs compatibles BarcodeDetector).
3. Cliquez sur **Vérifier**.

Le serveur contrôle la signature. Un QR falsifié est déclaré « QR code invalide ou falsifié ». Pour un e-Visa, le QR est **Valide** si la demande est approuvée et non échue. Comparez le titulaire et le numéro de document affichés avec le passeport présenté.

> Les anciens reçus WawPass (jetons `WP…`) émis avant la suppression du paiement voyageur restent vérifiables à titre historique : la première vérification les marque **Utilisé**, la suivante répond « Reçu déjà utilisé. ». Aucun nouveau reçu n'est émis.

## Historique WawPass (anciens reçus)

Le paiement de la taxe de sécurité par le voyageur (WawPass) a été supprimé : la redevance est incluse dans le billet. Ouvrez **Pré-enrôlements eGate**, onglet **Historique WawPass**, pour consulter les reçus émis auparavant :

| Colonne | Contenu |
|---|---|
| **Reçu** | Référence `WP…` |
| **Voyageur** | Nom et numéro de passeport |
| **Vol** | Numéro et date du voyage |
| **Montant** | Montant (15 000 FCFA par défaut) et moyen de paiement |
| **Statut** | **Valide** ou **Utilisé** |

Cet historique est en lecture seule ; aucun nouveau reçu n'y est ajouté.

## Pré-enrôlements eGate

Ouvrez la tuile **Pré-enrôlements eGate** (route `#/wawpass`) : l'onglet par défaut, **Pré-enrôlements eGate**, liste les voyageurs inscrits depuis le portail au programme de passage automatisé : **Référence** (`EN…`), **Voyageur** (nationalité et passeport), **Date** et **Statut**. Le statut affiché, « Biométrie à capturer au 1er passage », rappelle que le visage est capturé lors du premier passage au guichet.

Le portail n'accepte le pré-enrôlement que si :

- la MRZ saisie est valide (chiffres de contrôle corrects) ;
- le voyageur est majeur et son passeport n'est pas expiré ;
- l'adresse e-mail est valide et le consentement biométrique est donné.

Un passeport déjà pré-enrôlé renvoie la référence existante, sans doublon.

## Détecter un réseau d'identités

Les fraudes organisées réutilisent souvent les mêmes coordonnées pour plusieurs identités. Au dépôt de chaque demande e-Visa, WawID recherche les **autres demandes, portant d'autres numéros de passeport**, qui partagent :

- la même adresse **e-mail** (sans tenir compte de la casse) ;
- le même **téléphone** (comparaison sur les chiffres, 8 au moins) ;
- le même **appareil** (identifiant stable généré par le navigateur ou l'app).

Si au moins une demande est liée, le facteur **Coordonnées ou appareil partagés avec *n* autre(s) identité(s)** ajoute 15 points plus 10 par identité liée, jusqu'à 45, et indique le lien (e-mail, téléphone, appareil). Une coordonnée inscrite sur la liste noire ajoute en plus le facteur **Liste noire**.

### Que faire face à un réseau

1. Ouvrez une demande portant le facteur réseau et notez le lien indiqué.
2. Recherchez les autres demandes concernées (même téléphone, même adresse) dans l'onglet **Toutes**.
3. Demandez des pièces complémentaires ou refusez les demandes, avec un motif.
4. Faites inscrire le téléphone, l'e-mail ou l'appareil sur la liste noire de coordonnées pour bloquer les dépôts futurs (voir *Threat Monitor, dossiers, listes, règles et connecteurs*).

> Le jeu de démonstration contient un réseau fictif : quatre demandes d'identités et de nationalités différentes, déposées depuis le même appareil avec le même numéro de téléphone, lui-même inscrit sur la liste noire.
