# Démarrer avec WawID

WawID est la plateforme de gestion des identités et des frontières : contrôle des voyageurs aux guichets et aux eGates, renseignement (Threat Monitor, listes de surveillance, règles de ciblage), pré-contrôle des passagers aériens (APIS / PNR), autorisations de voyage (e-Visa), taxe de sécurité (WawPass), redevance de sécurité et administration. Cette page présente les interfaces, la connexion, les rôles et les éléments communs à tous les écrans du back-office.

## Les interfaces de WawID

| Interface | Adresse | Pour qui | Usage |
| --- | --- | --- | --- |
| Back-office | `/admin/` | Agents, analystes, superviseurs, administrateurs, agents du Trésor | Contrôle guichet, supervision des eGates, renseignement, APIS, e-Visa, finances, administration |
| Portail voyageur | `/` | Voyageurs (public) | Demande et suivi d'e-Visa, paiement du WawPass, pré-enrôlement eGate |
| Kiosque eGate | `/gate/` | Écran des portes automatiques et kiosques ABC | Parcours voyageur en libre-service (passeport, puce, visage, ouverture ou orientation) |
| App iPhone | application iOS | Voyageurs | Demande d'e-Visa avec lecture NFC de la puce du passeport |

Le back-office est accessible depuis un navigateur récent (Chrome, Edge, Safari, Firefox). Les liens **Portail voyageur** et **Ouvrir le kiosque eGate** du menu utilisateur ouvrent les deux autres interfaces dans un nouvel onglet.

## Se connecter

1. Ouvrez `/admin/` dans votre navigateur.
2. Saisissez votre **Identifiant** et votre **Mot de passe**, fournis par l'administrateur.
3. Cliquez sur **Se connecter**.

En cas d'erreur, le message « Identifiant ou mot de passe incorrect » s'affiche. Chaque tentative, réussie ou non, est inscrite au journal d'audit, et une tentative échouée est volontairement ralentie pour décourager les essais en série.

Pour vous déconnecter, cliquez sur votre avatar (vos initiales, en haut à droite) puis sur **Se déconnecter**.

> **Démonstration en local** : les comptes `admin` (mot de passe `admin`) et `agent`, `analyste`, `superviseur`, `tresor` (mot de passe `demo`) sont créés automatiquement. En production, les mots de passe sont définis par l'administrateur.

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
| Décisions e-Visa | — | Oui | Oui | Oui | — |
| Pilotage des eGates | — | — | Oui | Oui | — |
| Redevance de sécurité (finances) | — | — | — | Oui | Oui |
| Utilisateurs | — | — | — | Oui | — |
| Paramètres système | — | — | — | Oui | — |

En pratique :

- **Agent de contrôle** : réalise les contrôles au guichet, consulte les passages et les eGates, prend en charge les alertes et ouvre des dossiers de contrôle secondaire.
- **Analyste renseignement** : traite les alertes et les dossiers, alimente les listes de surveillance et les règles de ciblage, instruit les e-Visa et exploite les données APIS / PNR. Il ne réalise pas de contrôle guichet.
- **Superviseur** : cumule les droits de l'agent et de l'analyste, et pilote à distance les eGates et kiosques ABC (ouverture, fermeture, maintenance, paramètres).
- **Administrateur** : tous les droits, y compris la gestion des utilisateurs, les paramètres système et le module finances.
- **Agent du Trésor** : consultation et module **Redevance de sécurité** (factures, encaissements, rapprochement, répartition). Il n'a accès à aucune action de contrôle.

## La page d'accueil

Après connexion, la page d'accueil affiche **Bonjour** suivi de votre prénom et la date du jour.

### Espaces

Les applications sont rangées par espace, présentés sous forme d'onglets : **Mon accueil**, **Contrôle frontière**, **Renseignement**, **APIS & PNR**, **e-Visa & voyageurs**, **Finances**, **Administration** et **Projet**. **Mon accueil** regroupe toutes les tuiles auxquelles vous avez droit ; les autres onglets n'affichent qu'un espace. Un espace sans aucune tuile autorisée pour votre rôle n'apparaît pas. L'onglet choisi est conservé pendant la session du navigateur.

### Tuiles et indicateurs en direct

Chaque tuile ouvre une application et affiche son titre, une description et, le plus souvent, un indicateur chiffré : par exemple **Tableau de bord** (passages sur 24 h), **eGates & ABC** (portes ouvertes sur le total), **Threat Monitor** (nouvelles alertes), **e-Visa** (demandes à instruire) ou **Factures compagnies** (factures en retard). Un indicateur non nul s'affiche en rouge (critique) ou en orange (attention) lorsque la tuile le prévoit. Les données sont actualisées automatiquement toutes les 30 secondes.

Les tuiles à **bordure pointillée** sont des tuiles de création qui lancent directement une action : **Nouveau contrôle**, **Ajouter une entrée** (liste de surveillance), **Recevoir un message** (APIS / PNR), **Créer un utilisateur**. Les tuiles **Portail voyageur** et **Kiosque eGate** ouvrent ces interfaces dans un nouvel onglet.

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
| Avatar | Nom, rôle et poste ; liens vers le kiosque eGate et le portail voyageur ; déconnexion. |

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

Toutes les actions sensibles sont enregistrées dans le **Journal d'audit** : connexions, échecs de connexion et déconnexions, décisions de passage, commandes envoyées aux eGates, validations de WawPass, création de dossiers, modifications de listes et de règles, décisions e-Visa, gestion des utilisateurs, etc. Chaque entrée indique l'auteur, l'action, l'objet et l'heure. Les entrées sont chaînées par empreinte SHA-256 : toute modification ou suppression a posteriori rompt la chaîne et devient détectable. Le message de la page de connexion le rappelle : « Toutes les actions sont journalisées ».
