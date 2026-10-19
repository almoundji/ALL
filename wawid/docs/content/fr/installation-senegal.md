# Guide d'installation — Sénégal

Ce guide décrit la mise en place de WawID dans les postes frontière du Sénégal : phases de déploiement, hébergement, prérequis juridiques, matériel, installation des postes de travail, des kiosques eGate et de l'espace DPAF, installation logicielle de la plateforme, applications mobiles, raccordement des compagnies aériennes et du Trésor, formation, recette et mise en service. Il s'adresse aux équipes de projet de la DPAF, de l'exploitant et des intégrateurs.

L'infrastructure d'hébergement haute disponibilité (deux centres de données actifs au Sénégal et un site de sauvegarde), la stratégie de sauvegarde, les procédures de bascule et le phasage détaillé font l'objet de la page *Plan de déploiement — infrastructure haute disponibilité au Sénégal* ; ce guide en reprend l'essentiel. Pour les autres détails techniques déjà documentés, il renvoie aux pages *Déploiement et configuration*, *Sécurité, données personnelles et conformité*, *Kiosque eGate : mise en service et parcours* et *Référence API (compagnies, équipements, connecteurs)*.

## Lire ce guide

Chaque élément est classé selon son état réel :

| Mention | Signification |
| --- | --- |
| **Existant** | Fonctionne aujourd'hui dans le démonstrateur (code du dépôt). |
| **Recommandation** | Pratique conseillée pour l'exploitation ; elle n'engage aucune partie tant qu'elle n'a pas été décidée. |
| **À développer** | Nécessaire pour la production nationale mais absent du code actuel. |
| **À vérifier** | Point juridique, administratif ou contractuel à confirmer auprès de l'autorité compétente avant toute décision. |

## Situation de départ

Le déploiement actuel de WawID est un **démonstrateur** hébergé sur Netlify (Netlify Functions et Netlify Blobs). Il valide les parcours (guichet, eGate, e-Visa, WawPass, APIS/PNR, renseignement, redevance), pas la charge, la souveraineté ni la continuité de service. Une exploitation nationale exige l'architecture souveraine décrite dans `docs/ARCHITECTURE.md`.

| Composant | Aujourd'hui (Existant) | Cible nationale |
| --- | --- | --- |
| Hébergement | Netlify, hors du territoire | Deux centres de données actifs au Sénégal (site A : Datacenter national de Diamniadio ; site B : centre commercial certifié Tier III) + site C de sauvegarde (À développer) |
| Sauvegardes | Aucune sauvegarde dédiée | Règle 3-2-1-1-0, copies immuables et hors ligne au site C, restauration testée chaque trimestre (À développer) |
| Stockage | Une collection = un document JSON (Netlify Blobs) | PostgreSQL partitionné + bus d'événements (À développer) |
| Identité des agents | Identifiant + mot de passe (scrypt), session 12 h | OIDC, MFA, cartes agents PKI (À développer) |
| Biométrie | Scores simulés | SDK / ABIS certifiés, détection du vivant ISO/IEC 30107-3 (À développer) |
| Lecture de puce | Pont NFC local, mode simulation uniquement | Pilote du lecteur réel, vérification CSCA via l'ICAO PKD (À développer) |
| Fichiers externes | Connecteurs en mode « copie locale » | Raccordement BCN Interpol, WAPIS, FPR, DAF (À développer, accords requis) |
| Mode hors ligne | Absent | Serveur de poste (edge) avec copie locale des listes (À développer) |
| Paiements | Simulés | Intégration des opérateurs de paiement (À développer) |
| Données de démonstration | Créées automatiquement au premier appel de l'API si la base est vide | Désactivation du jeu de démonstration en production (À développer) |
| Inventaire des postes et équipements | Six postes définis dans le code (`POSTES` de `public/shared/engine.js`) ; eGates et équipements issus du jeu de démonstration | Référentiel administrable des postes, guichets et équipements (À développer) |
| Factures de la redevance | Issues du jeu de démonstration ; encaissements et assiette provisoire fonctionnels | Émission des factures réelles à partir des déclarations et du comptage (À développer) |

> Aucune donnée personnelle réelle ne doit être saisie dans le démonstrateur. Les étapes ci-dessous qui concernent le démonstrateur servent aux essais, aux démonstrations et à la formation.

## Phases de déploiement

Les postes déclarés dans WawID sont ceux de la liste `POSTES` :

| Code | Poste | Type | Région |
| --- | --- | --- | --- |
| `AIBD` | Aéroport International Blaise Diagne | Aérien | Thiès |
| `PDK` | Port Autonome de Dakar | Maritime | Dakar |
| `ROS` | Rosso | Terrestre | Saint-Louis |
| `KID` | Kidira | Terrestre | Tambacounda |
| `KAR` | Karang | Terrestre | Fatick |
| `ZIG` | Aéroport de Ziguinchor | Aérien | Ziguinchor |

Tout autre poste devra être ajouté à cette liste (modification du code, À développer) avant son raccordement.

Le phasage ci-dessous est une **Recommandation** ; il reprend celui de la page *Plan de déploiement — infrastructure haute disponibilité au Sénégal*, qui détaille les critères d'entrée et de sortie et les tests de réception. Il suit le principe de la note de proposition (`docs/PROPOSITION-REMPLACEMENT-SECURIPORT.md`) : pilote à l'AIBD en parallèle du système en place, puis bascule par vagues, sans interruption du contrôle. Il ajoute la construction de l'infrastructure haute disponibilité et la migration de l'application, que la note ne comprenait pas. Aucun calendrier n'est arrêté ; les durées du plan sont indicatives.

| Phase | Périmètre | Prérequis | Critère de sortie |
| --- | --- | --- | --- |
| 0. Cadrage et juridique | Contrat, formalités CDP, conventions avec Sénégal Numérique (site A) et le centre de données commercial (site B), choix du site C, mandat d'encaissement de la redevance si le circuit `OPERATEUR` est retenu | Points « À vérifier » ci-dessous traités | Conventions signées ; décision écrite des autorités compétentes |
| 1. Construction des sites A, B et C | Énergie, baies, réseau, liaisons entre sites, HSM, plateforme d'exécution, base de données, stockage objet, sauvegardes, supervision et SOC | Phase 0 terminée ; matériel livré | Bascule A → B et restauration depuis le site C réussies |
| 2. Migration de l'application | Passage du démonstrateur Netlify à la pile souveraine (API conteneurisée, PostgreSQL et stockage objet, secrets en HSM, un domaine par plateforme), en parallèle de la phase 1 | Développements prioritaires lancés | Recette fonctionnelle en préproduction ; test de charge ; test d'intrusion |
| 3. Pilote | AIBD : quelques guichets et eGates aux arrivées et aux départs, en parallèle du système en place ; serveur de poste de l'AIBD ; passerelle API/PNR ouverte à des compagnies volontaires ; rapprochement de la redevance | Phases 1 et 2 validées ; formalités CDP accomplies ; lecteurs et SDK certifiés intégrés ; agents pilotes formés | Recette du pilote validée (voir le tableau de recette) ; aucun incident bloquant sur une période d'observation convenue ; exercice de bascule réussi |
| 4. Généralisation par vagues | Vague 1 : AIBD complet, Aéroport de Ziguinchor, Port Autonome de Dakar. Vague 2 : Rosso, Kidira, Karang (lecteurs de plaques VRS, scanners) ; arrêt du système précédent | Bilan du pilote ; serveurs de poste installés ; liaisons principale et de secours validées ; mode hors ligne validé pour la vague 2 | Recette par poste, dont un essai de coupure de liaison ; reprise des données selon les clauses contractuelles ; procès-verbal de mise en service définitive |
| 5. Exploitation | Supervision 24 h/24, maintenance, exercices de reprise deux fois par an, restauration trimestrielle | Procès-verbal de mise en service | Revue annuelle |

## Hébergement au Sénégal

### Principes

- **Souveraineté** : les données nominatives et biométriques, ainsi que les clés qui les protègent, sont hébergées sur le territoire national ; aucune donnée personnelle n'est confiée à un cloud étranger. L'hébergement actuel sur Netlify n'est pas acceptable pour des données réelles (voir *Sécurité, données personnelles et conformité*).
- **Deux centres de données actifs** (Recommandation) : les services web et API fonctionnent simultanément dans les deux sites ; la base de données est répliquée de manière synchrone du site A vers le site B ; chaque site peut porter seul toute la charge de pointe.
- **Un site de sauvegarde (site C)** : il reçoit des copies chiffrées immuables et des copies hors ligne, sans héberger de production.
- **Exposition minimale** : seuls la plateforme voyageurs (portail, aide, page des applications mobiles), la plateforme des compagnies aériennes (`/compagnies/`) et la passerelle transporteurs sont exposés sur Internet, derrière un WAF et une protection anti-DDoS ; l'espace DPAF (`/dpaf/`), les kiosques et les services internes restent sur le réseau privé. Chaque plateforme reçoit son propre nom de domaine (par exemple `dpaf.<domaine>`, `www.<domaine>`, `compagnies.<domaine>`, `app.<domaine>`).

### Choix des sites (Recommandation, À vérifier)

| Site | Rôle | Option recommandée | Points à confirmer |
| --- | --- | --- | --- |
| A | Principal, actif | Datacenter national de Diamniadio (État, exploité par Sénégal Numérique SA), inauguré en 2021 et présenté comme « de type Tier III » | Aucune certification Uptime Institute confirmée publiquement ; capacité, niveaux de service, sécurité physique et convention **À vérifier** ; aucun engagement à ce jour |
| B | Secondaire, actif | Centre de données commercial certifié Tier III sur un site et un réseau électrique distincts : Sonatel (Orange) à Rufisque en premier choix, Yas (ex-Tigo) à Diamniadio en alternative | Certification de Rufisque annoncée mais **À vérifier** ; Yas Diamniadio certifié Tier III par l'Uptime Institute en 2017 (validité **À vérifier**) mais situé dans la même zone que le site A |
| C | Coffre de sauvegarde | Site sécurisé de l'État ou installation distincte, hors de la zone Dakar–Diamniadio–Rufisque si possible | Site à identifier avec Sénégal Numérique (**À vérifier**) |

La comparaison détaillée des options figure dans la page *Plan de déploiement — infrastructure haute disponibilité au Sénégal*.

### Objectifs de service (cibles de l'architecture)

| Indicateur | Cible |
| --- | --- |
| Disponibilité du central | 99,95 % ou plus |
| Perte de données dans un site (RPO) | Nulle (réplication synchrone) |
| Perte de données en cas de perte d'un site (RPO) | 5 minutes au plus (nulle tant que la réplication synchrone A → B est saine) |
| Délai de reprise en cas de perte d'un site (RTO) | Une heure au plus |
| Capacité de contrôle au poste | 100 %, y compris sans liaison avec le central |
| Tests de bascule | Deux fois par an au minimum |
| Tests de restauration | Chaque trimestre |

Ces valeurs sont des objectifs de conception, pas des engagements contractuels.

### Liaisons réseau

| Élément | Recommandation |
| --- | --- |
| Internet des sites centraux | Deux opérateurs différents par site, sur des chemins physiques distincts |
| Liaison entre les sites A et B | Fibre noire ou liaison dédiée sur deux chemins physiques distincts, chiffrée, à faible latence (réplication synchrone) |
| Liaison vers le site C | Liaison chiffrée dédiée pour l'archivage continu ; copies hors ligne transportées selon une procédure sécurisée |
| Liaison principale des postes | MPLS ou VPN chiffré entre chaque poste et les deux sites centraux, bascule automatique de l'un vers l'autre |
| Liaison de secours des postes | 4G ou VSAT par poste, chez un opérateur différent de la liaison principale, en particulier pour les postes terrestres éloignés (Kidira, Rosso, Karang) |
| Partenaires | Interpol via le BCN de Dakar (I-24/7), WAPIS, FPR, DAF et DGCPT par liaisons privées ou VPN, selon les accords (À vérifier) ; compagnies aériennes par Internet derrière le WAF |
| Réseau du poste | Réseau local segmenté (guichets, eGates, CCTV, administration) ; aucun poste de contrôle directement exposé à Internet |
| Flux sortants des postes | Limités au central WawID (HTTPS) ; le pont NFC n'écoute que sur la boucle locale de chaque poste de travail |
| Supervision | Remontée de l'état des équipements vers **Supervision systèmes** et vers le SOC de l'exploitant |

### Mode hors ligne (À développer)

Le démonstrateur n'a **pas** de mode hors ligne : un poste qui perd sa liaison ne peut plus enregistrer de passage. L'architecture cible prévoit dans chaque poste un **serveur de poste** (type `SRV-` dans **Supervision systèmes**), composé de deux nœuds, auquel se rattachent les guichets et les eGates, et qui :

- conserve une copie chiffrée des listes de surveillance, synchronisée en moins d'une minute ;
- exécute le même moteur de décision que le central (`public/shared/engine.js`) ;
- met les passages en file d'attente et les resynchronise au retour de la liaison ;
- déclenche une alerte locale en cas de correspondance critique ;
- permet au poste de poursuivre le contrôle même si les deux sites centraux sont indisponibles.

Tant que ce serveur n'existe pas, chaque poste doit disposer d'une **procédure de contrôle manuel** écrite, validée par la DPAF.

### Sauvegardes et reprise

La stratégie suit la règle **3-2-1-1-0** : trois copies, sur deux types de supports, dont une hors site (site C), une immuable ou hors ligne, et zéro erreur constatée lors des vérifications (Recommandation).

| Élément | Recommandation |
| --- | --- |
| Base de données | Réplication synchrone du site A vers le site B ; archivage continu des journaux de transactions (restauration à un instant donné) ; sauvegarde complète quotidienne et incrémentale horaire, copiées vers le site C |
| Stockage objet (biométrie, documents) | Réplication entre A et B, versionnement, copie quotidienne vers le site C |
| Copie immuable et hors ligne | Stockage à écriture unique au site C ; copie hors ligne chiffrée hebdomadaire conservée en coffre, sur le territoire |
| Journal d'audit | Export quotidien de la chaîne ; ancrage périodique de la tête de chaîne par une signature HSM (À développer) |
| Clés et secrets | Conservés dans une paire de HSM par site central ; sauvegarde des clés partagée entre plusieurs dépositaires |
| Conservation | 5 ans affichés dans WawID (`retentionDays`) ; durée légale **À vérifier** ; purge automatique **À développer** |
| Essais | Restauration testée chaque trimestre ; restauration depuis le site C et bascule entre sites lors des exercices semestriels |

Les scénarios de défaillance, la procédure de bascule et le retour à la normale sont décrits dans la page *Plan de déploiement — infrastructure haute disponibilité au Sénégal*.

## Prérequis juridiques et réglementaires

Les vérifications suivantes sont **À vérifier** auprès des autorités compétentes. Elles ne préjugent pas des réponses ; seuls les textes déjà cités dans la documentation de WawID sont mentionnés comme références.

| Domaine | Autorité ou interlocuteur | Vérification à effectuer |
| --- | --- | --- |
| Protection des données personnelles | Commission de Protection des Données Personnelles (CDP) | Déterminer le régime applicable au traitement au titre de la loi n° 2008-12 du 25 janvier 2008 (déclaration ou demande d'autorisation, notamment pour la biométrie et les traitements de sécurité publique) et accomplir les formalités **avant** toute mise en production ; fixer la durée de conservation (5 ans par défaut dans WawID), le point de contact pour les droits d'accès et de rectification, et les conditions d'hébergement. |
| Maîtrise d'ouvrage du contrôle frontière | Ministère de l'Intérieur, Direction de la Police de l'Air et des Frontières (DPAF) | Désignation du responsable de traitement ; validation des procédures (escalade, refus d'entrée, mode dégradé) ; vérification de la nécessité d'un acte réglementaire créant le traitement. |
| Redevance de sécurité | Ministère de l'Économie et des Finances, Direction générale de la Comptabilité publique et du Trésor (DGCPT) | Application du décret n° 2011-652 du 26 mai 2011, de l'arrêté interministériel du 3 février 2012, du décret n° 2012-519 du 18 mai 2012 et de la décision du 4 décembre 2012 ; nouvel acte de répartition si la part opérateur change ; circuit des quittances du Receveur général du Trésor. Le circuit « compagnies → WawID → Trésor public » (paramètre par défaut de WawID) diffère de ce cadre : il exige un **nouveau texte réglementaire** et une **convention de mandat d'encaissement** entre l'État et WawID avant toute mise en œuvre. |
| Données API et PNR | Compagnies aériennes, autorité de l'aviation civile (ANACIM), DPAF | Base juridique nationale imposant la transmission API/PNR (référence : OACI annexe 9) ; conditions de transmission et de conservation ; information des compagnies. |
| Fichiers de police | BCN Interpol, plateforme nationale WAPIS, services détenteurs du FPR et du registre des passeports (DAF) | Accords d'accès, conditions de raccordement, habilitations. |
| Contrat existant | Autorités contractantes, Agence judiciaire de l'État | Clauses de transfert, de réversibilité et de propriété des données du système actuellement en place (voir la note de proposition). |
| Commande publique | Autorités contractantes | Procédure conforme au Code des marchés publics ou à la loi sur les contrats de partenariat public-privé. |
| Télécommunications (option) | ARTP | À consulter seulement si le projet prévoit des moyens de télécommunication soumis à autorisation (par exemple des liaisons radio ou satellitaires privées). |
| Applications mobiles | Responsable de traitement | Mentions d'information et politique de confidentialité exigées par les magasins d'applications, cohérentes avec les formalités CDP. |

## Matériel par type de poste

### Par poste de travail

Les références de constructeurs citées dans le code (Regula, Thales/Gemalto, ARH, Innovatrics) sont des exemples, pas des choix arrêtés. Le choix du matériel relève de la procédure d'achat ; les SDK biométriques doivent être certifiés (performances NIST, ISO/IEC 30107-3).

| Équipement | Guichet | Kiosque eGate / ABC | Espace DPAF | Serveur de poste |
| --- | --- | --- | --- | --- |
| Ordinateur avec navigateur récent (Chrome ou Edge recommandés) | Oui | Oui (mode kiosque) | Oui | — |
| Node.js 22 (pour le pont NFC) | Oui | Oui | — | Oui |
| Lecteur de documents pleine page avec lecteur RFID/NFC (MRZ + puce ICAO 9303) | Oui | Oui | — | — |
| Capteur d'empreintes 4 doigts | Oui | Selon le modèle | — | — |
| Caméra pour la capture du visage | Oui | Oui (frontale) | — | — |
| Caméra iris | Facultatif | — | — | — |
| Douchette QR (e-Visa, WawPass) | Recommandée | — | — | — |
| Écran voyageur tactile | — | Oui | — | — |
| Contrôleur des portes | — | Oui | — | — |
| Onduleur | Oui | Oui | Oui | Oui |
| Lien réseau | Réseau du poste | Réseau du poste | Réseau privé | Liaison principale + secours |

### Par type de poste

Les types d'équipements suivis dans **Supervision systèmes** sont : terminaux guichet (`TRM-`), caméras CCTV (`CCTV-`), scanners bagages 3D (`LGS-`, postes aériens et maritime), lecteurs de plaques VRS (`ANPR-`, postes terrestres) et serveurs locaux (`SRV-`, un par poste).

| Type de poste | Postes | Équipements spécifiques | Points d'attention |
| --- | --- | --- | --- |
| Aérien | AIBD, Ziguinchor | Guichets, eGates et kiosques ABC aux arrivées et aux départs, corridor biométrique d'embarquement, CCTV, scanners bagages | Pointes de trafic ; passerelle API/PNR ; redevance de sécurité |
| Maritime | Port Autonome de Dakar | Guichets au terminal passagers, CCTV, scanners | Arrivées groupées de navires ; manifestes chargés en CSV si la compagnie n'est pas raccordée |
| Terrestre | Rosso, Kidira, Karang | Guichets, lecteurs de plaques (VRS), CCTV | Liaison réseau fragile ; coupures d'électricité ; mode dégradé indispensable |

### Sites centraux

Les quantités sont à dimensionner lors de l'étude détaillée ; la nomenclature complète figure dans la page *Plan de déploiement — infrastructure haute disponibilité au Sénégal*.

| Équipement | Site A | Site B | Site C |
| --- | --- | --- | --- |
| Routeurs (deux opérateurs), pare-feu, commutateurs | Par paires | Par paires | Selon le site |
| Répartiteurs de charge et WAF | Paire | Paire | — |
| Serveurs de la plateforme d'exécution (Kubernetes ou équivalent) | 3 nœuds de contrôle + nœuds de travail à dimensionner | Idem | — |
| Serveurs de base de données | 2 au minimum | 2 au minimum | — |
| Stockage objet | 4 nœuds au minimum | 4 nœuds au minimum | Stockage immuable |
| HSM | 2 | 2 | Sauvegarde des clés en coffre |
| Sauvegarde | Serveur de sauvegarde | Serveur de sauvegarde | Appliance immuable, bandes ou disques hors ligne |
| Bastions et collecteurs de supervision | 2 | 2 | — |

### Alimentation électrique (Recommandation)

Chaque guichet, kiosque, équipement réseau et serveur de poste est protégé par un **onduleur** dont l'autonomie est dimensionnée selon la fréquence et la durée des coupures observées sur le site, et, pour les postes isolés, par un groupe électrogène. Le passage sur batterie doit permettre de terminer les contrôles en cours et d'éteindre proprement les équipements.

## Installation d'un poste de travail guichet

### 1. Préparer le poste

1. Installez un système d'exploitation maintenu, avec mises à jour de sécurité, session utilisateur sans droits d'administration et verrouillage automatique de l'écran (Recommandation).
2. Installez Chrome ou Edge dans une version récente.
3. Installez les pilotes du lecteur de documents, du capteur d'empreintes et de la caméra fournis par le constructeur.
4. Installez **Node.js 22** (nécessaire au pont NFC).

### 2. Installer le pont NFC

Le pont `tools/nfc-bridge.mjs` relie le navigateur au lecteur de documents. Il n'écoute que sur `127.0.0.1` (Existant).

Copiez `tools/nfc-bridge.mjs` sur le poste, par exemple dans `C:\WawID\` ou `/opt/wawid/`, puis définissez les variables du pont :

| Variable | Valeur pour le Sénégal |
| --- | --- |
| `NFC_BRIDGE_PORT` | `8765` (défaut), sauf conflit sur le poste |
| `NFC_BRIDGE_MODE` | `simulation` pour les essais ; le nom du pilote une fois le lecteur réel intégré |
| `NFC_BRIDGE_ORIGIN` | L'adresse exacte de l'espace DPAF et du kiosque en production, par exemple `https://<domaine-wawid>` ; ne laissez pas les origines de démonstration ou `localhost` en exploitation |

Lancez ensuite le pont :

```bash
NFC_BRIDGE_ORIGIN="https://<domaine-wawid>" node tools/nfc-bridge.mjs
```

Le message « Pont NFC WawID : http://127.0.0.1:8765 (mode …) » confirme le démarrage.

Faites démarrer le pont automatiquement à l'ouverture du poste (service Windows ou unité systemd, Recommandation). Exemple d'unité systemd :

```text
[Unit]
Description=Pont NFC WawID
After=network.target

[Service]
Environment=NFC_BRIDGE_ORIGIN=https://<domaine-wawid>
ExecStart=/usr/bin/node /opt/wawid/nfc-bridge.mjs
Restart=always
User=<compte-de-service>

[Install]
WantedBy=multi-user.target
```

> **À développer** : dans le code actuel, tout mode autre que `simulation` répond « Aucun pilote de lecteur configuré ». Pour un lecteur réel, la fonction `readFromReader()` du pont doit être remplacée par l'appel au SDK du constructeur ou par une pile PC/SC + ICAO 9303 (accès BAC/PACE, DG1, DG2, EF.SOD, authentification passive contre les certificats CSCA de l'ICAO PKD). Voir *Déploiement et configuration*.

### 3. Configurer le poste dans WawID

1. Ouvrez `https://<domaine-wawid>/dpaf/` et connectez-vous avec un compte administrateur (la page **Paramètres** lui est réservée).
2. Ouvrez **Paramètres → Lecteur NFC de ce poste**.
3. Saisissez l'**Adresse du pont** (`http://127.0.0.1:8765` par défaut), cliquez sur **Enregistrer** puis **Tester**. Le résultat attendu est « Connecté » suivi du nom du lecteur.
4. Le réglage est propre au navigateur du poste : refaites-le si le navigateur ou le profil utilisateur change.
5. Déconnectez le compte administrateur ; l'agent se connecte ensuite avec son propre compte.

### 4. Tester le poste

1. Avec un compte de formation, ouvrez **Nouveau contrôle**.
2. Lisez un passeport de test : la MRZ et les chiffres de contrôle s'affichent.
3. Cliquez sur **Lire la puce** : le panneau ne doit **pas** porter la mention « (simulé) » sur un poste d'exploitation.
4. Activez la caméra et capturez un visage ; capturez les empreintes.
5. Lancez les vérifications sans valider la décision, ou validez sur un environnement de recette uniquement.

## Installation d'un kiosque eGate

Préparez l'ordinateur du kiosque comme un poste guichet (navigateur, pilotes, Node.js 22) et installez le pont NFC sur cette même machine (étape 2 de l'installation d'un guichet). Lancez ensuite le navigateur en **mode kiosque** sur l'adresse du kiosque, avec l'identifiant de l'équipement, par exemple :

```bash
chrome --kiosk "https://<domaine-wawid>/gate/?gate=<ID_EQUIPEMENT>"
```

Puis :

1. À l'écran **Activation de l'équipement**, saisissez la **Clé d'équipement** (valeur de `WAWID_GATE_KEY`) et cliquez sur **Activer**. La clé est mémorisée dans le navigateur du kiosque. Seul un technicien habilité la saisit ; elle n'est jamais affichée ni notée sur le kiosque.
2. Si l'adresse ne précise pas l'équipement, choisissez-le dans **Choisir l'équipement**. Vérifiez le nom et la zone affichés en haut à droite.
3. Dans l'espace DPAF, ouvrez **eGates & ABC** et vérifiez que la carte de l'équipement est **En service**, en mode automatique, avec un signal de vie récent.
4. Faites un essai de fermeture et de réouverture à distance : le kiosque doit afficher **Porte fermée** puis revenir à l'accueil en moins de 15 secondes.
5. Réglez les paramètres de la porte (seuil facial, âge minimal, éligibilité, détection du vivant, vérification de l'autorisation de voyage) selon la politique validée par la DPAF, avec **Paramètres → Appliquer à distance**.

Points ouverts pour la production :

- **À développer** : le panneau **Simulateur (démonstration)** affiché sous l'écran d'accueil doit être masqué sur les kiosques d'exploitation.
- **À développer** : il n'existe pas encore d'écran pour déclarer une nouvelle eGate ; les équipements proviennent du jeu de démonstration.
- **Recommandation** : remplacer la clé partagée unique `WAWID_GATE_KEY` par des certificats par équipement (mTLS), comme prévu dans *Sécurité, données personnelles et conformité*.

Pour le parcours voyageur et les messages, voir *Kiosque eGate : mise en service et parcours*.

## Installation de l'espace DPAF

L'espace DPAF ne demande qu'un navigateur récent sur un poste du réseau privé.

1. Fournissez aux analystes, superviseurs, administrateurs et agents du Trésor un poste maintenu, avec navigateur récent et verrouillage d'écran.
2. Donnez l'adresse `https://<domaine-wawid>/dpaf/` (l'ancienne adresse `/admin/` reste valable) ; ajoutez-la aux favoris. Le portail voyageur ne contient aucun lien vers l'espace DPAF.
3. En production, limitez l'accès à l'espace DPAF au réseau privé ou à un VPN (Recommandation) ; la balise `noindex, nofollow` est déjà appliquée (Existant).
4. Pour les agents du Trésor, prévoyez un accès depuis les locaux de la DGCPT selon la politique de sécurité retenue.

## Installation logicielle de la plateforme

### Prérequis

- **Node.js 22**, version 22.18 ou plus récente (exécution directe des fichiers `.mts`).
- Git et un accès au dépôt.
- Pour le démonstrateur : un compte Netlify. Aucune base de données n'est nécessaire.

### Installation et tests en local

```bash
cd wawid
npm install
npm test           # compile la documentation puis exécute les tests
npm run dev        # http://localhost:8888
```

- `npm run build` compile la documentation (`docs/content`) dans `netlify/lib/docs-content.mjs`.
- `npm test` compile la documentation puis exécute `node --test` sur le moteur métier, l'API et le décodage PAXLST/PNR.
- `npm run dev` lance le serveur local ; le port se change avec `PORT`.
- En local, les données sont en mémoire et des comptes et clés de développement sont créés automatiquement (voir *Déploiement et configuration*). Ces valeurs par défaut n'existent pas sur Netlify.

### Déploiement sur Netlify (démonstrateur)

| Paramètre | Valeur (fichier `netlify.toml`) |
| --- | --- |
| Répertoire de base | `wawid/` |
| Commande de build | `npm run build && npm test` |
| Répertoire publié | `public` |
| Fonctions | `netlify/functions` (bundler esbuild) |
| Version de Node | `NODE_VERSION = "22"` |

Un test en échec bloque le déploiement.

### Variables d'environnement

Les noms ci-dessous sont ceux lus par le code (`netlify/lib/auth.mts` et `netlify/lib/connectors.mts`).

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `SESSION_SECRET` | Oui | Signature des sessions et des QR codes e-Visa / WawPass. Sans elle, l'API répond par une erreur. |
| `WAWID_ADMIN_PASSWORD` | Oui | Mot de passe du compte `admin`, créé au premier login si aucun compte n'existe. |
| `WAWID_DEMO_PASSWORD` | Non | Crée les comptes de démonstration `agent`, `analyste`, `superviseur`, `tresor`. **Ne jamais définir en production.** |
| `WAWID_GATE_KEY` | Oui pour les eGates | Clé des eGates et kiosques (en-tête `X-Gate-Key`). |
| `WAWID_CARRIER_KEYS` | Oui pour la passerelle | Clés des compagnies : `CODE_IATA:clé` séparés par des virgules. |
| `WAWID_CONNECTOR_<ID>_URL` | Non | URL d'un connecteur (`INTERPOL_SLTD`, `INTERPOL_NOM`, `WAPIS`, `FPR`, `JUD`, `ETATCIVIL`, `PAXLST`). |
| `WAWID_CONNECTOR_<ID>_TOKEN` | Non | Jeton `Authorization: Bearer` du connecteur. |

Variables du serveur local et du pont NFC : `PORT`, `NFC_BRIDGE_PORT`, `NFC_BRIDGE_MODE`, `NFC_BRIDGE_ORIGIN`.

Saisie avec la CLI Netlify (valeurs remplacées par des espaces réservés) :

```bash
netlify env:set SESSION_SECRET "<SECRET_ALEATOIRE_64_CARACTERES>" --context production --secret
netlify env:set WAWID_ADMIN_PASSWORD "<MOT_DE_PASSE_ADMIN>" --context production --secret
netlify env:set WAWID_GATE_KEY "<CLE_EGATE>" --context production --secret
netlify env:set WAWID_CARRIER_KEYS "HC:<CLE_HC>,AF:<CLE_AF>" --context production --secret
```

Sur Netlify, une variable secrète doit être saisie **par contexte de déploiement** (au minimum Production) avec la portée **Functions** ; redéployez après chaque modification.

### Gestion des secrets

Générez chaque secret et chaque clé de manière aléatoire, par exemple :

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Règles à appliquer :

1. Utilisez une valeur différente pour chaque usage (session, eGates, chaque compagnie) et pour chaque environnement (démonstration, recette, production).
2. Ne placez jamais un secret dans le code, dans la documentation, dans un ticket ou dans une messagerie ; transmettez les clés aux compagnies et aux techniciens par un canal sûr.
3. Tenez un registre (sans les valeurs) : qui détient quelle clé, date de création, date de renouvellement prévue.
4. Changer `SESSION_SECRET` déconnecte tous les utilisateurs et **invalide tous les QR codes e-Visa et WawPass déjà émis** : planifiez cette opération.
5. En production nationale, les clés sont conservées dans un HSM (À développer).

### Comptes initiaux et mots de passe

1. Avant le premier déploiement, définissez `WAWID_ADMIN_PASSWORD` (et ne définissez pas `WAWID_DEMO_PASSWORD`).
2. Connectez-vous une première fois avec le compte `admin` : il est créé à ce moment, si la base ne contient aucun compte.
3. Dans **Utilisateurs & rôles**, créez immédiatement un compte nominatif pour chaque administrateur, puis les comptes des agents, avec un mot de passe initial de 10 caractères au moins remis en main propre.
4. Changez le mot de passe du compte `admin` dans **Utilisateurs & rôles → Modifier** : modifier ensuite `WAWID_ADMIN_PASSWORD` n'a **aucun effet** sur un compte existant. Réservez ce compte aux opérations exceptionnelles.
5. Les utilisateurs ne peuvent pas changer eux-mêmes leur mot de passe dans cette version : les changements passent par un administrateur.

## Applications mobiles

L'application **WawID e-Visa** existe en deux versions :

- `ios/` : application SwiftUI d'origine (iPhone), publiée par le workflow « WawID iOS → TestFlight » ;
- `mobile/` : nouvelle application Flutter pour **iPhone et Android** (scan de la MRZ par la caméra, lecture de la puce par NFC en BAC/PACE avec lecture DG1, DG2 et contrôle d'intégrité par rapport au SOD, saisie du séjour, paiement de démonstration, suivi avec QR code, français et anglais). Elle est en cours de finalisation.

| Élément | Valeur |
| --- | --- |
| Identifiant de l'application | `sn.wawtelecom.wawid.visa` (iOS et Android) |
| iPhone | iPhone 7 ou plus récent, iOS 15.5 ou plus |
| Android | Android 7 (API 24) ou plus récent, avec puce NFC |
| Adresse de l'API | `https://wawid-waw-telecom.netlify.app` par défaut ; modifiable à la compilation avec `--dart-define=WAWID_API=https://<domaine-wawid>` |

Avant toute diffusion au public pour le Sénégal, l'adresse de l'API doit pointer vers la plateforme nationale.

### Publication automatisée

Le workflow GitHub Actions « WawID mobile (Flutter) → APK / TestFlight » (`.github/workflows/wawid-mobile.yml`) exécute l'analyse et les tests Flutter, produit un **APK** installable et un **AAB** pour Google Play, et envoie la version iOS sur TestFlight lorsque les secrets Apple sont présents.

| Secret GitHub | Usage |
| --- | --- |
| `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` | Signature et envoi TestFlight (clé API App Store Connect de rôle App Manager) |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Signature Android de production ; sans eux, l'APK est signé avec une clé de test (installation directe seulement) |
| `PLAY_SERVICE_ACCOUNT_JSON` | Envoi automatique de l'AAB sur la piste « test interne » de Google Play |

### Installer l'application sur iPhone

1. **Aujourd'hui (TestFlight)** : le testeur reçoit une invitation TestFlight (testeurs internes jusqu'à 100, ou groupe externe après la revue « Beta App Review » d'Apple). Il installe l'application **TestFlight** depuis l'App Store, accepte l'invitation, puis installe **WawID e-Visa**.
2. **Plus tard (App Store)** : publication après revue d'Apple, avec fiche, captures d'écran, politique de confidentialité et justification de l'usage du NFC.
3. Le NFC ne fonctionne que sur un iPhone réel.

### Installer l'application sur Android

1. **Essais (APK)** : téléchargez l'APK depuis les artefacts du workflow, copiez-le sur le téléphone, autorisez l'installation depuis cette source, puis installez-le. Réservez cette méthode aux testeurs identifiés.
2. **Test interne Google Play** : avec le keystore et le compte de service configurés, l'AAB est publié sur la piste interne ; les testeurs l'installent depuis le lien d'invitation Google Play.
3. **Production** : publication sur Google Play après validation (fiche, politique de confidentialité, formulaire sur la sécurité des données).
4. Vérifiez que le **NFC est activé** dans les réglages du téléphone.

### Conseils NFC à transmettre aux testeurs

- Passeport fermé, à plat, sans étui ; téléphone sans coque épaisse ; loin des surfaces métalliques.
- iPhone : approcher le haut du téléphone. Android : l'antenne NFC se trouve en général au dos, sa position varie selon les modèles.
- Ne plus bouger pendant la lecture ; si elle échoue, vérifier la MRZ (une seule erreur empêche l'ouverture de la puce).

### Compte développeur

**Recommandation** : publier sous un compte développeur d'**organisation** au nom de l'entité qui portera l'application (WAW Telecom ou l'administration sénégalaise, selon la décision prise), et non sous un compte personnel. Les conditions d'ouverture (documents d'entreprise, numéro D-U-N-S pour Apple, vérification de l'organisation pour Google) sont **À vérifier** auprès d'Apple et de Google. Conservez le keystore Android de production et les clés App Store Connect dans le registre des secrets : leur perte empêche les mises à jour.

> **À vérifier** : la vérification de la signature de la puce contre les certificats CSCA (ICAO PKD) dans l'application Flutter, ainsi que la liste exacte des données transmises au serveur, doivent être confirmées à la livraison de l'application.

## Raccordement des compagnies aériennes

1. **Informer** chaque compagnie desservant l'AIBD et Ziguinchor : remettre la spécification `docs/API-TRANSPORTEURS.md` et la page *Référence API (compagnies, équipements, connecteurs)*.
2. **Désigner** un correspondant technique et un correspondant sûreté par compagnie.
3. **Générer** une clé par compagnie et l'ajouter à `WAWID_CARRIER_KEYS` (format `HC:<CLE_HC>,AF:<CLE_AF>`), puis redéployer.
4. **Transmettre** la clé par un canal sûr.
5. **Créer** les comptes nominatifs de la compagnie dans **Utilisateurs & rôles** (rôle **Compagnie aérienne**, compagnie choisie dans la liste) et communiquer l'adresse de la plateforme des compagnies (`https://<domaine-wawid>/compagnies/`) avec la page *Plateforme des compagnies aériennes*.
5. **Tester** sur l'environnement de recette : la compagnie envoie un PAXLST et un PNR d'essai, par exemple :

```bash
curl -X POST https://<domaine-wawid>/api/carrier/messages \
  -H "X-Carrier-Key: <CLE_COMPAGNIE>" -H "Content-Type: text/plain" \
  --data-binary @paxlst.edi
```

Ensuite :

1. **Vérifier** la réponse **202** et la référence `MSG-…`, puis, dans **Passerelle transporteurs**, le statut **ACCEPTÉ** et la complétude.
2. **Suivre** pendant les premières semaines l'onglet **Conformité transporteurs** (objectifs : ponctualité 95 %, complétude 98 %).

Les messages d'exemple de l'espace DPAF (**Recevoir un message → Exemple PAXLST / Exemple PNR**) et de la plateforme des compagnies (**Exemple PAXLST** / **Exemple PNR**) servent de référence de format. Les messages PNRGOV (EDIFACT) passent par un convertisseur. Une clé compromise est remplacée sans délai.

## Raccordement du Trésor (DGCPT)

1. Désigner, avec la DGCPT, les agents habilités ; l'administrateur crée leurs comptes avec le rôle **Agent du Trésor (redevance)**.
2. L'administrateur vérifie dans **Répartition → Paramètres** le taux par passager, la part opérateur, la pénalité mensuelle et le **Circuit de recouvrement**, et saisit chaque mois le **taux IATA du mois**, conformément aux textes en vigueur.
3. Choisir le circuit de recouvrement. Circuit `OPERATEUR` (compagnies → WawID → Trésor) : ouvrir le compte de collecte WawID, communiquer ses coordonnées aux compagnies, définir qui valide les paiements déclarés (onglet **Paiements à valider**) et le calendrier des reversements de la part de l'État au Receveur général du Trésor (onglet **Reversements à l'État**, le 15 du mois M+2). Ce circuit n'est applicable qu'après adoption d'un nouveau texte réglementaire et signature d'une convention de mandat d'encaissement avec l'État. Circuit `TRESOR` (décret n° 2012-519) : définir le circuit des quittances du Receveur général du Trésor (qui saisit, dans quel délai, quelle référence).
4. Former les agents au calendrier mensuel (collecte du 1er au 9, factures le 10, échéance fin du mois suivant), à la validation des paiements déclarés et au **Rapprochement**.
5. Valider le format de l'export CSV (`wawid-redevance.csv`) avec la comptabilité publique.

> **À développer** : dans le démonstrateur, les factures proviennent du jeu de démonstration. L'émission des factures réelles (déclarations des compagnies, taux IATA, comptage WawID) doit être réalisée avant l'exploitation.

## Plan de formation (Recommandation)

| Public | Contenu | Support |
| --- | --- | --- |
| Agents DPAF (guichet) | Connexion, contrôle complet, lecture de puce, biométrie, décisions motivées, QR, situations courantes, mode dégradé | *Guide utilisateur par profil* ; scénarios de démonstration |
| Superviseurs | Escalades, eGates, tableau de bord, dossiers, journal d'audit | *eGates et kiosques ABC* ; *Tableau de bord* |
| Analystes | Threat Monitor, listes, règles, APIS/PNR, e-Visa, réseau d'identités | *Threat Monitor, dossiers, listes, règles et connecteurs* ; *APIS et PNR* |
| Administrateurs | Comptes, paramètres, pont NFC, clés, sauvegardes, incidents, bascule et restauration | Ce guide ; *Déploiement et configuration* ; *Plan de déploiement — infrastructure haute disponibilité au Sénégal* |
| Techniciens de poste | Installation des postes et kiosques, diagnostic de premier niveau | Ce guide ; *Kiosque eGate : mise en service et parcours* |
| Agents du Trésor | Calendrier, validation des paiements, encaissements, reversements à l'État, rapprochement, export | *Redevance de sécurité* |
| Compagnies aériennes | Plateforme des compagnies, formats, calendrier, réponses, conformité, déclaration des paiements de redevance | *Plateforme des compagnies aériennes* ; `docs/API-TRANSPORTEURS.md` |

Organisez la formation sur un environnement de démonstration distinct de la production, et désignez dans chaque poste un **référent WawID** formé au diagnostic de premier niveau.

## Assistance et escalade (Recommandation)

| Niveau | Acteur | Périmètre |
| --- | --- | --- |
| N1 | Référent WawID du poste | Postes de travail, lecteurs, caméras, kiosques, procédures d'usage |
| N2 | Support de l'exploitant et centre de supervision (NOC) 24 h/24 | Comptes, paramètres, réseau, pont NFC, connecteurs, incidents applicatifs, état des sites centraux et des liaisons |
| N3 | Équipe de développement | Anomalies du logiciel, correctifs |
| Sécurité | Responsable sécurité et SOC | Incident de sécurité, fuite de clé, rupture de la chaîne d'audit |
| Crise | Cellule de crise (exploitant, DPAF) | Perte d'un site central, rançongiciel, mode dégradé prolongé |

Les coordonnées, horaires et délais d'intervention de chaque niveau sont fixés avec la DPAF avant la mise en service et affichés dans chaque poste. Les maintenances planifiées sont annoncées à l'avance aux postes, aux compagnies et au Trésor.

## Recette

| N° | Test | Résultat attendu |
| --- | --- | --- |
| 1 | `npm test` sur la version livrée | Tous les tests réussis |
| 2 | Connexion d'un agent, déconnexion, session expirée | Accès conforme au rôle ; actions inscrites au journal d'audit |
| 3 | Contrôle guichet d'un passeport biométrique réel de test | MRZ valide ; puce lue sans mention « (simulé) » ; authentification passive valide |
| 4 | Contrôle d'une MRZ altérée (scénario **MRZ falsifiée**) | Puce et MRZ différentes ; recommandation de contrôle secondaire ou plus |
| 5 | Correspondance sur liste de surveillance | Alerte dans le **Threat Monitor** ; escalade superviseur |
| 6 | Passage eGate d'un voyageur éligible | Ouverture des portes ; passage enregistré au canal **eGate / ABC** |
| 7 | Passage eGate d'un mineur | Orientation au guichet avec le motif attendu |
| 8 | Fermeture d'une eGate à distance | **Porte fermée** affiché en moins de 15 secondes |
| 9 | Demande e-Visa sur le portail, demande d'information, réponse, approbation | Statuts successifs corrects ; QR signé vérifié au guichet |
| 10 | Demande e-Visa depuis l'application iPhone et Android | Puce lue ; demande visible dans l'espace DPAF avec le champ **Puce (NFC)** |
| 11 | WawPass vérifié deux fois | Première vérification **Valide**, seconde « Reçu déjà utilisé » |
| 12 | Message PAXLST et PNR d'une compagnie avec sa clé | 202 sans résultat de pré-contrôle dans l'accusé ; fusion API + PNR ; passagers signalés visibles dans l'espace DPAF |
| 13 | Message avec la clé d'une autre compagnie | Rejet (422) |
| 14 | Encaissement d'une facture par un agent du Trésor | Statut **PARTIELLE** ou **PAYÉE** ; entrée `REDEVANCE_ENCAISSEMENT` |
| 15 | Vérification du **Journal d'audit** | **Chaîne intègre** |
| 16 | Connexion d'un compte compagnie sur `/dpaf/`, puis sur `/compagnies/` | Refus sur l'espace DPAF ; sur la plateforme, seules les données de sa compagnie, sans passager signalé ni score |
| 17 | Paiement déclaré par une compagnie, validé par un agent du Trésor, puis reversement de la part de l'État (circuit `OPERATEUR`) | Paiement **À valider** puis **Validé** ; facture **PARTIELLE** ou **PAYÉE** ; entrées `REDEVANCE_PAIEMENT_DECLARE`, `REDEVANCE_PAIEMENT_CONFIRME`, `REDEVANCE_REVERSEMENT_ETAT` |
| 18 | Coupure de la liaison d'un poste (après développement du mode hors ligne) | Contrôle poursuivi ; resynchronisation au retour de la liaison, sans perte ni doublon |
| 19 | Coupure électrique d'un guichet | Bascule sur onduleur ; aucun passage perdu |
| 20 | Bascule du site A vers le site B, puis retour | RTO d'une heure au plus ; RPO conforme ; **Chaîne intègre** dans le **Journal d'audit** après bascule |
| 21 | Restauration complète depuis une copie du site C en préproduction | Restauration réussie ; durée et perte de données mesurées |
| 22 | Panne simulée d'un HSM | Aucune interruption des signatures |
| 23 | Test de charge | Pointe de 15 000 voyageurs par heure à l'AIBD tenue par un seul site central |
| 24 | Test d'intrusion | Aucune vulnérabilité critique ou élevée ouverte |

## Liste de contrôle de mise en service

1. Formalités CDP accomplies et décisions écrites des autorités compétentes obtenues.
2. Sites A et B opérationnels et conventions signées ; site C recevant les copies immuables et hors ligne ; bascule A → B, retour et restauration depuis le site C réussis.
3. Centre de supervision 24 h/24, SOC, astreinte et cellule de crise en place ; procédures de bascule et de restauration rédigées.
4. Jeu de démonstration désactivé ; aucune donnée fictive dans la base de production.
5. `SESSION_SECRET`, `WAWID_ADMIN_PASSWORD`, `WAWID_GATE_KEY` et `WAWID_CARRIER_KEYS` définis ; `WAWID_DEMO_PASSWORD` absent.
6. Comptes nominatifs créés ; mot de passe du compte `admin` changé ; revue des rôles faite.
7. Ponts NFC installés avec `NFC_BRIDGE_ORIGIN` limité au domaine de production ; test **Connecté** sur chaque poste.
8. Lecteurs, SDK biométriques et kiosques intégrés et testés ; simulateur masqué sur les kiosques.
9. Connecteurs (Interpol, WAPIS, FPR, DAF) raccordés ou, à défaut, copie locale des listes à jour et procédure validée.
10. Compagnies raccordées et testées, comptes de la plateforme des compagnies créés ; circuit de recouvrement de la redevance arrêté avec la base juridique correspondante ; agents du Trésor formés.
11. Applications mobiles pointant vers l'API nationale ; fiches des magasins validées.
12. Procédure de mode dégradé affichée dans chaque poste ; serveurs de poste, liaisons de secours, onduleurs et groupes électrogènes testés.
13. Agents formés ; référents désignés ; chaîne d'escalade diffusée.
14. Recette signée ; procès-verbal de mise en service établi.
