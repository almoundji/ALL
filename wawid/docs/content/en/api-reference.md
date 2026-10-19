# API reference (airlines, devices, connectors)

This page describes the WawID interfaces open to third-party systems: the traveler portal and iPhone app, the airline gateway (API/PNR) and the airline platform routes, eGates and ABC kiosks, and the external connector contract.

## General

| Item | Value |
| --- | --- |
| Base URL | `https://wawid-waw-telecom.netlify.app` |
| Prefix | All routes are under `/api/` |
| Transport | HTTPS only |
| Format | JSON (`Content-Type: application/json`), UTF-8 |
| Caching | All responses carry `Cache-Control: no-store` |
| Codes and labels | Enumeration values (statuses, outcomes) are fixed French codes; error messages are written in French |

### Route families

| Family | Authentication | Intended for |
| --- | --- | --- |
| `/api/public/*` | None | Traveler portal, iPhone app |
| `/api/carrier/messages` | `X-Carrier-Key` header | Airlines (systems) |
| `/api/compagnie/*` | Session of an **Airline** account (signed cookie, signed in with `platform: "compagnies"`) | Airline platform (`/compagnies/`) |
| `/api/gate/*` | `X-Gate-Key` header | eGates, ABC kiosks |
| `/api/docs`, `/api/docs/:lang/:slug` | None for public pages; DPAF space session for internal pages | Help center |
| Other routes (`/api/session`, `/api/data`, `/api/crossings`, `/api/evisas/…`, etc.) | Officer session (signed cookie) | DPAF space only |

DPAF space routes are not documented here: they require an authenticated session and a role with the matching permission, and they are not an integration interface. An airline account has access to none of them (`403`), nor to the internal documentation pages (`403`; `401` without a session).

### Error format

Every error returns a JSON object with an `error` field:

```json
{ "error": "Champ obligatoire manquant : E-mail" }
```

| Code | Meaning |
| --- | --- |
| 400 | Invalid request (malformed JSON, missing or incorrect field) |
| 401 | Invalid device key, carrier key or session |
| 403 | Insufficient role (DPAF space), account refused on this platform, or internal documentation page requested by an airline account |
| 404 | Resource not found or unknown route (`{"error":"Route inconnue"}`) |
| 409 | Action not allowed in the current state (e.g. reply when no information is expected) |
| 413 | Body too large |
| 422 | Carrier message rejected (own format, see below) |
| 500 | Server error (`{"error":"Erreur serveur"}`) |

## Public traveler API

### GET /api/public/info

Public settings: border posts, countries, visa-exempt nationalities, fees.

```http
GET /api/public/info
```

```json
{
  "postes": [
    { "id": "AIBD", "name": "Aéroport Int. Blaise Diagne", "type": "Aérien", "region": "Thiès" },
    { "id": "PDK", "name": "Port Autonome de Dakar", "type": "Maritime", "region": "Dakar" }
  ],
  "countries": { "SEN": "Sénégal", "FRA": "France" },
  "visaExempt": ["SEN", "MLI", "FRA"],
  "evisaFee": 50000,
  "passFee": 15000
}
```

Amounts are in FCFA (XOF). Border post IDs: `AIBD`, `PDK`, `ROS`, `KID`, `KAR`, `ZIG`.

### POST /api/public/evisa

Submits an e-Visa application.

```http
POST /api/public/evisa
Content-Type: application/json
```

```json
{
  "applicant": {
    "surname": "MARTIN", "given": "CLAIRE", "dob": "1978-12-24", "sex": "F", "nat": "FRA",
    "docNo": "21CX88341", "expiry": "2031-05-30", "email": "claire.martin@example.org", "phone": "+33600000000"
  },
  "trip": { "purpose": "Tourisme", "arrival": "2026-11-20", "nights": 10, "port": "AIBD", "address": "Hotel, Dakar" },
  "health": { "yellowFever": true, "symptoms": false, "countriesVisited": "FRA" },
  "paymentMethod": "Wave",
  "consent": true,
  "channel": "Web",
  "chip": { "read": true, "dg1": "P<FRAMARTIN<<CLAIRE…\n21CX88341…", "passiveAuth": true, "protocol": "PACE", "source": "iPhone NFC" }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `applicant.surname`, `given`, `dob`, `nat`, `docNo`, `expiry`, `email` | Yes | Dates `YYYY-MM-DD`, nationality ISO 3166 alpha-3, valid e-mail |
| `trip.arrival` | Yes | `YYYY-MM-DD` |
| `consent` | Yes | Must be `true` |
| `applicant.sex`, `phone`, `trip.*`, `health.*`, `paymentMethod`, `channel` | No | `port` defaults to `AIBD`, payment defaults to "Carte bancaire" |
| `chip` | No | NFC read result; WawID recomputes the DG1 ↔ entered data match |
| `ekyc`, `deviceId` | No | eKYC results (scores and flags only, never images) and a device identifier |

`200` response:

```json
{ "ref": "EV1234567", "status": "SOUMISE", "receipt": "PAY-MH3K2A1B", "amount": 50000 }
```

### POST /api/public/evisa/status

Looks up an application. The reference **and** the passport number must match.

```json
{ "ref": "EV1234567", "docNo": "21CX88341" }
```

`200` response:

```json
{
  "ref": "EV1234567", "status": "APPROUVEE", "createdAt": "2026-10-19T08:12:00.000Z",
  "applicant": { "surname": "MARTIN", "given": "CLAIRE", "nat": "FRA", "docNo": "21CX88341" },
  "trip": { "purpose": "Tourisme", "arrival": "2026-11-20", "nights": 10, "port": "AIBD", "address": "Hotel, Dakar" },
  "messages": [{ "from": "Agent VMS", "at": "2026-10-19T10:00:00.000Z", "text": "Application approved." }],
  "visaNo": "SN-EV-1234567", "validUntil": "2027-01-17",
  "token": "EV.EV1234567.Xk3…"
}
```

| `status` | Meaning |
| --- | --- |
| `SOUMISE` | Submitted |
| `EN_EXAMEN` | Under review |
| `INFO_DEMANDEE` | Info requested |
| `APPROUVEE` | Approved (`token` is then set) |
| `REFUSEE` | Refused |

`token` is the e-Visa QR code content (`EV.<reference>.<signature>`); it is `null` until the application is approved. Error `404` if the reference/passport pair matches no application.

### POST /api/public/evisa/reply

The applicant's reply to a request for information.

```json
{ "ref": "EV1234567", "docNo": "21CX88341", "text": "Please find the hotel booking: …" }
```

`200` response: same object as `/evisa/status`, with `status` back to `EN_EXAMEN`. Errors: `409` if the status is not `INFO_DEMANDEE`, `400` if the message is empty. Text is limited to 1,000 characters.

### POST /api/public/pass

Pays the security fee (WawPass).

```json
{
  "surname": "NDIAYE", "given": "FATOU", "nat": "SEN", "docNo": "A07711223",
  "flight": "HC 404", "travelDate": "2026-11-20", "paymentMethod": "Orange Money"
}
```

All fields except `paymentMethod` are required; `travelDate` is `YYYY-MM-DD`, today or later; `nat` has 3 letters.

`200` response:

```json
{
  "ref": "WP7654321", "createdAt": "2026-10-19T08:30:00.000Z", "surname": "NDIAYE", "given": "FATOU",
  "docNo": "A07711223", "nat": "SEN", "flight": "HC 404", "travelDate": "2026-11-20",
  "amount": 15000, "currency": "XOF", "method": "Orange Money", "used": false,
  "token": "WP.WP7654321.a9F…"
}
```

The `token` is the QR code content. It is validated only once at the airport.

### POST /api/public/enrol

eGate pre-enrollment.

```json
{
  "mrz": "P<FRAMARTIN<<CLAIRE<<<<<<<<<<<<<<<<<<<<<<<<<\n21CX883416FRA7812248F3105308<<<<<<<<<<<<<<08",
  "email": "claire.martin@example.org", "phone": "+33600000000", "consent": true
}
```

Checks: readable MRZ with valid check digits, `consent: true`, valid e-mail, age 18 or over, unexpired passport.

```json
{ "ref": "EN1234567", "status": "EN_ATTENTE" }
```

If the passport is already pre-enrolled: `{ "ref": "EN…", "status": "…", "already": true }`.

## Carrier gateway: POST /api/carrier/messages

Machine-to-machine entry point for **API** data (UN/EDIFACT PAXLST) and **PNR** data (IATA text).

| Item | Value |
| --- | --- |
| Authentication | `X-Carrier-Key: <CARRIER_KEY>`: one key per airline, bound to its IATA code |
| Raw body | `Content-Type: text/plain` or `application/edifact`; format is detected automatically |
| JSON body | `{ "format": "PAXLST" \| "PNR", "message": "…" }` with `Content-Type: application/json` |
| Maximum size | 2 MB per message |

A message about a flight of another airline than the key's is rejected.

### PAXLST example

```http
POST /api/carrier/messages
X-Carrier-Key: <CARRIER_KEY>
Content-Type: text/plain
```

```text
UNA:+.? '
UNB+UNOA:4+HC:ZZ+SNPIU:ZZ+261120:0900+000001'
UNH+1+PAXLST:D:02B:UN:IATA+HC404+01:F'
BGM+745'
TDT+20+HC404'
LOC+125+CDG'
DTM+189:2611201000:201'
LOC+87+DSS'
DTM+232:2611201500:201'
NAD+FL+++NDIAYE:FATOU'
ATT+2++F'
DTM+329:900211'
LOC+178+CDG'
LOC+179+DSS'
NAT+2+SEN'
RFF+AVF:QX7K2P'
RFF+SEA:12A'
DOC+P:110:111+A07711223'
DTM+36:300101'
LOC+91+SEN'
CNT+42:1'
UNT+20+1'
UNZ+1+000001'
```

Segments used: `UNH` (PAXLST), `BGM` (745 passengers, 250 crew), `TDT` (flight), `LOC+125/87` and `DTM+189/232` (departure, arrival), `NAD+FL/FM` (surname, given names), `ATT+2` (sex), `DTM+329` (birth), `NAT+2` (nationality), `RFF+AVF` (record locator), `RFF+SEA` (seat), `DOC` (type and number), `DTM+36` (expiry), `LOC+91` (issuing country), `LOC+178/179` (embarkation, disembarkation). The `UNA` segment and the `?` release character are supported.

### PNR example

One or more PNRs, separated by an `END` line or a blank line.

```text
RLOC QX7K2P
BKD 02OCT26
FP CC
1.SOW/MARIAMA MRS
HC 404 Y 20NOV CDGDSS
HC 405 Y 30NOV DSSCDG
SSR DOCS HC HK1 P/SEN/A05544332/SEN/03MAR88/F/12DEC31/SOW/MARIAMA/P1
SSR CTCE HC HK1 MARIAMA.SOW//EXEMPLE.SN/P1
SSR CTCM HC HK1 221770000000/P1
END
```

| Element | Content |
| --- | --- |
| `RLOC` | Record locator |
| `BKD` | Booking date (`DDMMMYY`) |
| `FP` | Form of payment (`CASH`/`CA`: cash, `CC`: card) |
| `n.SURNAME/GIVEN` | Passengers |
| Segment line | `XX 999 Y DDMMM ORGDST`; several lines = itinerary |
| `SSR DOCS` | `type/issuer/number/nationality/birth/sex/expiry/surname/given/Pn` |
| `SSR CTCE` / `CTCM` | E-mail (`//` = `@`) / phone, linked to passenger `Pn` |

PNRGOV (EDIFACT) messages are accepted after conversion by the integration service.

### Responses

| Code | Meaning | Body |
| --- | --- | --- |
| 202 | Accepted (`ACCEPTÉ` or `ACCEPTÉ AVEC AVERTISSEMENTS`, i.e. accepted with warnings) | Full acknowledgment |
| 422 | Rejected: unknown format, no flight, no passenger, flight of another airline | `{ "status": "REJETÉ", "reference": "MSG-…", "errors": [ … ] }` |
| 401 | Invalid carrier key | `{ "status": "REJETÉ", "errors": ["Clé transporteur invalide"] }` |
| 400 | Empty message or invalid JSON | `{ "error": "…" }` |
| 413 | Message over 2 MB | `{ "error": "…" }` |

`202` example:

```json
{
  "status": "ACCEPTÉ AVEC AVERTISSEMENTS",
  "reference": "MSG-MH3K9Z01",
  "flight": "HC 404",
  "passengers": 3,
  "completeness": 67,
  "onTime": true,
  "errors": ["PNR QX7K2P : passager 2 sans SSR DOCS"]
}
```

- `reference` identifies the message in the Passenger Information Unit log; keep it for any follow-up.
- `completeness`: percentage of passengers with document number, date of birth and nationality. Target: **98% or more**.
- `onTime`: whether the transmission deadline was met.
- **No targeting result is shared with the carrier**: the acknowledgment contains neither the number of flagged passengers nor the internal flight identifier. The pre-screening outcome stays in the DPAF space.

API and PNR messages for the same flight are **merged** (matched on document number, otherwise on name).

### Transmission deadlines

| Data | Expected deadline | Check applied by WawID |
| --- | --- | --- |
| PNR | 48 h then 24 h before departure (updates allowed until flight close) | Received no later than 24 h before the scheduled flight time |
| API (PAXLST) | At check-in close, no later than gate close | Received no later than the departure time (`DTM+189`) |

A flight with a late message is marked "late transmission" in carrier compliance tracking (punctuality target: 95% of flights or more).

### Testing with curl

```bash
curl -X POST https://wawid-waw-telecom.netlify.app/api/carrier/messages \
  -H "X-Carrier-Key: <CARRIER_KEY>" \
  -H "Content-Type: text/plain" \
  --data-binary @paxlst.edi
```

## Airline platform: session routes

These routes serve the *Airline platform* (`/compagnies/`). They require the session of an account with the **Airline** role, opened by `POST /api/session` with `{ "username": "…", "password": "…", "platform": "compagnies" }`, and only cover the account's airline (its IATA code). Any other account gets `403`. For system-to-system integration, use the `POST /api/carrier/messages` gateway.

| Route | Purpose | Response |
| --- | --- | --- |
| `GET /api/compagnie/overview` | Airline overview | `carrier` (code, name), `flights` (last 200 flights: route, time, direction, sources, passengers, completeness, timeliness), `messages` (last 300 acknowledgments), `invoices` (security fee invoices and payments), `redevance` (`rateUSD`, `penaltyRate`, `circuit`, `beneficiary`) |
| `GET /api/compagnie/flights/:id` | Details of one of the airline's flights | Flight and passenger list (`surname`, `given`, `docNo`, `nat`, `seat`, `missing`: missing fields among `docNo`, `dob`, `nat`); `404` for another airline's flight |
| `POST /api/compagnie/messages` | Submission of a PAXLST or PNR message | Same body and same acknowledgment as the gateway (`202`, `422`) |
| `GET /api/compagnie/samples` | Sample messages | `{ "PAXLST": "…", "PNR": "…" }` adapted to the airline code |
| `POST /api/compagnie/payments` | Declaration of a security fee payment | Body `{ "invoiceId": "RS-…", "amount": 1000000, "ref": "VIR-…", "method": "Virement" }` (`method`: `Virement`, `SWIFT`, `Mobile money` or `Chèque`); returns the invoice with the payment in `DECLARE` status; `400` if the amount is invalid or the reference is missing, `404` if the invoice is not the airline's |

None of these responses contains a pre-screening result (score, factors, flagged passengers). A declared payment stays in `DECLARE` status until the finance department validates it (`CONFIRME`) or rejects it (`REJETE`, with a `reason`); only `CONFIRME` payments settle the invoice.

## eGate and ABC kiosk devices

Devices authenticate with the `X-Gate-Key: <GATE_KEY>` header. An invalid key returns `401` (`Clé d'équipement invalide`).

### GET /api/gate/list

```http
GET /api/gate/list
X-Gate-Key: <GATE_KEY>
```

```json
[
  {
    "id": "EG-AIBD-A01", "name": "eGate Arrivées 1", "posteId": "AIBD", "zone": "Arrivées", "type": "eGate",
    "status": "EN_SERVICE", "mode": "AUTO",
    "config": { "faceThreshold": 0.82, "livenessRequired": true, "minAge": 18, "eligibility": "TOUS",
                "eligibleNats": "", "maxRisk": 29, "requireVisaCheck": true, "maxSessionSec": 45 }
  }
]
```

`status`: `EN_SERVICE` (in service), `HORS_SERVICE` (out of service), `MAINTENANCE` (or `ALARME`, raised by monitoring). `mode`: `AUTO`, `MANUEL` (manual), `FERME` (closed). `eligibility`: `TOUS` (all), `CEDEAO` (ECOWAS), `LISTE` (list, with `eligibleNats`).

### POST /api/gate/transaction

Submits a crossing for the gate decision.

```json
{
  "gateId": "EG-AIBD-A01",
  "mrz": "P<FRAMARTIN<<CLAIRE<<<<<<<<<<<<<<<<<<<<<<<<<\n21CX883416FRA7812248F3105308<<<<<<<<<<<<<<08",
  "chip": { "read": true, "dg1": "…", "passiveAuth": true, "protocol": "PACE", "source": "eGate reader" },
  "faceScore": 0.91,
  "liveness": true,
  "attack": null,
  "flight": "HC 404",
  "durationSec": 14
}
```

| Field | Description |
| --- | --- |
| `gateId` | Gate ID (required, `404` if unknown) |
| `mrz` | Optically read MRZ (2 or 3 lines) |
| `chip` | NFC read result: `read` (`false` if the chip was not read), `dg1` (MRZ stored in the chip), `passiveAuth`, `protocol` (`PACE`/`BAC`), `source` |
| `faceScore` | Face match score from 0 to 1 (computed on the device) |
| `liveness` | Liveness detection result |
| `attack` | Detected presentation attack: `masque` (3D mask), `ecran` (screen replay), `impression` (printed photo), `deepfake` |
| `irisScore` | Optional iris score |
| `flight`, `durationSec` | Flight (optional) and transaction duration |

Direction (entry or exit) is derived from the gate's zone. WawID recomputes the match between DG1 and the printed MRZ.

Responses (`200`):

```json
{
  "outcome": "OUVERTURE", "code": "OK", "message": "Bon voyage ! Les portes s'ouvrent.",
  "crossingId": "PX-MH3KA1B2", "traveler": { "surname": "MARTIN", "given": "CLAIRE" }, "visa": null
}
```

| `outcome` | Meaning |
| --- | --- |
| `OUVERTURE` | Gate opening (`code: "OK"`) |
| `ORIENTATION` | Referral to a counter; `code` gives the reason |
| `INDISPONIBLE` | Gate out of service or not in `AUTO` mode |

Referral codes: `ILLISIBLE` (unreadable), `MRZ`, `AGE`, `ELIGIBILITE` (eligibility), `BIOMETRIE` (no face capture), `LIVENESS`, `PUCE` (chip), `FRAUDE` (fraud), `FACE`, `EXPIRE` (expired), `VISA`, `RISQUE` (risk). The `message` field is the text to display to the traveler. Every readable transaction is recorded as a crossing and may raise an alert.

## External connector contract

WawID can query external files in real time (Interpol, WAPIS, national wanted persons file…). Without configuration, the local synchronized copy is used ("Simulated").

### Request sent by WawID

```http
POST <WAWID_CONNECTOR_<ID>_URL>
Content-Type: application/json
Authorization: Bearer <WAWID_CONNECTOR_<ID>_TOKEN>
```

```json
{ "surname": "MARTIN", "given": "CLAIRE", "dob": "1978-12-24", "nat": "FRA", "docNo": "21CX88341", "issuer": "FRA" }
```

### Expected response

```json
{
  "hits": [
    { "list": "Interpol SLTD", "severity": "critique", "reason": "Document reported stolen", "reference": "SLTD-2026-0001", "kind": "document" }
  ]
}
```

| Field | Values |
| --- | --- |
| `kind` | `document` or `person` (default) |
| `severity` | `critique` (critical), `haute` (high, default), `moyenne` (medium), `basse` (low) |
| `surname`, `given`, `dob`, `docNo` | Optional; the request values are used otherwise |

Constraints: HTTP 2xx response within **2.5 s** (otherwise the connector is reported unavailable and the check continues); the connection test sends `{ "ping": true }` with a 4 s timeout.

### Environment variables

| Variable | Role |
| --- | --- |
| `WAWID_CONNECTOR_<ID>_URL` | Service URL; when set, the connector shows as "Connected" |
| `WAWID_CONNECTOR_<ID>_TOKEN` | Token sent as `Authorization: Bearer` (optional) |

`<ID>` is the connector ID without the `CN-` prefix: `INTERPOL_SLTD`, `INTERPOL_NOM`, `WAPIS`, `FPR`, `JUD`, `ETATCIVIL`, `PAXLST`.

## Limits

| Limit | Value |
| --- | --- |
| JSON body (all routes except carriers) | 1,000,000 characters (`413` above) |
| Carrier message | 2 MB (`413` above) |
| Text fields | Truncated to their maximum length (e.g. 1,000 characters for a reply) |
| External connector timeout | 2.5 s |
| Failed e-Visa lookup | `404` response deliberately delayed |

The demonstrator applies no per-client request quota. In production, a web application firewall (WAF) with rate limiting must protect the public routes and the carrier gateway.
