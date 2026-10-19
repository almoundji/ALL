# Crossings, traveler search, QR and vehicles

This page covers four applications in the **Border control** space, available to all roles for viewing:

- **Crossings**: the history of all border crossings and the detail page of each crossing;
- **Traveler search**: a traveler's 360° profile;
- **Verify a QR**: checking e-Visa QR codes;
- **Vehicles (VRS)**: vehicles and occupants at land border posts.

## Crossings: the list

The **Crossings** tile shows every crossing recorded at counters, eGates and ABC kiosks over the last 14 days. The table title shows the number of crossings matching the filters, for example **Crossings (1,284)**.

### Filtering

| Filter | Effect |
| --- | --- |
| **Search** | Surname, given names, document number, flight or crossing identifier. Not sensitive to accents or case. |
| **Border post** | One border post or **All**. |
| **Direction** | **Entry**, **Exit** or **All**. |
| **Channel** | **Counter**, **eGate / ABC** or **All**. |
| **Decision** | **Cleared**, **Secondary inspection**, **Refused** or **All**. |
| **Risk** | **Low**, **Moderate**, **High** or **All**. |
| **Period** | **24 h**, **7 days** or **14 days**. |
| **Suspected fraud** | Checkbox: only crossings with a fraud factor. |

Filters apply immediately, without a confirm button. The **See all** link on the dashboard opens this list already filtered on suspected fraud.

### Columns and sorting

The table shows **Date / time**, **Traveler** (and nationality), **Document**, **Border post** (with channel, eGate and flight), **Direction**, **Risk** (score, level and a **Fraud** badge where relevant), **Decision** and **Officer**.

By default, crossings are sorted from newest to oldest. Click a column header to sort by that column; click again to reverse the order.

### Showing more rows

The table shows 50 rows. The **More [50 / 1,284]** button at the bottom adds the next 50; the two numbers are the rows shown and the total.

### CSV export

**Export CSV** downloads `wawid-passages.csv` with **all** crossings matching the filters (not just the rows shown): identifier, date, border post, channel, eGate, direction, surname, given names, nationality, document, flight, score, fraud (yes / no), decision, reason and officer. The separator is a semicolon, which suits Excel with French regional settings; with other settings, use Excel's import feature and choose the semicolon separator. Column headers are in French.

## Crossings: the crossing page

Click a row to open the crossing page. The breadcrumb **Crossings › PX-…** takes you back to the list.

### Header

The header presents the traveler: initials, surname and given names, document type and number, nationality, date of birth, and badges for the decision, suspected fraud, direction and channel. On the right: **Risk score**, **Face** score and the number of **Known crossings** for this document.

The anchor bar **Information**, **Risk assessment**, **Traveler history** and **Log** scrolls the page to the selected section.

### Sections

- **General information**: date, border post, channel (counter, or eGate and its identifier), flight and origin, officer, duration; face match, liveness detection, fingerprints (out of 4), iris, NFC chip (**Authenticated**, **Passive authentication failed** or **Not read**, with the protocol and "simulated" where relevant), document expiry and reason. The officer's **Remarks** appear below.
- **Risk assessment**: score gauge, level, the recommendation matching the score and the explanatory factors with their points.
- **Traveler history**: the other crossings with the same document number (up to 20), or "First known crossing". Click a row to open that crossing.
- **Log**: the crossing record (counter or eGate, and officer), then the history of related alerts (creation, assignment, notes, closure).

### Actions

| Action | Roles | Effect |
| --- | --- | --- |
| **Open a case** | Cases permission (officer, analyst, supervisor, administrator) | Creates a secondary inspection case linked to the crossing and its alert, then opens it. If a case is already open for that alert, it is reused. |
| **Add as person of interest** | Watchlists permission (analyst, supervisor, administrator) | Adds the traveler (surname, given names, date of birth, nationality) to the **Person of interest** list, medium severity, with the crossing reference. Later checks will flag them. |
| **360° profile** | All | Opens **Traveler search** on the document number. |
| **Print** | All | Prints the page (action buttons are hidden when printing). |

## Traveler search (360° profile)

**Traveler search** gathers everything WawID knows about one person: crossings, e-Visa applications, APIS announcements and watchlist hits. Open it from its tile, from the **360° profile** button on a crossing page, or from the global search in the top bar.

1. Enter a surname, given names or a document number in **Surname, given names or document no.**
2. Click **Search**.

### Identity resolution

WawID goes beyond exact matching:

- **by document**: an identical document number finds all related crossings and e-Visa applications;
- **by approximate name**: the comparison tolerates typos, accents, swapped surname / given names and common transliteration variants (for example Mohamed, Mouhamed, Mamadou; Abdoulaye, Abdullahi; Ousmane, Usman);
- **by date of birth**: two crossings with different documents are grouped under the same identity when the names are very close and the date of birth is identical.

### Results

- A red banner flags **watchlist matches**, with the list, the name or document and the reference.
- Each identity found forms a card: name, nationality, date of birth, documents used, a **Several documents** badge when the person traveled with more than one document, and the number of crossings and e-Visa applications. The card lists the 12 most recent crossings and the e-Visa applications; click a row to open the crossing or the application.
- The **Announced on flights (APIS)** section lists flights on which an airline announced the person, with the pre-screening score.

When nothing is found, the message "No results for …" is shown.

## Verify a QR (e-Visa)

Travelers present the QR code of their approved e-Visa, issued by the portal. A QR code contains a value such as `EV.EV2600001.ab12cd34ef56gh78`: a type, a reference and a cryptographic signature computed by the server. The security fee is included in the ticket: no payment receipt is required from the traveler.

1. Open **Verify a QR** (tile, or button in the counter check).
2. Read the QR code:
   - with a **handheld scanner**: put the cursor in **QR code content** and scan;
   - with the **camera**: click **Scan** and show the QR code; reading is automatic. This depends on the browser (built-in QR reading, available in particular in Chrome and Edge); otherwise a message invites you to use a handheld scanner or paste the content;
   - or **paste** the content.
3. Click **Verify** (not needed after a camera scan).

The result shows **Valid** or **Invalid** with a message, then the type, **Reference**, **Holder** and **Document**. Always compare the holder and number with the document presented.

| Case | Result |
| --- | --- |
| Wrong signature (altered or fabricated QR) | Invalid — "Invalid or forged QR code (incorrect signature)." |
| e-Visa approved and not expired | Valid — visa number and end of validity. |
| e-Visa not approved or expired | Invalid — application status. |
| Former WawPass receipt (`WP.…`), first verification | Valid — "Fee paid", flight and travel date (history). |
| Former WawPass receipt already verified | Invalid — "Receipt already used." |

> Traveler payment through WawPass has been removed; receipts issued before can still be verified for the record. Their first verification marks them as used and is written to the audit log. They are listed in **eGate pre-enrollments**, **WawPass history** tab.

## Vehicles (VRS)

The **Vehicles (VRS)** application records vehicles and their occupants at land border posts (Rosso, Kidira, Karang…), from license plate reading and occupant declarations. The tile shows the number of flagged vehicles.

- **Plate, driver**: search on the plate or the driver's name.
- **Flagged only**: shows only flagged vehicles.

The table shows **Date**, **Plate** (with the **Flagged** badge and the related note), **Type** and cargo, **Driver** and number of occupants, **Border post** and direction. Column sorting and the **More** button work as in the crossings list.
