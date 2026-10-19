# WawID — Architecture : du démonstrateur au déploiement national

## 1. Verdict

| Question | Réponse |
| --- | --- |
| Le démonstrateur actuel (Netlify Functions + Netlify Blobs) peut-il tourner pour tout un pays ? | **Non.** Il est conçu pour démontrer les parcours, pas pour la charge, la souveraineté ni la continuité de service d'un système frontalier national. |
| Le code est-il réutilisable ? | **Oui, en grande partie** : moteur métier (`public/shared/engine.js`), contrats d'API (`/api/*`), interfaces (back-office, kiosque, portail) et règles de gestion se transposent tels quels. Seules les couches **stockage**, **identité**, **biométrie** et **connecteurs** changent d'implémentation. |
| L'architecture cible ci-dessous tient-elle l'échelle nationale ? | **Oui**, elle est dimensionnée avec une marge ×5 sur les volumes estimés, avec fonctionnement dégradé hors ligne aux postes. |

### Limites bloquantes du démonstrateur

1. **Stockage** : chaque collection est un seul document JSON réécrit à chaque écriture (dernier écrivain gagnant). Deux agents qui valident en même temps peuvent perdre un passage. Inacceptable au-delà de la démo.
2. **Lecture globale** : `/api/data` charge toutes les collections ; à des millions de passages, impossible.
3. **Souveraineté** : données biométriques et nominatives hébergées hors du territoire (Netlify, région US/UE). La loi n° 2008-12 (CDP) et la doctrine des fichiers régaliens imposent un hébergement national.
4. **Pas de mode hors ligne** : un poste terrestre qui perd sa liaison ne peut plus contrôler.
5. **Biométrie simulée** : pas de comparaison 1:N (doublons d'identité, recherche par visage) ni de SDK certifié.
6. **Identité des agents** : mots de passe ; il faut carte agent / MFA / PKI.

## 2. Dimensionnement (hypothèses Sénégal, à confirmer avec la DPAF)

| Indicateur | Estimation | Dimensionnement cible (×5) |
| --- | --- | --- |
| Passages annuels tous postes | ~6 millions | 30 millions |
| Pointe AIBD | ~3 000 voyageurs/heure | 15 000 / h |
| Transactions de contrôle (pointe nationale) | ~2 / s | 10 / s soutenu, 50 / s en rafale |
| Interrogations listes (par passage : SLTD, nominal, FPR, WAPIS, POI) | ~10 / s | 50 / s |
| Demandes e-Visa | ~300 000 / an | 1,5 M / an |
| Base biométrique (gabarits visage + 4 doigts) | ~10 M personnes à 5 ans | 50 M |
| Postes / guichets / eGates | 6 postes principaux, ~60 guichets, ~20 eGates | 60 postes, 600 guichets, 200 eGates |
| Rétention | 5 ans (paramétrable) | ~150 M passages |

Ces volumes sont modestes pour une architecture transactionnelle classique : le défi n'est pas la puissance brute mais **la disponibilité, la souveraineté, la sécurité et le fonctionnement dégradé**.

## 3. Architecture cible

```
                         ┌──────────────── Internet (portail voyageur, transporteurs) ────────────────┐
                         │  CDN/WAF anti-DDoS ─ API publique e-Visa / eGate / APIS Gateway (DMZ)      │
                         └───────────────────────────────┬────────────────────────────────────────────┘
                                                         │ (flux filtrés, unidirectionnels si possible)
┌──────────── Site A — Datacenter national de Diamniadio (actif) ─────────────┐   ┌──── Site B — DC commercial Tier III (actif) ────┐
│  Passerelle API + IAM (OIDC, MFA, PKI cartes agents) ─ HSM (paire)          │   │  Même pile, mêmes services (actif-actif)         │
│  Services : contrôle · eGates · TMS · APIS/PNR · e-Visa (VMS) · audit       │◄─►│  PostgreSQL : réplique SYNCHRONE                 │
│  PostgreSQL primaire (partitionné par mois) ─ bus d'événements (Kafka)      │   │  Stockage objet répliqué ─ Kafka ─ HSM (paire)   │
│  ABIS biométrique (1:1 et 1:N) ─ stockage objet (S3) ─ SIEM / SOC           │   │  Préproduction isolée                            │
│  Connecteurs : BCN Interpol (I-24/7) · WAPIS · FPR · état civil (DAF) · PIU │   └───────────────────────┬──────────────────────────┘
└──────────────┬──────────────────────────────┬───────────────────────────────┘    fibre A↔B : deux chemins distincts
               │ réplication asynchrone        │ MPLS/VPN chiffré vers A et B      (réplication synchrone, latence ~1 ms)
┌──────────────┴────────────────────────┐     │ + secours 4G/VSAT par poste
│ Site C — coffre de sauvegarde          │     │
│ copies chiffrées immuables (WAL, bases,│   ┌─┴────────────────────────────────────┐
│ objets, audit) + copies hors ligne     │   │ Serveur de poste (edge, 2 nœuds)      │
│ hebdomadaires ; arbitre de quorum      │   │  copie locale des listes (synchro     │
└────────────────────────────────────────┘   │  < 1 min), file d'attente des         │
                                             │  passages, décision hors ligne        │
                                             │  Guichets · eGates · kiosques · CCTV  │
                                             └───────────────────────────────────────┘
```

### Principes

- **Souveraineté** : deux centres de données actifs au Sénégal + un site de sauvegarde (voir « Hébergement haute disponibilité » ci-dessous) ; aucune donnée personnelle ni clé hors du pays, aucun cloud étranger. Seuls le portail public, la plateforme des compagnies et l'API transporteurs sont exposés, derrière WAF et anti-DDoS.
- **Fonctionnement dégradé** : chaque poste dispose d'un serveur local avec la copie chiffrée des listes (déjà prévu dans le modèle « connecteurs + copie locale » du démonstrateur). Sans liaison, le contrôle continue ; les passages sont mis en file et resynchronisés, les correspondances critiques déclenchent une alerte locale.
- **Événements** : chaque passage, alerte, décision e-Visa est un événement (Kafka) consommé par le TMS, l'analytique et l'audit. Le journal d'audit chaîné (SHA-256) du démonstrateur est conservé et ancré périodiquement (signature HSM).
- **Séparation des rôles** (moindre privilège, déjà en place) + **MFA** et carte agent, sessions courtes, traçabilité de chaque consultation de fiche.
- **Biométrie** : ABIS certifié (performances NIST FRTE/PFT), détection du vivant ISO/IEC 30107-3, normes ISO/IEC 19794 / 39794. L'enclave du terminal ne transmet que gabarits chiffrés et scores.
- **Interopérabilité** : API (UN/EDIFACT PAXLST), PNR (PNRGOV), Interpol via le BCN, normes OACI annexe 9 et Doc 9303, ICAO PKD pour la vérification des puces de passeports (Passive/Active Authentication).
- **Disponibilité** : objectif 99,95 % ou plus au central, 100 % de capacité de contrôle au poste (mode dégradé) ; RPO nul dans un site ; en cas de perte d'un site, RPO ≤ 5 min (nul tant que la réplication synchrone A → B est saine) et RTO ≤ 1 h ; tests de bascule semestriels, restauration testée chaque trimestre.

### Hébergement haute disponibilité

| Site | Rôle | Option recommandée (à valider) | État des informations publiques |
| --- | --- | --- | --- |
| A | Principal, actif | Datacenter national de Diamniadio (État, exploité par Sénégal Numérique SA, ex-ADIE ; inauguré en juin 2021 ; ~1 000 m² de salles, 1,4 MW) | Présenté « de type Tier III » ; aucune certification Uptime Institute confirmée publiquement — à vérifier |
| B | Secondaire, actif | Centre commercial certifié Tier III sur un site et un réseau électrique distincts : Sonatel (Orange) Rufisque en premier choix (meilleure séparation, < ~20 km pour la réplication synchrone), Yas (ex-Tigo) Diamniadio en alternative | Rufisque : annoncé Tier III, extension signalée en 2025 par une seule source — à vérifier. Yas Diamniadio : certifié Tier III Uptime Institute (2017), mais même zone que le site A |
| C | Coffre de sauvegarde | Site sécurisé de l'État ou installation distincte, hors de la zone Dakar–Diamniadio–Rufisque si possible | À identifier avec Sénégal Numérique |

Autres centres cités dans les annuaires : Free Sénégal Diamniadio (conception Tier III, non certifié), PAIX Dakar, Onix (colocation). Modes : actif-actif pour le web et l'API ; PostgreSQL primaire/secours (Patroni ou équivalent) avec réplique synchrone en B et archivage asynchrone vers C ; stockage objet (MinIO/Ceph) et Kafka répliqués ; paire de HSM par site ; une grappe Kubernetes par site ; bascule DNS ou adresse virtuelle ; deux opérateurs par site et par poste. Sauvegardes selon la règle 3-2-1-1-0. Le plan détaillé (scénarios de bascule, phases, RACI, nomenclature, risques) figure dans la page du centre d'aide *Plan de déploiement — infrastructure haute disponibilité au Sénégal* (`docs/content/fr/plan-deploiement.md`).

## 4. Passage du démonstrateur à la cible

| Couche | Démonstrateur | Cible nationale | Effort |
| --- | --- | --- | --- |
| Moteur métier (MRZ, risque, règles, eGate) | `engine.js` | Inchangé (exécuté au central **et** sur le serveur de poste) | Faible |
| API | Fonction unique `/api/*` | Mêmes routes, découpées en services derrière une passerelle | Moyen |
| Stockage | `store.mts` (Blobs/mémoire) | PostgreSQL partitionné + Kafka ; `store.mts` remplacé par un dépôt SQL | Moyen |
| Identité agents | Mots de passe scrypt + cookie signé | OIDC (Keycloak), MFA, cartes agents PKI | Moyen |
| Biométrie | Scores simulés | SDK/ABIS certifié + lecteurs de documents RFID (PA/AA via ICAO PKD) | Élevé |
| Connecteurs | Contrat REST + copie locale | Raccordement BCN Interpol, WAPIS, FPR, DAF ; accords juridiques | Élevé (organisationnel) |
| Poste hors ligne | — | Serveur edge + synchronisation | Élevé |
| Exploitation | Netlify | Deux sites actifs + coffre, Kubernetes on-premise par site, HSM, SOC/SIEM, sauvegardes 3-2-1-1-0, MCO | Élevé |

Ces chantiers correspondent aux sprints 5 à 8 du backlog (`docs/SCRUM.md`).

## 5. Ce que le démonstrateur valide déjà

- Les parcours complets (guichet, eGate/ABC, e-Visa, pré-enrôlement eGate, APIS, Threat Monitor, dossiers) et l'ergonomie Fiori.
- La logique métier testée (`npm test`), y compris le spécimen MRZ de la norme ICAO 9303.
- Le contrat des connecteurs externes et le principe de repli sur copie locale.
- La traçabilité (journal chaîné vérifiable) et la matrice des droits.
