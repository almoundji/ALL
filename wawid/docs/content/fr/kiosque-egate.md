# Kiosque eGate : mise en service et parcours

Le kiosque eGate est l'écran des portes automatiques et des kiosques ABC (Automated Border Control). Il guide le voyageur en libre-service : présentation du passeport, lecture de la puce, capture du visage, vérification, puis ouverture des portes ou orientation vers un guichet. Il s'ouvre à l'adresse `/gate/` dans un navigateur, sur l'ordinateur qui pilote la porte.

Cette page s'adresse aux techniciens qui installent un kiosque et aux agents qui assistent les voyageurs.

## Matériel recommandé

Un poste de kiosque se compose de :

- un **ordinateur** relié au réseau, avec un navigateur récent (Chrome ou Edge recommandés) lancé en plein écran (mode kiosque) ;
- un **écran** face au voyageur, idéalement tactile ;
- un **lecteur de documents pleine page avec lecteur RFID/NFC**, pour la bande MRZ et la puce du passeport ;
- le **pont NFC local** de WawID (`tools/nfc-bridge.mjs`), installé sur le même ordinateur : il relie le navigateur au lecteur et n'écoute que sur la machine elle-même (adresse par défaut `http://127.0.0.1:8765`) ;
- une **caméra frontale** pour la capture du visage ;
- selon le modèle d'équipement, un lecteur d'empreintes et le contrôleur des portes.

> Sans pont NFC joignable, la lecture de la puce est simulée. Dans la version de démonstration, la comparaison faciale est également simulée : la caméra sert à l'affichage, le score étant produit par un simulateur. En production, ces résultats sont fournis par le lecteur et le SDK biométrique certifié de l'équipement.

## Mise en service d'un kiosque

### 1. Activer l'équipement

Au premier lancement, le kiosque affiche **Activation de l'équipement**.

1. Saisissez la **Clé d'équipement** fournie par l'administrateur WawID.
2. Cliquez sur **Activer**.

La clé est mémorisée dans le navigateur du kiosque. Si le serveur la refuse, le message **Clé refusée par le serveur** s'affiche et la clé doit être saisie à nouveau.

À défaut de clé, un utilisateur habilité peut aussi se connecter au back-office (`/admin/`) dans le même navigateur : le kiosque utilise alors sa session. Cette méthode convient aux essais ; en exploitation, utilisez la clé d'équipement.

### 2. Choisir l'équipement

L'écran **Choisir l'équipement** liste les portes et kiosques déclarés, avec leur identifiant, leur type et leur état (**Ouvert** ou **Fermé**). Cliquez sur l'équipement correspondant à ce poste. Le choix est mémorisé dans le navigateur.

Vous pouvez aussi présélectionner l'équipement dans l'adresse : `/gate/?gate=EG-AIBD-A01`. Depuis le back-office, le bouton de lecture d'une carte de l'application **eGates & ABC** ouvre directement le kiosque de cet équipement.

Le nom et la zone de l'équipement s'affichent en haut à droite de l'écran. Le bouton engrenage **Changer d'équipement** permet d'en choisir un autre.

### En cas de problème de démarrage

| Message | Que faire |
| --- | --- |
| **Serveur WawID injoignable** | Vérifier la connexion réseau du kiosque, puis recharger la page. |
| **Clé refusée par le serveur** | Ressaisir la clé ; vérifier auprès de l'administrateur qu'elle n'a pas changé. |
| **Équipement non autorisé.** (en fin de parcours) | La clé n'est plus valide : elle est effacée et sera redemandée. |

## Le parcours du voyageur

Le bas de l'écran affiche les quatre étapes : **Passeport**, **Visage**, **Vérification**, **Passage**.

### 1. Passeport

L'écran d'accueil invite le voyageur à **placer son passeport ouvert sur le lecteur**, page photo vers le bas. Il rappelle que le passage automatisé est réservé aux voyageurs majeurs munis d'un passeport biométrique. Les langues d'accueil (Français, English, Wolof, العربية) sont rappelées sur l'écran.

### 2. Lecture de la puce

L'écran **Lecture de la puce…** demande au voyageur de **ne pas retirer son passeport** pendant la lecture.

### 3. Visage

L'écran **Regardez la caméra** demande de retirer lunettes de soleil et couvre-chef et de rester immobile. Un compte à rebours de 3 secondes précède la capture.

### 4. Vérification

L'écran **Vérification en cours…** s'affiche pendant la comparaison biométrique et les contrôles de sécurité, réalisés par le serveur WawID.

### 5. Résultat

- **Passage autorisé** : « **Bon voyage**, *prénom* ! » puis « Les portes s'ouvrent. Avancez. ».
- **Orientation** : « **Veuillez vous présenter au guichet** », suivi du motif, puis « Un agent a été informé. Merci de votre compréhension. ».

Le résultat reste affiché environ 6 secondes, puis le kiosque revient à l'écran d'accueil pour le voyageur suivant.

## Messages vus par les voyageurs

En cas d'orientation, le voyageur voit l'un des messages suivants. Ils sont volontairement neutres ; l'agent du guichet dispose du détail dans le back-office.

| Message | Situation typique |
| --- | --- |
| Document illisible — veuillez vous présenter au guichet. | La bande MRZ n'a pas pu être lue. |
| Le document n'a pas pu être authentifié. | Les données lues du document sont incohérentes. |
| Les voyageurs mineurs sont traités au guichet. | Le voyageur n'a pas l'âge requis pour le passage automatisé. |
| Nationalité non éligible au passage automatisé. | La nationalité n'est pas admise sur cet équipement. |
| Capture du visage impossible — veuillez vous présenter au guichet. | Aucun visage exploitable n'a été capturé. |
| Vérification biométrique impossible. | La vérification du visage n'a pas abouti. |
| La puce de votre passeport n'a pas pu être vérifiée. | La puce n'a pas pu être lue ou validée. |
| Votre visage ne correspond pas suffisamment à la photo du document. | La comparaison faciale n'est pas concluante. |
| Document expiré. | Le passeport n'est plus valide. |
| Autorisation de voyage introuvable. | Aucune autorisation de voyage (e-Visa) valide n'a été trouvée. |
| Contrôle complémentaire requis — un agent va vous accompagner. | Un contrôle par un agent est nécessaire. |
| Service momentanément indisponible. | Le serveur n'a pas pu traiter la demande. |

> Conseil aux agents : une orientation n'est pas une accusation. Accueillez le voyageur au guichet et réalisez un contrôle normal ; la plupart des orientations ont une cause simple (puce abîmée, éclairage, passeport expiré, voyageur mineur).

## Fermeture et réouverture à distance

Le superviseur peut fermer, rouvrir, mettre en maintenance ou redémarrer l'équipement depuis le back-office (application **eGates & ABC**).

- Lorsqu'il est au repos, le kiosque relit son état toutes les **15 secondes**. S'il a été fermé ou mis en maintenance, il affiche **Porte fermée** : « Merci de vous diriger vers un guichet de contrôle. ». Le bouton **Actualiser** relance la vérification.
- Un voyageur déjà engagé dans le parcours n'est pas interrompu. Si la porte a été fermée entre-temps, il reçoit le message « Cette porte est fermée. Merci de vous diriger vers un guichet. » et le kiosque se met à jour.
- Lorsque la porte est remise en service en mode automatique, l'écran d'accueil réapparaît automatiquement dans les 15 secondes.

## Simulateur de démonstration

Sous l'écran d'accueil, le panneau **Simulateur (démonstration)** remplace le lecteur de documents et la caméra pour les formations et démonstrations. En production, ces données proviennent des périphériques de la porte.

1. Choisissez un scénario dans la liste.
2. La MRZ correspondante s'affiche ; elle peut être modifiée.
3. Cochez **Utiliser la caméra de cet appareil** pour afficher la caméra pendant l'étape Visage (facultatif).
4. Cliquez sur **Présenter le passeport**.

| Scénario | Résultat attendu |
| --- | --- |
| Voyageur régulier | Ouverture des portes. |
| Ressortissant CEDEAO | Ouverture des portes (sauf si l'équipement est restreint à une autre liste). |
| Personne recherchée | Orientation au guichet. |
| Passeport volé | Orientation au guichet. |
| Voyageur mineur | Orientation au guichet (voyageur mineur). |
| Sans e-Visa | Orientation au guichet (autorisation de voyage). |
| Puce clonée | Orientation au guichet (puce non vérifiée). |
| Usurpation (masque) | Orientation au guichet (vérification biométrique impossible). |

Les transactions du simulateur sont traitées par le serveur comme de vraies transactions : elles apparaissent dans le flux en direct et dans la liste des passages du back-office. Utilisez-le de préférence sur un environnement de démonstration.
