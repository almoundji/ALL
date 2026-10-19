# WawID — gestion des identités et des frontières

Solution WAW Telecom couvrant le périmètre d'un système intégré de contrôle aux frontières
(type Securiport CAISS : BCS, TMS, APIS, e-Visa/TAS, SES), avec une ergonomie inspirée de SAP Fiori.

| Interface | URL | Public |
| --- | --- | --- |
| Portail voyageur | `/` | Voyageurs : e-Visa, suivi, WawPass (taxe de sécurité), pré-enrôlement eGate |
| Kiosque eGate / ABC | `/gate/` | Écran des portes automatiques (clé d'équipement) |
| Back-office | `/admin/` | Agents, analystes, superviseurs, administrateurs |
| App iPhone e-Visa | `ios/` | Demande e-Visa avec lecture NFC de la puce du passeport |

## Fonctionnalités

**Contrôle frontière (BCS)** — contrôle guichet en 4 étapes (MRZ ICAO 9303 TD3/TD1, lecture NFC de la puce,
visage + 4 empreintes + iris, interrogation des fichiers, score de risque explicable, décision motivée) ;
eGates, kiosques ABC et corridor biométrique (supervision temps réel, paramètres et commandes à distance,
orientation vers le guichet) ; historique des passages (filtres, tri, export CSV, fiche détaillée) ;
recherche voyageur 360° avec résolution d'identité ; véhicules (VRS) ; vérification des QR e-Visa / WawPass.

**Tableau de bord** — entrées / sorties par heure ou par jour, part eGate, suspicions de fraude par type,
décisions, comparaison par poste, nationalités ; filtres période / poste / canal ; vue tableau et export.

**Renseignement (TMS)** — Threat Monitor maître-détail, dossiers de contrôle secondaire avec entretien
structuré, listes de surveillance multi-sources (Interpol notices et SLTD, WAPIS, fichier des personnes
recherchées, interdictions judiciaires, personnes d'intérêt), règles de ciblage paramétrables,
connecteurs externes (contrat REST, repli sur copie locale).

**APIS / PNR** — APIS Monitor (pré-contrôle de chaque passager annoncé), APIS Gateway (chargement de
manifeste), conformité des transporteurs.

**e-Visa (TAS / VMS)** — dépôt en ligne avec déclaration sanitaire et paiement, pré-contrôle automatique,
instruction (approbation, refus, demande d'information), QR code signé.

**Administration (SES)** — supervision des équipements, utilisateurs et rôles, journal d'audit chaîné SHA-256,
paramètres (politique visa, pont NFC du poste), réinitialisation de la démo, suivi Scrum du projet.

## Lancer en local
```bash
cd wawid
npm install
npm run dev        # http://localhost:8888  — comptes admin/admin, agent|analyste|superviseur/demo
npm test           # moteur métier + API
node tools/nfc-bridge.mjs   # pont NFC local (simulation) pour le guichet et le kiosque
```
En local, les données sont en mémoire et régénérées à chaque démarrage ; la clé d'eGate est `dev-gate-key`.

## Déploiement Netlify
Site avec répertoire de base `wawid/` (voir `netlify.toml`). Variables d'environnement :

| Variable | Rôle |
| --- | --- |
| `SESSION_SECRET` | Clé de signature des sessions et des QR (longue chaîne aléatoire) — obligatoire |
| `WAWID_ADMIN_PASSWORD` | Mot de passe du compte `admin` créé au premier login — obligatoire |
| `WAWID_DEMO_PASSWORD` | Si défini, crée aussi `agent`, `analyste`, `superviseur` |
| `WAWID_GATE_KEY` | Clé des eGates / kiosques |
| `WAWID_CONNECTOR_<ID>_URL` / `_TOKEN` | Branchement réel d'un connecteur (ex. `WAWID_CONNECTOR_FPR_URL`) |

Données stockées dans Netlify Blobs (store `wawid`), jeu de démonstration créé au premier appel.

## Documentation
- `docs/ARCHITECTURE.md` — **passage à l'échelle nationale** (limites du démonstrateur, architecture cible souveraine).
- `docs/SCRUM.md` — organisation Scrum et sprints.
- `ios/README.md` — app iPhone e-Visa avec NFC.

Toutes les données de démonstration sont fictives. Les scores biométriques et la lecture de puce sont
simulés tant qu'aucun SDK / lecteur n'est branché.
