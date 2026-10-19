# Plateforme des compagnies aériennes

La **plateforme des compagnies aériennes** (`/compagnies/`) est l'espace WawID réservé au personnel des compagnies qui desservent le Sénégal. Elle permet de :

- transmettre les données passagers **API** (UN/EDIFACT PAXLST) et **PNR** aux autorités, à la main ou de système à système ;
- lire les **accusés de réception** et corriger les messages rejetés ;
- suivre, vol par vol, la **complétude** des données et le respect des **délais** ;
- consulter les factures de la **redevance de sécurité** et **déclarer les paiements** ;
- retrouver la documentation d'**intégration API** de la passerelle.

Chaque compte est rattaché à **une seule compagnie** (son code IATA) et ne voit que les vols, messages et factures de cette compagnie. Le résultat des contrôles effectués par les autorités sur les passagers n'est **jamais** affiché (voir « Ce qui n'est pas communiqué »).

> **Démonstrateur.** Dans la version de démonstration, les vols, passagers, factures et paiements sont fictifs. Ne transmettez jamais de données passagers réelles au démonstrateur.

## Les plateformes WawID

WawID comprend quatre plateformes distinctes. Un compte n'ouvre que la plateforme de son profil.

| Plateforme | Adresse | Pour qui |
| --- | --- | --- |
| Plateforme des compagnies aériennes | `/compagnies/` | Personnel des compagnies aériennes (opérations, finances, informatique) |
| Espace DPAF | `/dpaf/` | Agents, analystes, superviseurs, agents du Trésor, administrateurs |
| Plateforme voyageurs | `/` et `/aide/` | Voyageurs (public) |
| Applications mobiles | `/app/` | Voyageurs (Android et iPhone) |

Un compte compagnie est refusé sur l'espace DPAF (« Ce compte est un compte compagnie : connectez-vous sur la plateforme des compagnies aériennes. ») ; un compte de la DPAF est refusé sur la plateforme des compagnies (« Ce compte n'ouvre pas la plateforme des compagnies aériennes. »).

## Accès et connexion

### Obtenir un compte

Les comptes sont créés par un administrateur WawID (rôle **Compagnie aérienne**, rattaché au code IATA de votre compagnie). Adressez votre demande à WawID par le canal convenu lors du raccordement, en indiquant le nom et la fonction de chaque utilisateur. Le mot de passe initial compte au moins 10 caractères ; il vous est remis par un canal sûr.

La **clé de passerelle** (`X-Carrier-Key`), utilisée par vos systèmes pour la transmission automatique, est distincte des comptes utilisateurs. Elle est également délivrée par WawID.

### Se connecter

1. Ouvrez `/compagnies/` dans un navigateur récent.
2. Saisissez votre **Identifiant** et votre **Mot de passe**.
3. Cliquez sur **Se connecter**.

Le nom et le code de votre compagnie s'affichent sous le logo. Une session dure **12 heures** ; ensuite, reconnectez-vous. Pour vous déconnecter, utilisez le bouton de sortie à droite de votre nom. Le sélecteur **FR | EN** change la langue de l'interface et le bouton lune bascule le thème sombre.

Toutes les actions (connexions, échecs de connexion, transmissions, déclarations de paiement) sont inscrites au journal d'audit de WawID.

> **Démonstration** : les comptes `airsenegal` (Air Sénégal, HC) et `airfrance` (Air France, AF) sont créés automatiquement avec le mot de passe de démonstration (`demo` en local).

### Les écrans

| Menu | Contenu |
| --- | --- |
| **Tableau de bord** | Indicateurs des 30 derniers jours, derniers messages, prochaines échéances de redevance |
| **Transmettre** | Envoi manuel d'un message PAXLST ou PNR et accusé de réception |
| **Messages** | Journal de tous les messages reçus de votre compagnie |
| **Vols** | Données reçues par vol : sources, délais, complétude, données manquantes par passager |
| **Redevance** | Factures de la redevance de sécurité et déclaration des paiements |
| **API** | Intégration de système à système (passerelle) et référence API |

## Tableau de bord

Les indicateurs portent sur les **30 derniers jours** :

| Indicateur | Signification |
| --- | --- |
| **Vols transmis** | Nombre de vols de votre compagnie ayant reçu des données, et nombre de passagers |
| **Transmis dans les délais** | Part des vols dont tous les messages sont arrivés dans les délais (API au départ, PNR à H-24) |
| **Complétude des données** | Part des passagers ayant un numéro de document, une date de naissance et une nationalité |
| **Messages rejetés** | Messages rejetés, sur le nombre de messages reçus |
| **Redevance restant due** | Total restant dû, pénalités comprises, et nombre de factures en retard |

Les objectifs suivis par la DPAF sont de **95 %** des vols transmis dans les délais et de **98 %** de complétude. En dessous, la compagnie est classée « À relancer » dans le suivi de conformité des transporteurs.

Le tableau de bord affiche aussi les **Derniers messages** (cliquez sur une ligne pour lire l'accusé de réception) et les **Prochaines échéances** de redevance. Le bouton **Transmettre un message** ouvre l'écran d'envoi.

## Transmettre des données passagers

En exploitation, la transmission se fait de système à système par la passerelle (voir « Intégration API »). L'écran **Transmettre** sert aux envois ponctuels, aux corrections et aux essais.

1. Choisissez le **Format** : **Détection automatique**, **PAXLST (API)** ou **PNR**.
2. Collez le message dans le champ **Message**, ou cliquez sur **Charger un fichier** (`.edi`, `.txt`, `.pnr`).
3. Pour un essai, cliquez sur **Exemple PAXLST** ou **Exemple PNR** : un message type, adapté au code de votre compagnie, remplit le champ.
4. Cliquez sur **Transmettre**.

L'**accusé de réception** s'affiche à droite de l'écran.

Le message ne peut porter que sur un vol de **votre** compagnie : un message relatif au vol d'une autre compagnie est rejeté. Les messages API et PNR d'un même vol sont fusionnés (rapprochement par numéro de document, à défaut par nom) : un nouveau message peut donc compléter un envoi précédent.

### Lire un accusé de réception

| Champ | Contenu |
| --- | --- |
| **Statut** | **ACCEPTÉ**, **ACCEPTÉ AVEC AVERTISSEMENTS** ou **REJETÉ** |
| **Référence** | Référence `MSG-…` du message ; conservez-la pour tout échange avec WawID ou la DPAF |
| **Format** | `PAXLST` ou `PNR` |
| **Vol** | Vol reconnu dans le message |
| **Passagers** | Nombre de passagers lus dans le message |
| **Complétude** | Part des passagers du message ayant numéro de document, date de naissance et nationalité |
| **Délai** | **Dans les délais** ou **Transmission tardive** |
| **Reçu le** | Date et heure de réception |
| **Erreurs et avertissements** | Anomalies relevées (par exemple « passager 2 sans SSR DOCS ») |

| Statut | Signification | Que faire |
| --- | --- | --- |
| **ACCEPTÉ** | Message intégré sans anomalie | Rien |
| **ACCEPTÉ AVEC AVERTISSEMENTS** | Message intégré, mais des données manquent ou sont incomplètes | Compléter les données dans un nouveau message |
| **REJETÉ** | Format non reconnu, vol absent, aucun passager, ou vol d'une autre compagnie | Corriger le message et le renvoyer |

L'accusé de réception ne contient **aucun** résultat de contrôle : ni passager signalé, ni score.

## Messages

L'écran **Messages** liste tous les messages reçus de votre compagnie, qu'ils viennent de la passerelle ou de l'écran **Transmettre** : **Reçu le**, **Référence**, **Format**, **Vol**, **Passagers**, **Complétude**, **Statut** (avec la mention **transmission tardive** le cas échéant). Cliquez sur une ligne pour relire l'accusé de réception complet, erreurs comprises.

## Vols et complétude des données

L'écran **Vols** présente, pour chaque vol de votre compagnie : **Vol**, **Trajet**, **Date**, **Sens** (**Arrivée** ou **Départ**), **Sources** (`API`, `PNR` ou `API + PNR`), **Passagers**, **Complétude** et **Délai** (**Dans les délais** ou **transmission tardive**).

Cliquez sur un vol pour afficher la liste des passagers : **Passager**, **Document**, **Nationalité**, **Siège** et **Données manquantes**. Un passager est complet lorsqu'il a un **N° de document**, une **Date de naissance** et une **Nationalité** ; sinon, les champs manquants sont indiqués. Envoyez un nouveau message pour les compléter : il sera fusionné avec les données déjà reçues.

## Délais de transmission

| Donnée | Pratique attendue | Contrôle appliqué par WawID |
| --- | --- | --- |
| PNR | À H-48 puis à H-24 avant le départ ; mises à jour possibles jusqu'à la fermeture du vol | Reçu au plus tard 24 h avant l'heure prévue du vol |
| API (PAXLST) | À la clôture de l'enregistrement, au plus tard à la fermeture des portes | Reçu au plus tard à l'heure de départ du vol |

Un seul message hors délai suffit à marquer le vol **transmission tardive**. Le message est néanmoins intégré.

## Redevance de sécurité

La redevance de sécurité est de **12 USD par passager embarqué ou débarqué** sur vol commercial international (décret n° 2011-652). Elle est **perçue dans le prix du billet** puis reversée chaque mois par la compagnie.

### Factures

Une facture est émise par compagnie et par mois, le **10 du mois suivant** (référence `RS-AAAAMM-XX`, où `XX` est votre code IATA). Elle est payable **à la fin du mois suivant** la période.

**Montant** = passagers déclarés × 12 USD × taux IATA du mois (FCFA pour 1 USD), arrondi au franc. Le détail du calcul s'affiche en ouvrant la facture.

**Pénalité de retard** : 5 % du reste dû par mois de retard entamé après l'échéance.

L'écran **Redevance** affiche trois indicateurs (**Restant dû (pénalités comprises)**, **Paiements déclarés en attente de validation**, **Factures en retard**) et le tableau des factures : **Mois**, **Facture**, **Passagers déclarés**, **Montant**, **Payé** (et montant **à valider**), **Reste dû** (dont pénalité), **Échéance**, **Statut**.

| Statut de la facture | Signification |
| --- | --- |
| **ÉMISE** | Aucun paiement validé, échéance non atteinte |
| **PARTIELLE** | Paiement partiel validé |
| **PAYÉE** | Facture soldée |
| **EN RETARD** | Reste dû après l'échéance ; la pénalité s'applique |

Seuls les paiements **validés** soldent une facture : un paiement déclaré mais pas encore validé ne change pas le statut.

### À qui payer

Le bénéficiaire des paiements est affiché en haut de l'écran **Redevance** et dans chaque facture :

- **WawID — compte de collecte de la redevance de sécurité** : circuit en vigueur dans WawID. WawID reverse ensuite la **part de l'État** au **Receveur général du Trésor (DGCPT)** ;
- **Receveur général du Trésor (DGCPT)** : si l'administration a retenu le circuit prévu par le décret n° 2012-519.

Les coordonnées bancaires du bénéficiaire ne figurent pas sur la plateforme : utilisez celles qui vous ont été notifiées officiellement. Indiquez la **référence de la facture** dans le libellé du virement.

> **Cadre juridique.** Le circuit « compagnies → WawID → Trésor public » diffère du cadre en vigueur : le décret n° 2012-519 confie le recouvrement à la DGCPT, et la décision du ministre de l'Économie et des Finances du 4 décembre 2012 prévoit que le Trésor verse la part de l'opérateur. Ce circuit suppose un nouveau texte réglementaire et une convention de mandat d'encaissement entre l'État et WawID. Payez toujours le bénéficiaire affiché par la plateforme.

### Déclarer un paiement

1. Effectuez le virement au bénéficiaire affiché, avec la référence de la facture dans le libellé.
2. Ouvrez **Redevance** et cliquez sur **Déclarer un paiement** sur la ligne de la facture.
3. Vérifiez le **Montant (FCFA)**, prérempli avec le reste dû (pénalités comprises, moins les paiements déjà déclarés).
4. Choisissez le **Mode** : **Virement**, **SWIFT**, **Mobile money** ou **Chèque**.
5. Saisissez la **Référence du virement** (obligatoire).
6. Cliquez sur **Déclarer le paiement**.

Le paiement apparaît **À valider**. Le service financier le **valide** après rapprochement avec le relevé bancaire du compte de collecte, ou le **rejette** avec un motif (par exemple « Non retrouvé sur le relevé du compte de collecte »).

| Statut du paiement | Signification | Que faire |
| --- | --- | --- |
| **À valider** | Déclaré, en attente de rapprochement bancaire | Attendre la validation |
| **Validé** | Rapproché avec le relevé ; pris en compte dans la facture | Rien |
| **Rejeté** | Non retrouvé ou incorrect ; le motif est affiché | Vérifier le virement et déclarer à nouveau avec la bonne référence |

Lorsque le reste dû est entièrement couvert par un paiement déclaré, le bouton devient **Détail** et la facture indique que le paiement est en attente de validation. Un paiement déclaré ne peut pas être modifié depuis la plateforme : en cas d'erreur, contactez WawID avec la référence de la facture.

## Intégration API (passerelle)

L'écran **API** décrit la transmission automatique de système à système et affiche la page *Référence API (compagnies, équipements, connecteurs)*.

```http
POST /api/carrier/messages
X-Carrier-Key: <clé délivrée par WawID>
Content-Type: text/plain
```

| Réponse | Signification |
| --- | --- |
| **202** | Message accepté ; accusé de réception (référence, vol, passagers, complétude, délai, avertissements) |
| **422** | Message rejeté ; l'accusé contient la référence et les erreurs |
| **401** | Clé de passerelle invalide |
| **400** / **413** | Message vide ou JSON invalide / message de plus de 2 Mo |

La clé de passerelle est propre à votre compagnie et liée à son code IATA : elle ne permet de transmettre que vos vols. Demandez-la, ou faites-la renouveler en cas de doute sur sa confidentialité, auprès de WawID. Les messages reçus par la passerelle apparaissent aussi dans les écrans **Messages** et **Vols** de la plateforme.

## Ce qui n'est pas communiqué

Conformément aux règles applicables aux données API et PNR, **le résultat des contrôles effectués par les autorités n'est pas communiqué aux transporteurs** :

- ni sur la plateforme (tableau de bord, messages, vols, liste des passagers) ;
- ni dans l'accusé de réception de la passerelle (pas de nombre de passagers signalés, pas d'identifiant interne de vol) ;
- ni score de risque, ni motif, ni alerte.

Ce cloisonnement protège la confidentialité des listes de surveillance et des enquêtes, évite d'alerter une personne recherchée et garantit que les données passagers ne servent qu'aux autorités habilitées. Pour la même raison, la documentation interne de la DPAF (renseignement, score de risque, exploitation) n'est pas accessible aux comptes compagnie ; seules les pages publiques du centre d'aide le sont.

Si un passager doit faire l'objet d'une mesure, la DPAF intervient directement à la frontière ; la compagnie n'a aucune action à engager à partir de la plateforme.

## Questions fréquentes

| Question | Réponse |
| --- | --- |
| Je ne vois pas un vol | Seuls les vols dont le numéro commence par votre code IATA et pour lesquels un message a été reçu apparaissent. Vérifiez l'accusé de réception du message. |
| Mon message est rejeté pour « vol d'une autre compagnie » | Le vol du message ne correspond pas au code IATA de votre compte ou de votre clé. |
| Un paiement reste « À valider » | Le rapprochement bancaire n'a pas encore eu lieu. Vérifiez que la référence du virement et la référence de facture sont correctes. |
| Un collègue a besoin d'un accès | Demandez la création d'un compte à WawID ; ne partagez jamais vos identifiants. |
| Je dois modifier un message déjà envoyé | Envoyez un nouveau message corrigé : il est fusionné avec les données déjà reçues pour le vol. |
