# Threat Monitor, cases, watchlists, rules and connectors

The **Intelligence** space of the back office groups five apps: **Threat Monitor** (alerts), **Cases** (secondary inspections), **Watchlists**, **Targeting rules** and **Connectors**. They are intended for intelligence analysts and supervisors and, for alert and case handling, for border officers.

| App | Permission to view | Permission to act |
|---|---|---|
| Threat Monitor | `alerts` | `alerts` (open a case: `cases`) |
| Cases | `cases` | `cases` |
| Watchlists | `read` | `watchlist` |
| Targeting rules | `read` | `rules` |
| Connectors | `read` | **Test**: `watchlist` · **Enable / Disable**: `system` |

> The roles that hold these permissions are described on the *Administration* page. Every action below is written to the **Audit log**.

## Threat Monitor

The Threat Monitor is the single view of all matches: counter crossings, eGates and APIS/PNR pre-screening. An alert is created automatically:

- for a crossing (counter or eGate) whose risk score reaches **35** or whose decision is **Refused**;
- for an announced passenger (API/PNR message or manifest) whose score reaches **35** — one open alert per passenger and per flight.

Alert severity depends on the score: **Critical** from 80, **High** from 60, **Medium** below. The type and title are derived from the risk factors (see *Understanding the risk score*).

The bell in the top bar shows the number of **New** alerts. Data refreshes every 30 seconds, and a message announces new alerts.

### Tabs and filter

| Tab | Content |
|---|---|
| **Open** | All alerts that are not closed (default view) |
| **New** | Alerts nobody has taken yet |
| **In progress** | Alerts taken or reopened |
| **Closed** | Resolved alerts |
| **All** | Every alert |

The **All types** drop-down filters by type: **Lost / stolen document**, **Watchlist**, **Biometric fraud**, **Document fraud**, **Document expired**, **Targeting rule**, **No authorization**, **APIS / PNR**, **High risk**.

### Master-detail view

The list (columns **Severity**, **Alert**, **Received**, **Status**) is on the left. Click a row to open the detail on the right:

- traveler, document, border post, status and owner, and the resolution if any;
- a link to the **Crossing** (with its score) or to the **Flight** for an APIS alert;
- the score **Factors**, with their points;
- the time-stamped **History** of every action.

### Handle an alert

1. On the **New** tab, select the alert.
2. Click **Take ownership**. Your name is recorded as owner and the alert moves to **In progress**. This button only appears on a new alert.
3. To record a check, click **Note**, type the text, then click **Add**. An empty note is rejected.
4. For an in-depth inspection, click **Open a case** (permission `cases`). If an open case already exists for this alert, WawID shows it instead of creating a second one.
5. When the doubt is resolved, click **Close**. Choose a **Resolution**:
   - False alert — namesake
   - Doubt resolution — additional documents
   - Handed over to the border police
   - Entry refusal notified
   - Notice sent to Interpol (NCB)
   - Document seized
   - Other…
6. If needed, fill in **Details**, then click **Close**. The stored resolution combines the choice and the details ("choice — details"). A resolution is mandatory.

To go back to a closed alert, open it and click **Reopen**. It returns to **In progress** and the event is added to the history.

## Cases

A case documents a secondary inspection: interview, notes and decision. It takes the alert title, its severity as **Priority**, the traveler, the border post and the linked crossing. You become its **Owner**.

The list shows **Case**, **Subject**, **Priority**, **Owner**, **Open** (opening date) and **Status** (**Open** or **Closed**). Click a row to open the case page.

### Conduct the structured interview

1. Open the case.
2. In the **Structured interview** card, fill in the four sections: **Purpose of travel**, **Accommodation / address in Senegal**, **Funds and return ticket**, **Officer remarks**.
3. Click **Save**.

### Add a note

In the **Notes** card, type the text in **Add a note…** and click **Add**. Each note is time-stamped and signed. Opening, closing and reopening are also recorded there automatically.

### Close or reopen

Click **Close the case**. The interview becomes read-only and **Save** is disabled. **Reopen** lets you resume the case. The **Crossing** button opens the original crossing record.

## Watchlists

WawID keeps a synchronized local copy of the wanted-persons and document files. It is queried at every counter check, every eGate transaction, every e-Visa application and every announced passenger (APIS/PNR).

### Sources

| Tab (source) | Content |
|---|---|
| **Interpol — notices** | Notices (red, yellow…) |
| **Interpol — diffusions** | Diffusions (for example blue) |
| **Interpol SLTD** | Stolen and lost travel documents |
| **WAPIS** | West African regional police data |
| **Wanted persons (FPR)** | National wanted persons file (FPR) |
| **Judicial exclusion orders** | Judicial exclusion orders |
| **Invalidated national documents** | Passports cancelled by the national authority |
| **Persons of interest** | Persons of interest (POI) designated by analysts |

The **contact-details blacklist** ("Blacklist — contact details") adds e-mail addresses, phone numbers and device identifiers linked to fraud rings. These entries appear on the **All** tab. In this version, the add dialog only offers **Person** and **Document**. E-mail, phone or device entries are created through the API (`POST /api/watchlist` with `kind` = `email`, `phone` or `device` and the `value` field).

A tab only appears when it holds at least one entry. The table shows **Type**, **Identity / document**, **Source** (with the reference), **Severity**, **Reason** and **Status**.

### Add an entry

1. Click **Add** (or the **Add an entry** tile on the home page).
2. Choose the **Type**: **Person** or **Document**.
3. Choose the **Source** (default: **Persons of interest**).
4. For a person, enter **Name** and **Given names** (mandatory) and, if possible, the **Date of birth** and **Nationality**. For a document, enter the **Document no.** (mandatory) and the **Issuing State**.
5. Set the **Severity** (**Critical**, **High**, **Medium**, **Low**), the **Reference** (notice or warrant number…) and the **Reason**.
6. Click **Add**. The entry applies immediately to the next checks.

> From a crossing record, the **Add as person of interest** button creates a POI entry with medium severity in one click.

### Disable or re-enable an entry

In the **Status** column, click **Disable**. An inactive entry is kept but no longer used. Click **Enable** to restore it.

### Test a name match

1. Click **Test a match**.
2. Type a name (at least 3 characters), in any order.
3. The six closest "person" entries appear with their similarity: red from 90 %, orange from 80 %.

The tester compares names only. It ignores the date of birth and whether the entry is active.

### How matching works

- **Normalization**: upper case, ICAO transliteration (Ä → AE, Ø → OE…), accents, apostrophes and hyphens neutralized. The prefixes "ABD", "ABDEL", "ABDUL", "ABD AL" and "ABD EL" are unified.
- **Variants**: common spellings are grouped, for example Mohamed / Mohammed / Muhammad / Mamadou / Mahamadou, Abdoulaye / Abdullahi / Abdallah, Ousmane / Usman.
- **Token-based, order-insensitive**: each element of the shorter name must find a close equivalent in the other name. Closeness between two elements is the average of Jaro-Winkler and an edit distance. The final score is the average of the mean similarity and the lowest one, so a common surname alone is not enough (NDIAYE AWA ≠ NDIAYE ADAMA). A single-element name is capped at 85 %.
- **Date of birth**: +6 similarity points when it matches, −8 points when both dates are known and differ.
- **Threshold**: a match is kept from **90 %**.
- **Documents**: the number (letters and digits only) must be identical; the issuing State must also match when both sides know it.
- **Blacklist**: exact match of the e-mail (no spaces, case-insensitive), the phone (digits only) or the device identifier.

## Targeting rules

A targeting rule adds points to the score when **all** its conditions are true. Each card shows the rule as "IF … THEN +N points", its status, the number of times it fired on recorded crossings, its author and the last change.

### Fields and operators

| Field | Compared value |
|---|---|
| **Nationality** | 3-letter ISO code (e.g. `NGA`) |
| **Issuing State** | ISO code of the document |
| **Origin / destination** | Airport or border post code entered (e.g. `IST`, `ROS`) |
| **Age** | Age in years |
| **Sex** | `M`, `F` or `X` |
| **Direction** | `ENTREE` (entry) or `SORTIE` (exit) |
| **Channel** | `GUICHET` (counter), `EGATE`, `APIS` or `EVISA` |
| **Crossings over 30 days** | Number of crossings with the document over 30 days |
| **Remaining document validity (days)** | Days before expiry |

Operators: **is one of**, **is not one of** (lists; values separated by spaces or commas; case-insensitive), **greater than**, **less than** (numbers). A condition on unknown data is false.

### Create or edit a rule

1. Click **New rule** (or **Edit** on a card).
2. Enter the **Name** and the **Points added** (0 to 100, default 10).
3. For each condition, choose the field, the operator and the value. **Condition** adds a row (8 at most); the cross removes one.
4. Click **Save**. A name and at least one condition are mandatory.

**Enable** / **Disable** changes the status without losing the rule. The trash icon deletes it after confirmation. Crossings already assessed keep their score.

## Connectors

Connectors link WawID to national and international files. Each card shows the **Protocol**, **Mode**, number of **Records**, **Last sync** and the expected environment variable.

| Connector | Source | Variables |
|---|---|---|
| Interpol I-24/7 — SLTD | Interpol SLTD | `WAWID_CONNECTOR_INTERPOL_SLTD_URL` / `_TOKEN` |
| Interpol I-24/7 — Nominal & notices | Interpol — notices | `WAWID_CONNECTOR_INTERPOL_NOM_URL` / `_TOKEN` |
| WAPIS | WAPIS | `WAWID_CONNECTOR_WAPIS_URL` / `_TOKEN` |
| National wanted persons file | FPR | `WAWID_CONNECTOR_FPR_URL` / `_TOKEN` |
| Judicial exclusion orders | Judicial exclusion orders | `WAWID_CONNECTOR_JUD_URL` / `_TOKEN` |
| National passport register (DAF) | Invalidated national documents | `WAWID_CONNECTOR_ETATCIVIL_URL` / `_TOKEN` |
| API/PNR carrier gateway | APIS | `WAWID_CONNECTOR_PAXLST_URL` / `_TOKEN` |

### Statuses

| Status | Meaning |
|---|---|
| **Simulated (local copy)** | No URL configured: only the local copy of the lists is used. All connectors are in this status in the demo. |
| **Connected** | The `…_URL` variable is set: the service is queried in real time. |
| **Disabled** | Stopped by an administrator. Local entries from its source are ignored during counter and eGate checks. |

### Exchange contract

At each counter or eGate check, WawID queries the **Connected** connectors in parallel (2.5 s timeout), with the header `Authorization: Bearer <TOKEN>` when a token is set:

```json
POST <URL>
{ "surname": "…", "given": "…", "dob": "YYYY-MM-DD", "nat": "SEN", "docNo": "…", "issuer": "SEN" }
```

Expected response:

```json
{ "hits": [ { "list": "…", "severity": "critique|haute|moyenne|basse", "reason": "…", "reference": "…", "kind": "person|document" } ] }
```

A hit without severity is treated as **high** (`haute`). Hits are added to the local copy, which is always queried. If a service is unreachable or returns an error, the check continues on the local copy (degraded mode) and the error is reported to the officer. e-Visa and APIS pre-screening use the local copy only.

### Test a connector

Click **Test**. In simulated mode, the message is "Simulated mode: synchronized local copy used.". In connected mode, WawID sends `{ "ping": true }` (4 s timeout) and shows "Service reachable." with the latency, or the failure reason.

> Live access to Interpol I-24/7 goes through the National Central Bureau (NCB). Access to WAPIS goes through the national platform.
