# APIS and PNR

The **APIS Monitor** app (**APIS & PNR** space) is the single window for passenger data sent by airlines:

- **API** (Advance Passenger Information): identity and document of each passenger, in UN/EDIFACT **PAXLST** format;
- **PNR** (Passenger Name Record): booking data (record locator, itinerary, form of payment, contact details).

Every announced passenger is checked against the watchlists, the targeting rules and travel authorizations **before** the flight arrives or departs.

| Action | Permission |
|---|---|
| View flights, gateway and compliance | `read` |
| **Receive an API / PNR message**, **CSV manifest** | `apis` (intelligence analyst, supervisor, administrator) |

Three home-page tiles lead straight to the tabs: **Announced flights**, **Carrier gateway**, **Carrier compliance**. The **Receive a message** action tile opens the manual upload dialog.

## Announced flights and pre-screening

The **Announced flights** tab lists flights sorted by schedule, with the columns **Flight** (and airline), **Route** (and direction **Arrival** / **Departure**), **Schedule**, **Passengers** and **Flagged**. A passenger is **flagged** when the pre-screening score reaches 30.

### View a flight manifest

1. Click a flight. The manifest opens on the right.
2. The header shows the data source (**API**, **PNR**, **API + PNR** or manual upload), the reception date and, if relevant, the **late transmission** mention.
3. Passengers are sorted by descending score: **Seat**, **Passenger** (nationality and document number), **Booking** (PNR locator, payment, one way, presence of a phone or e-mail), **Pre-screening** (score and level), **Reasons** (factors worth at least 10 points).

### Passenger record

Click a row to open the record:

- **API data**: flight, seat, document type and number, issuer, birth, sex, nationality, expiry, boarding → disembarkation, and **Crew** when relevant;
- **PNR data**: record locator, **Booked on**, **Payment** (Cash, Card…), **E-mail**, **Phone**, full **Itinerary** (one segment per line);
- **Pre-screening**: score, level and the detailed list of factors with their points.

An **APIS / PNR** alert is created in the Threat Monitor for each passenger whose score reaches **35** (one open alert per passenger and per flight). No result is sent back to the airline.

## Merging API and PNR data for one flight

API and PNR messages for a flight arrive separately and at different times. WawID merges them:

1. The flight is identified by its number (e.g. `HC404`) and its **date** (same day). If it does not exist, it is created. The direction is **Arrival** when the destination is `DSS` or `ZIG`, otherwise **Departure**.
2. Each passenger is matched with a known passenger by **document number** or, failing that, by normalized **surname and given names**.
3. Filled fields in the new message complete or replace the known ones; empty fields erase nothing.
4. The flight source becomes **API + PNR** once both message types have been received.
5. Pre-screening is **recalculated for every passenger of the flight** after each message.

## PNR indicators

Booking data add explainable indicators to the score:

| Indicator | Points | Detection |
|---|---|---|
| Ticket paid in cash | 10 | `FP CASH` element |
| One-way ticket with no return booked | 5 | No segment leaves from the destination |
| Last-minute booking | 10 | Less than 48 h between the booking date (`BKD`) and the flight |
| Shared contact details | 15 + 10 per linked passenger, max. 45 | Same e-mail or phone (at least 8 digits) as other passengers on the flight holding other documents |

Phone numbers and e-mails are also compared with the **contact-details blacklist** (Blacklist factor).

## Carrier gateway

The **Carrier gateway** tab shows the message journal and the **Airline connection** panel.

### Message journal

Columns: **Received**, **Format** (`PAXLST`, `PNR` or `INCONNU` for unknown), **Flight** (and source: airline gateway, airline platform — "Portail compagnie" — or manual upload), **Passengers**, **Flagged** (score ≥ 35, visible only in the DPAF space), **Completeness**, **Status**. Click an accepted message to open the flight.

| Status (as stored) | Meaning |
|---|---|
| **ACCEPTÉ** (accepted) | Message decoded and integrated with no remark |
| **ACCEPTÉ AVEC AVERTISSEMENTS** (accepted with warnings) | Integrated, but anomalies are listed (e.g. missing UNH header, passenger without SSR DOCS, PNR without a segment) |
| **REJETÉ** (rejected) | Unknown format, no flight, no passenger, or a flight belonging to another airline than the key's |

**Completeness** is the share of passengers with a document number, a date of birth and a nationality.

### Airline connection

- **Access point**: `POST https://<domain>/api/carrier/messages`
- **Authentication**: `X-Carrier-Key` header, one key per airline, set in the `WAWID_CARRIER_KEYS` variable (e.g. `HC:key1,AF:key2`). The key is bound to the IATA code: a message about another airline's flight is rejected.
- **Responses**: 202 and an acknowledgment (`MSG-…` reference, flight, passengers, completeness, timeliness, warnings); 422 when rejected; 401 when the key is invalid. The acknowledgment contains **neither the number of flagged passengers nor the internal flight identifier**: no pre-screening result is disclosed to the airline.
- **Airline platform** (`/compagnies/`): each airline also has accounts with the **Airline** role to submit messages manually, read its acknowledgments, and track the completeness of its flights and its security fee. Messages sent from the platform appear in this log with the source "Portail compagnie" and are processed exactly like gateway messages.

The full specification for airlines is in `docs/API-TRANSPORTEURS.md` and on the *API reference* and *Airline platform* pages.

### Receive an API / PNR message manually

Use this for a message received outside the gateway, or for a demonstration. Processing is identical to the gateway.

1. Click **Receive an API / PNR message**.
2. Paste the message, or click **PAXLST example** or **PNR example** to load a compliant sample.
3. Click **Process message**.
4. A message shows the status, the flight, and the number of passengers and flagged passengers; the flight opens.

The samples show the complete process:

- **PAXLST example**: flight HC404 CDG → DSS with three passengers, one of whom matches a fictitious Interpol red notice;
- **PNR example**: two bookings. The first (TK597 IST → DSS) is paid in cash, booked less than 48 h before the flight, one way, and its two passengers share the same phone number, which is on the blacklist. The second completes flight HC404 with a round trip paid by card.

Accepted PNR format (one line per element; several PNRs separated by an `END` line):

```text
RLOC ABC123
BKD 18OCT26
FP CASH
1.MARTIN/PAUL MR
HC 404 Y 25OCT CDGDSS
SSR DOCS HC HK1 P/FRA/19AB12345/FRA/01JAN80/M/01JAN32/MARTIN/PAUL/P1
SSR CTCE HC HK1 PAUL//MARTIN.FR/P1
SSR CTCM HC HK1 33612345678/P1
```

### Upload a CSV manifest

For an airline that is not connected, upload a manifest:

1. Click **CSV manifest**.
2. Fill in **Flight** and **Carrier** (mandatory), **Route**, **Direction** (**Arrival** or **Departure**) and **Scheduled time**.
3. Paste the passengers, one line each: `seat;surname;given names;birth;nationality;document;expiry`. Separators `;`, `,` and tab are accepted; a header line containing "nom" is skipped.
4. Click **Pre-screen**.

Each line must contain a surname, a document number, a 3-letter ISO nationality and a `YYYY-MM-DD` date of birth; otherwise the numbers of the invalid lines are displayed. A manifest always creates a **new** flight (600 passengers at most). It is not merged with API/PNR messages and does not compute PNR indicators.

## Carrier compliance

The **Carrier compliance** tab rates each airline:

| Column | Calculation |
|---|---|
| **Flights** | Number of announced flights |
| **Passengers** | Total number of passengers |
| **On-time transmission** | Share of flights without late transmission |
| **Data completeness** | Share of passengers with date of birth, document number and nationality |
| **Rejected messages** | Rejected messages linked to the airline's flights |
| **Status** | **Compliant** if timeliness ≥ 95 % and completeness ≥ 98 %, otherwise **Follow up** |

**Deadlines applied**: an API message must arrive no later than the flight's departure time; a PNR message no later than 24 h before the scheduled flight time. A single late message marks the flight as **late transmission**. The standard expected from airlines (ICAO Annex 9) is API at flight close and PNR at H-48 then H-24.

> In the demo, flights, passengers and airlines are fictitious, and the "API/PNR carrier gateway" connector is in simulated mode. Locally, the key `dev-carrier-key` is accepted for every airline.
