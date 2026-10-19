# Démarrer avec WawID

WawID est la plateforme de gestion des identités et des frontières : contrôle des voyageurs aux guichets et aux eGates, renseignement (Threat Monitor, listes de surveillance, règles de ciblage), pré-contrôle des passagers aériens (APIS / PNR), autorisations de voyage (e-Visa), pré-enrôlement eGate, redevance de sécurité (incluse dans le billet et perçue par les compagnies aériennes) et administration. Cette page présente les plateformes, la connexion, les rôles et les éléments communs à tous les écrans de l'espace DPAF.

## Les plateformes de WawID

WawID est organisé en **quatre plateformes dissociées**. Chacune a sa propre adresse (et peut recevoir son propre nom de domaine en production) ; aucune ne renvoie vers une autre plateforme réservée.

| Plateforme | Adresse | Pour qui | Usage |
| --- | --- | --- | --- |
| Espace DPAF | `/dpaf/` (alias de `/admin/`) | Agents, analystes, superviseurs, agents du Trésor, administrateurs | Contrôle guichet, supervision des eGates, renseignement, APIS, e-Visa, finances, administration |
| Plateforme voyageurs | `/` (portail) et `/aide/` (aide publique) | Voyageurs (public) | Demande et suivi d'e-Visa, pré-enrôlement eGate, information sur la redevance de sécurité (rien à payer), centre d'aide |
| Applications mobiles | `/app/` | Voyageurs | Téléchargement de l'application WawID e-Visa : Android (APK en téléchargement direct) et iPhone (TestFlight) ; demande d'e-Visa avec lecture NFC de la puce du passeport |
| Plateforme des compagnies aériennes | `/compagnies/` | Personnel des compagnies aériennes | Transmission des données API / PNR, accusés de réception, qualité des données, factures et paiements de la redevance de sécurité (voir *Plateforme des compagnies aériennes*) |

S'y ajoute le **Kiosque eGate** (`/gate/`), l'écran des portes automatiques et kiosques ABC (parcours voyageur en libre-service : passeport, puce, visage, ouverture ou orientation).

L'espace DPAF est accessible depuis un navigateur récent (Chrome, Edge, Safari, Firefox). Le lien **Ouvrir le kiosque eGate** du menu utilisateur ouvre le kiosque dans un nouvel onglet. Le portail voyageur ne propose aucun lien vers l'espace DPAF, et l'espace DPAF aucun lien vers le portail.

## Se connecter

1. Ouvrez `/dpaf/` dans votre navigateur (l'ancienne adresse `/admin/` reste valable).
2. Saisissez votre **Identifiant** et votre **Mot de passe**, fournis par l'administrateur.
3. Cliquez sur **Se connecter**.

En cas d'erreur, le message « Identifiant ou mot de passe incorrect » s'affiche. Un compte de compagnie aérienne est refusé sur l'espace DPAF avec le message « Ce compte est un compte compagnie : connectez-vous sur la plateforme des compagnies aériennes. » Chaque tentative, réussie ou non, est inscrite au journal d'audit, et une tentative échouée est volontairement ralentie pour décourager les essais en série.

Pour vous déconnecter, cliquez sur votre avatar (vos initiales, en haut à droite) puis sur **Se déconnecter**.

> **Démonstration en local** : les comptes `admin` (mot de passe `admin`) et `agent`, `analyste`, `superviseur`, `tresor` (mot de passe `demo`) sont créés automatiquement, ainsi que les comptes compagnie `airsenegal` et `airfrance` (mot de passe `demo`), utilisables uniquement sur `/compagnies/`. En production, les mots de passe sont définis par l'administrateur.

### Durée de session

Une session dure **12 heures** (une vacation). Passé ce délai, ou si votre compte est désactivé, l'écran de connexion réapparaît à la prochaine action (« Session expirée — reconnectez-vous »). Le mot de passe n'est jamais stocké en clair (hachage scrypt) et la session est conservée dans un cookie sécurisé, inaccessible aux scripts.

## Les rôles

Chaque utilisateur a un rôle unique, qui détermine les tuiles visibles et les actions autorisées (principe du moindre privilège). Une page non autorisée affiche « Accès non autorisé pour le rôle … ».

| Droit | Agent de contrôle | Analyste renseignement | Superviseur | Administrateur | Agent du Trésor |
| --- | --- | --- | --- | --- | --- |
| Consultation (tableaux de bord, passages, listes…) | Oui | Oui | Oui | Oui | Oui |
| Contrôle guichet | Oui | — | Oui | Oui | — |
| Traitement des alertes | Oui | Oui | Oui | Oui | — |
| Dossiers | Oui | Oui | Oui | Oui | — |
| Listes de surveillance (ajout, modification) | — | Oui | Oui | Oui | — |
| Règles de ciblage | — | Oui | Oui | Oui | — |
| APIS (réception de messages, manifestes) | — | Oui | Oui | Oui | — |
| Décisions e-Visa et délégations | — | Oui | Oui | Oui | — |
| Pilotage des eGates | — | — | Oui | Oui | — |
| Redevance de sécurité (finances) | — | — | — | Oui | Oui |
| Utilisateurs | — | — | — | Oui | — |
| Paramètres système | — | — | — | Oui | — |

En pratique :

- **Agent de contrôle** : réalise les contrôles au guichet, consulte les passages et les eGates, prend en charge les alertes et ouvre des dossiers de contrôle secondaire.
- **Analyste renseignement** : traite les alertes et les dossiers, alimente les listes de surveillance et les règles de ciblage, instruit les e-Visa et les délégations et exploite les données APIS / PNR. Il ne réalise pas de contrôle guichet.
- **Superviseur** : cumule les droits de l'agent et de l'analyste, et pilote à distance les eGates et kiosques ABC (ouverture, fermeture, maintenance, paramètres).
- **Administrateur** : tous les droits, y compris la gestion des utilisateurs, les paramètres système et le module finances.
- **Agent du Trésor** : consultation et module **Redevance de sécurité** (factures, validation des paiements déclarés par les compagnies, encaissements, reversements à l'État, rapprochement, répartition). Il n'a accès à aucune action de contrôle.

Un sixième rôle, **Compagnie aérienne**, est réservé à la plateforme des compagnies : il est rattaché au code IATA d'une compagnie, n'ouvre pas l'espace DPAF et ne donne accès qu'aux données de cette compagnie.

## La page d'accueil

Après connexion, la page d'accueil affiche **Bonjour** suivi de votre prénom et la date du jour.

### Espaces

Les applications sont rangées par espace, présentés sous forme d'onglets : **Mon accueil**, **Contrôle frontière**, **Renseignement**, **APIS & PNR**, **e-Visa & voyageurs**, **Finances**, **Administration** et **Projet**. **Mon accueil** regroupe toutes les tuiles auxquelles vous avez droit ; les autres onglets n'affichent qu'un espace. Un espace sans aucune tuile autorisée pour votre rôle n'apparaît pas. L'onglet choisi est conservé pendant la session du navigateur.

### Tuiles et indicateurs en direct

Chaque tuile ouvre une application et affiche son titre, une description et, le plus souvent, un indicateur chiffré : par exemple **Tableau de bord** (passages sur 24 h), **eGates & ABC** (portes ouvertes sur le total), **Threat Monitor** (nouvelles alertes), **e-Visa** (demandes à instruire), **Délégations** (délégations à valider) ou **Factures compagnies** (factures en retard). Un indicateur non nul s'affiche en rouge (critique) ou en orange (attention) lorsque la tuile le prévoit. Les données sont actualisées automatiquement toutes les 30 secondes.

Les tuiles à **bordure pointillée** sont des tuiles de création qui lancent directement une action : **Nouveau contrôle**, **Ajouter une entrée** (liste de surveillance), **Recevoir un message** (APIS / PNR), **Enregistrer une délégation**, **Créer un utilisateur**. La tuile **Kiosque eGate** ouvre le kiosque dans un nouvel onglet.

### Personnaliser l'accueil

1. Cliquez sur **Personnaliser**.
2. Sur chaque tuile, cliquez sur la coche pour la masquer (ou sur l'œil pour la réafficher).
3. Cliquez sur **Terminer**.

Les tuiles masquées disparaissent seulement de **Mon accueil** : elles restent disponibles dans l'onglet de leur espace. Ce choix est enregistré dans le navigateur du poste de travail.

## La barre supérieure

| Élément | Rôle |
| --- | --- |
| Bouton retour (flèche) | Revient à la page précédente de l'outil, ou à l'accueil si la page a été ouverte directement. Raccourci : Alt + ←. Il est masqué sur l'accueil. |
| Logo WawID | Retour à l'accueil. |
| Recherche globale | Recherche un voyageur, un document ou une application. |
| Poste | Votre poste de rattachement, précédé d'un point vert (connecté) ou gris (hors ligne). |
| Thème (lune) | Bascule entre thème clair et thème sombre. |
| Cloche | Notifications des nouvelles alertes. |
| Avatar | Nom, rôle et poste ; lien vers le kiosque eGate ; déconnexion. |

### Recherche globale

Appuyez sur la touche **/** ou sur **Ctrl + K** (**Cmd + K** sur Mac) pour placer le curseur dans le champ de recherche, saisissez votre texte puis validez avec Entrée :

- si le texte correspond au titre d'une application autorisée (par exemple « eGates » ou « dossiers »), cette application s'ouvre ;
- sinon, la **Recherche voyageur** s'ouvre avec votre texte (nom, prénoms ou numéro de document).

### Notifications

La cloche affiche le nombre d'alertes au statut **Nouvelle** (99+ au-delà de 99). Un clic ouvre la liste des six plus récentes ; cliquez sur une alerte pour l'ouvrir dans le Threat Monitor, ou sur **Tout voir**. Lorsque de nouvelles alertes arrivent pendant que vous travaillez, un message apparaît en bas de l'écran.

### Thème sombre

Par défaut, WawID suit le réglage clair ou sombre de votre système. Le bouton lune impose l'un ou l'autre ; le choix est mémorisé dans le navigateur.

### Langue (FR / EN)

Le sélecteur **FR | EN** bascule l'interface entre le français et l'anglais. La page se recharge dans la langue choisie, mémorisée dans le navigateur. Sans choix explicite, WawID utilise la langue du navigateur (français si elle commence par « fr », anglais sinon).

### Aide contextuelle

Le bouton **?** ouvre la page de cette documentation qui correspond à l'écran affiché (par exemple la page « Contrôle guichet » depuis l'assistant de contrôle). Depuis l'accueil, il ouvre la présente page.

## Traçabilité et journal d'audit

Toutes les actions sensibles sont enregistrées dans le **Journal d'audit** : connexions, échecs de connexion et déconnexions, décisions de passage, commandes envoyées aux eGates, vérifications d'anciens reçus WawPass, création de dossiers, modifications de listes et de règles, décisions e-Visa et délégations, gestion des utilisateurs, etc. Chaque entrée indique l'auteur, l'action, l'objet et l'heure. Les entrées sont chaînées par empreinte SHA-256 : toute modification ou suppression a posteriori rompt la chaîne et devient détectable. Le message de la page de connexion le rappelle : « Toutes les actions sont journalisées ».
