# Fonctionnalités de l'outil et cas d'usage

Document de présentation destiné aux décideurs (Présidence, MCTN, DRN, Senum, CCDOC) et aux analystes.
Il décrit ce que fait la plateforme aujourd'hui (prototype livré), puis les cas d'usage opérationnels qu'elle sert,
en reprenant les enjeux du compte rendu de la mission de Dubaï : collecter, centraliser, croiser, analyser, monitorer.

---

## 1. Fonctionnalités

### 1.1 Un référentiel unique : l'ontologie

| Élément | Contenu |
| --- | --- |
| **10 types d'objets** | Personne, Organisation, Véhicule, Téléphone, Lieu, Événement, Compte bancaire, Appareil (IMEI, MAC), Document, Navire |
| **13 types de liens** | connaît, membre de, possède, utilise, a appelé, localisé à, a participé à, a viré vers, a voyagé vers, mentionne, lié à, famille de, employé par |
| **Attributs libres** | Chaque objet porte des attributs (date de naissance, plaque, IBAN, opérateur…) sans schéma figé : une nouvelle source s'intègre sans développement |
| **Géolocalisation** | Latitude / longitude sur tout objet, affichées sur la carte |
| **Validité temporelle** | Dates de début / fin sur les liens (abonnement, emploi, détention) |

### 1.2 Résolution d'identité (fusion des doublons)

- **Clés fortes** : un téléphone écrit `77 123 45 67`, `+221771234567` ou `00221 77 123 45 67` est la même entité ; idem pour
  les plaques, IBAN, IMEI, pièces d'identité.
- **Appariement flou** des noms (accents, tirets, casse, ordre des mots), avec garde-fous : dates de naissance contradictoires
  ou libellé trop court par rapport au candidat empêchent la fusion.
- **Fusion conservatrice** : aucune valeur n'est écrasée ; les variantes sont conservées et visibles sur la fiche.
- **Confiance agrégée** : chaque source indépendante augmente le score de confiance de l'objet.

### 1.3 Provenance et cotation des sources

- Chaque affirmation est rattachée à sa **source** (HUMINT, OSINT, SIGINT, FININT, GEOINT, fichiers administratifs, partenaires),
  cotée **A à F** (fiabilité, échelle OTAN), avec référence externe (fichier, ligne), score d'appariement et horodatage.
- La fiche d'une entité montre la **chronologie des sources** qui l'ont alimentée : l'analyste sait toujours *qui a dit quoi, quand*.

### 1.4 Recherche

- Recherche globale (`Ctrl K`) sur les libellés **et** les attributs : nom, alias, numéro, plaque, IBAN, lieu, mot-clé.
- Filtres par type et par niveau de classification ; ouverture directe des résultats dans le graphe.

### 1.5 Analyse de liens

- **Expansion de voisinage** sur 1 à 4 niveaux depuis une ou plusieurs entités racines ; double-clic pour étendre.
- **Plus court chemin** entre deux entités : « par qui A est-il relié à B ? ».
- **Centralité** : degré, intermédiarité (betweenness : les pivots qui relient des groupes) et PageRank (influence).
- **Détection de communautés** : regroupements naturels (cellules, réseaux de sociétés, grappes téléphoniques).
- Quatre dispositions (force, concentrique, hiérarchique, ajustement), légende par type, mise en évidence du chemin.

### 1.6 Carte opérationnelle

- Toutes les entités géolocalisées visibles dans le périmètre de l'utilisateur, filtrables par type, avec accès à la fiche et au graphe.
- Fond de carte substituable par un serveur de tuiles interne pour un déploiement isolé.

### 1.7 Dossiers d'enquête

- Référence normalisée `DRN-AAAA-NNNN`, statut (ouvert, en cours, clos), priorité P0–P3, classification et compartiment propres.
- Entités rattachées avec un **rôle** (objectif, témoin, associé, moyen) et graphe du dossier.
- **Journal d'analyse typé** : note, hypothèse, décision, action ; chaque entrée est signée et horodatée. Les décisions sont motivées et traçables.

### 1.8 Veille et alertes

- Règles sur tout champ (libellé ou attribut) : égal, contient, flou, expression régulière, par type d'objet, avec sévérité.
- Évaluées **à chaque ingestion** et **rétroactivement** sur l'existant à la création d'une règle.
- Workflow : nouvelle → prise en compte (assignée) → close. Les alertes portant sur des objets hors habilitation sont invisibles.

### 1.9 Ingestion de données

- Fichiers CSV / JSON, détection automatique du séparateur, prévisualisation des colonnes.
- **Mapping déclaratif** colonnes → objets et liens ; 4 modèles fournis : annuaire de personnes, relevés d'appels (CDR),
  immatriculations, virements.
- Rapport d'ingestion : lignes lues, objets créés, objets fusionnés, liens créés, alertes levées, erreurs ligne par ligne.
- Chaque import est rattaché à une source cotée et à un niveau de classification.

### 1.10 Sécurité et habilitations

- **4 niveaux** : Non protégé, Diffusion restreinte, Confidentiel Défense, Secret Défense.
- **Compartiments** de besoin d'en connaître (ex. OPS, FIN, CYBER) : un analyste CD sans le compartiment CYBER ne voit pas un objet CD/CYBER.
- **Non-révélation** : un objet inaccessible n'existe pas pour l'utilisateur (404), y compris dans les graphes, chemins, alertes et dossiers.
- **Rôles** : administrateur, analyste (lecture / écriture dans son périmètre), lecteur.
- **Propagation** : la fusion de deux objets conserve la classification la plus protectrice ; nul ne peut créer au-dessus de son niveau.
- **Bandeau de classification** permanent, coloré selon la session.

### 1.11 Journal d'audit inviolable

- Toute connexion (réussie ou non), consultation de fiche, expansion de graphe, recherche de chemin, lecture de dossier et
  toute écriture sont journalisées avec l'utilisateur, l'horodatage, la ressource et l'adresse IP.
- Les entrées sont **chaînées par SHA-256** : chaque ligne scelle la précédente. La vérification d'intégrité détecte toute
  altération, même par un administrateur de la base. Chaque utilisateur voit son propre journal ; l'administrateur voit tout.

### 1.12 Décisionnel et administration

- Tableau de bord : volumes par type et par classification, alertes à traiter, acteurs les plus influents, pivots, ingestions récentes.
- Gestion des utilisateurs : rôle, niveau, compartiments, unité, activation.
- API REST documentée (OpenAPI), prête pour l'intégration avec d'autres systèmes gouvernementaux.

---

## 2. Cas d'usage

Chaque cas d'usage ci-dessous est réalisable avec le prototype sur le jeu de données de démonstration (fictif), puis sur
données réelles après raccordement des sources.

### CU-01 — Enquête sur une filière de trafic (DRN / Douanes / Gendarmerie)

**Situation** : une saisie au Port de Dakar implique un chauffeur et un camion.
**Parcours** : rechercher la plaque → ouvrir le graphe (profondeur 2) → découvrir l'employeur, le gérant, ses téléphones,
ses contacts à l'étranger, l'entrepôt où le véhicule a été observé → créer le dossier, rattacher les objectifs, consigner les
hypothèses → poser une règle de veille sur les numéros et les passages frontière.
**Valeur** : ce qui prenait des jours de croisement de fichiers (immatriculations, CDR, HUMINT) se fait en minutes, avec la provenance de chaque lien.

### CU-02 — Lutte contre le blanchiment (CENTIF / FININT)

**Situation** : déclaration de soupçon sur un virement vers l'étranger.
**Parcours** : partir du compte émetteur → remonter à la société titulaire, à sa gérante, à sa comptable → suivre les virements
vers d'autres comptes → identifier via « plus court chemin » qu'une société de transit et une société d'import-export
partagent des flux et des personnes.
**Valeur** : les flux financiers et les liens humains sont dans le même graphe, cloisonnés dans le compartiment FIN.

### CU-03 — Analyse de relevés d'appels (SIGINT / enquête judiciaire)

**Situation** : réception des CDR d'un opérateur pour un numéro cible.
**Parcours** : ingestion avec le modèle « cdr_appels » → les numéros sont dédoublonnés automatiquement → la centralité révèle
le numéro pivot et les communautés d'appels → les numéros à indicatif étranger déclenchent une alerte de veille.
**Valeur** : des milliers de lignes deviennent un réseau lisible ; les numéros déjà connus (HUMINT, fichiers) sont reliés sans ressaisie.

### CU-04 — Protection des infrastructures critiques (GEOINT)

**Situation** : surveillance des sites sensibles (port, aéroport, centrales, barrages).
**Parcours** : règle de veille « lieu de type infrastructure critique » → toute nouvelle entité ou événement localisé sur un site
sensible lève une alerte → carte opérationnelle des événements et des véhicules observés à proximité.
**Valeur** : passage d'une surveillance réactive à une surveillance par exception.

### CU-05 — Contrôle des frontières (Police de l'air et des frontières)

**Situation** : passages répétés d'un véhicule aux postes de Rosso et Karang.
**Parcours** : ingestion des passages (modèle véhicules ou API) → lien « a voyagé vers » horodaté → corrélation avec les
propriétaires et les événements → alerte sur les postes frontière désignés.
**Valeur** : détection de circuits logistiques, appui aux contrôles ciblés.

### CU-06 — Cybersécurité (incident sur un opérateur)

**Situation** : intrusion réseau signalée par un opérateur télécom.
**Parcours** : les objets de l'incident (IMEI, personne, cybercafé) sont créés dans le compartiment CYBER au niveau Secret ;
seuls les analystes habilités CYBER les voient ; le reste du graphe reste accessible aux autres services sans fuite.
**Valeur** : coopération inter-services sans compromettre les enquêtes les plus sensibles.

### CU-07 — Coopération inter-services et besoin d'en connaître

**Situation** : une gendarmerie régionale alimente la plateforme mais ne doit voir que ses propres dossiers et les objets de niveau DR.
**Parcours** : compte « officier » au niveau DR sans compartiment → il voit les véhicules, personnes et lieux publics ou
restreints, pas les objets CD/OPS ; ses contributions enrichissent le graphe central ; tout est journalisé.
**Valeur** : chaque service contribue en confiance ; la DRN garde la vue d'ensemble.

### CU-08 — Veille sur personnes d'intérêt

**Situation** : liste de personnes à surveiller.
**Parcours** : règles « flou » sur les noms (tolérantes aux orthographes) → toute nouvelle source mentionnant la personne
déclenche une alerte, même avec une graphie différente → l'alerte est prise en compte, assignée, close.
**Valeur** : aucune mention ne passe inaperçue, quel que soit le fichier d'origine.

### CU-09 — Pilotage gouvernemental

**Situation** : le comité de pilotage veut mesurer l'activité et l'état de la menace.
**Parcours** : tableau de bord décisionnel (volumes, alertes, dossiers, acteurs clés) ; exports pour le comité ; journal
d'audit pour le contrôle interne.
**Valeur** : un pilotage fondé sur des indicateurs issus des mêmes données que les analystes.

### CU-10 — Contrôle, conformité et confiance

**Situation** : une autorité de contrôle veut s'assurer de l'usage proportionné de l'outil.
**Parcours** : vérification de l'intégrité de la chaîne d'audit ; revue des consultations par agent ; vérification que
chaque recherche sensible est rattachée à un dossier.
**Valeur** : la traçabilité n'est pas une promesse mais une propriété cryptographique du système.

---

## 3. Ce que le prototype ne fait pas encore

Flux temps réel (Kafka), recherche phonétique et texte intégral (OpenSearch), extraction automatique d'entités dans les
comptes rendus (NER), scoring de risque, SSO / MFA, chronologie interactive, rapports PDF classifiés, serveur de tuiles
interne, haute disponibilité. Tout cela est planifié dans la feuille de route en 12 sprints (`docs/SCRUM.md`).
