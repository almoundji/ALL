# Architecture

## 1. Principes

1. **Ontologie d'abord** : tout est objet (entité) ou lien (relation), typé, avec attributs libres. Les sources alimentent
   l'ontologie, jamais l'inverse. C'est le choix qui rend Palantir Gotham ou Data Fusion interopérables.
2. **Provenance intégrale** : aucune valeur sans source, aucune source sans cotation. La fusion n'écrase jamais, elle accumule.
3. **Sécurité par construction** : le filtrage par habilitation vit dans une couche unique (`services/access.py`) appelée par
   toutes les routes ; aucun endpoint n'interroge la base directement sans elle.
4. **Auditabilité inviolable** : journal chaîné, vérifiable sans confiance dans l'administrateur de la base.
5. **Souveraineté** : 100 % logiciel libre, déployable hors ligne (Docker), aucune télémétrie, aucun appel sortant obligatoire.

## 2. Vue logique

```
 Sources (CSV, JSON, API, HUMINT…) ──► Ingestion ──► Résolution d'identité ──► Graphe d'entités (ontologie)
                                           │                                        │
                                           └──► Veille (règles) ──► Alertes          ├──► Analyse de liens (NetworkX)
                                                                                    ├──► Recherche / Carte / Dossiers
            Journal d'audit chaîné ◄────── toutes les routes ◄───── Couche d'accès (niveau + compartiment)
```

## 3. Modèle de sécurité

| Dimension | Mécanisme |
| --- | --- |
| Authentification | JWT signé (HS256), expiration 8 h, mots de passe bcrypt. Cible : SSO (OIDC / Keycloak) + MFA, cartes à puce. |
| Rôles | `admin` (tout), `analyst` (lecture / écriture dans son périmètre), `viewer` (lecture seule). |
| Niveau | Objet `classification` 0–3 ≤ `clearance` de l'utilisateur. Un utilisateur ne peut pas créer au-dessus de son niveau. |
| Compartiment | Objet `compartment` ∈ compartiments de l'utilisateur (ou vide). Règle du besoin d'en connaître. |
| Propagation | La fusion de deux objets conserve la classification **la plus protectrice**. |
| Non-révélation | Un objet inaccessible renvoie 404, jamais 403 : l'existence n'est pas divulguée. Les relations vers des objets inaccessibles disparaissent du graphe. |
| Audit | `LOGIN`, `LOGIN_FAILED`, `ENTITY_VIEW`, `GRAPH_EXPAND`, `GRAPH_PATH`, `CASE_VIEW`, toutes les écritures. Hachage SHA-256(prev ∥ ts ∥ user ∥ action ∥ ressource ∥ détails ∥ IP). |

Cible production : chiffrement au repos (LUKS / TDE PostgreSQL), TLS mutuel entre services, export quotidien du dernier hachage
d'audit vers un support externe (ou un HSM) pour rendre toute falsification détectable même par un administrateur système.

## 4. Résolution d'identité

1. **Blocage** par clé déterministe : `phone:221771234567`, `plate:DK4521AB`, `id:<pièce>`, `iban:…`, `imei:…`, `geo:lat,lon`,
   sinon `type:libellé normalisé`.
2. **Appariement flou** (libellés seulement, types sans identifiant fort) : `token_set_ratio ≥ 90`, avec garde-fous
   (ratio de jetons ≥ 0,6 ; dates de naissance contradictoires ⇒ rejet).
3. **Fusion conservatrice** : attributs manquants complétés, conflits stockés dans `_variants`, confiance +0,1 par source.

Évolutions prévues : règles par type configurables (poids, seuils), file de revue humaine pour les scores 80–90, fusion /
scission manuelle avec historique (sprint 6), translittération arabe / wolof.

## 5. Montée en charge — trajectoire

| Composant | Prototype | Pilote (10⁶ objets) | Cible nationale (10⁸+) |
| --- | --- | --- | --- |
| Base relationnelle | SQLite | PostgreSQL 16 + partitions | PostgreSQL HA (Patroni) |
| Graphe | NetworkX en mémoire par requête | PostgreSQL + Apache AGE ou Neo4j Community | Neo4j Enterprise / JanusGraph sur Cassandra |
| Recherche | `LIKE` | OpenSearch (texte intégral, facettes, phonétique) | Cluster OpenSearch |
| Ingestion | Synchrone, fichiers | Workers Celery / RQ + file Redis | Kafka + Flink (flux temps réel, CDR, AIS, ANPR) |
| Objets binaires | — | MinIO (S3) pour documents, images | MinIO distribué |
| IA | Centralité, communautés | NER (extraction d'entités dans les rapports), détection d'anomalies sur CDR / flux financiers | Modèles sur mesure hébergés localement |
| Carte | Tuiles OSM Internet | Serveur de tuiles interne (TileServer GL, données OSM Sénégal) | Idem + imagerie GEOINT |

L'API REST et l'ontologie restent stables sur toute la trajectoire : seules les implémentations des services changent.

## 6. API

Documentation interactive : `/docs` (OpenAPI). Points principaux :

- `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/meta`
- `GET|POST /api/entities`, `GET|PATCH|DELETE /api/entities/{id}`, `GET /api/entities/{id}/graph?depth=`
- `POST /api/relations`, `GET /api/graph/expand?ids=&depth=`, `GET /api/graph/path?a=&b=`, `GET /api/graph/analytics`
- `GET|POST /api/cases`, `/api/cases/{id}/entities`, `/api/cases/{id}/notes`
- `GET|POST /api/ingest/sources`, `GET /api/ingest/templates`, `POST /api/ingest/preview`, `POST /api/ingest/upload`, `GET /api/ingest/jobs`
- `GET|POST /api/watchlists`, `GET|PATCH /api/alerts`
- `GET /api/dashboard`, `GET /api/audit`, `GET /api/audit/verify`, `GET|POST|PATCH /api/users`
