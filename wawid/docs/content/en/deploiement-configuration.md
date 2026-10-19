# Deployment and configuration

This page is for technical teams (development, operations, integration). It covers local execution, Netlify deployment, environment variables, the NFC bridge, iPhone app publishing and upgrading to national scale.

## Overview

| Component | Location | Role |
| --- | --- | --- |
| Web interfaces | `wawid/public/` | Traveler portal (`/`), help (`/aide/`), mobile apps (`/app/`), DPAF space (`/dpaf/`, alias of `/admin/`), airline platform (`/compagnies/`), eGate kiosk (`/gate/`) |
| API | `wawid/netlify/functions/api.mts` | Single function routed on `/api/*` |
| Server libraries | `wawid/netlify/lib/` | `auth.mts` (accounts, sessions, keys), `store.mts` (storage, audit), `carrier.mts` (API/PNR), `connectors.mts`, `seed.mts` (demo data set) |
| Business engine | `wawid/public/shared/engine.js` | MRZ, risk score, eGate decision (shared by browser and server) |
| NFC bridge | `wawid/tools/nfc-bridge.mjs` | Local service linking the browser to the passport reader |
| iPhone app | `wawid/ios/` | WawID e-Visa SwiftUI app (NFC reading) |
| Tests | `wawid/tests/` | `engine.test.mjs`, `api.test.mts`, `carrier.test.mts` |

## Local development

### Prerequisites

- Node.js 22 (the version used on Netlify), in a release that runs TypeScript `.mts` files directly (22.18 or newer).
- No database or Netlify account is needed locally.

### Start

```bash
cd wawid
npm install
npm run dev        # http://localhost:8888
```

The development server (`dev-server.mjs`) serves the files in `public/` and forwards `/api/*` calls to the same function as on Netlify. Change the port with the `PORT` variable.

| Local URL | Interface |
| --- | --- |
| `http://localhost:8888/` | Traveler portal |
| `http://localhost:8888/dpaf/` | DPAF space (alias of `/admin/`) |
| `http://localhost:8888/compagnies/` | Airline platform |
| `http://localhost:8888/app/` | Mobile apps |
| `http://localhost:8888/gate/` | eGate kiosk |

### Local accounts and keys

Outside Netlify, development values are used when the variables are not set:

| Item | Local default |
| --- | --- |
| Administrator account | `admin` / `admin` |
| Demo accounts | `agent`, `analyste`, `superviseur`, `tresor` with password `demo` |
| eGate key | `dev-gate-key` |
| Carrier key | `dev-carrier-key` (accepted for all airlines) |
| Session secret | Fixed development value |

These defaults **do not exist on Netlify**: in production, every secret must be set explicitly.

### Demo data

Locally, data is **in memory**: a complete fictitious demo data set (crossings, alerts, e-Visas, flights, eGates, connectors, invoices…) is generated at startup and lost when the server stops.

### Tests

```bash
npm test
```

Runs `node --test tests/*.test.mjs tests/*.test.mts`: business engine (including the ICAO 9303 MRZ specimen), API and PAXLST/PNR decoding. The same command is the Netlify build command: a failing test blocks the deployment.

## Netlify deployment

### Site settings

| Setting | Value |
| --- | --- |
| Base directory | `wawid/` |
| Build command | `npm test` |
| Publish directory | `public` |
| Functions | `netlify/functions` (esbuild bundler) |
| Node version | 22 (`NODE_VERSION` in `netlify.toml`) |

`wawid/netlify.toml` also sets the security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy`, `Strict-Transport-Security`) and `X-Robots-Tag: noindex, nofollow` on `/admin/*` and `/gate/*`.

### Netlify Blobs storage

On Netlify, data is stored in **Netlify Blobs**, store `wawid`, with strong consistency. Each collection (`settings`, `crossings`, `alerts`, `evisas`, `users`, `audit`, etc.) is one JSON document. On the first API call, if no data set exists (no `meta` key), the demo data set is created automatically.

Caps applied: 20,000 crossings, 300 flights, 2,000 carrier messages kept; the audit log is never truncated.

### Environment variables

| Variable | Required | Role |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | HMAC key signing session cookies and e-Visa / WawPass QR codes. Long random string (64 characters or more). Without it, the API returns a server error. Changing it invalidates all sessions and all issued QR codes. |
| `WAWID_ADMIN_PASSWORD` | Yes | Password of the `admin` account, created at the **first** login if no account exists. Without it, no account is created. |
| `WAWID_DEMO_PASSWORD` | No | If set, also creates the `agent`, `analyste`, `superviseur` and `tresor` accounts with this password. Do not set it in production. |
| `WAWID_GATE_KEY` | Yes, for eGates | Shared key of eGates and kiosks (`X-Gate-Key` header). Without it, no device can authenticate. |
| `WAWID_CARRIER_KEYS` | Yes, for the gateway | Airline keys, as comma-separated `IATA_CODE:key` pairs, e.g. `HC:<HC_KEY>,AF:<AF_KEY>`. |
| `WAWID_CONNECTOR_<ID>_URL` | No | External service URL for a connector (`<ID>`: `INTERPOL_SLTD`, `INTERPOL_NOM`, `WAPIS`, `FPR`, `JUD`, `ETATCIVIL`, `PAXLST`). |
| `WAWID_CONNECTOR_<ID>_TOKEN` | No | Token sent to the connector as `Authorization: Bearer`. |

Important points:

- Accounts are created **only once**, when the `users` collection is empty. Changing `WAWID_ADMIN_PASSWORD` afterwards does not change the existing password: use **Administration → Users & roles**.
- On Netlify, variables **marked as secret** (`SESSION_SECRET`, passwords, keys) cannot take a single "all contexts" value: you must enter a value **per deploy context**, at least **Production** (then, if needed, Deploy Previews and Branch deploys with different values). A secret variable set only for another context is missing in production.
- Variables must have the **Functions** scope (and Builds if needed). Redeploy the site after a change.

Example with the Netlify CLI:

```bash
netlify env:set SESSION_SECRET "<SESSION_SECRET>" --context production --secret
netlify env:set WAWID_ADMIN_PASSWORD "<ADMIN_PASSWORD>" --context production --secret
netlify env:set WAWID_GATE_KEY "<GATE_KEY>" --context production --secret
netlify env:set WAWID_CARRIER_KEYS "HC:<HC_KEY>,AF:<AF_KEY>" --context production --secret
```

### Setting up an eGate kiosk

1. Open `https://wawid-waw-telecom.netlify.app/gate/` on the kiosk workstation (optional `?gate=<ID>` parameter to select the gate).
2. Enter the device key (`WAWID_GATE_KEY`); it is stored in the kiosk browser.
3. A rejected key (`401`) is cleared and requested again.

### Resetting the demo

In the back office, **Administration → Settings → Reset the demo** (`system` permission, Administrator role). The `POST /api/system/reset` call regenerates all operational collections. **User accounts are kept**; the audit log restarts with a new chain whose first entry records the reset.

## NFC bridge (chip reading at counters and kiosks)

A browser cannot talk to a passport chip (Web NFC is limited to NDEF). WawID therefore uses a **local bridge** installed on each workstation and connected to the reader.

### Running the bridge

```bash
cd wawid
node tools/nfc-bridge.mjs     # listens on http://127.0.0.1:8765
```

| Variable | Default | Role |
| --- | --- | --- |
| `NFC_BRIDGE_PORT` | `8765` | Listening port (loopback `127.0.0.1` only) |
| `NFC_BRIDGE_MODE` | `simulation` | `simulation` returns simulated reads; any other value requires a real reader driver |
| `NFC_BRIDGE_ORIGIN` | `https://wawid-waw-telecom.netlify.app,http://localhost:8888` | Allowed web origins (comma-separated); any other origin gets `403` |

### Protocol

| Route | Input | Output |
| --- | --- | --- |
| `GET /status` | — | `{ "reader", "version", "mode" }` |
| `POST /read` | `{ "mrz": "…" }` | `{ "read", "protocol", "dg1", "photo", "passiveAuth", "activeAuth", "reader" }` |

The MRZ is required: it is used to derive the BAC/PACE access keys.

### Configuring the workstation

In the back office, **Administration → Settings → NFC reader on this workstation**: enter the bridge address (default `http://127.0.0.1:8765`), then **Test**. The setting is specific to the workstation browser. If the bridge cannot be reached, the read is **simulated and flagged as such**.

### Plugging in a real reader

Replace the `readFromReader()` function in `tools/nfc-bridge.mjs` with:

- a call to the vendor SDK (Regula Document Reader, Thales/Gemalto, ARH, Innovatrics…); or
- a PC/SC + ICAO 9303 stack: BAC/PACE access derived from the MRZ, reading EF.COM, DG1, DG2 and EF.SOD, passive authentication against the CSCA certificates of the ICAO PKD, active or chip authentication when DG15/DG14 are present.

Then start the bridge with `NFC_BRIDGE_MODE` set to the driver name. The bridge only listens on loopback: data leaves the workstation only through WawID.

## WawID e-Visa iPhone app

### Local build

1. macOS with Xcode 15 or newer, an Apple Developer account, and the **NFC Tag Reading** capability on the App ID `sn.wawtelecom.wawid.visa`.
2. Generate the project:

   ```bash
   brew install xcodegen
   cd wawid/ios && xcodegen
   open WawIDVisa.xcodeproj
   ```

3. The API URL is set in `project.yml` (key `WAWIDApiBaseURL`, default `https://wawid-waw-telecom.netlify.app`).
4. Add `masterList.pem` (CSCA master list from the ICAO PKD or national lists) to `WawIDVisa/Resources`. Without this file, the chip is read but passive authentication fails.
5. Run on a **real iPhone** (NFC does not work in the simulator).

Dependency: NFCPassportReader (MIT license). If your version names the parameter `password:` instead of `mrzKey:`, adapt the call in `PassportNFC.swift`.

### TestFlight publishing (GitHub Actions)

The `.github/workflows/wawid-ios-testflight.yml` workflow ("WawID iOS → TestFlight") runs on a GitHub Mac (`macos-15`): it generates the project with XcodeGen, then runs `bundle exec fastlane beta` (build, automatic signing, upload). It runs manually or on every push to `main` that changes `wawid/ios/**`. The build number is the GitHub run number.

1. In App Store Connect, create the "WawID e-Visa" app (bundle `sn.wawtelecom.wawid.visa`).
2. In **Users and Access → Integrations → App Store Connect API**, create a key with the **App Manager** role and download `AuthKey_XXXX.p8`.
3. In GitHub, **Settings → Secrets and variables → Actions**, add:

| Secret | Content |
| --- | --- |
| `APPLE_TEAM_ID` | Apple team ID |
| `ASC_KEY_ID` | API key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | Base64-encoded content of the `.p8` file (`base64 -i AuthKey_XXXX.p8`) |

4. Run the workflow from the **Actions** tab. The build appears in TestFlight after Apple processing (10 to 30 min). Add internal testers (up to 100) or an external group ("Beta App Review", about 24 h).

Locally on a Mac:

```bash
cd wawid/ios
bundle install
APPLE_TEAM_ID=<TEAM_ID> ASC_KEY_ID=<KEY_ID> ASC_ISSUER_ID=<ISSUER_ID> ASC_KEY_P8_BASE64=<P8_BASE64> bundle exec fastlane beta
```

Status: the app code has been written and reviewed but still needs an Xcode build and a test on an iPhone with a real biometric passport.

## Upgrading to national scale

The demonstrator (Netlify Functions + Netlify Blobs) validates the journeys, not load, sovereignty or service continuity. Summary of `docs/ARCHITECTURE.md`:

### Blocking limits of the demonstrator

1. **Storage**: each collection is one JSON document rewritten on every write (last writer wins); two simultaneous writes can lose a crossing.
2. **Global read**: `/api/data` loads every collection.
3. **Sovereignty**: hosting outside the country, incompatible with Law 2008-12 for state files.
4. **No offline mode** at border posts.
5. **Simulated biometrics**: no 1:N matching and no certified SDK.
6. **Officer identity** based on passwords only.

### Target sizing (×5 on estimates)

| Indicator | Estimate | Target |
| --- | --- | --- |
| Annual crossings | ~6 million | 30 million |
| AIBD peak | ~3,000 travelers/h | 15,000/h |
| Control transactions | ~2/s | 10/s sustained, 50/s burst |
| e-Visa applications | ~300,000/year | 1.5 million/year |
| Biometric database | ~10 M people at 5 years | 50 M |

### Target architecture

- Active national data center + disaster recovery site in the country (RPO < 5 min, RTO < 1 h, 99.95% availability).
- API gateway + IAM (OIDC, MFA, PKI officer cards), HSM for keys and signatures.
- PostgreSQL partitioned by month + Kafka event bus; `store.mts` replaced by a SQL repository.
- Certified biometric ABIS (1:1 and 1:N), ISO/IEC 30107-3 liveness detection, RFID readers with PA/AA verification through the ICAO PKD.
- Border post (edge) server with an encrypted local copy of the lists and a crossing queue: checks continue without a link.
- Only the public portal and the carrier gateway are exposed, in a DMZ behind a CDN/WAF.

The business engine, API contracts and interfaces are reused as is; only the storage, identity, biometrics and connector layers change. This work matches sprints S5 to S8 of the backlog (`docs/SCRUM.md`).
