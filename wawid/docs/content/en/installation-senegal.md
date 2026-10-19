# Installation guide — Senegal

This guide describes how to set up WawID at Senegal's border posts: deployment phases, hosting, legal prerequisites, hardware, installation of counter workstations, eGate kiosks and the DPAF space, software installation of the platform, mobile apps, onboarding of airlines and the Treasury, training, acceptance testing and go-live. It is intended for the project teams of the DPAF, the operator and the integrators.

The high-availability hosting infrastructure (two active data centers in Senegal and a backup site), the backup strategy, failover procedures and detailed phasing are covered by the page *Deployment plan — high-availability infrastructure in Senegal*; this guide summarizes them. For other technical details already documented, it refers to the pages *Deployment and configuration*, *Security, personal data and compliance*, *eGate kiosk: setup and journey* and *API reference (airlines, devices, connectors)*.

## Reading this guide

Each item is classified according to its actual state:

| Label | Meaning |
| --- | --- |
| **Existing** | Works today in the demonstrator (code in the repository). |
| **Recommendation** | Advised practice for operations; it commits no party until it has been decided. |
| **To be developed** | Required for national production but absent from the current code. |
| **To be checked** | Legal, administrative or contractual point to confirm with the competent authority before any decision. |

## Starting point

The current WawID deployment is a **demonstrator** hosted on Netlify (Netlify Functions and Netlify Blobs). It validates the journeys (counter, eGate, e-Visa, eGate pre-enrollment, APIS/PNR, intelligence, security fee), not load, sovereignty or service continuity. National operations require the sovereign architecture described in `docs/ARCHITECTURE.md`.

| Component | Today (Existing) | National target |
| --- | --- | --- |
| Hosting | Netlify, outside the national territory | Two active data centers in Senegal (site A: national data center in Diamniadio; site B: Tier III-certified commercial data center) + backup site C (To be developed) |
| Backups | No dedicated backup | 3-2-1-1-0 rule, immutable and offline copies at site C, restoration tested every quarter (To be developed) |
| Storage | One collection = one JSON document (Netlify Blobs) | Partitioned PostgreSQL + event bus (To be developed) |
| Officer identity | Username + password (scrypt), 12-hour session | OIDC, MFA, PKI officer cards (To be developed) |
| Biometrics | Simulated scores | Certified SDK / ABIS, liveness detection ISO/IEC 30107-3 (To be developed) |
| Chip reading | Local NFC bridge, simulation mode only | Real reader driver, CSCA verification via the ICAO PKD (To be developed) |
| External files | Connectors in "local copy" mode | Connection to the Interpol NCB, WAPIS, FPR, DAF (To be developed, agreements required) |
| Offline mode | None | Post server (edge) with a local copy of the lists (To be developed) |
| Payments | Simulated | Integration of payment operators (To be developed) |
| Demo data | Created automatically on the first API call if the database is empty | Demo dataset disabled in production (To be developed) |
| Inventory of posts and devices | Six posts defined in the code (`POSTES` in `public/shared/engine.js`); eGates and devices come from the demo dataset | Administrable register of posts, counters and devices (To be developed) |
| Security fee invoices | From the demo dataset; collections and provisional fee base work | Issuing real invoices from declarations and counts (To be developed) |

> No real personal data may be entered into the demonstrator. The steps below that concern the demonstrator are for tests, demonstrations and training.

## Deployment phases

The posts declared in WawID are those of the `POSTES` list:

| Code | Post | Type | Region |
| --- | --- | --- | --- |
| `AIBD` | Blaise Diagne International Airport | Air | Thiès |
| `PDK` | Autonomous Port of Dakar | Sea | Dakar |
| `ROS` | Rosso | Land | Saint-Louis |
| `KID` | Kidira | Land | Tambacounda |
| `KAR` | Karang | Land | Fatick |
| `ZIG` | Ziguinchor Airport | Air | Ziguinchor |

Any other post must be added to this list (code change, To be developed) before it is connected.

The phasing below is a **Recommendation**; it follows that of the page *Deployment plan — high-availability infrastructure in Senegal*, which details the entry and exit criteria and the acceptance tests. It follows the principle of the proposal note (`docs/PROPOSITION-REMPLACEMENT-SECURIPORT.md`): a pilot at AIBD in parallel with the system in place, then a switchover in waves, without interrupting border checks. It adds the build of the high-availability infrastructure and the application migration, which the note did not include. No schedule has been set; the durations in the plan are indicative.

| Phase | Scope | Prerequisites | Exit criterion |
| --- | --- | --- | --- |
| 0. Scoping and legal | Contract, CDP formalities, agreements with Sénégal Numérique (site A) and the commercial data center (site B), choice of site C, collection mandate for the security fee if the `OPERATEUR` flow is selected | "To be checked" items below handled | Agreements signed; written decision of the competent authorities |
| 1. Build of sites A, B and C | Power, racks, network, inter-site links, HSMs, runtime platform, database, object storage, backups, monitoring and SOC | Phase 0 completed; hardware delivered | A → B failover and restoration from site C passed |
| 2. Application migration | Move from the Netlify demonstrator to the sovereign stack (containerized API, PostgreSQL and object storage, secrets in HSM, one domain per platform), in parallel with phase 1 | Priority developments started | Functional acceptance in pre-production; load test; penetration test |
| 3. Pilot | AIBD: a few counters and eGates at arrivals and departures, in parallel with the system in place; AIBD post server; carrier gateway open to volunteer airlines; security fee reconciliation | Phases 1 and 2 validated; CDP formalities completed; certified readers and SDKs integrated; pilot officers trained | Pilot acceptance passed (see the acceptance table); no blocking incident over an agreed observation period; failover drill passed |
| 4. Rollout in waves | Wave 1: full AIBD, Ziguinchor Airport, Autonomous Port of Dakar. Wave 2: Rosso, Kidira, Karang (VRS plate readers, scanners); decommissioning of the previous system | Pilot review; post servers installed; main and backup links validated; offline mode validated for wave 2 | Acceptance per post, including a link-cut test; data takeover under the contractual clauses; final go-live report |
| 5. Operations | 24/7 monitoring, maintenance, recovery drills twice a year, quarterly restoration | Go-live report | Annual review |

## Hosting in Senegal

### Principles

- **Sovereignty**: nominative and biometric data, as well as the keys that protect it, is hosted on national territory; no personal data is entrusted to a foreign cloud. The current Netlify hosting is not acceptable for real data (see *Security, personal data and compliance*).
- **Two active data centers** (Recommendation): web and API services run simultaneously in both sites; the database is replicated synchronously from site A to site B; each site can carry the full peak load alone.
- **A backup site (site C)**: it receives immutable encrypted copies and offline copies, without hosting production.
- **Minimal exposure**: only the traveler platform (portal, help, mobile apps page), the airline platform (`/compagnies/`) and the carrier gateway are exposed to the Internet, behind a WAF and anti-DDoS protection; the DPAF space (`/dpaf/`), kiosks and internal services remain on the private network. Each platform gets its own domain name (for example `dpaf.<domain>`, `www.<domain>`, `compagnies.<domain>`, `app.<domain>`).

### Choice of sites (Recommendation, To be checked)

| Site | Role | Recommended option | Points to confirm |
| --- | --- | --- | --- |
| A | Primary, active | National data center in Diamniadio (State-owned, operated by Sénégal Numérique SA), inaugurated in 2021 and presented as "Tier III type" | No Uptime Institute certification publicly confirmed; capacity, service levels, physical security and agreement **To be checked**; no commitment to date |
| B | Secondary, active | Tier III-certified commercial data center on a separate site and power grid: Sonatel (Orange) in Rufisque as first choice, Yas (formerly Tigo) in Diamniadio as the alternative | Rufisque certification announced but **To be checked**; Yas Diamniadio Uptime Institute Tier III certified in 2017 (validity **To be checked**) but located in the same area as site A |
| C | Backup vault | Secure State site or separate facility, outside the Dakar–Diamniadio–Rufisque area if possible | Site to be identified with Sénégal Numérique (**To be checked**) |

The detailed comparison of the options is in the page *Deployment plan — high-availability infrastructure in Senegal*.

### Service objectives (architecture targets)

| Indicator | Target |
| --- | --- |
| Central availability | 99.95% or more |
| Data loss within a site (RPO) | None (synchronous replication) |
| Data loss if a site is lost (RPO) | 5 minutes at most (none while synchronous replication A → B is healthy) |
| Recovery time if a site is lost (RTO) | One hour at most |
| Checking capacity at the post | 100%, including without a link to the central system |
| Failover tests | At least twice a year |
| Restoration tests | Every quarter |

These values are design objectives, not contractual commitments.

### Network links

| Item | Recommendation |
| --- | --- |
| Internet for central sites | Two different carriers per site, over separate physical paths |
| Link between sites A and B | Dark fiber or dedicated link over two separate physical paths, encrypted, low latency (synchronous replication) |
| Link to site C | Dedicated encrypted link for continuous archiving; offline copies transported under a secure procedure |
| Main link of posts | MPLS or encrypted VPN between each post and both central sites, automatic failover from one to the other |
| Backup link of posts | 4G or VSAT per post, from a carrier other than that of the main link, especially for remote land posts (Kidira, Rosso, Karang) |
| Partners | Interpol through the NCB in Dakar (I-24/7), WAPIS, FPR, DAF and DGCPT through private links or VPN, according to the agreements (To be checked); airlines over the Internet behind the WAF |
| Post network | Segmented local network (counters, eGates, CCTV, administration); no control workstation directly exposed to the Internet |
| Outbound flows from posts | Limited to the WawID central system (HTTPS); the NFC bridge only listens on the loopback interface of each workstation |
| Monitoring | Device status reported to **System monitoring** and to the operator's SOC |

### Offline mode (To be developed)

The demonstrator has **no** offline mode: a post that loses its link can no longer record crossings. The target architecture provides at each post a **post server** (type `SRV-` in **System monitoring**), made up of two nodes, to which counters and eGates are attached, and that:

- keeps an encrypted copy of the watchlists, synchronized in under one minute;
- runs the same decision engine as the central system (`public/shared/engine.js`);
- queues crossings and resynchronizes them when the link returns;
- raises a local alert on a critical match;
- allows the post to continue checks even if both central sites are unavailable.

Until this server exists, each post must have a written **manual checking procedure**, validated by the DPAF.

### Backups and recovery

The strategy follows the **3-2-1-1-0** rule: three copies, on two types of media, one of them off-site (site C), one immutable or offline, and zero errors found during verification (Recommendation).

| Item | Recommendation |
| --- | --- |
| Database | Synchronous replication from site A to site B; continuous archiving of transaction logs (point-in-time recovery); daily full and hourly incremental backups, copied to site C |
| Object storage (biometrics, documents) | Replication between A and B, versioning, daily copy to site C |
| Immutable and offline copy | Write-once storage at site C; weekly encrypted offline copy kept in a safe, on national territory |
| Audit log | Daily export of the chain; periodic anchoring of the chain head with an HSM signature (To be developed) |
| Keys and secrets | Kept in a pair of HSMs per central site; key backup split among several custodians |
| Retention | 5 years shown in WawID (`retentionDays`); legal period **To be checked**; automatic purge **To be developed** |
| Tests | Restoration tested every quarter; restoration from site C and inter-site failover during the six-monthly drills |

Failure scenarios, the failover procedure and the switchback are described in the page *Deployment plan — high-availability infrastructure in Senegal*.

## Legal and regulatory prerequisites

The following checks are **To be checked** with the competent authorities. They do not presume the answers; only texts already cited in the WawID documentation are mentioned as references.

| Area | Authority or contact | Check to perform |
| --- | --- | --- |
| Personal data protection | Personal Data Protection Commission (CDP) | Determine the regime applicable to the processing under Law No. 2008-12 of 25 January 2008 (declaration or authorization request, in particular for biometrics and public security processing) and complete the formalities **before** any production use; set the retention period (5 years by default in WawID), the contact point for access and rectification rights, and the hosting conditions. |
| Border control ownership | Ministry of the Interior, Air and Border Police Directorate (DPAF) | Appointment of the data controller; validation of procedures (escalation, entry refusal, degraded mode); check whether a regulatory act creating the processing is required. |
| Security fee | Ministry of Economy and Finance, General Directorate of Public Accounting and Treasury (DGCPT) | Application of Decree No. 2011-652 of 26 May 2011, the interministerial order of 3 February 2012, Decree No. 2012-519 of 18 May 2012 and the decision of 4 December 2012; new allocation act if the operator share changes; flow of receipts from the Receiver General of the Treasury. The "airlines → WawID → Public Treasury" flow (WawID's default setting) differs from this framework: it requires a **new regulatory text** and a **collection-mandate agreement** between the State and WawID before any implementation. |
| API and PNR data | Airlines, civil aviation authority (ANACIM), DPAF | National legal basis requiring API/PNR transmission (reference: ICAO Annex 9); transmission and retention conditions; information of airlines. |
| Police files | Interpol NCB, national WAPIS platform, departments holding the FPR and the passport register (DAF) | Access agreements, connection conditions, clearances. |
| Existing contract | Contracting authorities, State Judicial Agency | Transfer, reversibility and data ownership clauses of the system currently in place (see the proposal note). |
| Public procurement | Contracting authorities | Procedure compliant with the Public Procurement Code or the law on public-private partnership contracts. |
| Telecommunications (option) | ARTP | To be consulted only if the project uses telecommunication means subject to authorization (for example private radio or satellite links). |
| Mobile apps | Data controller | Information notices and privacy policy required by the app stores, consistent with the CDP formalities. |

## Hardware per post type

### Per workstation

The manufacturer references cited in the code (Regula, Thales/Gemalto, ARH, Innovatrics) are examples, not decisions. Hardware selection is a matter for the procurement procedure; biometric SDKs must be certified (NIST performance, ISO/IEC 30107-3).

| Equipment | Counter | eGate / ABC kiosk | DPAF space | Post server |
| --- | --- | --- | --- | --- |
| Computer with a recent browser (Chrome or Edge recommended) | Yes | Yes (kiosk mode) | Yes | — |
| Node.js 22 (for the NFC bridge) | Yes | Yes | — | Yes |
| Full-page document reader with RFID/NFC reader (MRZ + ICAO 9303 chip) | Yes | Yes | — | — |
| 4-finger fingerprint scanner | Yes | Depending on model | — | — |
| Camera for face capture | Yes | Yes (front-facing) | — | — |
| Iris camera | Optional | — | — | — |
| QR scanner gun (e-Visa) | Recommended | — | — | — |
| Traveler touch screen | — | Yes | — | — |
| Gate controller | — | Yes | — | — |
| UPS | Yes | Yes | Yes | Yes |
| Network link | Post network | Post network | Private network | Main link + backup |

### Per post type

The device types tracked in **System monitoring** are: counter terminals (`TRM-`), CCTV cameras (`CCTV-`), 3D baggage scanners (`LGS-`, air and sea posts), VRS plate readers (`ANPR-`, land posts) and local servers (`SRV-`, one per post).

| Post type | Posts | Specific equipment | Points of attention |
| --- | --- | --- | --- |
| Air | AIBD, Ziguinchor | Counters, eGates and ABC kiosks at arrivals and departures, biometric boarding corridor, CCTV, baggage scanners | Traffic peaks; carrier gateway; security fee |
| Sea | Autonomous Port of Dakar | Counters at the passenger terminal, CCTV, scanners | Grouped ship arrivals; manifests uploaded as CSV if the operator is not connected |
| Land | Rosso, Kidira, Karang | Counters, plate readers (VRS), CCTV | Fragile network link; power cuts; degraded mode essential |

### Central sites

Quantities are to be sized during the detailed study; the full bill of materials is in the page *Deployment plan — high-availability infrastructure in Senegal*.

| Equipment | Site A | Site B | Site C |
| --- | --- | --- | --- |
| Routers (two carriers), firewalls, switches | In pairs | In pairs | Depending on the site |
| Load balancers and WAF | Pair | Pair | — |
| Runtime platform servers (Kubernetes or equivalent) | 3 control-plane nodes + worker nodes to be sized | Same | — |
| Database servers | At least 2 | At least 2 | — |
| Object storage | At least 4 nodes | At least 4 nodes | Immutable storage |
| HSM | 2 | 2 | Key backup in a safe |
| Backup | Backup server | Backup server | Immutable appliance, offline tapes or disks |
| Bastions and monitoring collectors | 2 | 2 | — |

### Power supply (Recommendation)

Each counter, kiosk, network device and post server is protected by a **UPS** whose autonomy is sized according to the frequency and duration of power cuts observed on site and, for isolated posts, by a generator. Running on battery must allow ongoing checks to be completed and equipment to be shut down cleanly.

## Installing a counter workstation

### 1. Prepare the workstation

1. Install a maintained operating system, with security updates, a user session without administrator rights and automatic screen locking (Recommendation).
2. Install a recent version of Chrome or Edge.
3. Install the drivers for the document reader, fingerprint scanner and camera supplied by the manufacturer.
4. Install **Node.js 22** (required by the NFC bridge).

### 2. Install the NFC bridge

The `tools/nfc-bridge.mjs` bridge connects the browser to the document reader. It only listens on `127.0.0.1` (Existing).

Copy `tools/nfc-bridge.mjs` to the workstation, for example to `C:\WawID\` or `/opt/wawid/`, then set the bridge variables:

| Variable | Value for Senegal |
| --- | --- |
| `NFC_BRIDGE_PORT` | `8765` (default), unless there is a conflict on the workstation |
| `NFC_BRIDGE_MODE` | `simulation` for tests; the driver name once the real reader is integrated |
| `NFC_BRIDGE_ORIGIN` | The exact production address of the DPAF space and kiosk, for example `https://<wawid-domain>`; do not leave demo origins or `localhost` in operations |

Then start the bridge:

```bash
NFC_BRIDGE_ORIGIN="https://<wawid-domain>" node tools/nfc-bridge.mjs
```

The message "Pont NFC WawID : http://127.0.0.1:8765 (mode …)" confirms startup.

Have the bridge start automatically with the workstation (Windows service or systemd unit, Recommendation). Example systemd unit:

```text
[Unit]
Description=WawID NFC bridge
After=network.target

[Service]
Environment=NFC_BRIDGE_ORIGIN=https://<wawid-domain>
ExecStart=/usr/bin/node /opt/wawid/nfc-bridge.mjs
Restart=always
User=<service-account>

[Install]
WantedBy=multi-user.target
```

> **To be developed**: in the current code, any mode other than `simulation` answers "Aucun pilote de lecteur configuré" (no reader driver configured). For a real reader, the bridge's `readFromReader()` function must be replaced by a call to the manufacturer's SDK or by a PC/SC + ICAO 9303 stack (BAC/PACE access, DG1, DG2, EF.SOD, passive authentication against CSCA certificates from the ICAO PKD). See *Deployment and configuration*.

### 3. Configure the workstation in WawID

1. Open `https://<wawid-domain>/dpaf/` and sign in with an administrator account (the **Settings** page is reserved for it).
2. Open **Settings → NFC reader on this workstation**.
3. Enter the **Bridge address** (`http://127.0.0.1:8765` by default), click **Save** then **Test**. The expected result is "Connected" followed by the reader name.
4. The setting belongs to the workstation's browser: redo it if the browser or the user profile changes.
5. Sign out of the administrator account; the officer then signs in with their own account.

### 4. Test the workstation

1. With a training account, open **New check**.
2. Read a test passport: the MRZ and check digits are displayed.
3. Click **Read chip**: the panel must **not** show "(simulated)" on an operational workstation.
4. Enable the camera and capture a face; capture fingerprints.
5. Run the checks without confirming the decision, or confirm only on an acceptance environment.

## Installing an eGate kiosk

Prepare the kiosk computer like a counter workstation (browser, drivers, Node.js 22) and install the NFC bridge on the same machine (step 2 of the counter installation). Then start the browser in **kiosk mode** on the kiosk address, with the device identifier, for example:

```bash
chrome --kiosk "https://<wawid-domain>/gate/?gate=<DEVICE_ID>"
```

Then:

1. On the **Device activation** screen, enter the **Device key** (value of `WAWID_GATE_KEY`) and click **Activate**. The key is stored in the kiosk browser. Only an authorized technician enters it; it is never displayed or written down at the kiosk.
2. If the address does not specify the device, choose it on **Choose device**. Check the name and zone shown at the top right.
3. In the DPAF space, open **eGates & ABC** and check that the device card is **In service**, in automatic mode, with a recent heartbeat.
4. Test a remote close and reopen: the kiosk must show **Gate closed** and then return to the welcome screen within 15 seconds.
5. Set the gate parameters (face threshold, minimum age, eligibility, liveness detection, travel authorization check) according to the policy validated by the DPAF, with **Settings → Apply remotely**.

Open points for production:

- **To be developed**: the **Simulator (demo)** panel shown below the welcome screen must be hidden on operational kiosks.
- **To be developed**: there is no screen yet to declare a new eGate; devices come from the demo dataset.
- **Recommendation**: replace the single shared key `WAWID_GATE_KEY` with per-device certificates (mTLS), as planned in *Security, personal data and compliance*.

For the traveler journey and messages, see *eGate kiosk: setup and journey*.

## Installing the DPAF space

The DPAF space only requires a recent browser on a workstation of the private network.

1. Provide analysts, supervisors, administrators and Treasury officers with a maintained workstation, recent browser and screen locking.
2. Give them the address `https://<wawid-domain>/dpaf/` (the former `/admin/` address still works); add it to the bookmarks. The traveler portal has no link to the DPAF space.
3. In production, restrict DPAF space access to the private network or a VPN (Recommendation); the `noindex, nofollow` tag is already applied (Existing).
4. For Treasury officers, provide access from DGCPT premises according to the chosen security policy.

## Software installation of the platform

### Prerequisites

- **Node.js 22**, version 22.18 or later (direct execution of `.mts` files).
- Git and access to the repository.
- For the demonstrator: a Netlify account. No database is required.

### Local installation and tests

```bash
cd wawid
npm install
npm test           # compiles the documentation then runs the tests
npm run dev        # http://localhost:8888
```

- `npm run build` compiles the documentation (`docs/content`) into `netlify/lib/docs-content.mjs`.
- `npm test` compiles the documentation then runs `node --test` on the business engine, the API and PAXLST/PNR decoding.
- `npm run dev` starts the local server; the port is changed with `PORT`.
- Locally, data is kept in memory and development accounts and keys are created automatically (see *Deployment and configuration*). These defaults do not exist on Netlify.

### Netlify deployment (demonstrator)

| Setting | Value (`netlify.toml` file) |
| --- | --- |
| Base directory | `wawid/` |
| Build command | `npm run build && npm test` |
| Publish directory | `public` |
| Functions | `netlify/functions` (esbuild bundler) |
| Node version | `NODE_VERSION = "22"` |

A failing test blocks the deployment.

### Environment variables

The names below are those read by the code (`netlify/lib/auth.mts` and `netlify/lib/connectors.mts`).

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs sessions and e-Visa QR codes (and former WawPass receipts). Without it, the API returns an error. |
| `WAWID_ADMIN_PASSWORD` | Yes | Password of the `admin` account, created on the first sign-in if no account exists. |
| `WAWID_DEMO_PASSWORD` | No | Creates the demo accounts `agent`, `analyste`, `superviseur`, `tresor`. **Never set it in production.** |
| `WAWID_GATE_KEY` | Yes for eGates | eGate and kiosk key (`X-Gate-Key` header). |
| `WAWID_CARRIER_KEYS` | Yes for the gateway | Airline keys: `IATA_CODE:key` separated by commas. |
| `WAWID_CONNECTOR_<ID>_URL` | No | URL of a connector (`INTERPOL_SLTD`, `INTERPOL_NOM`, `WAPIS`, `FPR`, `JUD`, `ETATCIVIL`, `PAXLST`). |
| `WAWID_CONNECTOR_<ID>_TOKEN` | No | `Authorization: Bearer` token of the connector. |

Variables of the local server and the NFC bridge: `PORT`, `NFC_BRIDGE_PORT`, `NFC_BRIDGE_MODE`, `NFC_BRIDGE_ORIGIN`.

Setting them with the Netlify CLI (values replaced by placeholders):

```bash
netlify env:set SESSION_SECRET "<RANDOM_SECRET_64_CHARACTERS>" --context production --secret
netlify env:set WAWID_ADMIN_PASSWORD "<ADMIN_PASSWORD>" --context production --secret
netlify env:set WAWID_GATE_KEY "<EGATE_KEY>" --context production --secret
netlify env:set WAWID_CARRIER_KEYS "HC:<HC_KEY>,AF:<AF_KEY>" --context production --secret
```

On Netlify, a secret variable must be entered **per deploy context** (at least Production) with the **Functions** scope; redeploy after every change.

### Secrets handling

Generate each secret and each key randomly, for example:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Rules to apply:

1. Use a different value for each purpose (session, eGates, each airline) and for each environment (demo, acceptance, production).
2. Never put a secret in the code, the documentation, a ticket or a messaging app; send keys to airlines and technicians through a secure channel.
3. Keep a register (without the values): who holds which key, creation date, planned renewal date.
4. Changing `SESSION_SECRET` signs out every user and **invalidates every e-Visa QR code (and former WawPass receipt) already issued**: plan this operation.
5. In national production, keys are kept in an HSM (To be developed).

### Initial accounts and passwords

1. Before the first deployment, set `WAWID_ADMIN_PASSWORD` (and do not set `WAWID_DEMO_PASSWORD`).
2. Sign in once with the `admin` account: it is created at that moment, if the database contains no account.
3. In **Users & roles**, immediately create a nominative account for each administrator, then the officers' accounts, with an initial password of at least 10 characters handed over in person.
4. Change the `admin` account password in **Users & roles → Edit**: changing `WAWID_ADMIN_PASSWORD` afterwards has **no effect** on an existing account. Keep this account for exceptional operations.
5. Users cannot change their own password in this version: changes go through an administrator.

## Mobile apps

The **WawID e-Visa** app exists in two versions:

- `ios/`: the original SwiftUI app (iPhone), published by the "WawID iOS → TestFlight" workflow;
- `mobile/`: the new Flutter app for **iPhone and Android** (MRZ scan with the camera, NFC chip reading with BAC/PACE, reading DG1 and DG2 and checking integrity against the SOD, stay details, demo payment, tracking with QR code, French and English). It is being finalized.

| Item | Value |
| --- | --- |
| App identifier | `sn.wawtelecom.wawid.visa` (iOS and Android) |
| iPhone | iPhone 7 or later, iOS 15.5 or later |
| Android | Android 7 (API 24) or later, with NFC |
| API address | `https://wawid-waw-telecom.netlify.app` by default; can be changed at build time with `--dart-define=WAWID_API=https://<wawid-domain>` |

Before any public release for Senegal, the API address must point to the national platform.

### Automated publishing

The GitHub Actions workflow "WawID mobile (Flutter) → APK / TestFlight" (`.github/workflows/wawid-mobile.yml`) runs Flutter analysis and tests, builds an installable **APK** and an **AAB** for Google Play, and sends the iOS version to TestFlight when the Apple secrets are present.

| GitHub secret | Use |
| --- | --- |
| `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` | Signing and TestFlight upload (App Store Connect API key with the App Manager role) |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Production Android signing; without them, the APK is signed with a test key (direct installation only) |
| `PLAY_SERVICE_ACCOUNT_JSON` | Automatic upload of the AAB to the Google Play "internal testing" track |

### Installing the app on iPhone

1. **Today (TestFlight)**: the tester receives a TestFlight invitation (internal testers up to 100, or an external group after Apple's "Beta App Review"). They install the **TestFlight** app from the App Store, accept the invitation, then install **WawID e-Visa**.
2. **Later (App Store)**: publication after Apple's review, with store listing, screenshots, privacy policy and justification of NFC use.
3. NFC only works on a real iPhone.

### Installing the app on Android

1. **Tests (APK)**: download the APK from the workflow artifacts, copy it to the phone, allow installation from that source, then install it. Reserve this method for identified testers.
2. **Google Play internal testing**: with the keystore and service account configured, the AAB is published to the internal track; testers install it from the Google Play invitation link.
3. **Production**: publication on Google Play after validation (store listing, privacy policy, data safety form).
4. Check that **NFC is enabled** in the phone settings.

### NFC tips for testers

- Passport closed, flat, without a cover; phone without a thick case; away from metal surfaces.
- iPhone: bring the top of the phone close. Android: the NFC antenna is usually on the back; its position varies by model.
- Stay still during reading; if it fails, check the MRZ (a single error prevents the chip from opening).

### Developer account

**Recommendation**: publish under an **organization** developer account in the name of the entity that will own the app (WAW Telecom or the Senegalese administration, depending on the decision taken), not under a personal account. Enrollment conditions (company documents, D-U-N-S number for Apple, organization verification for Google) are **To be checked** with Apple and Google. Keep the production Android keystore and the App Store Connect keys in the secrets register: losing them prevents updates.

> **To be checked**: verification of the chip signature against CSCA certificates (ICAO PKD) in the Flutter app, and the exact list of data sent to the server, must be confirmed when the app is delivered.

## Airline onboarding

1. **Inform** each airline serving AIBD and Ziguinchor: hand over the specification `docs/API-TRANSPORTEURS.md` and the page *API reference (airlines, devices, connectors)*.
2. **Appoint** a technical contact and a security contact per airline.
3. **Generate** one key per airline and add it to `WAWID_CARRIER_KEYS` (format `HC:<HC_KEY>,AF:<AF_KEY>`), then redeploy.
4. **Send** the key through a secure channel.
5. **Create** the airline's named accounts in **Users & roles** (role **Airline**, airline selected from the list) and send the address of the airline platform (`https://<wawid-domain>/compagnies/`) with the *Airline platform* page.
5. **Test** on the acceptance environment: the airline sends a test PAXLST and PNR, for example:

```bash
curl -X POST https://<wawid-domain>/api/carrier/messages \
  -H "X-Carrier-Key: <AIRLINE_KEY>" -H "Content-Type: text/plain" \
  --data-binary @paxlst.edi
```

Then:

1. **Check** the **202** response and the `MSG-…` reference, then, in **Carrier gateway**, the **ACCEPTÉ** (accepted) status and completeness.
2. **Monitor** the **Carrier compliance** tab during the first weeks (targets: 95% punctuality, 98% completeness).

The sample messages of the DPAF space (**Receive a message → PAXLST example / PNR example**) and of the airline platform (**PAXLST example** / **PNR example**) serve as a format reference. PNRGOV (EDIFACT) messages go through a converter. A compromised key is replaced without delay.

## Treasury (DGCPT) onboarding

1. Designate, with the DGCPT, the authorized officers; the administrator creates their accounts with the **Treasury officer (fee)** role.
2. The administrator checks in **Revenue split → Settings** the rate per passenger, the operator share, the monthly penalty and the **Collection flow**, and enters the **IATA rate of the month** every month, in accordance with the texts in force.
3. Choose the collection flow. `OPERATEUR` flow (airlines → WawID → Treasury): open the WawID collection account, send its details to the airlines, define who validates declared payments (**Payments to validate** tab) and the schedule of transfers of the State's share to the Receiver General of the Treasury (**Transfers to the State** tab, on the 15th of month M+2). This flow only applies once a new regulatory text has been adopted and a collection-mandate agreement signed with the State. `TRESOR` flow (Decree No. 2012-519): define the flow of receipts from the Receiver General of the Treasury (who enters them, within what time, with which reference).
4. Train officers on the monthly calendar (collection from the 1st to the 9th, invoices on the 10th, due date at the end of the following month), on validating declared payments and on **Reconciliation**.
5. Validate the CSV export format (`wawid-redevance.csv`) with public accounting.

> **To be developed**: in the demonstrator, invoices come from the demo dataset. Issuing real invoices (airline declarations, IATA rate, WawID count) must be implemented before operations.

## Training plan (Recommendation)

| Audience | Content | Material |
| --- | --- | --- |
| DPAF officers (counter) | Sign-in, full check, chip reading, biometrics, justified decisions, QR, common situations, degraded mode | *User guide by profile*; demo scenarios |
| Supervisors | Escalations, eGates, dashboard, cases, audit log | *eGates and ABC kiosks*; *Dashboard* |
| Analysts | Threat Monitor, lists, rules, APIS/PNR, e-Visa, identity networks | *Threat Monitor, cases, watchlists, rules and connectors*; *APIS and PNR* |
| Administrators | Accounts, settings, NFC bridge, keys, backups, incidents, failover and restoration | This guide; *Deployment and configuration*; *Deployment plan — high-availability infrastructure in Senegal* |
| Post technicians | Installation of workstations and kiosks, first-level diagnosis | This guide; *eGate kiosk: setup and journey* |
| Treasury officers | Calendar, payment validation, collections, transfers to the State, reconciliation, export | *Security fee* |
| Airlines | Airline platform, formats, schedule, responses, compliance, security fee payment declaration | *Airline platform*; `docs/API-TRANSPORTEURS.md` |

Run training on a demonstration environment separate from production, and appoint in each post a **WawID focal point** trained in first-level diagnosis.

## Support and escalation (Recommendation)

| Level | Actor | Scope |
| --- | --- | --- |
| L1 | Post WawID focal point | Workstations, readers, cameras, kiosks, usage procedures |
| L2 | Operator support and 24/7 network operations center (NOC) | Accounts, settings, network, NFC bridge, connectors, application incidents, status of central sites and links |
| L3 | Development team | Software defects, fixes |
| Security | Security officer and SOC | Security incident, key leak, broken audit chain |
| Crisis | Crisis unit (operator, DPAF) | Loss of a central site, ransomware, prolonged degraded mode |

Contact details, hours and response times for each level are set with the DPAF before go-live and displayed in each post. Planned maintenance is announced in advance to posts, airlines and the Treasury.

## Acceptance testing

| No. | Test | Expected result |
| --- | --- | --- |
| 1 | `npm test` on the delivered version | All tests pass |
| 2 | Officer sign-in, sign-out, expired session | Access matches the role; actions written to the audit log |
| 3 | Counter check of a real biometric test passport | Valid MRZ; chip read without "(simulated)"; passive authentication valid |
| 4 | Check of an altered MRZ (**Forged MRZ** scenario) | Chip and MRZ different; recommendation of secondary inspection or higher |
| 5 | Watchlist match | Alert in the **Threat Monitor**; supervisor escalation |
| 6 | eGate crossing by an eligible traveler | Gates open; crossing recorded in the **eGate / ABC** channel |
| 7 | eGate crossing by a minor | Referral to the counter with the expected reason |
| 8 | Remote closing of an eGate | **Gate closed** shown within 15 seconds |
| 9 | e-Visa application on the portal, information request, reply, approval | Correct successive statuses; signed QR verified at the counter |
| 10 | e-Visa application from the iPhone and Android app | Chip read; application visible in the DPAF space with the **Chip (NFC)** field |
| 11 | **Security fee** card on the traveler portal | Information page "You have nothing to pay", fee included in the ticket; no form and no payment request; `POST /api/public/pass` answers `410` |
| 12 | PAXLST and PNR message from an airline with its key | 202 with no pre-screening result in the acknowledgment; API + PNR merge; flagged passengers visible in the DPAF space |
| 13 | Message with another airline's key | Rejection (422) |
| 14 | Collection recorded on an invoice by a Treasury officer | **PARTIELLE** (partial) or **PAYÉE** (paid) status; `REDEVANCE_ENCAISSEMENT` entry |
| 15 | **Audit log** check | **Chain intact** |
| 16 | Sign-in of an airline account on `/dpaf/`, then on `/compagnies/` | Refused on the DPAF space; on the platform, only its own airline's data, with no flagged passenger or score |
| 17 | Payment declared by an airline, validated by a Treasury officer, then transfer of the State's share (`OPERATEUR` flow) | Payment **Awaiting validation** then **Validated**; invoice **PARTIELLE** (partial) or **PAYÉE** (paid); `REDEVANCE_PAIEMENT_DECLARE`, `REDEVANCE_PAIEMENT_CONFIRME`, `REDEVANCE_REVERSEMENT_ETAT` entries |
| 18 | Link cut at a post (after offline mode is developed) | Checks continue; resynchronization when the link returns, with no loss or duplicate |
| 19 | Power cut at a counter | Switch to UPS; no crossing lost |
| 20 | Failover from site A to site B, then back | RTO of one hour at most; RPO met; **Chain intact** in the **Audit log** after failover |
| 21 | Full restoration from a site C copy in pre-production | Restoration successful; duration and data loss measured |
| 22 | Simulated HSM failure | No interruption of signing |
| 23 | Load test | AIBD peak of 15,000 travelers per hour carried by a single central site |
| 24 | Penetration test | No open critical or high vulnerability |

## Go-live checklist

1. CDP formalities completed and written decisions of the competent authorities obtained.
2. Sites A and B operational and agreements signed; site C receiving immutable and offline copies; A → B failover, switchback and restoration from site C passed.
3. 24/7 monitoring center, SOC, on-call duty and crisis unit in place; failover and restoration procedures written.
4. Demo dataset disabled; no fictitious data in the production database.
5. `SESSION_SECRET`, `WAWID_ADMIN_PASSWORD`, `WAWID_GATE_KEY` and `WAWID_CARRIER_KEYS` set; `WAWID_DEMO_PASSWORD` absent.
6. Nominative accounts created; `admin` account password changed; role review done.
7. NFC bridges installed with `NFC_BRIDGE_ORIGIN` limited to the production domain; **Connected** test on each workstation.
8. Readers, biometric SDKs and kiosks integrated and tested; simulator hidden on kiosks.
9. Connectors (Interpol, WAPIS, FPR, DAF) connected or, failing that, local copy of the lists up to date and procedure validated.
10. Airlines connected and tested, airline platform accounts created; security fee collection flow settled with the matching legal basis; Treasury officers trained.
11. Mobile apps pointing to the national API; store listings validated.
12. Degraded-mode procedure displayed in each post; post servers, backup links, UPS units and generators tested.
13. Officers trained; focal points appointed; escalation chain shared.
14. Acceptance signed; go-live report drawn up.
