# Planning Scrum — Jotna, du prototype au lancement commercial

Version du 12 novembre 2026. Point de départ : prototype d'interface Fiori livré (cinq écrans, données fictives).
Horizon : **cinquante établissements actifs à la rentrée d'octobre 2027**, après un pilote de cinq écoles sur les
mensualités de février et mars 2027. La page `planning-scrum.html` donne la frise et les cartes de sprint.

## 1. Pourquoi Scrum pour Jotna

- **Le besoin se précise au contact des gestionnaires** : ce qu'une école pointe à la main, comment elle relance, ce qu'elle
  accepte de changer. Des livraisons toutes les deux semaines valent mieux qu'un cahier des charges.
- **Le calendrier est imposé par les échéances** : les mensualités tombent le 5 de chaque mois. Chaque sprint du pilote est
  calé sur une échéance réelle, et c'est elle qui juge l'incrément.
- **L'accès aux transactions est incertain** : API Business PI-SPI d'une banque, webhooks Wave Business, import de relevés.
  Le backlog garde toujours un chemin de repli qui ne bloque aucun sprint.
- **Le fondateur arbitre vite** : une seule personne décide du périmètre, du prix et des priorités.

## 2. Équipe

| Rôle Scrum | Titulaire proposé | Responsabilités |
| --- | --- | --- |
| **Product Owner** | Le fondateur | Vision, backlog, prix, relation avec les écoles pilotes, validation des incréments. |
| **Scrum Master** | Développeur full-stack senior (20 % de son temps) | Cérémonies, obstacles (accès API, comptes Wave, hébergement), protection de l'équipe. |
| **Équipe de développement** (3) | 1 full-stack (API, base, intégrations), 1 front et mobile (Fiori, PWA), 1 UX et support à mi-temps | Incrément livrable à chaque sprint, support des pilotes. |
| **Utilisateurs référents** (5) | Les gestionnaires des cinq écoles pilotes | Écrivent les critères d'acceptation, testent sur leurs données, font les démonstrations en revue. |
| **Revue de jalon** | Fondateur + gestionnaires référents + conseil juridique | À chaque jalon : poursuivre, pivoter, arrêter. |

Règles : un seul backlog, un seul Product Owner, les gestionnaires référents assistent à la revue de sprint, l'équipe se
retrouve physiquement le lundi de planning et le vendredi de revue.

## 3. Cadence et cérémonies

| Cérémonie | Fréquence | Durée | Spécificité Jotna |
| --- | --- | --- | --- |
| **Sprint** | 2 semaines | — | 15 sprints jusqu'à la version 1.0 puis cadence maintenue. Sprint 0 d'une semaine. |
| **Sprint Planning** | Lundi de début de sprint | 1 h 30 | Chaque story est rattachée à un parcours (gestionnaire, parent, direction) et, pendant le pilote, à l'échéance du 5 qu'elle sert. |
| **Daily** | Quotidien | 15 min | En visio, devant le tableau ; le gestionnaire d'astreinte y assiste la semaine de l'échéance. |
| **Refinement** | Hebdomadaire | 45 min | Découpage, estimation en points, vérification de la Definition of Ready. |
| **Sprint Review** | Vendredi de fin de sprint | 1 h | Démonstration par un gestionnaire référent sur ses données. Lecture des indicateurs (§ 7). |
| **Rétrospective** | Vendredi de fin de sprint | 45 min | Trois axes : produit, relation avec les écoles, technique. |
| **Revue de jalon** | Aux dates J0 à J5 | 1 h 30 | Décision écrite : poursuivre, pivoter, arrêter ; révision du planning. |

## 4. Definition of Ready

1. La story décrit un parcours réel d'un gestionnaire, d'un parent ou d'un directeur, en une phrase « En tant que… je veux… afin de… ».
2. Les critères d'acceptation sont écrits et validés par un gestionnaire référent.
3. Les données de test existent (export réel anonymisé d'une école pilote ou jeu fictif).
4. L'impact sur les données personnelles est qualifié (nouvelle donnée ? nouveau destinataire ?).
5. Elle est estimée et tient dans un sprint.

## 5. Definition of Done

1. Code revu, tests automatisés verts, déployé sur l'environnement de recette.
2. Démontrée en revue sur des données réelles par un gestionnaire, acceptée par le Product Owner.
3. Toute action sur l'argent (saisie, rapprochement, annulation) est journalisée avec son auteur.
4. Les textes de l'interface sont en français simple ; les messages aux parents ont été relus par un gestionnaire.
5. Fiche d'aide d'une page mise à jour si le parcours change.

## 6. Backlog produit

### Épopées

| # | Épopée | Valeur |
| --- | --- | --- |
| E1 | Établissements, payeurs, échéancier | La base : qui doit quoi, quand |
| E2 | Encaissements et rapprochement | Pointer sans effort : import, webhooks Wave, API PI-SPI |
| E3 | Relances et demandes de paiement | Être payé plus tôt |
| E4 | Reçus et export comptable | Preuve pour le parent, écriture pour le comptable |
| E5 | Tableau de bord et indicateurs | Voir le mois d'un coup d'œil |
| E6 | Abonnement et facturation de Jotna | Le revenu |
| E7 | Contrats récurrents (bailleurs, salles de sport) | Élargir au-delà des écoles |
| E8 | Portail parents et application mobile | Payer et pointer depuis un téléphone |
| E9 | Sécurité, données personnelles, exploitation | Confiance et conformité (CDP) |
| E10 | Inscription autonome et support | Croître sans appel |

### Phases et jalons

| Phase | Sprints | Période | Jalon |
| --- | --- | --- | --- |
| 0. Cadrage | S0 | 16 → 20 nov 2026 | **J0 Lancement** (20 nov) : temps et capital décidés, 5 lettres d'intention, compte Wave Business, demande d'API déposée |
| 1. Produit minimum | S1 – S3 | 23 nov 2026 → 15 jan 2027 | **J1 Pilote prêt** (15 jan) : payeurs, échéancier, import de relevés, reçus, relances |
| 2. Pilote cinq écoles | S4 – S6 | 18 jan → 26 fév 2027 | **J2 Pilote concluant** (26 fév) : échéance de février suivie, 70 % de rapprochement automatique, tarif fixé |
| 3. PI-SPI, abonnement, bailleurs | S7 – S9 | 1 mars → 9 avr 2027 | **J3 Premiers revenus** (9 avr) : 10 établissements payants |
| 4. Industrialisation | S10 – S14 | 12 avr → 18 juin 2027 | **J4 Version 1.0** (18 juin) : CDP, sauvegardes, portail parents, inscription autonome |
| 5. Campagne de rentrée | S15 + | 21 juin → 1 oct 2027 | **J5 Rentrée** (4 oct) : 50 établissements actifs |

Pause du 21 décembre au 1er janvier. Une échéance du 5 tombe dans presque chaque phase ; c'est elle qui sert de test réel.

### Sprints

**S0 — Cadrage · 16 → 20 novembre 2026.** Décision temps et capital du fondateur, équipe constituée, pile technique choisie.
Cinq lettres d'intention d'écoles privées de Dakar (200 à 600 élèves). Compte Wave Business ouvert ; demande d'API Business
PI-SPI déposée auprès de deux banques. Backlog estimé pour trois sprints. **Sortie J0.**

**S1 — Socle et payeurs · 23 nov → 4 déc.** PostgreSQL, API, authentification, CI. Établissement, payeurs, élèves, classes,
mensualités ; import CSV ou Excel des listes d'élèves ; échéancier généré ; écran Payeurs branché sur la base.
*Démo : import des élèves d'une école pilote, échéancier de décembre à juin.*

**S2 — Encaissements et reçus · 7 → 18 déc.** Saisie manuelle (espèces, virement) ; import de relevés Wave Business, Orange
Money et banque ; rapprochement automatique par alias ou référence, file de vérification avec payeur proposé ; reçu PDF envoyé
par WhatsApp ou e-mail ; fiche payeur. *Démo : relevé réel de décembre importé, 100 lignes rapprochées.*

**S3 — Relances et tableau de bord · 4 → 15 janvier 2027.** Modèle de relance avec variables, envoi WhatsApp Business,
historique ; demande de paiement PI-SPI (alias, QR, libellé avec référence élève) ; tuiles KPI ; sauvegardes testées.
**Sortie J1 :** pilote prêt, démontré par un gestionnaire sur ses données.

**S4 — Mise en service de deux écoles · 18 → 29 jan.** Formation de 30 minutes, import des élèves, alias communiqué aux
parents avec la référence de l'élève ; corrections rapides ; groupe WhatsApp de support.

**S5 — Première échéance réelle · 1 → 12 fév.** Webhooks Wave Business (paiement reçu en temps réel) ; trois écoles de plus ;
mesure du rapprochement automatique, du temps de pointage, des relances. *Démo : échéance du 5 février suivie en direct.*

**S6 — Mesure et décision tarif · 15 → 26 fév.** Entretiens avec les cinq gestionnaires, indicateurs par école, export
comptable SYSCOHADA, proposition tarifaire testée. **Sortie J2 :** tarif accepté par au moins trois écoles.

**S7 — API Business PI-SPI · 1 → 12 mars.** Intégration de l'API de la banque partenaire (demandes groupées, notifications,
suivi) ; repli documenté si l'accès n'est pas ouvert ; déclaration CDP engagée, registre des traitements.

**S8 — Abonnement et multi-établissements · 15 → 26 mars.** Offres, essai, facturation mensuelle par alias PI-SPI ou Wave ;
plusieurs établissements par compte ; rôles gestionnaire, direction, comptable ; échéance du 5 mars suivie.

**S9 — Bailleurs et salles de sport · 29 mars → 9 avr.** Objet générique « contrat récurrent » ; un bailleur et une salle de
sport en production ; premiers clients payants hors pilote. **Sortie J3 :** dix établissements payants.

**S10 — Sécurité et exploitation · 12 → 23 avr.** Sauvegardes chiffrées et restauration testée, supervision, journal des accès,
minimisation des données des mineurs, test d'intrusion léger.

**S11 — Portail parents · 26 avr → 7 mai.** Lien personnel : solde, historique, reçus, bouton payer ; rappels automatiques
J-3, J+3, J+10 ; échéance du 5 mai suivie.

**S12 — Application mobile du gestionnaire · 10 → 21 mai.** PWA installable : accueil en tuiles, payeurs, relances, saisie
espèces ; notifications ; textes en français et en wolof.

**S13 — Inscription autonome · 24 mai → 4 juin.** Parcours d'inscription, import guidé, alias et modèles pré-remplis,
documentation d'une page, vidéos courtes ; échéance du 5 juin suivie.

**S14 — Version 1.0 · 7 → 18 juin.** Gel fonctionnel, corrections, revue des cinq mois de pilote, déclaration CDP effectuée,
CGV et contrat d'abonnement finalisés, plan de campagne de rentrée. **Sortie J4.**

**S15 et suivants — Campagne de rentrée · 21 juin → 1 oct.** Prospection de 150 écoles de Dakar et Thiès, démonstrations par
les gestionnaires pilotes, sprints de maintenance. **Sortie J5 :** 50 établissements actifs à la rentrée du 4 octobre 2027.

### Exemple de user story

> **US-E2-04 — Rapprochement automatique d'un paiement reçu par alias**
> *En tant que* gestionnaire, *je veux* qu'un paiement reçu sur l'alias de l'école avec la référence d'un élève passe sa
> mensualité à « Payé » sans que j'intervienne, *afin de* ne pointer à la main que les cas douteux.
> **Critères d'acceptation** : Étant donné une mensualité de novembre « En retard » pour l'élève KX-0421, quand une ligne de
> 55 000 FCFA arrive avec le libellé « KX-0421 nov. », alors la mensualité passe à « Payé », un reçu est généré, la ligne est
> marquée « Automatique » et le journal contient l'auteur « système ». Si le montant diffère, la ligne va en file de
> vérification avec KX-0421 proposé. — *Estimation : 5 points. Données personnelles : aucune nouvelle donnée.*

## 7. Indicateurs lus à chaque revue de sprint

| Indicateur | Cible J2 (fin du pilote) | Cible J5 (rentrée) |
| --- | --- | --- |
| Part des lignes rapprochées automatiquement | ≥ 70 % | ≥ 85 % |
| Temps de pointage mensuel par établissement | < 1 h | < 20 min |
| Taux de recouvrement à J+10 (vs avant Jotna) | + 10 points | + 15 points |
| Relances envoyées dans les 72 h après l'échéance | 100 % | 100 % automatiques |
| Établissements actifs (une échéance suivie dans le mois) | 5 | 50 |
| Revenu mensuel récurrent (hypothèse 25 000 FCFA par établissement) | 0 (pilote gratuit) | 1,25 M FCFA |
| Satisfaction des gestionnaires (1 à 5) | ≥ 4 | ≥ 4 |
| Incidents de données personnelles | 0 | 0 |

## 8. Risques et parades

| Risque | Impact | Parade |
| --- | --- | --- |
| Accès API Business PI-SPI refusé ou tardif | Décale J3 | Demande à deux banques dès S0 ; pilote sur webhooks Wave et import de relevés |
| Parents qui ne passent pas par l'alias | Baisse du rapprochement automatique | Référence unique par élève, demande de paiement pré-remplie, saisie manuelle rapide pour les espèces |
| Écoles pilotes qui décrochent | Compromet J2 | Pilote gratuit, visite à chaque échéance du 5, démonstrations faites par les gestionnaires |
| Saisonnalité scolaire (juillet à septembre) | Creux de revenus | Bailleurs et salles de sport dès avril ; l'été sert à la campagne de rentrée |
| Données de mineurs et de familles | Bloque J4 | Déclaration CDP engagée en S7, minimisation, chiffrement, rôles |
| Coût de l'API WhatsApp Business | Marge réduite | Messages groupés par échéance, SMS en secours, quota par établissement |
| Dérive vers la gestion scolaire complète | Décale tout | Jotna ne fait que le recouvrement récurrent ; le reste va au backlog post-J5 |

## 9. Ce qui est déjà fait

Le prototype Fiori couvre l'interface des épopées E1 (payeurs), E2 (rapprochement, côté écran), E3 (relances, demandes de
paiement) et E5 (tuiles). Les sprints ne le refont pas : ils le branchent sur une base, sur de vrais relevés et sur de vraies
écoles, puis l'entourent de la facturation, de la sécurité et du support qu'exige un service payant.
