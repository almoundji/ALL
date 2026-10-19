# Déploiement et configuration

Cette page s'adresse aux équipes techniques (développement, exploitation, intégration). Elle décrit l'exécution locale, le déploiement sur Netlify, les variables d'environnement, le pont NFC, la publication de l'app iPhone et le passage à l'échelle nationale.

## Vue d'ensemble

| Composant | Emplacement | Rôle |
| --- | --- | --- |
| Interfaces web | `wawid/public/` | Portail voyageur (`/`), back-office (`/admin/`), kiosque eGate (`/gate/`) |
| API | `wawid/netlify/functions/api.mts` | Fonction unique routée sur `/api/*` |
| Bibliothèques serveur | `wawid/netlify/lib/` | `auth.mts` (comptes, sessions, clés), `store.mts` (stockage, audit), `carrier.mts` (API/PNR), `connectors.mts`, `seed.mts` (jeu de démonstration) |
| Moteur métier | `wawid/public/shared/engine.js` | MRZ, score de risque, décision eGate (partagé navigateur et serveur) |
| Pont NFC | `wawid/tools/nfc-bridge.mjs` | Service local reliant le navigateur au lecteur de passeports |
| App iPhone | `wawid/ios/` | App SwiftUI WawID e-Visa (lecture NFC) |
| Tests | `wawid/tests/` | `engine.test.mjs`, `api.test.mts`, `carrier.test.mts` |

## Développement local

### Prérequis

- Node.js 22 (version utilisée sur Netlify), dans une version qui exécute directement les fichiers TypeScript `.mts` (22.18 ou plus récente).
- Aucune base de données ni compte Netlify n'est nécessaire en local.

### Démarrer

```bash
cd wawid
npm install
npm run dev        # http://localhost:8888
```

Le serveur de développement (`dev-server.mjs`) sert les fichiers de `public/` et transmet les appels `/api/*` à la même fonction que sur Netlify. Le port se change avec la variable `PORT`.

| URL locale | Interface |
| --- | --- |
| `http://localhost:8888/` | Portail voyageur |
| `http://localhost:8888/admin/` | Back-office |
| `http://localhost:8888/gate/` | Kiosque eGate |

### Comptes et clés en local

Hors Netlify, des valeurs de développement sont utilisées lorsque les variables ne sont pas définies :

| Élément | Valeur locale par défaut |
| --- | --- |
| Compte administrateur | `admin` / `admin` |
| Comptes de démonstration | `agent`, `analyste`, `superviseur`, `tresor` avec le mot de passe `demo` |
| Clé eGate | `dev-gate-key` |
| Clé transporteur | `dev-carrier-key` (acceptée pour toutes les compagnies) |
| Secret de session | Valeur de développement fixe |

Ces valeurs par défaut **n'existent pas sur Netlify** : en production, chaque secret doit être configuré explicitement.

### Données de démonstration

En local, les données sont **en mémoire** : un jeu de démonstration fictif complet (passages, alertes, e-Visa, vols, eGates, connecteurs, factures…) est généré au démarrage et perdu à l'arrêt du serveur.

### Tests

```bash
npm test
```

Exécute `node --test tests/*.test.mjs tests/*.test.mts` : moteur métier (dont le spécimen MRZ de la norme ICAO 9303), API et décodage PAXLST/PNR. La même commande sert de commande de build sur Netlify : un test en échec bloque le déploiement.

## Déploiement sur Netlify

### Paramètres du site

| Paramètre | Valeur |
| --- | --- |
| Répertoire de base | `wawid/` |
| Commande de build | `npm test` |
| Répertoire publié | `public` |
| Fonctions | `netlify/functions` (bundler esbuild) |
| Version de Node | 22 (`NODE_VERSION` dans `netlify.toml`) |

Le fichier `wawid/netlify.toml` fixe aussi les en-têtes de sécurité (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy`, `Strict-Transport-Security`) et `X-Robots-Tag: noindex, nofollow` sur `/admin/*` et `/gate/*`.

### Stockage Netlify Blobs

Sur Netlify, les données sont enregistrées dans **Netlify Blobs**, store `wawid`, en cohérence forte. Chaque collection (`settings`, `crossings`, `alerts`, `evisas`, `users`, `audit`, etc.) est un document JSON. Au premier appel de l'API, si aucun jeu de données n'existe (clé `meta` absente), le jeu de démonstration est créé automatiquement.

Plafonds appliqués : 20 000 passages, 300 vols, 2 000 messages transporteurs conservés ; le journal d'audit n'est jamais tronqué.

### Variables d'environnement

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `SESSION_SECRET` | Oui | Clé HMAC de signature des cookies de session et des QR codes e-Visa / WawPass. Longue chaîne aléatoire (64 caractères ou plus). Sans elle, l'API répond par une erreur serveur. La changer invalide toutes les sessions et tous les QR codes émis. |
| `WAWID_ADMIN_PASSWORD` | Oui | Mot de passe du compte `admin`, créé au **premier** login si aucun compte n'existe. Sans elle, aucun compte n'est créé. |
| `WAWID_DEMO_PASSWORD` | Non | Si définie, crée aussi les comptes `agent`, `analyste`, `superviseur` et `tresor` avec ce mot de passe. À ne pas définir en production. |
| `WAWID_GATE_KEY` | Oui pour les eGates | Clé partagée des eGates et kiosques (en-tête `X-Gate-Key`). Sans elle, aucun équipement ne peut s'authentifier. |
| `WAWID_CARRIER_KEYS` | Oui pour la passerelle | Clés des compagnies, au format `CODE_IATA:clé` séparés par des virgules, par exemple `HC:<CLE_HC>,AF:<CLE_AF>`. |
| `WAWID_CONNECTOR_<ID>_URL` | Non | URL du service externe d'un connecteur (`<ID>` : `INTERPOL_SLTD`, `INTERPOL_NOM`, `WAPIS`, `FPR`, `JUD`, `ETATCIVIL`, `PAXLST`). |
| `WAWID_CONNECTOR_<ID>_TOKEN` | Non | Jeton envoyé en `Authorization: Bearer` au connecteur. |

Points importants :

- Les comptes sont créés **une seule fois**, lorsque la collection `users` est vide. Modifier ensuite `WAWID_ADMIN_PASSWORD` ne change pas le mot de passe existant : utilisez **Administration → Utilisateurs & rôles**.
- Sur Netlify, les variables **marquées comme secrètes** (`SESSION_SECRET`, mots de passe, clés) ne peuvent pas recevoir une valeur unique « pour tous les contextes » : il faut saisir une valeur **par contexte de déploiement**, au minimum **Production** (puis, si besoin, Deploy Previews et Branch deploys avec des valeurs distinctes). Une variable secrète définie seulement pour un autre contexte est absente en production.
- Les variables doivent avoir la portée **Functions** (et Builds si nécessaire). Après modification, redéployez le site.

Exemple de saisie avec la CLI Netlify :

```bash
netlify env:set SESSION_SECRET "<SESSION_SECRET>" --context production --secret
netlify env:set WAWID_ADMIN_PASSWORD "<MOT_DE_PASSE_ADMIN>" --context production --secret
netlify env:set WAWID_GATE_KEY "<CLE_EGATE>" --context production --secret
netlify env:set WAWID_CARRIER_KEYS "HC:<CLE_HC>,AF:<CLE_AF>" --context production --secret
```

### Mise en service d'un kiosque eGate

1. Ouvrez `https://wawid-waw-telecom.netlify.app/gate/` sur le poste du kiosque (paramètre `?gate=<ID>` facultatif pour choisir la porte).
2. Saisissez la clé d'équipement (`WAWID_GATE_KEY`) ; elle est mémorisée dans le navigateur du kiosque.
3. Une clé refusée (`401`) est effacée et redemandée.

### Réinitialiser la démonstration

Dans le back-office, **Administration → Paramètres → Réinitialiser la démonstration** (permission `system`, rôle Administrateur). L'appel `POST /api/system/reset` régénère toutes les collections opérationnelles. Les **comptes utilisateurs sont conservés** ; le journal d'audit repart d'une nouvelle chaîne, dont la première entrée trace la réinitialisation.

## Pont NFC (lecture des puces au guichet et au kiosque)

Un navigateur ne peut pas dialoguer avec la puce d'un passeport (Web NFC se limite au format NDEF). WawID passe donc par un **pont local** installé sur chaque poste de travail et relié au lecteur.

### Lancer le pont

```bash
cd wawid
node tools/nfc-bridge.mjs     # écoute sur http://127.0.0.1:8765
```

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `NFC_BRIDGE_PORT` | `8765` | Port d'écoute (boucle locale `127.0.0.1` uniquement) |
| `NFC_BRIDGE_MODE` | `simulation` | `simulation` renvoie des lectures simulées ; toute autre valeur exige un pilote de lecteur réel |
| `NFC_BRIDGE_ORIGIN` | `https://wawid-waw-telecom.netlify.app,http://localhost:8888` | Origines web autorisées (liste séparée par des virgules) ; toute autre origine reçoit `403` |

### Protocole

| Route | Entrée | Sortie |
| --- | --- | --- |
| `GET /status` | — | `{ "reader", "version", "mode" }` |
| `POST /read` | `{ "mrz": "…" }` | `{ "read", "protocol", "dg1", "photo", "passiveAuth", "activeAuth", "reader" }` |

La MRZ est obligatoire : elle sert à dériver les clés d'accès BAC/PACE.

### Configurer le poste

Dans le back-office, **Administration → Paramètres → Lecteur NFC de ce poste** : saisissez l'adresse du pont (par défaut `http://127.0.0.1:8765`), puis **Tester**. Le réglage est propre au navigateur du poste. Si le pont est injoignable, la lecture est **simulée et signalée comme telle**.

### Brancher un vrai lecteur

Remplacez la fonction `readFromReader()` de `tools/nfc-bridge.mjs` par :

- l'appel au SDK du constructeur (Regula Document Reader, Thales/Gemalto, ARH, Innovatrics…) ; ou
- une pile PC/SC + ICAO 9303 : accès BAC/PACE dérivé de la MRZ, lecture de EF.COM, DG1, DG2 et EF.SOD, authentification passive contre les certificats CSCA de l'ICAO PKD, authentification active ou chip si DG15/DG14 sont présents.

Lancez ensuite le pont avec `NFC_BRIDGE_MODE` égal au nom du pilote. Le pont n'écoute que sur la boucle locale : les données ne quittent le poste que via WawID.

## App iPhone WawID e-Visa

### Compilation locale

1. macOS avec Xcode 15 ou plus, compte Apple Developer, capacité **NFC Tag Reading** sur l'App ID `sn.wawtelecom.wawid.visa`.
2. Générer le projet :

   ```bash
   brew install xcodegen
   cd wawid/ios && xcodegen
   open WawIDVisa.xcodeproj
   ```

3. L'URL de l'API est réglée dans `project.yml` (clé `WAWIDApiBaseURL`, par défaut `https://wawid-waw-telecom.netlify.app`).
4. Ajoutez `masterList.pem` (liste maîtresse CSCA de l'ICAO PKD ou listes nationales) dans `WawIDVisa/Resources`. Sans ce fichier, la puce est lue mais l'authentification passive échoue.
5. Lancez sur un **iPhone réel** (le NFC ne fonctionne pas dans le simulateur).

Dépendance : NFCPassportReader (licence MIT). Si votre version nomme le paramètre `password:` au lieu de `mrzKey:`, adaptez l'appel dans `PassportNFC.swift`.

### Publication TestFlight (GitHub Actions)

Le workflow `.github/workflows/wawid-ios-testflight.yml` (« WawID iOS → TestFlight ») s'exécute sur un Mac GitHub (`macos-15`) : génération du projet avec XcodeGen, puis `bundle exec fastlane beta` (compilation, signature automatique, envoi). Il se déclenche manuellement ou à chaque push sur `main` modifiant `wawid/ios/**`. Le numéro de build est celui de l'exécution GitHub.

1. Dans App Store Connect, créez l'app « WawID e-Visa » (bundle `sn.wawtelecom.wawid.visa`).
2. Dans **Users and Access → Integrations → App Store Connect API**, créez une clé de rôle **App Manager** et téléchargez `AuthKey_XXXX.p8`.
3. Dans GitHub, **Settings → Secrets and variables → Actions**, ajoutez :

| Secret | Contenu |
| --- | --- |
| `APPLE_TEAM_ID` | Identifiant d'équipe Apple |
| `ASC_KEY_ID` | Identifiant de la clé API |
| `ASC_ISSUER_ID` | Identifiant de l'émetteur |
| `ASC_KEY_P8_BASE64` | Contenu du fichier `.p8` encodé en base64 (`base64 -i AuthKey_XXXX.p8`) |

4. Lancez le workflow depuis l'onglet **Actions**. La version apparaît dans TestFlight après traitement par Apple (10 à 30 min). Ajoutez des testeurs internes (jusqu'à 100) ou un groupe externe (revue « Beta App Review », environ 24 h).

En local sur un Mac :

```bash
cd wawid/ios
bundle install
APPLE_TEAM_ID=<TEAM_ID> ASC_KEY_ID=<KEY_ID> ASC_ISSUER_ID=<ISSUER_ID> ASC_KEY_P8_BASE64=<P8_BASE64> bundle exec fastlane beta
```

État : le code de l'app a été écrit et relu mais doit encore passer une compilation Xcode et un test sur iPhone avec un vrai passeport biométrique.

## Passage à l'échelle nationale

Le démonstrateur (Netlify Functions + Netlify Blobs) valide les parcours, pas la charge, la souveraineté ni la continuité de service. Synthèse de `docs/ARCHITECTURE.md` :

### Limites bloquantes du démonstrateur

1. **Stockage** : chaque collection est un document JSON réécrit à chaque écriture (dernier écrivain gagnant) ; deux écritures simultanées peuvent perdre un passage.
2. **Lecture globale** : `/api/data` charge toutes les collections.
3. **Souveraineté** : hébergement hors du territoire, incompatible avec la loi n° 2008-12 pour des fichiers régaliens.
4. **Pas de mode hors ligne** aux postes.
5. **Biométrie simulée** : ni comparaison 1:N ni SDK certifié.
6. **Identité des agents** par mot de passe seul.

### Dimensionnement cible (×5 sur les estimations)

| Indicateur | Estimation | Cible |
| --- | --- | --- |
| Passages annuels | ~6 millions | 30 millions |
| Pointe AIBD | ~3 000 voyageurs/h | 15 000/h |
| Transactions de contrôle | ~2/s | 10/s soutenu, 50/s en rafale |
| Demandes e-Visa | ~300 000/an | 1,5 million/an |
| Base biométrique | ~10 M personnes à 5 ans | 50 M |

### Architecture cible

- Centre de données national actif + site de secours sur le territoire (RPO < 5 min, RTO < 1 h, disponibilité 99,95 %).
- Passerelle API + IAM (OIDC, MFA, cartes agents PKI), HSM pour les clés et signatures.
- PostgreSQL partitionné par mois + bus d'événements Kafka ; `store.mts` remplacé par un dépôt SQL.
- ABIS biométrique certifié (1:1 et 1:N), détection du vivant ISO/IEC 30107-3, lecteurs RFID avec vérification PA/AA via l'ICAO PKD.
- Serveur de poste (edge) avec copie locale chiffrée des listes et file d'attente des passages : le contrôle continue sans liaison.
- Seuls le portail public et la passerelle transporteurs sont exposés, en DMZ derrière un CDN/WAF.

Le moteur métier, les contrats d'API et les interfaces sont réutilisés tels quels ; seules les couches stockage, identité, biométrie et connecteurs changent. Ces chantiers correspondent aux sprints S5 à S8 du backlog (`docs/SCRUM.md`).
