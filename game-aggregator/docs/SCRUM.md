# Démarrer en Scrum — Agrégateur de jeux de hasard

Un agrégateur de jeux relie **plusieurs fournisseurs de jeux** (studios de machines à sous, jeux de table,
jeux instantanés) à **plusieurs opérateurs** (casinos et sites de paris) grâce à **une seule intégration** :
catalogue unifié, lancement de partie, portefeuille, bonus, reporting et conformité.

Ce document répond à la question « je commence par quoi ? » et découpe la solution **module par module**
en backlog Scrum.

---

## 1. L'ordre de démarrage

| Étape | Quoi | Durée | Résultat attendu |
| --- | --- | --- | --- |
| **0. Vision produit** | Une phrase et une page : pour qui, quel problème, ce qu'on ne fera pas | 1 jour | *Vision board* validée par le sponsor |
| **1. Rôles** | Nommer **un seul** Product Owner, un Scrum Master et l'équipe (5 à 9 personnes) | 1 jour | Organigramme Scrum |
| **2. Cadre réglementaire** | Licence visée, juridiction, exigences de certification (RNG, RTP, jeu responsable, LCB-FT) | en parallèle, dès le début | Liste d'exigences **non négociables** (elles entrent dans la *Definition of Done*) |
| **3. Backlog initial** | Épopées = les modules ci-dessous ; user stories pour les 2 premiers sprints seulement | 2–3 jours | Backlog priorisé |
| **4. Definition of Ready / Done** | Règles communes (voir § 5) | ½ jour | Affichées au mur |
| **5. Sprint 0** | Socle technique, pas de fonctionnalité métier | 1–2 semaines | Dépôt, CI, environnement de recette, squelette d'API déployé |
| **6. Sprint 1** | La **tranche verticale minimale** (voir § 3) | 2 semaines | Une vraie partie jouée de bout en bout, démontrée en Sprint Review |

> **Règle d'or :** ne pas construire les modules un par un « en couches » (tout le catalogue, puis tout le portefeuille…).
> Chaque sprint livre une **tranche verticale** qui traverse plusieurs modules et qu'on peut démontrer.

---

## 2. Les modules (= épopées du backlog)

| # | Module | Rôle | Priorité |
| --- | --- | --- | --- |
| M1 | **Opérateurs** | Comptes B2B, clés d'API, devise, frais d'agrégation | MVP |
| M2 | **Fournisseurs (adaptateurs)** | Un adaptateur par studio : catalogue, URL de lancement, protocole de callbacks signés (HMAC) | MVP |
| M3 | **Catalogue unifié** | Jeux normalisés (catégorie, RTP, volatilité, mises min/max), activation par opérateur | MVP |
| M4 | **Joueurs** | Correspondance joueur opérateur ↔ joueur agrégateur, contrôle d'âge | MVP |
| M5 | **Portefeuille** | Grand livre des transactions, **idempotence**, débit/crédit/annulation ; mode interne puis *seamless wallet* (callback vers l'opérateur) | MVP |
| M6 | **Sessions et lancement** | Jeton de session, mode démo / argent réel, expiration | MVP |
| M7 | **Tours de jeu (rounds)** | Mise → gain → clôture, annulations (*rollback*), transactions tardives | MVP |
| M8 | **RNG prouvablement équitable** | Graine serveur/client/nonce, vérification publique | MVP (jeux de démo) |
| M9 | **Jeu responsable** | Limites de mise et de perte, auto-exclusion, délai de réflexion sur les hausses de limites | MVP (exigence réglementaire) |
| M10 | **Journal d'audit** | Journal chaîné (hash) de toutes les actions sensibles | MVP |
| M11 | **Bonus / tours gratuits** | Campagnes, attribution, consommation, coût des bonus | V2 |
| M12 | **Reporting et facturation** | GGR par opérateur / fournisseur / jeu / jour, partage de revenus, factures mensuelles | V2 |
| M13 | **Back-office** | Interface d'administration et lobby de démonstration | V2 |
| M14 | **Exploitation** | Supervision, sauvegardes, haute disponibilité, rapprochement comptable quotidien | V3 |

---

## 3. Premiers sprints

### Sprint 0 — Socle (pas de valeur métier visible, et c'est normal)

- Dépôt Git, structure du projet, choix technique (ex. FastAPI + PostgreSQL, comme le centre de fusion).
- Intégration continue : tests automatiques à chaque commit.
- Environnement de recette déployé avec un `GET /api/health`.
- Modèle de données des **montants en unités mineures (entiers)**, jamais en flottants.
- Backlog des sprints 1–2 affiné et estimé.

### Sprint 1 — « Une partie de bout en bout » (objectif de sprint)

> *En tant qu'opérateur, je lance un jeu de démonstration pour un joueur, le joueur mise et gagne, et le solde est juste.*

| Story | Module | Critère d'acceptation (extrait) |
| --- | --- | --- |
| Créer un opérateur et obtenir sa clé d'API | M1 | La clé n'est affichée qu'une fois ; elle est stockée hachée |
| Enregistrer un fournisseur de démonstration et 1 jeu | M2, M3 | Le jeu apparaît dans `GET /api/games` |
| Créer un joueur (18 ans minimum) | M4 | Un mineur est refusé |
| Créditer / débiter le portefeuille interne | M5 | Rejouer la même transaction ne débite pas deux fois |
| Lancer une session de jeu | M6 | Renvoie un jeton et une URL de lancement |
| Jouer un tour (mise + gain) | M7, M8 | Solde final = solde initial − mise + gain ; tour clôturé |
| Journaliser chaque action | M10 | Le journal chaîné se vérifie sans erreur |

### Sprints suivants (proposition)

| Sprint | Objectif |
| --- | --- |
| 2 | Annulations, transactions tardives, limites de jeu responsable, auto-exclusion |
| 3 | Protocole de callbacks signés pour un **vrai** fournisseur externe |
| 4 | *Seamless wallet* (le solde reste chez l'opérateur) |
| 5 | Bonus / tours gratuits |
| 6 | Reporting GGR et facturation |
| 7 | Back-office et lobby |
| 8 | Durcissement : tests de charge, audit de sécurité, préparation à la certification |

---

## 4. Équipe et cérémonies

- **Product Owner** : une seule personne qui décide des priorités (idéalement côté métier jeux / opérateur).
- **Scrum Master** : facilite, lève les obstacles (accès fournisseurs, juridique, hébergement).
- **Équipe** : 2–3 backend, 1 frontend, 1 QA/automatisation, 1 profil sécurité/conformité (au moins à temps partiel).
- **Sprint** de 2 semaines : Planning (2 h), Daily (15 min), Refinement (1 h/semaine), Review (1 h) avec démonstration, Rétrospective (1 h).

---

## 5. Definition of Ready / Definition of Done

**Ready** : la story est rattachée à un module, a des critères d'acceptation (Étant donné / Quand / Alors), est estimée et tient dans un sprint.

**Done** :

1. Code revu, tests automatisés verts (dont les cas d'**idempotence** et de **rollback** pour tout ce qui touche l'argent).
2. Toute opération sur un solde passe par le grand livre ; aucun montant en flottant.
3. Action sensible journalisée dans l'audit chaîné.
4. Contrôles de jeu responsable appliqués si la story touche une mise.
5. Démontrée en Sprint Review et acceptée par le PO.

---

## 6. Ta to-do de la semaine 1

1. Écrire la vision produit (1 page).
2. Désigner le PO et le Scrum Master.
3. Lister les exigences réglementaires de la juridiction visée (licence, certification RNG/RTP, jeu responsable, LCB-FT, protection des données).
4. Créer le backlog avec les 14 épopées ci-dessus et détailler uniquement les sprints 0 et 1.
5. Planifier le Sprint 0.
