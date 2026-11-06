# Mise en production — étapes, planning Scrum et sprints à venir

Version du 6 novembre 2026. Point de départ : prototype livré (socle fonctionnel, 17 tests, démo Netlify).
Horizon : **mise en production nationale la semaine du 24 mai 2027**, après deux paliers de pilote.

## 1. Vue d'ensemble

| Phase | Sprints | Période | Jalon de décision (gate) |
| --- | --- | --- | --- |
| 0. Cadrage et sécurisation | S0 | 9 → 20 nov 2026 | **J0 Lancement** (20 nov) : équipe habilitée, base légale engagée, backlog priorisé |
| 1. Socle de production | S1 – S3 | 23 nov 2026 → 15 jan 2027 | **J1 Socle sécurisé** (15 jan) : revue sécurité OSSI n° 1 validée |
| 2. Montée en charge et pilote restreint | S4 – S6 | 18 jan → 26 fév 2027 | **J2 Pilote restreint** (26 fév) : 10 analystes DRN sur données réelles |
| 3. Pilote élargi et IA | S7 – S9 | 1 mars → 9 avr 2027 | **J3 Pilote élargi** (9 avr) : 30 analystes, 3 services, supervision et PRA testés |
| 4. Industrialisation et homologation | S10 – S11 | 12 avr → 7 mai 2027 | **J4 Homologation** (7 mai) : tests d'intrusion corrigés, dossier signé |
| 5. Bascule | S12 | 10 → 21 mai 2027 | **J5 Mise en production** (décision comité stratégique 21 mai, bascule 24–28 mai) |
| 6. Hypercare puis amélioration continue | S13 + | 31 mai 2027 → | Cadence maintenue, revue trimestrielle |

Pause de fin d'année du 21 décembre au 1er janvier (aucun sprint). Chaque gate est tenu par le comité de pilotage ;
une gate non franchie décale la phase suivante, jamais la Definition of Done.

## 2. Les sept chantiers préalables à la production

Chaque chantier a un responsable unique, un état de départ (prototype) et une cible. Ils avancent en parallèle des sprints et
conditionnent les gates.

| Chantier | Responsable | Prototype (aujourd'hui) | Cible production | Gate |
| --- | --- | --- | --- | --- |
| **A. Juridique et gouvernance** | Conseiller sécurité Présidence + MCTN | Document de gouvernance | Acte réglementaire (finalités, données, durées, destinataires), avis CDP, charte d'usage signée par chaque agent, protocoles d'échange avec chaque FDS, comités installés | J0 (engagé), J4 (signé) |
| **B. Infrastructure et hébergement** | Senum SA | Docker Compose, SQLite / PostgreSQL | Local habilité, 3 environnements (dev, recette, pilote/prod), PostgreSQL HA (Patroni), OpenSearch, Kafka, MinIO, sauvegardes chiffrées hors site, PRA testé | J1 (recette), J3 (PRA) |
| **C. Sécurité et homologation** | OSSI DRN + ingénieur sécurité | JWT, bcrypt, habilitations, audit chaîné, 404 non révélateur | SSO OIDC + MFA (carte à puce), chiffrement au repos, TLS mutuel, ancrage externe de l'audit, SIEM, analyse de risques, tests d'intrusion, dossier d'homologation | J1, J4 |
| **D. Données et connecteurs** | Ingénieur données + PO délégué FDS | Import CSV/JSON, 4 modèles, données fictives | Catalogue des sources (≥ 8), protocoles signés, connecteurs CDR / frontières / CENTIF / immatriculations, qualité et dédoublonnage mesurés (< 2 %), purge selon durées légales | J2, J3 |
| **E. Qualité logicielle** | Scrum Master + équipe | 17 tests API, build CI local | GitLab interne, CI/CD (tests, analyse statique, scan de dépendances, image signée), couverture ≥ 80 % sur accès et résolution, tests de cloisonnement automatisés, tests de charge | J1, J3 |
| **F. Exploitation** | Senum SA (exploitants) | Aucune | Supervision (Prometheus, Grafana, alertes), journalisation centralisée, procédures d'exploitation, astreinte, gestion des incidents et des changements, plan de capacité | J3, J5 |
| **G. Formation et conduite du changement** | DRN (cellule fusion) + UX | Fiches comptes de démo | Parcours de 3 jours, fiches d'une page, super-utilisateurs par service, cellule fusion DRN créée, officier de sécurité des données nommé, évolution des processus de compte rendu | J2, J5 |

## 3. Sprints à venir

Cadence : sprints de 2 semaines, du lundi au vendredi suivant. Planning le lundi matin, revue et revue sécurité le vendredi
de la deuxième semaine, rétrospective dans la foulée. Équipe : 8 personnes (2 backend, 2 frontend, 1 données,
1 data scientist, 1 sécurité/DevSecOps, 1 UX), capacité de référence 40 points par sprint à affiner après S2.

### Sprint 0 — Cadrage et sécurisation · 9 → 20 novembre 2026
**Objectif** : une équipe habilitée, un local, des environnements et un backlog prêts.
- Nomination du PO (Directeur technique DRN), du Scrum Master (Senum), de l'officier de liaison FDS ; habilitations de tous les membres.
- Local habilité, postes, GitLab interne, premier environnement de développement ; import du prototype dans le dépôt interne.
- Rédaction des 10 cas d'usage DRN avec critères d'acceptation ; backlog initial estimé ; charte de sécurité et d'usage.
- Lancement du chantier A : saisine juridique, protocoles d'échange de données avec 2 services pilotes.
**Sortie (J0)** : backlog priorisé, Definition of Ready / Done adoptées, 2 protocoles signés, calendrier des comités.

### Sprint 1 — Fondations de production · 23 novembre → 4 décembre
**Objectif** : le socle tourne sur PostgreSQL, derrière un SSO, avec une chaîne CI.
- Migration PostgreSQL + migrations de schéma versionnées (Alembic), environnements dev et recette.
- SSO Keycloak (OIDC) + MFA ; rôles et habilitations synchronisés ; fin des comptes locaux de démo.
- CI/CD : tests, analyse statique, scan de dépendances, image Docker signée ; tests de cloisonnement automatisés (4 profils).
- Durcissement : TLS, secrets hors code, en-têtes de sécurité, rotation de la clé de signature.
**Démo** : connexion SSO/MFA d'un analyste, graphe sur PostgreSQL, pipeline CI vert.

### Sprint 2 — Premières données réelles · 7 → 18 décembre
**Objectif** : deux fichiers réels anonymisés de la DRN sont dans le graphe, avec revue humaine des appariements.
- Ingestion asynchrone (workers + file), suivi des lots, reprise sur erreur.
- File de revue des appariements incertains (score 80–90) ; fusion / scission manuelle avec historique.
- Ancrage externe quotidien du dernier hachage d'audit ; sauvegardes chiffrées et restauration testée.
- Import de 2 fichiers réels anonymisés (immatriculations, annuaire) ; mesure du taux de doublons.
**Démo** : import réel, revue d'un appariement par un analyste, restauration d'une sauvegarde.

*Pause du 21 décembre au 1er janvier.*

### Sprint 3 — Dossiers et collaboration · 4 → 15 janvier 2027
**Objectif** : un dossier réel conduit de bout en bout par les analystes référents ; première revue sécurité OSSI.
- Compartiments par dossier, partage contrôlé entre services, notifications.
- Rapport PDF classifié d'un dossier (marquage, pagination, journalisation de l'export).
- Durées de conservation et purge planifiée par source (chantier A).
- Formation des 3 analystes référents ; revue sécurité OSSI n° 1 (analyse de risques, journal d'audit, cloisonnement).
**Sortie (J1)** : avis OSSI favorable, dossier réel démontré par un analyste.

### Sprint 4 — Recherche et volumétrie · 18 → 29 janvier
**Objectif** : recherche instantanée sur un million d'objets.
- OpenSearch : texte intégral, facettes, recherche phonétique français / wolof, synonymes.
- Partitionnement PostgreSQL, index, import d'un jeu synthétique d'un million d'objets en moins d'une heure.
- Serveur de tuiles cartographiques interne (données OpenStreetMap Sénégal), carte hors ligne.
**Démo** : recherche en moins d'une seconde sur 1 M d'objets, carte sans accès Internet.

### Sprint 5 — Flux temps réel · 1 → 12 février
**Objectif** : une alerte moins de cinq minutes après l'événement source.
- Kafka et consommateurs ; connecteur relevés d'appels opérateur ; connecteur passages frontières.
- Évaluation des règles de veille au fil de l'eau ; déduplication des alertes ; escalade par sévérité.
- Supervision initiale (Prometheus, Grafana) des flux et des fonctions.
**Démo** : passage frontière simulé → alerte dans l'interface en moins de 5 minutes.

### Sprint 6 — Analyse temporelle et pilote restreint · 15 → 26 février
**Objectif** : ouverture du pilote restreint à 10 analystes DRN.
- Chronologie interactive, filtres temporels sur le graphe, motifs (« même téléphone, deux identités »), exports graphe.
- Formation des 10 analystes ; support de niveau 1 ; recueil structuré des retours.
- Comité de pilotage n° 2 : revue des indicateurs, décision d'ouverture du pilote.
**Sortie (J2)** : 10 analystes actifs, 3 réseaux détectés en atelier, taux de doublons < 2 %.

### Sprint 7 — Extraction d'entités · 1 → 12 mars
**Objectif** : les comptes rendus alimentent le graphe automatiquement.
- Reconnaissance d'entités nommées (personnes, lieux, dates, organisations) sur les comptes rendus, hébergée localement.
- Suggestions de liens à valider par l'analyste ; traçabilité « suggéré par le modèle, validé par X ».
- Jeu de test DRN annoté, mesure de précision et rappel.
**Démo** : un compte rendu déposé → entités et liens proposés, validés en deux clics.

### Sprint 8 — Détection d'anomalies et pilotage · 15 → 26 mars
**Objectif** : signaux faibles sur les flux, tableau de bord de direction.
- Détection d'anomalies sur relevés d'appels et flux financiers (changements de comportement, pics, schémas en étoile).
- Scoring de priorité des alertes ; explication de chaque score.
- Tableau de bord direction : tendances, charge par service, délais de traitement, exports pour le comité.
**Démo** : anomalie financière détectée sur le jeu réel anonymisé, tableau de bord présenté au comité.

### Sprint 9 — Pilote élargi · 29 mars → 9 avril
**Objectif** : 30 analystes dans 3 services, exploitation en conditions réelles.
- Onboarding Gendarmerie, Police, Douanes (compartiments, protocoles, super-utilisateurs).
- Supervision complète, journalisation centralisée (SIEM), astreinte, procédures d'incident.
- Test du plan de reprise d'activité (restauration complète sur site de secours), test de charge à 100 utilisateurs simultanés.
**Sortie (J3)** : 30 formés, 20 actifs par semaine, PRA réussi, p95 recherche < 1 s et expansion < 3 s.

### Sprint 10 — Haute disponibilité et tests d'intrusion · 12 → 23 avril
**Objectif** : l'architecture tient la panne et l'attaque.
- PostgreSQL haute disponibilité (Patroni), bascule automatique ; OpenSearch et Kafka en cluster ; décision graphe natif (Apache AGE ou Neo4j) selon volumétrie mesurée.
- Tests d'intrusion externes (prestataire habilité) sur l'application, l'infrastructure et le SSO.
- Gel des nouvelles fonctionnalités : seules les corrections entrent au backlog jusqu'à la bascule.
**Démo** : perte d'un nœud base de données sans interruption ; rapport de tests d'intrusion reçu.

### Sprint 11 — Corrections et homologation · 26 avril → 7 mai
**Objectif** : dossier d'homologation signé.
- Correction des vulnérabilités (toutes les critiques et hautes, plan daté pour les moyennes) ; contre-test.
- Dossier d'homologation : analyse de risques, mesures, résidus acceptés, procédures, PV de tests.
- Procédures d'exploitation finalisées, formation des exploitants, revue des sauvegardes.
**Sortie (J4)** : décision d'homologation signée par l'autorité.

### Sprint 12 — Bascule · 10 → 21 mai
**Objectif** : mise en production nationale.
- Recette finale par les analystes référents sur l'environnement de production ; reprise des données du pilote.
- Plan de bascule (séquence, points de retour arrière), répétition générale, communication aux services.
- Formation des dernières vagues ; mise hors service de la démo Netlify (ou conservation avec données fictives à des fins de présentation).
- Comité stratégique du 21 mai : décision de go-live ; bascule du 24 au 28 mai ; hypercare jusqu'au 18 juin (équipe complète en support).
**Sortie (J5)** : production ouverte, 0 incident de sécurité, journal d'audit intègre depuis J1.

### Sprint 13 et suivants — Amélioration continue · à partir du 31 mai
Même cadence, même équipe réduite à 5 personnes après l'hypercare : nouveaux connecteurs (AIS maritime, ANPR), modèles prédictifs,
multilinguisme (wolof, arabe), revue trimestrielle du comité stratégique, audit indépendant annuel.

## 4. Critères de passage de chaque gate

| Gate | Critères mesurables |
| --- | --- |
| J0 | 100 % de l'équipe habilitée ; 10 cas d'usage écrits ; 2 protocoles d'échange signés ; backlog estimé pour 3 sprints |
| J1 | SSO/MFA en service ; CI verte ; tests de cloisonnement 100 % ; avis OSSI n° 1 favorable ; sauvegarde restaurée avec succès |
| J2 | 10 analystes actifs ; ≥ 4 sources réelles ; doublons < 2 % ; alerte temps réel < 5 min ; satisfaction ≥ 3,5 / 5 |
| J3 | 30 formés, ≥ 20 actifs ; 3 services ; PRA réussi ; p95 recherche < 1 s ; 0 incident de sécurité ; charge 100 utilisateurs |
| J4 | 0 vulnérabilité critique ou haute ouverte ; dossier d'homologation signé ; procédures d'exploitation validées |
| J5 | Recette finale signée ; répétition de bascule réussie ; plan de retour arrière testé ; communication faite |

## 5. Risques du planning et parades

| Risque | Impact | Parade |
| --- | --- | --- |
| Base légale ou avis CDP en retard | Bloque J4 | Saisine dès S0, suivi au comité de pilotage, pilote sur données anonymisées tant que l'acte n'est pas pris |
| Accès aux données réelles refusé ou tardif | Décale J2 | Protocoles signés en S0, données synthétiques pour ne jamais bloquer un sprint, escalade par le Scrum Master |
| Habilitations de l'équipe tardives | Décale S1 | Démarrer les enquêtes d'habilitation avant S0 ; développement sur données fictives en attendant |
| Infrastructure du local habilité non livrée | Décale J1 | Environnement de recette provisoire chez Senum, bascule vers le local en S3 |
| Résultats de tests d'intrusion lourds | Décale J4 | Revue sécurité à chaque sprint dès S1, tests d'intrusion internes en S6 et S9 avant le test externe |
| Rejet par les utilisateurs | Compromet J3 | Analystes référents dans l'équipe dès S1, démonstrations faites par eux, formation continue |
| Dérive de périmètre | Décale tout | Un seul PO, gel fonctionnel dès S10, toute nouvelle demande va au backlog post-production |

## 6. Ce qui est déjà fait (et compte pour les sprints)

Le prototype couvre l'essentiel des épopées E1 (ontologie), E4 (habilitations et audit), E5 (analyse de liens), E7 (dossiers),
E8 (veille) et une partie de E2 (ingestion fichiers). Les sprints ci-dessus ne refont pas ce travail : ils l'industrialisent
(PostgreSQL, SSO, CI, volumétrie), le raccordent aux données réelles et l'entourent de l'exploitation, de la sécurité et de la
formation qu'exige une production nationale.
