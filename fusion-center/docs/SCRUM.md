# Méthode Scrum proposée — Programme « Centre de Fusion National »

Ce document traduit les recommandations de la mission de Dubaï (équipe projet composite, cas d'usage préparés par la DRN,
pilotage MCTN / Senum, exigences de qualité, confidentialité et sécurité) en une organisation Scrum concrète.

## 1. Pourquoi Scrum pour ce programme

- **Incertitude fonctionnelle forte** : les besoins réels des analystes DRN et des FDS n'émergent qu'au contact de l'outil.
  Des livraisons toutes les deux semaines remplacent un cahier des charges figé de 200 pages.
- **Conduite du changement** (point souligné par le rapport) : chaque sprint embarque des utilisateurs finaux, forme et
  ajuste les processus au fil de l'eau plutôt qu'en fin de projet.
- **Souveraineté et maîtrise des coûts** : des incréments mesurables permettent d'arbitrer régulièrement entre développement
  interne, briques libres et achat éventuel, sur la base de démonstrations et non de promesses de fournisseurs.
- **Sécurité continue** : la *Definition of Done* intègre la revue sécurité à chaque sprint plutôt qu'un audit unique en fin de projet.

## 2. Équipe composite (recommandation n° 4 du rapport)

| Rôle Scrum | Titulaire proposé | Responsabilités |
| --- | --- | --- |
| **Product Owner** | Directeur technique du renseignement (DRN) | Porte la vision opérationnelle, priorise le backlog, arbitre les cas d'usage, valide les incréments. Mandat explicite du Délégué général. |
| **PO délégué « métier FDS »** | Officier de liaison Gendarmerie / Police / Douanes (tournant) | Garantit que les besoins terrain des FDS sont représentés ; prépare les jeux de données réels anonymisés. |
| **Scrum Master** | Chef de projet Senum SA | Facilite les cérémonies, lève les obstacles (accès aux données, habilitations, infrastructures), protège l'équipe. |
| **Équipe de développement** (7 ± 2) | 2 développeurs backend (Senum / CCDOC), 2 développeurs frontend, 1 ingénieur données (ingestion, résolution d'identité), 1 data scientist (graphe, IA), 1 ingénieur sécurité / DevSecOps, 1 UX designer | Livre un incrément « potentiellement livrable » à chaque sprint. |
| **Analystes référents** (2–3) | Analystes DRN habilités, techniciens DRN | Utilisent l'outil dès le sprint 1 sur données réelles, écrivent les critères d'acceptation, participent aux revues. |
| **Comité de pilotage** | Conseiller sécurité de la Présidence, MCTN (Directeur de Cabinet), DG Senum, DG Renseignement, CCDOC | Toutes les 3 sprints (6 semaines) : revue de la feuille de route, budget, arbitrages juridiques, décision « poursuivre / pivoter / acheter ». |

Règles : l'équipe est **colocalisée dans un local habilité** (au moins 3 jours par semaine), tous les membres détiennent une
habilitation adaptée avant le sprint 1, un seul backlog, un seul PO décisionnaire.

## 3. Cadence et cérémonies

| Cérémonie | Fréquence | Durée | Contenu spécifique au programme |
| --- | --- | --- | --- |
| **Sprint** | 2 semaines | — | 12 sprints pour atteindre le pilote national (≈ 6 mois), puis cadence continue. |
| **Sprint Planning** | Début de sprint | 2 h | Sélection des *user stories* prêtes ; chaque story liée à un **cas d'usage DRN** numéroté. |
| **Daily Scrum** | Quotidien | 15 min | Devant le tableau Kanban ; les analystes référents y assistent le mardi et le jeudi. |
| **Backlog Refinement** | Hebdomadaire | 1 h | Découpage, estimation (points de Fibonacci), vérification de la *Definition of Ready*. |
| **Sprint Review** | Fin de sprint | 1 h 30 | **Démonstration sur données réelles** par un analyste, pas par un développeur. Mesure des indicateurs (§ 7). |
| **Revue sécurité** | Fin de sprint | 45 min | Ingénieur sécurité + officier de sécurité des systèmes d'information : menaces, journal d'audit, tests de cloisonnement. |
| **Rétrospective** | Fin de sprint | 1 h | Trois axes : technique, conduite du changement, coopération inter-services. |
| **Comité de pilotage** | Tous les 3 sprints | 2 h | Décisions stratégiques, revue budget, arbitrage interne / achat. |

## 4. Definition of Ready (une story entre en sprint si…)

1. Elle est rattachée à un cas d'usage DRN identifié et à une persona (analyste, enquêteur FDS, chef de service, administrateur).
2. Les critères d'acceptation sont écrits en *Gherkin* (Étant donné / Quand / Alors) et validés par un analyste référent.
3. Les données nécessaires (réelles anonymisées ou synthétiques) sont disponibles et leur classification définie.
4. L'impact sécurité est qualifié (nouvelle donnée ? nouveau flux ? nouvel accès ?).
5. Elle est estimée et tient dans un sprint (sinon : découper).

## 5. Definition of Done (une story est finie si…)

1. Code revu par un pair, tests automatisés verts (couverture ≥ 80 % sur les services d'accès et de résolution).
2. **Test de cloisonnement** : la fonctionnalité a été vérifiée avec au moins deux niveaux d'habilitation différents.
3. Toute nouvelle action sensible est journalisée dans l'audit chaîné.
4. Documentation utilisateur (fiche d'une page en français) et journal des changements mis à jour.
5. Démontrée en Sprint Review sur l'environnement de recette, acceptée par le PO.
6. Aucune dépendance externe non maîtrisée ajoutée (licences libres, hébergement local).

## 6. Backlog produit priorisé

### Épopées (epics)

| # | Épopée | Valeur opérationnelle |
| --- | --- | --- |
| E1 | Ontologie et graphe d'entités | Vision unifiée personnes / objets / lieux / événements |
| E2 | Ingestion et connecteurs | Raccorder les fichiers existants des FDS, puis les flux |
| E3 | Résolution d'identité et provenance | Une seule fiche par individu, traçabilité des sources |
| E4 | Sécurité, habilitations, audit | Confiance des services contributeurs, conformité |
| E5 | Analyse de liens et analytique | Détecter réseaux, intermédiaires, communautés |
| E6 | Géospatial et temporel | Cartes, trajets, chronologies |
| E7 | Dossiers d'enquête et collaboration | Travail d'équipe tracé, décisions motivées |
| E8 | Veille, alertes, tableaux de bord | Réactivité, pilotage gouvernemental |
| E9 | IA et modèles prédictifs | Extraction d'entités, scoring de risque, anomalies |
| E10 | Industrialisation et exploitation | Haute disponibilité, sauvegardes, supervision, formation |

### Feuille de route sur 12 sprints

| Sprint | Objectif de sprint | Stories clés (extrait) | Livrable démontré |
| --- | --- | --- | --- |
| **0** (préparation, 2 sem.) | Équipe habilitée, environnement prêt | Habilitations, local, serveurs, dépôt Git interne, CI, charte de sécurité, 10 cas d'usage DRN rédigés | Backlog initial, environnement de recette |
| **1** | Socle : graphe, recherche, habilitations | ✅ *En tant qu'analyste je recherche une personne et vois ses relations* · ✅ *Je ne vois que les objets ≤ mon niveau et dans mes compartiments* · ✅ Journal d'audit chaîné | **Ce prototype** (E1, E4) |
| **2** | Première ingestion réelle | ✅ Import CSV avec mapping · ✅ Résolution d'identité (téléphones, plaques, personnes) · Import de 2 fichiers réels DRN anonymisés | Premier graphe sur données réelles (E2, E3) |
| **3** | Confiance et accès | SSO Keycloak + MFA · Gestion fine des compartiments par dossier · Export du hachage d'audit vers support externe · Chiffrement au repos | Revue sécurité OSSI validée (E4) |
| **4** | Dossiers et collaboration | ✅ Dossiers, notes typées, entités avec rôle · Partage contrôlé entre services · Rapport PDF de dossier classifié · Notifications | Un dossier réel conduit de bout en bout (E7) |
| **5** | Recherche et volumétrie | OpenSearch (texte intégral, phonétique wolof / français, facettes) · PostgreSQL + partitions · Import 1 M d'objets < 1 h | Recherche < 1 s sur 1 M d'objets (E2, E10) |
| **6** | Résolution d'identité avancée | File de revue humaine des appariements incertains · Fusion / scission manuelle avec historique · Règles par type configurables | Taux de doublons < 2 % mesuré (E3) |
| **7** | Analyse de liens avancée | ✅ Centralité, communautés, chemins · Filtres temporels sur le graphe · Motifs (schémas) : « même téléphone, deux identités » · Export graphe | Atelier analystes : 3 réseaux détectés (E5) |
| **8** | Géospatial et temporel | Serveur de tuiles interne · Chronologie interactive · Trajets de véhicules / navires (ANPR, AIS) · Zones et périmètres d'alerte | Carte opérationnelle hors ligne (E6) |
| **9** | Flux temps réel | Kafka + workers · Connecteur relevés d'appels opérateurs · Connecteur passages frontières · Connecteur CENTIF | Alerte < 5 min après l'événement (E2, E8) |
| **10** | IA : extraction et scoring | NER sur les comptes rendus (personnes, lieux, dates) · Détection d'anomalies sur flux financiers / appels · Suggestion de liens | Modèle évalué sur jeu de test DRN (E9) |
| **11** | Pilotage et tableau de bord gouvernemental | ✅ Tableau de bord analyste · Tableau de bord direction (tendances, charge, délais) · Exports réglementaires | Comité de pilotage utilise l'outil (E8) |
| **12** | Industrialisation et pilote national | Haute disponibilité, sauvegardes testées, supervision, plan de reprise · Formation de 30 analystes · Procédures d'exploitation | **Pilote en conditions réelles**, décision de généralisation (E10) |

Les stories marquées ✅ sont déjà couvertes par le prototype livré.

### Exemple de user story complète (format attendu)

> **US-E3-07 — Fusion automatique des numéros de téléphone**
> *En tant qu'* analyste, *je veux* que « 77 123 45 67 », « +221771234567 » et « 00221 77 123 45 67 » désignent la même entité,
> *afin de* ne jamais manquer un lien à cause d'un format.
> **Critères d'acceptation** : Étant donné un téléphone existant `+221771234567`, quand j'importe une ligne contenant
> `77 123 45 67`, alors aucune entité n'est créée, la provenance de la nouvelle source est ajoutée, et le journal d'audit contient
> `ENTITY_MERGE`. — *Estimation : 3 points. Impact sécurité : aucun. Test de cloisonnement : non requis.*

## 7. Indicateurs suivis à chaque Sprint Review

| Indicateur | Cible fin de pilote |
| --- | --- |
| Vélocité et prévisibilité (écart engagement / réalisé) | Écart < 20 % sur 3 sprints glissants |
| Nombre de cas d'usage DRN couverts / 10 | 10 / 10 |
| Sources raccordées (fichiers, puis flux) | ≥ 8 sources, ≥ 3 flux temps réel |
| Taux de doublons résiduels après résolution | < 2 % |
| Temps de réponse recherche / expansion de graphe (p95) | < 1 s / < 3 s |
| Tests de cloisonnement réussis / effectués | 100 % |
| Incidents de sécurité, ruptures de chaîne d'audit | 0 |
| Analystes formés et actifs hebdomadairement | 30 formés, ≥ 20 actifs |
| Satisfaction utilisateurs (enquête trimestrielle, échelle 1–5) | ≥ 4 |

## 8. Gestion des risques spécifiques

| Risque | Parade dans la méthode |
| --- | --- |
| Accès aux données réelles bloqué par les services détenteurs | Le Scrum Master escalade au comité de pilotage ; protocole d'échange signé en sprint 0 ; données synthétiques pour ne jamais bloquer un sprint. |
| Fuite ou mauvais usage | Habilitations avant tout accès, audit chaîné, revue sécurité par sprint, compartiments par dossier, principe du 404. |
| Dépendance à un fournisseur étranger | Tout le socle est libre ; un éventuel achat de brique (Data Fusion, Euler) se fait par **test comparatif sur les cas d'usage DRN** (recommandation n° 2) et s'intègre via l'API, sans remplacer l'ontologie souveraine. |
| Rejet par les utilisateurs | Analystes référents dans l'équipe dès le sprint 1, démonstrations faites par eux, formation continue, fiches d'une page. |
| Dérive de périmètre | Un seul PO, backlog unique, objectif de sprint explicite, comité de pilotage tous les 3 sprints. |

## 9. Outillage

Dépôt Git interne (GitLab hébergé localement) · CI (tests, analyse statique, scan de dépendances, image Docker) ·
Tableau Scrum (GitLab Boards ou OpenProject, hébergés localement) · Environnements : développement, recette (données
anonymisées), pilote (données réelles, local habilité) · Documentation dans le dépôt, en français.
