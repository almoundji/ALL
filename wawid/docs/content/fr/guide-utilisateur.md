# Guide utilisateur par profil

Ce guide décrit, profil par profil, ce que chaque utilisateur de WawID voit et fait au quotidien dans les postes frontière du Sénégal : agent de la Police de l'Air et des Frontières (DPAF) au guichet, superviseur des eGates, analyste du renseignement, superviseur de poste, administrateur, agent du Trésor, compagnie aérienne et voyageur. Il se concentre sur les procédures ; le détail de chaque écran figure dans les pages spécialisées du centre d'aide, citées en italique (par exemple *Contrôle guichet (MRZ, puce NFC, biométrie)*).

> **Démonstrateur.** La version actuellement en ligne est un démonstrateur : les données sont fictives, la biométrie et les paiements sont simulés et la lecture de puce est simulée tant qu'aucun lecteur réel n'est raccordé. Ne saisissez jamais de données personnelles réelles dans le démonstrateur. Les procédures ci-dessous sont celles prévues pour l'exploitation ; elles se pratiquent à l'identique sur le démonstrateur pour la formation.

## Démarrage rapide

Chaque utilisateur de l'espace DPAF (`/dpaf/`) a **un seul rôle**, attribué par l'administrateur. Le rôle détermine les tuiles visibles sur la page d'accueil et les actions autorisées.

| Profil | Rôle WawID | Tuiles principales | Pages de référence |
| --- | --- | --- | --- |
| Agent DPAF au guichet | Agent de contrôle | **Nouveau contrôle**, **Contrôle guichet**, **Vérifier un QR**, **Passages**, **Recherche voyageur**, **Threat Monitor**, **Dossiers** | *Contrôle guichet (MRZ, puce NFC, biométrie)* ; *Passages, recherche voyageur, QR et véhicules* |
| Superviseur des eGates | Superviseur | **eGates & ABC**, **Kiosque eGate**, **Supervision systèmes**, **Passages** | *eGates et kiosques ABC* ; *Kiosque eGate : mise en service et parcours* |
| Analyste renseignement | Analyste renseignement | **Threat Monitor**, **Dossiers**, **Listes de surveillance**, **Règles de ciblage**, **Connecteurs**, **Vols annoncés**, **e-Visa** | *Threat Monitor, dossiers, listes, règles et connecteurs* ; *APIS et PNR* ; *e-Visa, WawPass et pré-enrôlements* |
| Superviseur de poste (chef de vacation) | Superviseur | **Tableau de bord**, **Threat Monitor**, **Dossiers**, **eGates & ABC**, **Contrôle guichet**, **Journal d'audit** | *Tableau de bord* ; *Comprendre le score de risque* |
| Administrateur | Administrateur | **Utilisateurs & rôles**, **Créer un utilisateur**, **Paramètres**, **Journal d'audit**, **Supervision systèmes**, **Connecteurs** | *Administration (équipements, utilisateurs, audit, paramètres)* ; *Déploiement et configuration* |
| Agent du Trésor | Agent du Trésor (redevance) | **Redevance de sécurité**, **Factures compagnies**, **Paiements à valider**, **Reversements à l'État**, **Rapprochement**, **Répartition** | *Redevance de sécurité* |
| Compagnie aérienne | Compagnie aérienne (compte rattaché à un code IATA) et clé de passerelle | Plateforme des compagnies (`/compagnies/`) : **Tableau de bord**, **Transmettre**, **Messages**, **Vols**, **Redevance**, **API** ; pas d'accès à l'espace DPAF ; transmission automatique à `/api/carrier/messages` | *Plateforme des compagnies aériennes* ; *Référence API (compagnies, équipements, connecteurs)* |
| Voyageur | Aucun compte | Portail voyageur (`/`), application mobile WawID e-Visa (iPhone et Android) | *Guide du voyageur (portail et app iPhone)* |

Un même agent peut avoir besoin de deux profils (par exemple un superviseur qui supervise aussi les eGates) : le rôle **Superviseur** couvre les deux. Le rôle **Analyste renseignement** ne permet pas de contrôle au guichet ; le rôle **Agent du Trésor (redevance)** ne donne accès à aucune action de contrôle.

## Premier jour : liste de contrôle

Avant votre première vacation sur WawID, vérifiez les points suivants avec votre chef de poste ou l'administrateur.

1. Vous avez reçu votre **Identifiant** et un **mot de passe initial** par un canal remis en main propre (jamais par un message partagé).
2. Vous vous connectez sur `/dpaf/` et la page d'accueil affiche « Bonjour » suivi de votre prénom.
3. Votre **rôle** et votre **poste** affichés dans le menu de l'avatar sont corrects (par exemple « Agent de contrôle », poste AIBD). Sinon, signalez-le à l'administrateur avant toute opération : le poste est enregistré avec chaque passage.
4. Le point devant le nom du poste, dans la barre supérieure, est **vert** (connecté).
5. Vous retrouvez les tuiles de votre profil (voir le tableau ci-dessus) dans **Mon accueil**.
6. Pour un guichet : **Paramètres → Lecteur NFC de ce poste → Tester** répond « Connecté » avec le nom du lecteur (le test est fait par l'administrateur ou le technicien, car la page **Paramètres** lui est réservée). Si le test répond « Pont injoignable — lecture simulée », le poste n'est pas prêt pour l'exploitation.
7. Le navigateur a l'autorisation d'utiliser la **caméra** du poste (demandée au premier clic sur **Activer la caméra**).
8. Vous savez ouvrir l'aide contextuelle avec le bouton **?** et changer de langue avec **FR | EN**.
9. Vous avez réalisé au moins un contrôle complet en formation avec les **Scénarios de démonstration** (passeport valide, notice rouge, passeport volé, puce clonée).
10. Vous connaissez le numéro d'astreinte de votre poste et la chaîne d'escalade (voir la fin de ce guide).

## Règles communes à tous les profils

- **Compte personnel** : votre compte est nominatif. Toutes vos actions sont inscrites au **Journal d'audit** (connexions, décisions, consultations sensibles, modifications). Ne prêtez jamais votre compte et ne travaillez jamais sous la session d'un collègue.
- **Session de 12 heures** : la session couvre une vacation. Déconnectez-vous en fin de service (avatar → **Se déconnecter**) ; sur un poste partagé, faites-le à chaque changement d'agent.
- **Mot de passe** : il n'existe pas de changement de mot de passe en libre-service dans cette version. Pour en changer (oubli, suspicion de compromission), adressez-vous à l'administrateur, qui le réinitialise dans **Utilisateurs & rôles**.
- **Recherche rapide** : touche **/** ou **Ctrl + K** pour rechercher un voyageur, un document ou une application.
- **Notifications** : la cloche indique le nombre d'alertes nouvelles ; les données se rafraîchissent toutes les 30 secondes.
- **Décisions motivées** : toute décision différente de la recommandation de WawID exige un motif écrit. Le motif doit être factuel et compréhensible par un tiers (pas d'abréviation interne).
- **Discrétion** : une orientation ou une correspondance n'est pas une accusation. Ne communiquez jamais au voyageur le contenu d'une liste de surveillance ni le score de risque.

## Agent DPAF au guichet

### Ce que vous voyez

Avec le rôle **Agent de contrôle**, l'accueil affiche l'espace **Contrôle frontière** (Tableau de bord, Contrôle guichet, eGates & ABC, Passages, Recherche voyageur, Vérifier un QR, Véhicules (VRS), tuile **Nouveau contrôle**) et, dans **Renseignement**, le **Threat Monitor** et les **Dossiers**. Vous pouvez consulter les listes de surveillance et les règles, mais pas les modifier.

### Prise de service

1. Connectez-vous sur `/dpaf/` et vérifiez votre poste dans la barre supérieure.
2. Ouvrez le **Threat Monitor**, onglet **Nouvelles**, pour prendre connaissance des alertes en cours sur votre poste (par exemple les passagers signalés d'un vol attendu).
3. Vérifiez auprès du chef de vacation les consignes du jour (vols à surveiller, eGates fermées, sources indisponibles).
4. Faites un contrôle d'essai si le chef de poste le demande (scénario **Passeport valide**) pour vérifier lecteur, puce et caméra, sans valider la décision.

### Contrôler un voyageur

1. Cliquez sur **Nouveau contrôle**.
2. Choisissez le sens (**Entrée** ou **Sortie**), vérifiez le poste et renseignez **Vol / navire / véhicule** et la provenance ou la destination.
3. Présentez le document au lecteur : la MRZ s'inscrit dans le champ prévu. Vérifiez que tous les **Chiffres de contrôle ICAO 9303** sont **Valides**.
4. Pour un passeport biométrique, cliquez sur **Lire la puce** et laissez le document sur le lecteur jusqu'au résultat. Vérifiez **Authentification passive : valide** et **Puce ↔ MRZ imprimée : concordantes**.
5. Cliquez sur **Capturer la biométrie**, puis **Activer la caméra**. Cadrez le visage de face, sans lunettes de soleil ni couvre-chef, et cliquez sur **Capturer**.
6. Capturez les empreintes (**Capturer tout**) selon les consignes du poste ; l'iris est facultatif.
7. Cliquez sur **Lancer les vérifications**. Lisez chaque ligne (**OK**, **Attention**, **Alerte**) et le panneau **Évaluation du risque**.
8. Cliquez sur **Décider**. La décision recommandée est présélectionnée : **Autoriser**, **Contrôle secondaire** ou **Refuser**.
9. Si vous choisissez une autre décision, saisissez le **Motif** (obligatoire). Ajoutez des **Observations** si utile.
10. Vérifiez le récapitulatif et cliquez sur **Valider la décision**. La fiche du passage (`PX-…`) s'ouvre.
11. Si le voyageur présente un e-Visa ou un reçu WawPass, ouvrez **Vérifier un QR** (bouton du contrôle guichet), scannez le QR et comparez le titulaire et le numéro de document avec le passeport.

### Situations courantes

| Situation | Ce que vous voyez | Que faire |
| --- | --- | --- |
| Correspondance sur une liste de surveillance (notice Interpol, FPR, WAPIS, POI) | Ligne **Alerte** dans les vérifications ; recommandation « Refuser et retenir — escalade superviseur » si la gravité est critique | Ne rien laisser paraître au voyageur. Ne validez pas seul : appelez le superviseur. Choisissez **Contrôle secondaire** ou **Refuser** selon ses instructions, motivez, puis **Ouvrir un dossier** depuis la fiche du passage. |
| Homonyme probable | Correspondance nominative, mais date de naissance ou nationalité différente | Vérifiez l'identité complète (date et lieu de naissance, filiation si disponible). Si le doute est levé, l'analyste ou vous-même clôturez l'alerte avec la résolution « Fausse alerte — homonyme ». |
| Document signalé perdu ou volé (SLTD) | Ligne **Interpol SLTD** en **Alerte** ; recommandation de refus | Conservez le document conformément aux instructions de service, appelez le superviseur, choisissez **Refuser** et ouvrez un dossier. |
| Puce illisible | **Puce électronique (NFC)** : « Non lue au guichet » (Attention) | Repositionnez le document (page de données à plat, sans étui), relancez **Lire la puce**. Si la lecture échoue encore, examinez les sécurités physiques du document et mentionnez l'échec dans les **Observations**. Une puce illisible seule n'est pas une preuve de fraude. |
| Authentification passive en échec, ou puce différente de la MRZ | **Authentification passive : échec** ou **Puce ↔ MRZ imprimée : différentes** | Indice fort de puce clonée ou de page biographique altérée : **Contrôle secondaire**, appel du superviseur, dossier. |
| Chiffres de contrôle MRZ invalides | Mention **Invalide** sur un ou plusieurs chiffres | Relisez le document (lecture abîmée, reflet). Si la MRZ imprimée est réellement incohérente, traitez comme un document suspect. |
| Lecture de puce « (simulé) » sur un poste d'exploitation | Le panneau NFC porte la mention « (simulé) » | Le pont NFC du poste est arrêté ou mal configuré. Prévenez immédiatement le support technique ; en attendant, appliquez la consigne de mode dégradé du poste (contrôle visuel renforcé). |
| Voyageur orienté par une eGate | Le voyageur se présente avec un message de la porte | Faites un contrôle normal. Le motif de l'orientation figure sur le passage eGate (canal **eGate / ABC**, motif préfixé « eGate : ») dans **Passages**. La plupart des orientations ont une cause simple (mineur, puce abîmée, éclairage, passeport expiré). |
| Voyageur soumis à visa sans e-Visa | **Autorisation de voyage (e-Visa)** en Attention ou Alerte | Vérifiez si le voyageur a une référence `EV…` (recherche dans **Recherche voyageur** ou **e-Visa**). Sans autorisation valide, appliquez la réglementation en vigueur et les consignes du chef de poste. |
| QR e-Visa refusé | « QR code invalide ou falsifié » ou statut non approuvé | Un QR modifié est un faux document : contrôle secondaire. Un e-Visa non approuvé ou échu n'autorise pas l'entrée. |
| WawPass « Reçu déjà utilisé » | Résultat **Non valide** | Le reçu a déjà été présenté. Vérifiez dans **WawPass & enrôlements** à quelle date ; ne vérifiez un reçu qu'au moment du contrôle effectif. |
| Caméra indisponible | Message d'absence de caméra ; capture simulée | Vérifiez le branchement et l'autorisation du navigateur. Ne validez pas de passage en production avec une capture simulée : prévenez le support. |
| Sources indisponibles | Bandeau **Sources indisponibles** | Le contrôle est fait sur la copie locale des listes. Poursuivez, et signalez la panne au superviseur si elle dure. |

### Fin de vacation

1. Terminez ou transmettez les dossiers que vous avez ouverts (onglet **Dossiers**, statut **Ouvert**).
2. Ajoutez une **Note** aux alertes que vous avez prises en charge sans les clôturer, pour le collègue suivant.
3. Déconnectez-vous.

## Superviseur des eGates

### Ce que vous voyez

Le rôle **Superviseur** affiche l'application **eGates & ABC** avec les boutons de commande (**Fermer**, **Ouvrir**, **Remettre en service**, redémarrage, **Passer en maintenance**, **Paramètres**). Les indicateurs **Ouvertes**, **Alarmes**, **Transactions 24 h**, **Taux d'orientation guichet** et **Durée moyenne** résument l'état du parc ; les panneaux **Flux en direct** et **Motifs d'orientation (24 h)** montrent l'activité.

### Ouverture des portes

1. Ouvrez **eGates & ABC** et filtrez sur votre poste (liste **Tous les postes**).
2. Pour chaque carte, vérifiez le statut **En service**, le mode automatique, le dernier signal de vie (heartbeat) et l'état des périphériques (**Lecteur**, **Caméra**, **Empreintes**, **Portes** en vert).
3. Vérifiez visuellement chaque kiosque : écran d'accueil affiché, nom de l'équipement correct en haut à droite.
4. Ouvrez les portes fermées la veille avec **Ouvrir** (ou **Remettre en service** pour un équipement en maintenance) une fois l'agent d'assistance en place.
5. Faites passer un voyageur test ou un agent volontaire si la consigne du poste le prévoit.

### Pendant le service

1. Surveillez le **Taux d'orientation guichet** et les **Motifs d'orientation (24 h)**. Une hausse soudaine d'un motif signale souvent un problème matériel (caméra, éclairage, lecteur).
2. Traitez sans délai toute carte en **Alarme** : passez l'équipement en maintenance (bouton cadenas), prévenez le technicien, orientez les voyageurs vers les guichets.
3. En cas d'afflux aux guichets ou d'incident, fermez une porte avec **Fermer** : le kiosque applique la fermeture en moins de 15 secondes, sans interrompre le voyageur en cours.
4. Toute modification des paramètres passe par **Paramètres → Appliquer à distance** et est journalisée. Ne modifiez les seuils que sur instruction écrite de la hiérarchie.

### Situations courantes

| Situation | Que faire |
| --- | --- |
| Carte en **Alarme** (caméra, portes) | **Passer en maintenance**, intervention technique, puis **Remettre en service** après essai. |
| Kiosque affichant « Serveur WawID injoignable » | Vérifier le réseau du kiosque, recharger la page ; si la panne persiste, fermer la porte et prévenir le support. |
| Kiosque affichant « Clé refusée par le serveur » | La clé d'équipement a changé ou est erronée : la faire ressaisir par le technicien habilité. Ne communiquez jamais la clé à un agent non habilité. |
| Beaucoup d'orientations « La puce de votre passeport n'a pas pu être vérifiée » | Vérifier le lecteur de documents et le pont NFC du kiosque ; si le problème est général, fermer la porte. |
| Beaucoup d'orientations « Votre visage ne correspond pas suffisamment… » | Vérifier l'éclairage et la propreté de la caméra avant toute discussion sur le seuil facial (82 % par défaut). |
| File devant une porte en mode fermé | Vérifier qu'une signalétique oriente vers les guichets ; rouvrir dès que possible. |

Rappel : le score de risque maximal d'une porte ne peut que durcir la politique ; une eGate n'ouvre jamais en cas de correspondance sur liste, de document SLTD ou de recommandation autre que « autoriser ».

## Analyste renseignement

### Ce que vous voyez

Le rôle **Analyste renseignement** donne accès à l'espace **Renseignement** (Threat Monitor, Dossiers, Listes de surveillance, Règles de ciblage, Connecteurs, tuile **Ajouter une entrée**), à l'espace **APIS & PNR** (Vols annoncés, Passerelle transporteurs, Conformité transporteurs, **Recevoir un message**) et à l'espace **e-Visa & voyageurs**. Il ne permet pas le contrôle au guichet.

### Routine quotidienne

1. **Threat Monitor**, onglet **Nouvelles** : prenez en charge les alertes par ordre de gravité (**Critique**, **Haute**, **Moyenne**) avec **Prendre en charge**.
2. Pour chaque alerte : lisez les **Facteurs**, ouvrez le passage ou le vol lié, consignez vos vérifications avec **Note**, puis **Ouvrir un dossier** ou **Clôturer** avec une **Résolution**.
3. **Vols annoncés** : ouvrez les vols des prochaines heures, examinez les passagers signalés (score de 30 ou plus) et transmettez au chef de vacation la liste des passagers à contrôler à l'arrivée.
4. **Conformité transporteurs** : repérez les compagnies **À relancer** (ponctualité inférieure à 95 % ou complétude inférieure à 98 %).
5. **e-Visa**, onglet **À instruire** : instruisez les demandes (voir ci-dessous).
6. **Listes de surveillance** et **Règles de ciblage** : mettez à jour les entrées et règles selon les instructions reçues, en renseignant toujours la **Référence** et le **Motif**.
7. **Connecteurs** : en début de vacation, cliquez sur **Tester** pour les sources connectées.

### Instruire une demande d'e-Visa

1. Ouvrez la demande depuis l'onglet **À instruire**.
2. Examinez le pré-contrôle automatique, le champ **Puce (NFC)** (**Passeport authentifié**, **Vérification échouée** ou **Non lue**), la déclaration sanitaire et les **Passages antérieurs**.
3. Si une pièce manque, cliquez sur **Demander une information** et précisez la pièce attendue.
4. Décidez : **Approuver** (numéro `SN-EV-…`, validité 90 jours, QR signé) ou **Refuser** avec un motif, communiqué au demandeur.

### Situations courantes

| Situation | Que faire |
| --- | --- |
| Correspondance confirmée sur un passager annoncé (APIS) | Ouvrez un dossier, informez le chef de vacation du poste d'arrivée avec le vol et le siège ; aucune information n'est renvoyée à la compagnie. |
| Homonyme | Clôturez avec « Fausse alerte — homonyme » et précisez l'élément discriminant (date de naissance, nationalité). |
| Réseau d'identités en e-Visa (coordonnées ou appareil partagés) | Recherchez les demandes liées dans l'onglet **Toutes**, demandez des pièces ou refusez avec motif, faites inscrire la coordonnée sur la liste noire. |
| Demande d'information sans réponse | La demande reste **Info. demandée** ; le demandeur répond depuis le portail. Suivez l'onglet **Info. demandée** et relancez selon la procédure du service. |
| Message PAXLST arrivé en retard | Le vol porte la mention **transmission tardive** ; le pré-contrôle est quand même recalculé. Signalez les retards répétés pour relance de la compagnie (onglet **Conformité transporteurs**). |
| Message rejeté par la passerelle | Ouvrez le message dans **Passerelle transporteurs** et lisez les erreurs (format inconnu, vol absent, vol d'une autre compagnie). Prévenez le correspondant technique de la compagnie. |
| Transporteur non raccordé | Chargez son manifeste avec **Manifeste CSV** (format `siège;nom;prénoms;naissance;nationalité;document;expiration`). |
| Connecteur injoignable | Les contrôles se poursuivent sur la copie locale ; prévenez l'administrateur, qui vérifie l'URL et le jeton du connecteur. |

## Superviseur de poste (chef de vacation)

### Ce que vous voyez

Le rôle **Superviseur** cumule les droits de l'agent et de l'analyste et le pilotage des eGates. Il ne donne pas accès à la gestion des utilisateurs, aux paramètres système ni au module finances.

### Procédure de vacation

1. **Prise de poste** : ouvrez le **Tableau de bord** filtré sur votre poste, puis le **Threat Monitor** (alertes ouvertes) et **eGates & ABC** (état du parc).
2. Répartissez les agents par guichet ; vérifiez que chacun est connecté avec son propre compte et le bon poste.
3. Diffusez aux agents la liste des passagers signalés des vols attendus (préparée par l'analyste).
4. **Pendant le service**, traitez les escalades : les recommandations « Refuser et retenir — escalade superviseur » et toute correspondance critique doivent vous être présentées avant validation.
5. Contrôlez les décisions qui s'écartent de la recommandation (filtre **Décision** dans **Passages**) et la qualité des motifs saisis.
6. Suivez les dossiers ouverts et assurez la continuité des entretiens (**Entretien structuré**).
7. **Fin de vacation** : ouvrez le **Journal d'audit**, vérifiez la mention **Chaîne intègre** et reportez le début de l'empreinte de tête dans le rapport de vacation.

### Situations courantes

| Situation | Que faire |
| --- | --- |
| Escalade pour une notice rouge | Assurez-vous de l'identité, appliquez les instructions de service (BCN Interpol, procureur), consignez tout dans le dossier, clôturez l'alerte avec la résolution adaptée (« Remis à la police aux frontières », « Signalement transmis à Interpol (BCN) »…). |
| Agent qui ne peut plus se connecter | Session expirée (12 h) ou compte désactivé : faites vérifier par l'administrateur. |
| Panne réseau du poste | Appliquez la consigne de mode dégradé du poste et prévenez le support (voir « Continuité de service » ci-dessous). Dans le démonstrateur, il n'existe pas encore de mode hors ligne (prévu dans l'architecture cible). |
| Intégrité du journal d'audit rompue | Ne touchez à rien, notez le numéro d'entrée affiché et prévenez immédiatement l'administrateur et le responsable sécurité. |

## Administrateur

### Ce que vous voyez

Le rôle **Administrateur** dispose de tous les droits, dont **Utilisateurs & rôles**, **Paramètres** (permission `system`) et le module finances.

### Tâches courantes

1. **Créer un compte** : **Créer un utilisateur**, nom complet, identifiant (3 à 40 caractères), rôle, poste, mot de passe initial de 10 caractères au moins. Remettez le mot de passe initial en main propre.
2. **Changer un mot de passe** (oubli, départ, suspicion) : **Utilisateurs & rôles → Modifier**, saisissez un nouveau mot de passe, **Enregistrer**. C'est aussi ainsi que vous changez votre propre mot de passe.
3. **Désactiver un compte** (mutation, départ, suspension) : décochez **Compte actif**. La session en cours est coupée immédiatement. Un compte n'est jamais supprimé.
4. **Configurer un guichet** : sur le poste de travail, **Paramètres → Lecteur NFC de ce poste**, adresse du pont (par défaut `http://127.0.0.1:8765`), **Enregistrer**, **Tester**.
5. **Connecteurs** : activez ou désactivez une source (**Activer** / **Désactiver**) ; la configuration de l'URL et du jeton se fait côté serveur (variables d'environnement).
6. **Audit** : consultez régulièrement le **Journal d'audit** (connexions en échec, modifications d'utilisateurs, commandes eGate).
7. **Revue des habilitations** : au moins à chaque mouvement de personnel, vérifiez que chaque compte actif correspond à un agent en fonction et au bon rôle.

### Situations courantes

| Situation | Que faire |
| --- | --- |
| Agent muté d'un poste à un autre | **Modifier** le compte et changer le **Poste**. |
| Agent promu superviseur | Changer le **Rôle** ; l'effet est immédiat. |
| Clé eGate ou clé compagnie compromise | Générer une nouvelle clé, la mettre à jour côté serveur (voir *Guide d'installation — Sénégal*) et la redistribuer ; tracer l'incident. |
| Demande de « réinitialiser la démonstration » | Uniquement sur un environnement de démonstration, jamais en exploitation. |

## Agent du Trésor (redevance de sécurité)

### Ce que vous voyez

Le rôle **Agent du Trésor (redevance)** affiche l'espace **Finances** : **Redevance de sécurité** (synthèse), **Factures compagnies**, **Paiements à valider**, **Reversements à l'État**, **Rapprochement**, **Répartition** et **Simulateur de modèle**. Vous pouvez valider ou rejeter les paiements déclarés par les compagnies, enregistrer des encaissements et des reversements à l'État, et exporter ; vous ne pouvez pas modifier les paramètres de la redevance (taux, part opérateur, pénalité, taux IATA, circuit de recouvrement), réservés à l'administrateur.

Par défaut, WawID applique le circuit « compagnies → WawID → Trésor public » : les compagnies paient WawID (compte de collecte) et WawID reverse la part de l'État au Receveur général du Trésor. Ce circuit diffère du cadre en vigueur (décret n° 2012-519, décision du 4 décembre 2012) et suppose un nouveau texte réglementaire et une convention de mandat d'encaissement avec l'État ; voir *Redevance de sécurité*, « Circuit de recouvrement ».

### Calendrier mensuel

Le calendrier suit l'arrêté interministériel du 3 février 2012 ; les étapes de paiement dépendent du circuit de recouvrement :

1. **Du 1er au 9 du mois M+1** : collecte des statistiques (déclarations des compagnies et comptage WawID). Consultez **Assiette du mois en cours (WawID)** pour une première estimation.
2. **Le 10 du mois M+1** : émission des factures en FCFA au taux IATA du mois M. Vérifiez dans **Factures compagnies** que chaque compagnie a sa facture `RS-AAAAMM-XX`.
3. **Pendant le mois M+1** : les compagnies déclarent leurs virements sur leur plateforme ; dans **Paiements à valider**, rapprochez chaque déclaration du relevé du compte de collecte, puis **Valider** ou **Rejeter** (avec un motif). Dans le circuit `TRESOR`, enregistrez aussi l'encaissement à réception de chaque quittance du Receveur général du Trésor.
4. **Fin du mois M+1** : échéance. Les factures non soldées par des paiements validés passent **EN RETARD** ; la pénalité de 5 % par mois de retard s'applique au reste dû.
5. **Le 15 du mois M+2** (circuit `OPERATEUR`) : dans **Reversements à l'État**, enregistrez le virement de la part de l'État au Receveur général du Trésor avec sa référence.
6. **Chaque mois** : examinez l'onglet **Rapprochement** et exportez les données (**Exporter**) pour la comptabilité publique.

### Enregistrer un encaissement

Pour un paiement que la compagnie n'a pas déclaré sur sa plateforme :

1. Ouvrez **Factures compagnies** et cliquez sur la facture.
2. Dans **Enregistrer un encaissement (relevé du compte de collecte)** ou **Enregistrer un encaissement (quittance du Trésor)** selon le circuit, vérifiez le montant (prérempli avec le reste dû et les pénalités) et corrigez-le si le relevé ou la quittance porte un autre montant.
3. Saisissez la **Référence de quittance** exacte.
4. Cliquez sur **Enregistrer**.

### Situations courantes

| Situation | Que faire |
| --- | --- |
| Paiement partiel | Validez le paiement déclaré (ou enregistrez le montant réellement encaissé) : la facture passe **PARTIELLE** et le reste dû est conservé. |
| Paiement déclaré introuvable sur le relevé | **Rejetez**-le avec un motif précis ; la compagnie voit le motif et peut déclarer à nouveau avec la bonne référence. |
| Écart supérieur à 3 % entre comptage WawID et déclaration | La ligne apparaît en rouge dans **Rapprochement**. Constituez le dossier (mois, compagnie, écart, montant non facturé) pour le contrôle et le contentieux de la DGCPT. |
| Compagnie contestant une pénalité | Vérifiez la date d'échéance, les dates d'encaissement et le détail de la facture ; la décision relève de la DGCPT. |
| Erreur de saisie d'un encaissement | Un encaissement enregistré ne peut être ni modifié ni supprimé dans cette version (et un montant négatif est refusé). Ne ressaisissez pas : signalez l'erreur par écrit à l'administrateur et au comptable, avec la référence de la facture ; l'entrée reste visible dans le journal d'audit. |

> Dans le démonstrateur, les compagnies, montants et encaissements sont fictifs.

## Compagnie aérienne (transmission API et PNR)

Les compagnies n'ont pas accès à l'espace DPAF. Elles disposent de la **plateforme des compagnies aériennes** (`/compagnies/`), avec des comptes du rôle **Compagnie aérienne** rattachés à leur code IATA : transmission manuelle des messages, accusés de réception, complétude par vol, factures de redevance et déclaration des paiements (voir *Plateforme des compagnies aériennes*). Leurs systèmes transmettent aussi les messages à la passerelle transporteurs avec une clé propre, liée à leur code IATA.

### Raccordement

1. La compagnie désigne un correspondant technique et un correspondant sûreté.
2. L'administrateur crée ses comptes utilisateurs (rôle **Compagnie aérienne**, compagnie choisie dans la liste) et l'administration lui remet sa clé `X-Carrier-Key` par un canal sûr.
3. La compagnie envoie des messages d'essai (PAXLST et PNR) sur l'environnement indiqué par l'administration et vérifie la réponse **202** et la référence `MSG-…`.
4. L'analyste confirme la bonne réception dans **Passerelle transporteurs** (statut **ACCEPTÉ**, complétude).

### Transmission quotidienne

1. **PNR** : à H-48 puis à H-24 avant le départ prévu.
2. **API (PAXLST)** : à la clôture de l'enregistrement, au plus tard à la fermeture des portes.
3. Conservez la référence `MSG-…` de chaque accusé ; tous les accusés restent consultables dans l'écran **Messages** de la plateforme des compagnies.

### Situations courantes

| Réponse ou situation | Signification | Que faire |
| --- | --- | --- |
| 401 | Clé invalide | Vérifier la clé ; en cas de doute, demander une nouvelle clé. |
| 422 avec erreurs | Message rejeté (format, vol absent, aucun passager, vol d'une autre compagnie) | Corriger et renvoyer. |
| 202 avec avertissements | Message intégré avec anomalies (passager sans SSR DOCS…) | Compléter les données au prochain envoi. |
| Vol marqué « transmission tardive » | Message reçu hors délai | Revoir le calendrier d'envoi ; objectif de ponctualité : 95 % des vols. |
| Statut **À relancer** | Ponctualité inférieure à 95 % ou complétude inférieure à 98 % | Plan de correction avec l'administration. |

Aucun résultat de ciblage n'est renvoyé à la compagnie : ni sur la plateforme, ni dans l'accusé de réception de la passerelle (pas de nombre de passagers signalés).

## Voyageur

### Sur le portail (`/`)

1. Vérifiez si votre nationalité est dispensée de visa (**Ai-je besoin d'un visa ?**).
2. Si un e-Visa est requis, remplissez les 4 étapes (Identité avec la MRZ, Voyage, Santé, Paiement), donnez votre consentement et cliquez sur **Payer et soumettre**. Conservez la référence `EV…`.
3. Suivez la demande dans l'onglet **Suivi** (référence et numéro de passeport). Si le statut est **Info. demandée**, répondez dans **Votre réponse**.
4. Une fois l'e-Visa **Approuvé**, imprimez ou enregistrez le QR code et présentez-le avec le passeport à la frontière.
5. Le cas échéant, payez la taxe de sécurité dans l'onglet **WawPass** (QR à usage unique) et pré-enregistrez-vous pour les eGates dans l'onglet **eGate**.

### Avec l'application mobile WawID e-Visa (iPhone et Android)

L'application permet de déposer la demande en lisant la puce du passeport. Elle fonctionne sur **iPhone 7 ou plus récent (iOS 15.5 ou plus)** et sur **Android 7 ou plus récent équipé du NFC**.

1. **Scanner la MRZ** avec la caméra (ou la saisir). Les chiffres de contrôle doivent être valides : la MRZ sert de clé pour ouvrir la puce.
2. **Lire la puce** : passeport fermé à plat, approchez le haut de l'iPhone ou le dos du téléphone Android (zone NFC) de la couverture, ne bougez plus jusqu'au message de succès. L'application lit les données d'identité (DG1) et la photo (DG2) et vérifie leur intégrité par rapport à la signature de la puce (SOD).
3. **Compléter** les informations de séjour et la déclaration sanitaire.
4. **Payer et déposer** (paiement de démonstration dans la version actuelle). Conservez la référence.
5. **Suivre** la demande dans l'application : statut, messages et, après approbation, QR code à présenter. L'application est disponible en français et en anglais (sélecteur FR / EN).

### Situations courantes

| Situation | Que faire |
| --- | --- |
| « Chiffres de contrôle invalides » | Une faute de frappe dans la MRZ : vérifiez chaque caractère (0 et O, 1 et I, 8 et B). |
| La puce ne se lit pas | Retirez la coque et l'étui, éloignez toute surface métallique, déplacez lentement le téléphone (la puce peut être dans la couverture ou dans la page de données). Sur Android, vérifiez que le NFC est activé dans les réglages. Vous pouvez continuer sans la puce, l'instruction sera plus longue. |
| Statut **Info. demandée** | Répondez depuis l'onglet **Suivi** du portail. |
| Orientation par l'eGate vers un guichet | Présentez-vous au guichet : ce n'est pas une sanction. |
| WawPass « Reçu déjà utilisé » | Un reçu ne sert qu'une fois ; présentez la preuve de paiement à l'agent. |

## Continuité de service : mode dégradé, bascule et maintenance

En exploitation nationale, WawID est hébergé dans **deux centres de données actifs au Sénégal**, avec un troisième site pour les sauvegardes, et chaque poste disposera d'un **serveur de poste** capable de fonctionner sans liaison (voir *Plan de déploiement — infrastructure haute disponibilité au Sénégal*). Cette section décrit ce que vous voyez et ce que vous faites dans chaque situation. Elle distingue ce qui existe aujourd'hui dans le démonstrateur et ce qui est prévu (Cible, À développer).

### Les situations possibles

| Situation | Ce que vous constatez | Ce que vous faites |
| --- | --- | --- |
| Maintenance planifiée | Annonce préalable par le chef de poste ou l'administrateur ; éventuellement une reconnexion demandée pendant la fenêtre | Terminez les contrôles en cours avant l'heure annoncée ; reconnectez-vous si l'écran de connexion s'affiche |
| Bascule d'un centre de données vers l'autre | Quelques erreurs ou lenteurs pendant un court moment ; éventuellement retour à l'écran de connexion | Patientez, rechargez la page, reconnectez-vous ; vérifiez que votre dernière action a bien été enregistrée avant de la refaire |
| Liaison du poste coupée | Messages d'erreur à l'enregistrement ; données qui ne se rafraîchissent plus ; kiosques affichant « Serveur WawID injoignable » | Appliquez la procédure de mode dégradé du poste (ci-dessous) et prévenez le support |
| Les deux centres de données indisponibles | Même chose dans tous les postes | Mode dégradé ; les consignes sont données par la cellule de crise via le chef de poste |

Le point devant le nom du poste, dans la barre supérieure, indique seulement que le navigateur de votre poste de travail dispose d'une connexion réseau. Il peut rester vert alors que le serveur WawID ne répond pas : en cas de doute, fiez-vous aux messages d'erreur et prévenez le support.

### Mode dégradé au poste

**Aujourd'hui (démonstrateur)** : il n'existe pas de mode hors ligne. Sans liaison, aucun passage ne peut être enregistré dans WawID. Le poste applique sa **procédure de contrôle manuel** écrite et validée par la DPAF.

**Cible (À développer)** : le serveur de poste prendra le relais automatiquement. Avec lui :

| Fonction | Sans liaison avec le central |
| --- | --- |
| Lecture de la MRZ et chiffres de contrôle | Disponible |
| Lecture de la puce et authentification passive | Disponible (certificats CSCA copiés sur le serveur de poste) |
| Comparaison du visage avec la photo de la puce (1:1) | Disponible |
| Vérification sur les listes de surveillance | Disponible sur la **copie locale**, à jour de la dernière synchronisation |
| Enregistrement des passages | Disponible ; passages mis en file puis transmis au retour de la liaison |
| Vérification des e-Visa | Sur la copie locale des e-Visa approuvés ; un e-Visa approuvé après la coupure n'est pas connu du poste |
| Interrogation en temps réel d'Interpol, du WAPIS ou d'autres sources | Indisponible |
| Recherche biométrique 1:N, nouveaux messages API/PNR | Indisponibles |
| eGates | Selon la politique fixée par la DPAF pour le mode dégradé (fermeture ou fonctionnement restreint) |

### Procédure de contrôle manuel (tant que le mode hors ligne n'existe pas)

1. Le chef de vacation déclare le passage en mode dégradé et note l'heure.
2. Le superviseur ferme les eGates (**Fermer**) si l'espace DPAF est encore accessible ; sinon, il fait orienter les voyageurs vers les guichets.
3. Les agents appliquent le contrôle documentaire visuel renforcé prévu par la procédure de la DPAF et consultent les listes disponibles hors WawID selon les instructions de service.
4. Chaque passage est consigné sur le registre prévu (papier ou fichier local autorisé), avec l'heure, le document, la décision et le nom de l'agent.
5. Au retour du service, le chef de vacation organise la saisie différée des passages selon les consignes de la DPAF et clôt le mode dégradé en notant l'heure.

Les modalités exactes (registre, saisie différée, politique des eGates) sont fixées par la DPAF avant la mise en service (**À vérifier**).

### Pendant une bascule de site central

- La bascule est décidée et conduite par l'exploitant ; vous n'avez aucune action technique à faire.
- Votre session peut rester valide, mais il peut vous être demandé de vous reconnecter : faites-le avec votre propre compte.
- Si une action était en cours au moment de l'erreur (décision de passage, encaissement, déclaration, message), **vérifiez d'abord qu'elle n'a pas été enregistrée** (**Passages**, fiche de la facture, écran **Messages**) avant de la refaire, pour éviter les doublons.
- Le superviseur de poste vérifie ensuite le **Journal d'audit** (**Chaîne intègre**).

### Maintenance planifiée

Les maintenances sont réalisées site par site et, sauf exception, sans interruption du service. Elles sont annoncées à l'avance aux postes, aux compagnies et au Trésor, de préférence aux heures creuses. Une maintenance qui impose une interruption est validée avec la DPAF.

### Notes par profil

| Profil | En cas de bascule, de coupure ou de maintenance |
| --- | --- |
| Agent DPAF au guichet | Appliquez les consignes du chef de vacation ; ne validez pas un passage deux fois ; notez l'heure et le message exact affiché |
| Superviseur des eGates | Fermez les portes dont le kiosque affiche « Serveur WawID injoignable » ; rouvrez-les après un passage d'essai au retour du service |
| Analyste renseignement | Les contrôles reposent sur la copie locale des listes : à la reprise, vérifiez les **Connecteurs** (**Tester**) et les alertes arrivées pendant la coupure |
| Superviseur de poste | Déclarez et clôturez le mode dégradé ; après une bascule, vérifiez la **Chaîne intègre** et le retour des données de votre poste |
| Administrateur | Relayez les annonces de maintenance ; après une bascule, vérifiez les connexions et les **Connecteurs** ; ne réinitialisez jamais la démonstration en exploitation |
| Agent du Trésor | Avant de ressaisir un encaissement ou un reversement interrompu, vérifiez la fiche de la facture : un encaissement enregistré ne peut être ni modifié ni supprimé dans cette version |
| Compagnie aérienne | Voir ci-dessous |
| Voyageur | Le portail et l'application peuvent être brièvement indisponibles ; réessayez plus tard et conservez votre référence `EV…` |

### Compagnies aériennes : renvoi des messages

- Si la passerelle ne répond pas ou renvoie une erreur serveur (`500` ou absence de réponse), renvoyez le **même** message un peu plus tard. Une réponse `401` ou `422` ne se corrige pas en renvoyant le même message.
- **Existant** : un renvoi crée un nouveau message avec une nouvelle référence `MSG-…` (les deux apparaissent dans l'écran **Messages**), mais les passagers d'un même vol, à la même date, sont fusionnés par numéro de document : le renvoi ne crée pas de passagers en double.
- **À développer** : une clé d'idempotence explicite (même référence renvoyée pour un message déjà reçu) et des consignes de renvoi automatique documentées dans *Référence API (compagnies, équipements, connecteurs)*.
- Déclaration d'un paiement de redevance : en cas d'erreur, vérifiez d'abord dans la facture si la déclaration apparaît ; une déclaration renvoyée crée une seconde déclaration, que le Trésor rejettera comme doublon.

### Sauvegardes et restaurations (administrateur)

- Les sauvegardes sont automatiques et gérées par l'exploitant ; aucun utilisateur n'a d'action à faire.
- Une demande de restauration (donnée effacée ou modifiée par erreur, incident) est adressée par l'administrateur à l'exploitant (niveau N2), par écrit, avec l'objet, la date et l'heure concernées et le motif. Elle exige l'accord de la DPAF et l'intervention de deux personnes habilitées.
- Une restauration ne doit jamais servir à effacer une trace du **Journal d'audit** ; après toute restauration, l'administrateur vérifie la **Chaîne intègre**.
- Dans le démonstrateur, il n'existe pas de sauvegarde dédiée ; **Réinitialiser la démonstration** n'est pas une restauration.

## Assistance et escalade

| Niveau | Qui | Pour quoi |
| --- | --- | --- |
| N1 | Chef de vacation et référent WawID du poste | Toute question opérationnelle, escalade d'un contrôle, fermeture d'une eGate ; lecteur, pont NFC, caméra, kiosque, réseau local, déclaration du mode dégradé |
| N2 | Administrateur WawID central, support de l'exploitant et centre de supervision (NOC) 24 h/24 | Comptes et rôles, paramètres, connecteurs, clés d'équipements et de compagnies ; liaisons du poste ; état des centres de données ; demandes de restauration |
| N3 | Experts de l'exploitant (infrastructure, base de données) et équipe de développement | Anomalies du logiciel, bascule d'un site central, restauration |
| Sécurité | Responsable sécurité et SOC | Incident de sécurité, rupture de la chaîne d'audit, fuite de clé |
| Crise | Cellule de crise (exploitant et DPAF) | Indisponibilité générale, perte d'un centre de données, rançongiciel, mode dégradé prolongé |

Les coordonnées de chaque niveau sont fixées par la DPAF et l'exploitant lors de la mise en service (voir *Guide d'installation — Sénégal*). Le centre de supervision (NOC) est joignable 24 h/24 et 7 j/7 ; il peut déjà être informé d'une panne générale avant votre appel, mais signalez toujours un incident constaté au poste. Pour tout incident, notez l'heure, le poste, l'équipement, le message exact affiché et, le cas échéant, la référence (`PX-…`, `EV…`, `MSG-…`).
