# Security, personal data and compliance

This page describes the WawID security model as implemented in the demonstrator, the processing of personal data under Senegalese law, and the known limits. It is intended for security officers, the data protection officer and operations teams.

## Principles

- **Least privilege**: each role has only the permissions it needs; rights are checked **server-side** on every call.
- **Traceability**: every sensitive action is written to a chained audit log.
- **Minimization**: biometric images do not leave the workstation; only scores and flags are sent.
- **Channel separation**: travelers (no account), officers (session), devices and airlines (separate keys).
- **Separate platforms**: DPAF space (`/dpaf/`), traveler platform (`/`, `/aide/`), mobile apps (`/app/`) and airline platform (`/compagnies/`). An account only opens the platform of its role, and no public platform links to the DPAF space.

## Roles and permissions

| Role | Permissions |
| --- | --- |
| Border officer | `read`, `control`, `alerts`, `cases` |
| Intelligence analyst | `read`, `alerts`, `cases`, `watchlist`, `rules`, `apis`, `evisa` |
| Supervisor | `read`, `control`, `alerts`, `cases`, `watchlist`, `rules`, `apis`, `evisa`, `gates` |
| Treasury officer | `read`, `finance` |
| Administrator | All DPAF space permissions, including `users`, `system` and `finance` |
| Airline | `carrier` only (airline platform, limited to the account's airline) |

| Permission | Allows |
| --- | --- |
| `read` | Viewing DPAF space data, verifying a QR code, reading the audit log |
| `control` | Assessing a traveler and recording a crossing decision |
| `alerts`, `cases` | Handling alerts, opening and updating cases |
| `watchlist`, `rules` | Managing watchlists and targeting rules, testing connectors |
| `apis` | Loading manifests and API/PNR messages |
| `evisa` | Processing e-Visa applications |
| `gates` | Controlling and configuring eGates |
| `finance` | Security fee (fee base, collections, validation of payments declared by airlines, transfers to the State) |
| `carrier` | Airline platform: flights, messages, invoices and payment declarations of **its own** airline (the account's IATA code) |
| `users`, `system` | Managing accounts; settings, connectors, reset |

A request without a valid session gets `401`; a session whose role lacks the permission gets `403`. An administrator cannot deactivate or demote their own account.

Sign-in states the requested platform: an **Airline** account is refused (`403`) on the DPAF space and a DPAF account on the airline platform; the refusal is logged (`ECHEC_CONNEXION`). An airline account only sees its own airline's data, never pre-screening results, and has no access to internal documentation pages (reserved for DPAF space sessions).

## Officer authentication

### Sessions

- `wawid_session` cookie holding the user ID, an expiry time and an **HMAC-SHA256 signature** computed with `SESSION_SECRET`.
- Attributes: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, lifetime **12 hours** (one shift).
- On every request, the signature is checked in constant time, the expiry is enforced and the account must be **active**: deactivating an account ends its sessions immediately.
- Logout clears the cookie and is logged.
- On Netlify, a missing `SESSION_SECRET` blocks the API (there is no default secret).

### Passwords

- **scrypt** hashing with a random 16-byte salt per account; constant-time comparison.
- Minimum length of **10 characters** for accounts created or changed in the DPAF space.
- Failed login: delayed response (about 0.7 s), generic message and an `ECHEC_CONNEXION` (failed login) audit entry.
- Initial accounts are created from `WAWID_ADMIN_PASSWORD` (and `WAWID_DEMO_PASSWORD` if set) only when no account exists.

## Device and carrier keys

| Channel | Header | Configuration | Checks |
| --- | --- | --- | --- |
| eGates and kiosks | `X-Gate-Key` | `WAWID_GATE_KEY` (shared key) | Constant-time comparison; no default key on Netlify |
| Airlines | `X-Carrier-Key` | `WAWID_CARRIER_KEYS` (`CODE:key`, one per airline) | The key identifies the airline; a message about another airline's flight is rejected |

Keys must be long and random, delivered over a secure channel, and rotated periodically or after any incident. They never appear in code or documentation.

## Signed QR codes

Approved e-Visas (and former WawPass receipts, issued before traveler payment was removed) are shown as a QR code holding a `TYPE.REFERENCE.SIGNATURE` token (`EV` or `WP`), signed with HMAC-SHA256 using `SESSION_SECRET` (signature truncated to 16 characters).

- Verification is restricted to signed-in officers (`read` permission).
- A tampered token is rejected ("invalid or forged QR code").
- For an e-Visa, status and validity date are checked again **in real time**: a revoked or expired e-Visa is refused even if the signature is correct.
- A former WawPass receipt is accepted **only once**; every verification is logged. No new receipts are issued: the security fee is included in the ticket.

## Chained audit log

Each entry holds a sequence number, a timestamp, the actor, the action, the target, details, the hash of the previous entry and its own **SHA-256** hash.

- Any modification, deletion or insertion of an entry breaks the chain.
- The back office (**Administration → Audit log**) recomputes the chain and shows "Chain intact" or the number of the faulty entry.
- The log is never truncated automatically; archiving it (signed export) is an operations task.
- Logged actions: logins and failures, crossing decisions, eGate transactions, e-Visa submissions and decisions, validations of former WawPass receipts, pre-enrollments, API/PNR messages, changes to watchlists, rules, users, settings and connectors, eGate commands, collections, reset.

Limit: someone with write access to the storage could recompute the whole chain. In production, the chain head must be **anchored periodically** with an HSM signature.

## Input validation

- JSON bodies limited to 1,000,000 characters (2 MB for carrier messages); invalid JSON rejected with `400`.
- Every text field is trimmed and truncated to a maximum length; enumerated values (statuses, roles, decisions, severities) are allow-listed; numeric settings are bounded.
- The MRZ is checked (ICAO 9303 check digits). The match between the chip (DG1) and the printed MRZ is **recomputed server-side**, without trusting the terminal.
- eKYC results sent by the client are normalized to strict types (booleans, scores between 0 and 1).
- A crossing decision that differs from the recommendation requires a reason.
- Internal errors return a generic message ("Erreur serveur") without technical details.
- A public application lookup requires the reference **and** the passport number; failures are delayed to slow down enumeration.

### HTTP headers

`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` (camera limited to the site, microphone and geolocation disabled), `Cache-Control: no-store` on the API, `noindex` on the DPAF space, the airline platform and the kiosk.

## Local NFC bridge

- Listens only on loopback `127.0.0.1`: it cannot be reached from the network.
- CORS restricted to the origins listed in `NFC_BRIDGE_ORIGIN`; any other origin gets `403`. The Private Network Access header is handled.
- Read data leaves the workstation only through the WawID application.

## Data minimization

| Source | Sent to the server | Stays local |
| --- | --- | --- |
| eGate / kiosk | MRZ, chip read result (DG1, passive authentication, protocol), face score, liveness result, detected attack type | Face images, camera stream, chip photo |
| Counter | MRZ, chip results, face and iris scores, number of fingerprints captured | Biometric images and templates |
| iPhone app | Chip MRZ, passive authentication result, protocol | Chip photo (DG2) |
| e-Visa (eKYC) | Quality and authenticity flags, scores | Document photos and selfie |
| Airline gateway and platform | Acknowledgment: reference, flight, passengers, completeness, timeliness, errors | No targeting result is returned to the airline (no number of flagged passengers, no score, no internal flight identifier) |

## Personal data: Law 2008-12

WawID processes identity, travel, self-declared health and biometric data. This processing falls under **Law 2008-12 of 25 January 2008 on the protection of personal data**, supervised by the **Personal Data Protection Commission (CDP)**.

| Requirement | Implementation in WawID |
| --- | --- |
| Specified purpose | Processing travel authorizations, border control, aviation security |
| Information and consent | Mandatory consent box for the e-Visa and biometric pre-enrollment; reference to the law on the portal |
| Minimization | See above; the public lookup returns only a subset of the data |
| Security | Role-based access control, encryption in transit, chained audit |
| Retention period | `retentionDays` setting (1,825 days, i.e. 5 years, by default) |
| Formalities | Biometric and public security processing requires prior formalities with the CDP before going live |
| Data subject rights | Access and rectification procedure to be defined by the administration (contact point, deadlines) |
| Transfers | Data must not leave the country without a legal basis; see hosting below |

### Retention period

The period is shown in **Administration → Settings** ("Retention"). In the demonstrator, **no automatic purge is applied yet**: collections are only capped by count (20,000 crossings, 300 flights, 2,000 carrier messages). A purge and archiving job matching the set period must be implemented before production.

## Hosting and sovereignty (production)

The demonstrator is hosted on Netlify (outside the country). For real operations:

- hosting in **two active data centers in Senegal** (recommendation: national data center in Diamniadio as the primary site, Tier III-certified commercial data center on a separate site as the secondary site) and a **backup site** in the country; no foreign cloud for personal data;
- **no biometric data outside the country**;
- only the public portal, the airline platform and the carrier gateway exposed, in a DMZ behind an anti-DDoS CDN/WAF;
- keys and signatures in **HSMs** (one pair per central site); encrypted backups following the 3-2-1-1-0 rule, with immutable and offline copies;
- officer identity through **OIDC, MFA and PKI officer cards**;
- **SIEM/SOC** monitoring, penetration testing before go-live, failover tests twice a year;
- administration through a bastion with MFA, network segmentation, key ceremonies and clearance of personnel with privileged access.

Details (choice of sites, network, backups, failover scenarios, infrastructure security, risks) are in the page *Deployment plan — high-availability infrastructure in Senegal*.

## Known limits of the demonstrator

These limits are deliberate: the demonstrator validates the journeys, not national operations.

| Limit | Consequence | Target answer |
| --- | --- | --- |
| Netlify Blobs storage: one collection = one JSON document rewritten on every write | Two simultaneous writes can lose data (last writer wins) | Transactional PostgreSQL + Kafka |
| Simulated biometrics | Face scores, iris and liveness do not come from a certified SDK | Certified ABIS, ISO/IEC 30107-3 |
| Simulated chip reading without a bridge or reader | A simulated read is flagged as such | RFID readers, ICAO PKD |
| eKYC and chip results supplied by the client | A malicious client could send false flags | Server-side verification by the eKYC provider |
| Fictitious payments | No real collection | Payment provider integration |
| Password only, no MFA or account lockout | Exposure to credential theft | OIDC + MFA + PKI |
| No rate limiting | Exposure to abuse of public routes | WAF with rate limiting |
| Single shared eGate key | A leak affects every device | Per-device certificates (mTLS) |
| `SESSION_SECRET` is used for both sessions and QR codes | Rotating it also invalidates issued QR codes | Separate keys managed in an HSM |
| No automatic purge | The retention period is not enforced yet | Purge and archiving job |
| Hosting outside the country | Not compliant for real data | Two active data centers in Senegal + backup site |

All demo data is **fictitious**. No real personal data must be entered in the demonstrator.
