# Administration (devices, users, audit, settings)

The **Administration** space groups device monitoring, account management, the audit log and settings. The **Project (Scrum)** page tracks project progress.

| App | Permission |
|---|---|
| **System monitoring** | `read` |
| **Users & roles** | `users` (Administrator) |
| **Audit log** | `read` |
| **Settings** | `system` (Administrator) |
| **Project (Scrum)** | `read` |

An app your role cannot access shows "Unauthorized access for role …", and its tile does not appear on the home page.

## System monitoring

This page shows the status of every device at the border posts.

1. Open **System monitoring**.
2. Pick a border post in the **All border posts** list to narrow the display.
3. Read the summary cards: for each device type, the number online out of the total, and **Nominal** or the number of anomalies. The **eGates / ABC** card gives the number of gates in service; the **Monitor** link opens eGate supervision.
4. The table details each **Device**: **Type**, **Border post**, **Version**, **Status**. Devices with an anomaly are listed first.

### Device types

| Prefix | Type | Border posts |
|---|---|---|
| `TRM-` | **Counter terminal** | All (24 at AIBD) |
| `CCTV-` | **CCTV camera (facial recognition)** | All |
| `LGS-` | **3D baggage scanner** | Air and sea posts |
| `ANPR-` | **License plate reader (VRS)** | Land posts |
| `SRV-` | **Local server (degraded mode)** | One per post |

### Statuses

| Status | Meaning |
|---|---|
| **Online** | Device operational |
| **Degraded** | Working with an anomaly |
| **Offline** | Unreachable |

The home tile shows the number of anomalies (devices that are not **Online**).

> In the demo, the device list and statuses are generated; they do not come from actual equipment reporting.

## Users & roles

Permissions follow the least-privilege principle. Passwords are hashed (scrypt), a session lasts 12 hours, and every action is logged.

The accounts table shows **Name** (and username), **Role** (with, below it, the platform the account opens: **DPAF space** or **Airline platform** followed by the airline name), **Border post**, **Last sign-in** and **Status** (**Active** or **Disabled**).

### Create a user

1. Click **New user** (or the **Create a user** tile).
2. Enter the **Full name** and the **Username**: 3 to 40 characters from a-z, 0-9, dot, underscore and hyphen; it must be unique.
3. Choose the **Role** and the home **Border post**.
4. For an airline account only, choose the **Airline** role and the airline in **Airline (“Airline” accounts only)**: this choice is mandatory for that role.
5. Enter an **Initial password (10 characters min.)**.
6. Click **Create**.

### Airline accounts

The **Airline** role only opens the *Airline platform* (`/compagnies/`); it is refused on the DPAF space. The account is bound to an airline (IATA code) and only sees that airline's flights, messages and invoices; no pre-screening result and no internal documentation page is available to it. Create one named account per airline user. Conversely, DPAF accounts (officers, analysts, supervisors, Treasury, administrators) do not open the airline platform.

This account is separate from the `X-Carrier-Key` gateway key used by the airline's systems (`WAWID_CARRIER_KEYS` variable, see *Deployment and configuration*).

### Edit or disable an account

1. Click **Edit** on the account row.
2. Change the **Role**, the **Border post** or, for an airline account, the **Airline**; enter a new password if needed (leave blank to keep the current one).
3. Clear **Account active** to disable the account: the user can no longer sign in and the current session is rejected. Select the box to re-enable it.
4. Click **Save**.

> You cannot disable your own account or remove its Administrator role. Accounts are never deleted: they are disabled, which preserves traceability.

### Permissions matrix

The matrix under the table shows each role's permissions, including **Security fee (finance)** and **Airline platform (own airline)**.

| Permission | Border officer | Intelligence analyst | Supervisor | Treasury officer (fee) | Administrator | Airline |
|---|---|---|---|---|---|---|
| Read access (`read`) | Yes | Yes | Yes | Yes | Yes | — |
| Counter check (`control`) | Yes | — | Yes | — | Yes | — |
| Alert handling (`alerts`) | Yes | Yes | Yes | — | Yes | — |
| Cases (`cases`) | Yes | Yes | Yes | — | Yes | — |
| Watchlists (`watchlist`) | — | Yes | Yes | — | Yes | — |
| Targeting rules (`rules`) | — | Yes | Yes | — | Yes | — |
| APIS (`apis`) | — | Yes | Yes | — | Yes | — |
| e-Visa decisions (`evisa`) | — | Yes | Yes | — | Yes | — |
| eGate management (`gates`) | — | — | Yes | — | Yes | — |
| Users (`users`) | — | — | — | — | Yes | — |
| System settings (`system`) | — | — | — | — | Yes | — |
| Security fee (`finance`) | — | — | — | Yes | Yes | — |
| Airline platform, own airline (`carrier`) | — | — | — | — | — | Yes |

**Read access** gives read-only access to dashboards, crossings, watchlists, rules, connectors, flights, e-Visas, monitoring, the audit log and the project page.

## Audit log

The log records every sensitive action. Each entry holds a sequence number, timestamp, actor, action, target, details and the entry's **SHA-256 hash**. The hash covers the entry's content **and the hash of the previous entry**, so the entries form a chain.

### Verify integrity

Each time the **Audit log** opens, WawID recalculates the whole chain:

- **Chain intact**: number of entries verified and the start of the head hash (last entry);
- **Integrity broken** at entry No. X, with one of these reasons: invalid hash (entry modified), broken chaining (entry deleted or inserted), or missing chain start (old entries deleted).

Record the head hash at regular intervals (in the shift report, for example): any later change to the past then becomes detectable. The log is never truncated automatically; archiving it is an operations task.

The table shows the latest 1,000 entries, newest first: **No.**, **Timestamp**, **Actor**, **Action**, **Target** (and details), **Hash** (hover to see it in full).

### Logged actions

| Area | Action codes |
|---|---|
| Sessions | `CONNEXION` (object: DPAF space or airline platform), `ECHEC_CONNEXION` (including a sign-in refused on a platform the account is not allowed to open), `DECONNEXION` |
| Border control | `PASSAGE_DECISION`, `EGATE_TRANSACTION`, `EGATE_REJET`, `EGATE_COMMANDE` |
| Intelligence | `ALERTE_ASSIGN`, `ALERTE_NOTE`, `ALERTE_CLOSE`, `ALERTE_REOPEN`, `DOSSIER_CREATION`, `DOSSIER_MAJ`, `SURVEILLANCE_AJOUT`, `SURVEILLANCE_ACTIVATION`, `SURVEILLANCE_DESACTIVATION`, `REGLE_CREATION`, `REGLE_MODIFICATION`, `REGLE_SUPPRESSION`, `CONNECTEUR_TEST`, `CONNECTEUR_ACTIVATION`, `CONNECTEUR_DESACTIVATION` |
| APIS | `APIS_PAXLST`, `APIS_PNR`, `APIS_MANIFESTE` |
| Portal and e-Visa | `EVISA_DEPOT`, `EVISA_REPONSE`, `EVISA_REQUEST_INFO`, `EVISA_APPROVE`, `EVISA_REJECT`, `WAWPASS_PAIEMENT` (history, no longer written), `WAWPASS_VALIDATION` (verification of a former receipt), `PREENROLEMENT` |
| Security fee | `REDEVANCE_ENCAISSEMENT`, `REDEVANCE_PAIEMENT_DECLARE` (declaration by an airline), `REDEVANCE_PAIEMENT_CONFIRME`, `REDEVANCE_PAIEMENT_REJETE`, `REDEVANCE_REVERSEMENT_ETAT`, `REDEVANCE_PARAMETRES` |
| Administration | `UTILISATEUR_CREATION`, `UTILISATEUR_MAJ`, `INITIALISATION`, `REINITIALISATION_DEMO` |

Action codes are internal identifiers and stay in French. Passwords are never written to the log: a password change is only mentioned.

## Settings

### Policy

The **Policy** card shows the settings in force (read-only in this version):

- **Visa exemption**: exempt nationalities (ECOWAS and bilateral agreements); other nationalities trigger the e-Visa check on entry;
- **Face threshold (counter)**: 80 %;
- **e-Visa fee**: 50,000 FCFA;
- **Security fee**: 15,000 FCFA (legacy setting from the former WawPass, with no effect: the security fee is included in the ticket and is managed in the Finance module);
- **Retention**: 5 years (Law No. 2008-12 on personal data — CDP).

eGate thresholds are set gate by gate in **eGates & ABC**.

### NFC reader on this workstation

At the counter, passport chips are read through a local bridge (`tools/nfc-bridge.mjs`) connected to the reader (PC/SC or vendor SDK). The setting belongs to the workstation (browser):

1. Enter the **Bridge address** (default `http://127.0.0.1:8765`).
2. Click **Save**.
3. Click **Test**: "Connected — *reader name*" if the bridge answers, otherwise "Bridge unreachable — simulated reading".

Without a reachable bridge, chip reading is simulated.

### Demo data

**Reset demo** regenerates a complete fictitious dataset (crossings, alerts, e-Visas, flights, invoices…).

1. Click **Reset demo**.
2. Confirm with **Reset**.

User accounts are kept. The audit log restarts with a **new chain** (`INITIALISATION`, then `REINITIALISATION_DEMO`). Use this only in demo environments.

## Project (Scrum)

The **Project (Scrum)** page shows how the WawID project is run in 2-week sprints:

- indicators: **Overall progress**, **Points delivered**, **Current sprint**, **Average velocity** (points per completed sprint);
- board of the selected sprint in three columns (**To do**, **In progress**, **Done**), with the sprint goal and the points of each story;
- **Velocity per sprint** chart;
- **Sprints** list (S0 to S8) with their state (**Done**, **In progress**, **Upcoming**); click a sprint to show its board.

The current sprint is sprint 5, "Real integrations" (Interpol I-24/7, WAPIS, national file, biometric SDK, document readers, eGates, PAXLST / PNRGOV). This page's content is defined in the code (source: `docs/SCRUM.md`) and cannot be edited from the interface.
