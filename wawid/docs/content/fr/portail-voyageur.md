# Guide du voyageur (portail et app iPhone)

Ce guide s'adresse aux voyageurs qui se rendent au Sénégal ou qui en partent. Il décrit le **portail voyageur** WawID (site web, accessible sans compte) et l'**application iPhone WawID e-Visa**. Toutes les démarches se font en ligne ; aucune inscription préalable n'est nécessaire.

| Service | Où | À quoi il sert |
| --- | --- | --- |
| Ai-je besoin d'un visa ? | Page d'accueil du portail | Savoir si votre nationalité est dispensée de visa |
| e-Visa | Portail (onglet **e-Visa**) ou app iPhone | Demander une autorisation de voyage en ligne |
| Suivi | Portail (onglet **Suivi**) ou app iPhone | Consulter l'état de la demande, répondre à l'administration, obtenir le QR code |
| Redevance de sécurité | Page d'accueil du portail (carte **Redevance de sécurité**) | S'informer : la redevance est incluse dans le billet, rien à payer |
| eGate | Portail (onglet **eGate**) | Se pré-enregistrer pour les portes automatiques |
| Délégations | Portail (onglet **Délégations**) | Organisateurs : déclarer une délégation (visite officielle, compétition, conférence…) et suivre sa validation |

Adresse du portail : `https://wawid-waw-telecom.netlify.app`

La plateforme voyageurs comprend le portail (`/`) et le centre d'aide public (`/aide/`). Les applications mobiles se téléchargent sur la page `/app/` (lien **Application mobile** du portail) : Android par téléchargement direct de l'APK, iPhone par TestFlight. Les espaces des agents de la DPAF et des compagnies aériennes sont des plateformes distinctes, réservées à leurs utilisateurs ; le portail n'y donne pas accès.

> Démonstrateur : sur la version de démonstration, **aucun paiement réel n'est effectué** et les données affichées sont fictives.

## Ai-je besoin d'un visa ?

1. Ouvrez la page d'accueil du portail.
2. Dans la carte **Ai-je besoin d'un visa ?**, choisissez votre nationalité.
3. Le portail affiche immédiatement :
   - **Dispensé de visa (séjour ≤ 90 jours)** : vous n'avez pas de demande à faire ;
   - **e-Visa requis** : suivez le lien **Faire la demande**.

La liste des nationalités dispensées est fixée par l'administration et peut évoluer. En cas de doute, faites la vérification juste avant votre départ.

## Demander un e-Visa sur le portail

Le formulaire comporte **4 étapes** : Identité, Voyage, Santé, Paiement. Les champs marqués d'un astérisque (*) sont obligatoires. Le bouton **Retour** permet de revenir à l'étape précédente sans perdre la saisie.

### Étape 1 — Identité (remplissage automatique par la MRZ)

La **MRZ** est la bande de 2 lignes de caractères en bas de la page photo de votre passeport (par exemple `P<FRAMARTIN<<CLAIRE<<<…`).

1. Recopiez ou collez les 2 lignes de la MRZ dans la zone prévue en haut du formulaire.
2. Le portail remplit automatiquement nom, prénoms, date de naissance, sexe, nationalité, numéro et date d'expiration du passeport.
3. Si le message indique **chiffres de contrôle invalides**, la MRZ contient probablement une faute de frappe : vérifiez chaque champ.
4. Complétez votre **e-mail** (obligatoire) et votre **téléphone** (facultatif).

### Étape 2 — Voyage

- **Motif** : tourisme, affaires, visite familiale, conférence, études ou transit.
- **Date d'arrivée** et **durée** (en nuits).
- **Point d'entrée** : aéroport international Blaise Diagne (AIBD), port de Dakar, aéroport de Ziguinchor, postes terrestres de Rosso, Kidira ou Karang.
- **Adresse de séjour** : hôtel, adresse ou hôte.

### Étape 3 — Déclaration sanitaire

- Vaccination contre la fièvre jaune (certificat international).
- Fièvre ou symptômes infectieux au cours des 14 derniers jours.
- Pays visités au cours des 21 derniers jours.

### Étape 4 — Paiement et consentement

1. Vérifiez le montant des **frais de traitement** (50 000 FCFA dans la configuration par défaut, non remboursables).
2. Choisissez le moyen de paiement : Wave, Orange Money, Free Money ou carte bancaire.
3. Cochez la case de **consentement** : vous acceptez que vos données soient traitées par les services de l'immigration pour l'instruction de la demande et le contrôle aux frontières (loi n° 2008-12) et certifiez l'exactitude des informations. Sans consentement, la demande ne peut pas être déposée.
4. Cliquez sur **Payer et soumettre**.

### Après le dépôt

L'écran **Demande enregistrée** affiche :

- votre **référence** (commençant par `EV`, par exemple `EV1234567`) : **conservez-la** ;
- le montant payé et le numéro de reçu ;
- un bouton **Suivre ma demande**.

La réponse est généralement donnée **sous 72 h**. Votre demande fait l'objet d'un pré-contrôle automatique puis d'une instruction par un agent.

## Suivre une demande et répondre à l'administration

1. Ouvrez l'onglet **Suivi**.
2. Saisissez la **référence** (EV…) et le **numéro de passeport** utilisé pour la demande. Les deux doivent correspondre.
3. Cliquez sur **Consulter**.

| Statut | Signification | Que faire ? |
| --- | --- | --- |
| Soumise | Demande reçue, en attente d'instruction | Patienter |
| En examen | Un agent étudie la demande | Patienter |
| Info. demandée | L'administration a besoin d'un complément | Lire le message et répondre |
| Approuvée | e-Visa délivré | Télécharger ou imprimer le QR code |
| Refusée | Demande rejetée (motif indiqué dans les messages) | Lire le motif |

### Répondre à une demande d'information

Lorsque le statut est **Info. demandée**, le message de l'agent apparaît dans la rubrique **Messages** et un champ **Votre réponse** s'affiche.

1. Rédigez votre réponse (1 000 caractères maximum).
2. Cliquez sur **Envoyer**.
3. La demande repasse automatiquement au statut **En examen**.

Vous ne pouvez répondre que lorsqu'une information est attendue.

## Le QR code e-Visa

Lorsque la demande est **approuvée**, le suivi affiche :

- le **numéro d'e-Visa** (format `SN-EV-…`) ;
- la **date de fin de validité** (90 jours après l'approbation) ;
- un **QR code** signé électroniquement.

Imprimez la page (bouton **Imprimer**) ou gardez-la sur votre téléphone. À la frontière, présentez **le QR code et votre passeport**, au guichet ou à l'eGate. Le QR code est signé : toute modification le rend invalide. L'agent vérifie en temps réel que l'e-Visa est approuvé et toujours valide.

## Redevance de sécurité : rien à payer

**Vous n'avez rien à payer.** La redevance de sécurité est incluse dans le prix de votre billet d'avion et perçue par votre compagnie aérienne. Elle s'applique aux passagers embarqués ou débarqués sur un vol commercial international au Sénégal ; les membres d'équipage, les enfants de moins de 2 ans, les passagers en transit de moins de 24 h et les vols déroutés en sont exonérés.

La carte **Redevance de sécurité** de la page d'accueil du portail ouvre cette information. Aucun reçu n'est à présenter à l'aéroport.

> **Méfiez-vous de toute demande de paiement** en ligne ou à l'aéroport au titre de cette redevance : elle ne vous sera jamais réclamée directement. L'ancien service de paiement en ligne WawPass a été supprimé.

## Passer par les eGates

### Comment fonctionne une eGate

1. Posez votre **passeport biométrique ouvert** sur le lecteur. La porte lit la MRZ et la **puce** du passeport.
2. Regardez la **caméra** : votre visage est comparé à la photo enregistrée dans la puce, et la porte vérifie qu'il s'agit d'une personne réelle (détection du vivant).
3. Si tout est conforme, **les portes s'ouvrent** (environ 15 secondes).

La porte vous **oriente vers un guichet** (sans que cela préjuge de votre situation) notamment si :

- vous êtes mineur (le passage automatisé est réservé aux majeurs) ;
- le document est illisible, expiré, ou la puce n'a pas pu être vérifiée ;
- la comparaison faciale ou la détection du vivant échoue ;
- votre nationalité n'est pas éligible sur cette porte, ou aucune autorisation de voyage n'est trouvée ;
- un contrôle complémentaire est requis ;
- la porte est fermée ou en maintenance.

### Se pré-enregistrer

1. Ouvrez l'onglet **eGate**.
2. Collez les **2 lignes de la MRZ** de votre passeport et votre **e-mail**.
3. Cochez le **consentement biométrique** (capture de vos données biométriques lors du premier passage, à des fins de contrôle aux frontières).
4. Cliquez sur **M'enregistrer**. Une référence `EN…` s'affiche.

Conditions : MRZ valide, voyageur **majeur**, passeport **non expiré**. Un passeport déjà pré-enregistré renvoie la référence existante. Votre visage et vos empreintes sont capturés lors de votre **premier passage au guichet** ; les eGates vous sont ensuite ouvertes.

## L'application iPhone WawID e-Visa

L'app permet de déposer une demande d'e-Visa en lisant directement la **puce électronique** de votre passeport, ce qui renforce la vérification et accélère l'instruction. Elle s'installe depuis la page `/app/` du portail (iPhone : TestFlight ; une version Android est aussi proposée en téléchargement direct).

### Ce qu'il vous faut

- Un **passeport biométrique** (logo de puce sur la couverture).
- Un **iPhone 7 ou plus récent** (la lecture NFC n'est pas disponible sur les modèles plus anciens).
- Un moyen de paiement : Wave, Orange Money, Free Money ou carte.

### Étape 1 — Scanner la MRZ

1. Touchez **Scanner avec la caméra** et cadrez la bande de 2 lignes en bas de la page photo, ou saisissez-la manuellement.
2. Vérifiez le résumé (nom, prénoms, passeport, nationalité, expiration).
3. Le badge **Chiffres de contrôle valides** doit apparaître. Sinon, corrigez la saisie : la MRZ sert de **clé** pour ouvrir la puce.

### Étape 2 — Lire la puce avec le NFC

1. Touchez **Lire la puce NFC**.
2. Posez le passeport **fermé** sur une table et approchez le **haut de l'iPhone** de la couverture.
3. **Ne bougez plus** pendant la lecture (5 à 15 secondes) jusqu'au message « Passeport lu avec succès ».
4. L'app affiche la photo de la puce et deux résultats : **Passeport authentique** (authentification passive) et **Puce et MRZ concordantes**.

Conseils pour une bonne lecture :

- retirez la coque de l'iPhone et l'étui du passeport ;
- déplacez lentement l'iPhone si la lecture ne démarre pas : la position de la puce varie selon les passeports (couverture ou page de données) ;
- évitez les surfaces métalliques ;
- en cas d'échec, vérifiez la MRZ : une seule erreur empêche l'accès à la puce.

Vous pouvez **continuer sans lecture de la puce** ; l'instruction sera alors plus longue.

### Étape 3 — Votre séjour

Complétez l'identité (nom, prénoms, e-mail, téléphone), le voyage (motif, arrivée, durée de 1 à 90 nuits, point d'entrée, adresse) et la déclaration sanitaire.

### Étape 4 — Paiement et dépôt

1. Vérifiez les frais (50 000 FCFA) et choisissez le moyen de paiement.
2. Activez le **consentement** (loi n° 2008-12).
3. Touchez **Payer et déposer**. L'app affiche votre **référence** : conservez-la.

### Suivi dans l'app

Touchez **Suivre ma demande**, saisissez la référence et le numéro de passeport, puis **Consulter**. L'app affiche le statut, le numéro d'e-Visa, la date de validité, les messages de l'administration et, si la demande est approuvée, le **QR code à présenter à la frontière**. Pour répondre à une demande d'information, utilisez l'onglet **Suivi** du portail web.

## Déclarer une délégation (organisateurs)

Cette rubrique s'adresse aux **organisateurs** : ministères, ambassades, fédérations sportives, comités d'organisation. Elle permet d'annoncer en une seule fois un groupe qui se rend au Sénégal (visite officielle, compétition sportive, conférence ou sommet, événement culturel) pour que la Police de l'Air et des Frontières (DPAF) l'examine avant son arrivée.

Déclarez la délégation **au moins 72 h avant l'arrivée** (recommandé).

1. Ouvrez l'onglet **Délégations**, rubrique **Déclarer une délégation**.
2. Renseignez le nom de la délégation, son type, l'événement, l'hôte ou l'organisateur au Sénégal, le pays de provenance, les dates d'arrivée et de départ, le point d'entrée et le vol.
3. Indiquez le contact de l'organisateur : nom, **e-mail** (obligatoire, il sert au suivi) et téléphone.
4. Saisissez les **membres**, une ligne par personne, au format `Nom;Prénoms;Nationalité;Sexe;Naissance;Passeport;Fonction;Type de passeport`. Exemple : `Okafor;Grace;NGA;F;1998-05-12;A09981234;Athlète;ORDINAIRE`. La nationalité est un code à 3 lettres, la date de naissance s'écrit `AAAA-MM-JJ` et le type de passeport est `DIPLOMATIQUE`, `SERVICE` ou `ORDINAIRE`. Vous pouvez copier-coller les colonnes depuis Excel.
5. Cochez la case de **consentement** : vous certifiez l'exactitude des informations et disposez du consentement des membres au traitement de leurs données (loi n° 2008-12).
6. Cliquez sur **Déclarer la délégation**. Une référence commençant par `DL` s'affiche : **conservez-la**.

Pour suivre la demande, utilisez la rubrique **Suivre une délégation** : saisissez la **référence** (DL…) et l'**e-mail du contact**, puis cliquez sur **Consulter**.

| Statut | Signification |
| --- | --- |
| Soumise — en cours d'examen | La DPAF examine la délégation |
| Validée | Délégation acceptée ; le suivi précise le régime d'entrée accordé |
| Refusée | Délégation rejetée ; le motif est affiché |
| Clôturée | Séjour terminé |

Lorsque la délégation est validée avec une **autorisation collective d'entrée**, celle-ci vaut e-Visa pour chaque membre pendant le séjour : les membres présentent simplement leur passeport à l'arrivée. Sinon, chaque membre soumis à visa doit obtenir un e-Visa individuel. Dans tous les cas, chaque membre passe le contrôle frontière habituel au guichet.

## Données personnelles

Vos données sont traitées conformément à la **loi n° 2008-12 sur la protection des données à caractère personnel** (Commission de protection des données personnelles, CDP).

| Données | Utilisation |
| --- | --- |
| Identité et passeport | Instruction de la demande, contrôle aux frontières, vérification sur les listes officielles |
| E-mail, téléphone | Réponse à votre demande, contact par l'administration |
| Voyage et déclaration sanitaire | Instruction de la demande, santé publique |
| Données de la puce (app iPhone) | Seuls la MRZ de la puce, le résultat de l'authentification et le protocole sont transmis ; **la photo de la puce reste sur votre iPhone** |
| Biométrie eGate | Capturée au guichet lors du premier passage, avec votre consentement |

Les données sont conservées pendant la durée fixée par l'administration (5 ans dans la configuration par défaut). Chaque consultation et décision est tracée dans un journal d'audit.

## Changer de langue

Le portail est disponible en **français** et en **anglais**. Par défaut, il suit la langue de votre navigateur ; utilisez le sélecteur **FR / EN** de l'en-tête pour changer de langue. Votre choix est mémorisé sur votre appareil. Le bouton en forme de lune ou de soleil bascule entre thème clair et thème sombre.
