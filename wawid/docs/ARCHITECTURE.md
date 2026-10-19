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
                         │  CDN/WAF anti-DDoS ─ API publique e-Visa / WawPass / APIS Gateway (DMZ)    │
                         └───────────────────────────────┬────────────────────────────────────────────┘
                                                         │ (flux filtrés, unidirectionnels si possible)
┌──────────────────────── Centre de données national principal (actif) ───────────────────────────────┐
│  Passerelle API + IAM (OIDC, MFA, PKI cartes agents) ─ HSM (clés, signatures QR, chiffrement)        │
│  Services : contrôle · eGates · TMS (alertes, règles, dossiers) · APIS/PNR · e-Visa (VMS) · audit     │
│  PostgreSQL (partitionné par mois, réplication synchrone) ─ bus d'événements (Kafka)                  │
│  ABIS biométrique (1:1 et 1:N, visage + empreintes + iris) ─ moteur de correspondance nominale        │
│  Entrepôt analytique (BI, tableaux de bord) ─ SIEM / SOC ─ sauvegardes chiffrées hors ligne            │
│  Connecteurs : BCN Interpol (I-24/7 FIND/MIND) · WAPIS · FPR · état civil/passeports (DAF) · PIU       │
└──────────────┬─────────────────────────────────────────────────────────────┬────────────────────────┘
               │ réplication asynchrone (RPO < 5 min)                         │ MPLS/VPN chiffré
┌──────────────┴───────────── Site de secours (DR) ─────────┐        + secours 4G/VSAT par poste
│  Même pile, bascule < 1 h (RTO)                            │                    │
└────────────────────────────────────────────────────────────┘   ┌────────────────┴──────────────────┐
                                                                  │ Serveur de poste (edge) — par poste │
                                                                  │  copie locale des listes (synchro   │
                                                                  │  < 1 min), file d'attente des        │
                                                                  │  passages, décision hors ligne       │
                                                                  │  Guichets · eGates · kiosques · CCTV │
                                                                  └──────────────────────────────────────┘
```

### Principes

- **Souveraineté** : hébergement au datacenter national (ex. Diamniadio) + site de secours sur le territoire ; aucune donnée biométrique hors du pays. Seuls le portail public et l'API transporteurs sont exposés, en DMZ.
- **Fonctionnement dégradé** : chaque poste dispose d'un serveur local avec la copie chiffrée des listes (déjà prévu dans le modèle « connecteurs + copie locale » du démonstrateur). Sans liaison, le contrôle continue ; les passages sont mis en file et resynchronisés, les correspondances critiques déclenchent une alerte locale.
- **Événements** : chaque passage, alerte, décision e-Visa est un événement (Kafka) consommé par le TMS, l'analytique et l'audit. Le journal d'audit chaîné (SHA-256) du démonstrateur est conservé et ancré périodiquement (signature HSM).
- **Séparation des rôles** (moindre privilège, déjà en place) + **MFA** et carte agent, sessions courtes, traçabilité de chaque consultation de fiche.
- **Biométrie** : ABIS certifié (performances NIST FRTE/PFT), détection du vivant ISO/IEC 30107-3, normes ISO/IEC 19794 / 39794. L'enclave du terminal ne transmet que gabarits chiffrés et scores.
- **Interopérabilité** : API (UN/EDIFACT PAXLST), PNR (PNRGOV), Interpol via le BCN, normes OACI annexe 9 et Doc 9303, ICAO PKD pour la vérification des puces de passeports (Passive/Active Authentication).
- **Disponibilité** : objectif 99,95 % au central, 100 % de capacité de contrôle au poste (mode dégradé), RPO < 5 min, RTO < 1 h, tests de bascule semestriels.

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
| Exploitation | Netlify | Kubernetes on-premise, SOC/SIEM, sauvegardes, MCO | Élevé |

Ces chantiers correspondent aux sprints 5 à 8 du backlog (`docs/SCRUM.md`).

## 5. Ce que le démonstrateur valide déjà

- Les parcours complets (guichet, eGate/ABC, e-Visa, WawPass, APIS, Threat Monitor, dossiers) et l'ergonomie Fiori.
- La logique métier testée (`npm test`), y compris le spécimen MRZ de la norme ICAO 9303.
- Le contrat des connecteurs externes et le principe de repli sur copie locale.
- La traçabilité (journal chaîné vérifiable) et la matrice des droits.
