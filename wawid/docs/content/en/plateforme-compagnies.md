# Airline platform

The **airline platform** (`/compagnies/`) is the WawID space for the staff of airlines serving Senegal. It lets you:

- submit **API** (UN/EDIFACT PAXLST) and **PNR** passenger data to the authorities, manually or system-to-system;
- read **acknowledgements** and fix rejected messages;
- track, flight by flight, data **completeness** and compliance with **deadlines**;
- view **security fee** invoices and **declare payments**;
- find the **API integration** documentation for the gateway.

Each account is bound to **a single airline** (its IATA code) and only sees that airline's flights, messages and invoices. The outcome of the checks made by the authorities on passengers is **never** shown (see "What is not disclosed").

> **Demonstrator.** In the demo version, flights, passengers, invoices and payments are fictitious. Never send real passenger data to the demonstrator.

## WawID platforms

WawID has four separate platforms. An account only opens the platform of its profile.

| Platform | Address | Users |
| --- | --- | --- |
| Airline platform | `/compagnies/` | Airline staff (operations, finance, IT) |
| DPAF space | `/dpaf/` | Border officers, analysts, supervisors, Treasury officers, administrators |
| Traveler platform | `/` and `/aide/` | Travelers (public) |
| Mobile apps | `/app/` | Travelers (Android and iPhone) |

An airline account is refused on the DPAF space ("This is an airline account: sign in on the airline platform."); a DPAF account is refused on the airline platform ("This account cannot open the airline platform.").

## Access and sign-in

### Getting an account

Accounts are created by a WawID administrator (role **Airline**, bound to your airline's IATA code). Send your request to WawID through the channel agreed at onboarding, with the name and position of each user. The initial password has at least 10 characters and is handed to you through a secure channel.

The **gateway key** (`X-Carrier-Key`), used by your systems for automatic submission, is separate from user accounts. It is also issued by WawID.

### Signing in

1. Open `/compagnies/` in a recent browser.
2. Enter your **Username** and **Password**.
3. Click **Sign in**.

Your airline's name and code appear under the logo. A session lasts **12 hours**; after that, sign in again. To sign out, use the exit button to the right of your name. The **FR | EN** switch changes the interface language and the moon button toggles dark mode.

Every action (sign-ins, failed sign-ins, submissions, payment declarations) is written to the WawID audit log.

> **Demo**: the accounts `airsenegal` (Air Sénégal, HC) and `airfrance` (Air France, AF) are created automatically with the demo password (`demo` locally).

### Screens

| Menu | Content |
| --- | --- |
| **Dashboard** | Last 30 days indicators, latest messages, upcoming security fee due dates |
| **Submit** | Manual submission of a PAXLST or PNR message, and acknowledgement |
| **Messages** | Log of all messages received from your airline |
| **Flights** | Data received per flight: sources, timeliness, completeness, missing data per passenger |
| **Security fee** | Security fee invoices and payment declaration |
| **API** | System-to-system integration (gateway) and API reference |

## Dashboard

Indicators cover the **last 30 days**:

| Indicator | Meaning |
| --- | --- |
| **Flights submitted** | Number of your airline's flights for which data was received, and number of passengers |
| **Submitted on time** | Share of flights whose messages all arrived on time (API at departure, PNR at D-24h) |
| **Data completeness** | Share of passengers with a document number, date of birth and nationality |
| **Rejected messages** | Rejected messages, out of the number of messages received |
| **Security fee outstanding** | Total outstanding, penalties included, and number of overdue invoices |

The targets monitored by the DPAF are **95 %** of flights submitted on time and **98 %** completeness. Below these, the airline is flagged "Follow up" in carrier compliance monitoring.

The dashboard also shows the **Latest messages** (click a row to read the acknowledgement) and the **Upcoming due dates** for the security fee. The **Submit a message** button opens the submission screen.

## Submitting passenger data

In operations, submission is system-to-system through the gateway (see "API integration"). The **Submit** screen is for one-off submissions, corrections and tests.

1. Choose the **Format**: **Automatic detection**, **PAXLST (API)** or **PNR**.
2. Paste the message into the **Message** field, or click **Upload a file** (`.edi`, `.txt`, `.pnr`).
3. For a test, click **PAXLST example** or **PNR example**: a sample message, adapted to your airline code, fills the field.
4. Click **Submit**.

The **Acknowledgement** appears on the right of the screen.

A message may only concern a flight of **your** airline: a message about another airline's flight is rejected. API and PNR messages for the same flight are merged (matched by document number, otherwise by name): a new message can therefore complete an earlier one.

### Reading an acknowledgement

| Field | Content |
| --- | --- |
| **Status** | **ACCEPTÉ** (accepted), **ACCEPTÉ AVEC AVERTISSEMENTS** (accepted with warnings) or **REJETÉ** (rejected) |
| **Reference** | `MSG-…` reference of the message; keep it for any exchange with WawID or the DPAF |
| **Format** | `PAXLST` or `PNR` |
| **Flight** | Flight recognized in the message |
| **Passengers** | Number of passengers read from the message |
| **Completeness** | Share of the message's passengers with document number, date of birth and nationality |
| **Timeliness** | **On time** or **Late transmission** |
| **Received** | Date and time of receipt |
| **Errors and warnings** | Anomalies found (for example "passenger 2 without SSR DOCS") |

| Status | Meaning | What to do |
| --- | --- | --- |
| **ACCEPTÉ** (accepted) | Message integrated without anomaly | Nothing |
| **ACCEPTÉ AVEC AVERTISSEMENTS** (accepted with warnings) | Message integrated, but some data is missing or incomplete | Complete the data in a new message |
| **REJETÉ** (rejected) | Unknown format, missing flight, no passenger, or another airline's flight | Fix the message and resend it |

The acknowledgement contains **no** check result: no flagged passenger, no score.

## Messages

The **Messages** screen lists every message received from your airline, whether through the gateway or the **Submit** screen: **Received**, **Reference**, **Format**, **Flight**, **Passengers**, **Completeness**, **Status** (with the **late transmission** mention where relevant). Click a row to read the full acknowledgement again, errors included.

## Flights and data completeness

The **Flights** screen shows, for each of your airline's flights: **Flight**, **Route**, **Date**, **Direction** (**Arrival** or **Departure**), **Sources** (`API`, `PNR` or `API + PNR`), **Passengers**, **Completeness** and **Timeliness** (**On time** or **late transmission**).

Click a flight to see its passenger list: **Passenger**, **Document**, **Nationality**, **Seat** and **Missing data**. A passenger is complete when they have a **Document no.**, a **Date of birth** and a **Nationality**; otherwise, the missing fields are shown. Send a new message to complete them: it is merged with the data already received.

## Submission deadlines

| Data | Expected practice | Check applied by WawID |
| --- | --- | --- |
| PNR | At D-48h then D-24h before departure; updates possible until flight close | Received at least 24 h before the scheduled flight time |
| API (PAXLST) | At check-in close, at the latest when the doors close | Received at the latest at the flight's departure time |

A single late message is enough to mark the flight **late transmission**. The message is still integrated.

## Security fee

The security fee is **12 USD per passenger embarking or disembarking** on an international commercial flight (Decree No. 2011-652). It is **collected in the ticket price** and paid monthly by the airline.

### Invoices

One invoice is issued per airline and per month, on the **10th of the following month** (reference `RS-YYYYMM-XX`, where `XX` is your IATA code). It is due **at the end of the month following** the period.

**Amount** = declared passengers × 12 USD × IATA rate of the month (FCFA per 1 USD), rounded to the franc. The calculation is detailed when you open the invoice.

**Late payment penalty**: 5 % of the balance due per started month overdue after the due date.

The **Security fee** screen shows three indicators (**Outstanding (penalties included)**, **Declared payments awaiting validation**, **Overdue invoices**) and the invoice table: **Month**, **Invoice**, **Declared passengers**, **Amount**, **Paid** (and amount **awaiting validation**), **Balance due** (incl. penalty), **Due date**, **Status**.

| Invoice status | Meaning |
| --- | --- |
| **ÉMISE** (issued) | No validated payment, due date not reached |
| **PARTIELLE** (partial) | Partial payment validated |
| **PAYÉE** (paid) | Invoice settled |
| **EN RETARD** (overdue) | Balance due after the due date; the penalty applies |

Only **validated** payments settle an invoice: a payment that is declared but not yet validated does not change the status.

### Who to pay

The payment beneficiary is shown at the top of the **Security fee** screen and in each invoice:

- **WawID — security fee collection account**: the flow in force in WawID. WawID then transfers the **State's share** to the **Receiver General of the Treasury (DGCPT)**;
- **Receiver General of the Treasury (DGCPT)**: if the administration has kept the flow set by Decree No. 2012-519.

The beneficiary's bank details are not shown on the platform: use the details officially notified to you. Put the **invoice reference** in the transfer description.

> **Legal framework.** The "airlines → WawID → Public Treasury" flow differs from the current legal framework: Decree No. 2012-519 assigns collection to the DGCPT, and the decision of the Minister of Economy and Finance of 4 December 2012 has the Treasury pay the operator's share. This flow requires a new regulatory text and a collection-mandate agreement between the State and WawID. Always pay the beneficiary shown by the platform.

### Declaring a payment

1. Make the transfer to the beneficiary shown, with the invoice reference in the description.
2. Open **Security fee** and click **Declare a payment** on the invoice row.
3. Check the **Amount (FCFA)**, prefilled with the balance due (penalties included, minus payments already declared).
4. Choose the **Method**: **Bank transfer**, **SWIFT**, **Mobile money** or **Cheque**.
5. Enter the **Transfer reference** (required).
6. Click **Declare the payment**.

The payment shows as **Awaiting validation**. The finance department **validates** it after reconciliation with the bank statement of the collection account, or **rejects** it with a reason (the default reason is "Non retrouvé sur le relevé du compte de collecte", i.e. not found on the collection account statement).

| Payment status | Meaning | What to do |
| --- | --- | --- |
| **Awaiting validation** | Declared, waiting for bank reconciliation | Wait for validation |
| **Validated** | Matched with the statement; counted in the invoice | Nothing |
| **Rejected** | Not found or incorrect; the reason is shown | Check the transfer and declare again with the correct reference |

When the balance due is fully covered by a declared payment, the button becomes **Details** and the invoice states that the payment is awaiting validation. A declared payment cannot be changed from the platform: in case of error, contact WawID with the invoice reference.

## API integration (gateway)

The **API** screen describes automatic system-to-system submission and shows the *API reference (airlines, devices, connectors)* page.

```http
POST /api/carrier/messages
X-Carrier-Key: <key issued by WawID>
Content-Type: text/plain
```

| Response | Meaning |
| --- | --- |
| **202** | Message accepted; acknowledgement (reference, flight, passengers, completeness, timeliness, warnings) |
| **422** | Message rejected; the acknowledgement contains the reference and the errors |
| **401** | Invalid gateway key |
| **400** / **413** | Empty message or invalid JSON / message larger than 2 MB |

The gateway key is specific to your airline and bound to its IATA code: it only allows you to submit your own flights. Request it from WawID, or have it renewed if you have any doubt about its confidentiality. Messages received through the gateway also appear in the platform's **Messages** and **Flights** screens.

## What is not disclosed

In line with the rules that apply to API and PNR data, **the outcome of the checks made by the authorities is not disclosed to carriers**:

- not on the platform (dashboard, messages, flights, passenger list);
- not in the gateway acknowledgement (no number of flagged passengers, no internal flight identifier);
- no risk score, no reason, no alert.

This separation protects the confidentiality of watchlists and investigations, avoids tipping off a wanted person, and ensures that passenger data is used only by authorized authorities. For the same reason, the DPAF's internal documentation (intelligence, risk score, operations) is not available to airline accounts; only the public pages of the help center are.

If a passenger requires action, the DPAF deals with it directly at the border; the airline has no action to take from the platform.

## Frequently asked questions

| Question | Answer |
| --- | --- |
| I cannot see a flight | Only flights whose number starts with your IATA code and for which a message was received are shown. Check the message's acknowledgement. |
| My message is rejected for "another airline's flight" | The flight in the message does not match the IATA code of your account or key. |
| A payment stays "Awaiting validation" | Bank reconciliation has not taken place yet. Check that the transfer reference and the invoice reference are correct. |
| A colleague needs access | Ask WawID to create an account; never share your credentials. |
| I need to change a message already sent | Send a new corrected message: it is merged with the data already received for the flight. |
