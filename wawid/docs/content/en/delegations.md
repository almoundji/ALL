# Delegations: official visits, competitions, conferences

The **Delegations** application (**e-Visa & travelers** space) manages groups announced in advance: official visits, sports teams, participants in a conference or a cultural event. It lets you:

- **register** a delegation and its member list, or receive one declared by the organizer on the traveler portal;
- **pre-screen** every member at registration (watchlists, targeting rules);
- **validate** or **refuse** the delegation, with or without a **collective entry authorization**;
- **recognize** members at the counter and **check in** their arrival;
- **close** the delegation at the end of the stay.

> The collective authorization only replaces the individual e-Visa. It exempts no one from checks: every member goes through the counter (document reading, chip, biometrics, database queries) like any traveler.

## Access and permissions

The DPAF space offers two tiles under **e-Visa & travelers**:

| Tile | Purpose | Indicator |
|---|---|---|
| **Delegations** | List and records of delegations (route `#/delegations`) | Number of delegations **to validate** (orange when not zero) |
| **Register a delegation** | Creation tile: opens the **New delegation** form directly | — |

| Action | Permission | Roles |
|---|---|---|
| View delegations, their members and pre-screening, print the list | `read` | All DPAF space roles |
| **New delegation**, **Add members**, remove a member, **Validate**, **Refuse**, **Close** | `evisa` | Intelligence analyst, Supervisor, Administrator |
| **Check in** a member's arrival | `control` | Border officer, Supervisor, Administrator |

Organizers (ministries, embassies, sports federations, organizing committees) have no account: they declare and track their delegation on the traveler portal, **Delegations** tab (see below).

## Types and statuses

| Type | Code |
|---|---|
| Official visit | `VISITE_OFFICIELLE` |
| Sports competition | `COMPETITION` |
| Conference / summit | `CONFERENCE` |
| Cultural event | `CULTUREL` |
| Other | `AUTRE` |

| Status | Meaning | Possible actions |
|---|---|---|
| **Submitted** (`SOUMISE`) | Registered by the DPAF or declared by the organizer, awaiting a decision | Add or remove members, **Validate**, **Refuse** |
| **Validated** (`VALIDEE`) | Accepted, with or without a collective entry authorization; members are recognized at the counter | Add members, **Check in** arrivals, **Close** |
| **Refused** (`REFUSEE`) | Rejected, with a reason shown to the organizer | None |
| **Closed** (`CLOTUREE`) | Stay over; members are no longer recognized at the counter | None |

## The delegation list

The header shows four indicators:

- **Awaiting validation**: submitted delegations;
- **Validated, ongoing or upcoming**: validated delegations whose departure date has not passed, with the number of members expected;
- **Flagged members**: members whose pre-screening score is 60 or more;
- **Arrived**: members whose arrival has been checked in.

The **Status** and **Type** filters narrow the table, which shows:

| Column | Content |
|---|---|
| **Reference** | `DL…` reference and a **VIP** badge for a protocol reception |
| **Delegation** | Name, type and event |
| **Stay** | Arrival and departure dates, point of entry and flight |
| **Members** | Number of members, and number of flagged members in red |
| **Status** | Status; for a validated delegation, **Collective authorization** or **Individual e-Visas** |

Click a row to open the delegation record.

## Registering a delegation (DPAF)

1. Click the **Register a delegation** tile, or **New delegation** in the **Delegations** application.
2. Enter the **Delegation name** (mandatory), the **Type**, the **Event** and the **Host / organizer in Senegal**.
3. Choose the **Country of origin**, the **Arrival** and **Departure** dates (mandatory), the **Point of entry** (AIBD by default) and the **Flight / means of transport**.
4. Choose the **Protocol**: **Standard** or **VIP (protocol reception)**. The VIP level is only available in the DPAF space; it is shown in the counter banner.
5. Fill in the organizer's contact (name, e-mail, phone).
6. Enter the **Members**, one line per person (see the format below).
7. Click **Save**.

WawID assigns a reference made of `DL` + two-digit year + sequence number (for example `DL260004`), pre-screens each member and opens the record. The delegation is **Submitted**: it still has to be validated.

### Member list format

One line per member, fields separated by a semicolon (or a tab):

```
Nom;Prénoms;Nationalité;Sexe;Naissance;Passeport;Fonction;Type de passeport
```

| Field | Format | Mandatory |
|---|---|---|
| Surname (`Nom`) | Text | Yes |
| Given names (`Prénoms`) | Text | No |
| Nationality (`Nationalité`) | 3-letter ISO code (`SEN`, `JPN`, `NGA`…) | Yes |
| Sex (`Sexe`) | `M` or `F` | No |
| Date of birth (`Naissance`) | `YYYY-MM-DD` | Recommended |
| Passport (`Passeport`) | Passport number (spaces removed) | Yes |
| Role (`Fonction`) | Head of delegation, athlete, coach, journalist… ("Membre" by default) | No |
| Passport type (`Type de passeport`) | `DIPLOMATIQUE`, `SERVICE` or `ORDINAIRE` (`ORDINAIRE` by default) | No |

Example:

```
Jallow;Mamadou;GMB;M;1968-03-14;GD0012345;Head of delegation;DIPLOMATIQUE
Ceesay;Awa;GMB;F;1979-07-02;GD0012399;Adviser;DIPLOMATIQUE
```

Tips and checks:

- The list can be **copy-pasted from Excel**: copied columns are separated by tabs, which WawID recognizes. A header line starting with "Nom" is ignored.
- A member without a surname, a passport number or a valid nationality blocks the registration, with a message naming the member.
- A passport number can only appear once in a delegation.
- A delegation has at most 500 members; one addition has at most 200.

## Member pre-screening

At registration, and for every member added later, WawID computes a risk score (`DELEGATION` channel, entry direction) from the local copy of the **watchlists** and the active **targeting rules**. The score is frozen at that moment: it is not recalculated if the lists change afterwards (the counter check, however, queries up-to-date databases).

- The **Pre-screening** column of the record shows the score, the level and the first two factors.
- A member whose score reaches **60** is **flagged**: a red banner says so at the top of the record and a **Delegation (pre-screening)** alert (`DELEGATION`) is created in the **Threat Monitor**, with **High** (60 to 79) or **Critical** (80 and above) severity. Its title includes the delegation reference ("Délégation DL… : Liste de surveillance", for example).
- The pre-screening result is **never disclosed to the organizer**, neither on the portal nor in the public API response.

## Processing a delegation

### The delegation record

The record contains:

- the **Members** table: name and role, **Nationality**, **Passport** (number and type), **Birth**, **Pre-screening** and **Arrival** (check-in date and time, or a **Check in** button);
- the **Information** panel: reference, stay, point of entry and flight, origin, host, protocol, **Entry** regime (collective authorization or individual e-Visas), contact, **Source** (**Espace DPAF** or **Portail organisateurs**) and, where relevant, **Refusal reason**;
- the time-stamped **History**: registration, decisions, additions, removals and checked-in arrivals, with their author.

The **Print the list** button prints the record (member list included) for the reception team or the post chief.

### Checking before deciding

1. Open each related **Delegation (pre-screening)** alert in the **Threat Monitor** and handle it like any alert: **Take ownership**, checks, **Note**, then **Close** with a resolution, or **Open a case**.
2. For a member whose match is confirmed, remove them from the list (trash icon on their row, available while the delegation is **Submitted**) or refuse the delegation, according to your chain of command's instructions.
3. Check the consistency of the list: dates, roles, passport types, number of members announced by the organizer.

### Validating

1. Click **Validate**. The window recalls the number of members and of flagged members.
2. Leave **Grant a collective entry authorization** ticked so the delegation counts as an e-Visa for each member, or untick it to require an individual e-Visa from each member who needs a visa.
3. Click **Validate**. The delegation becomes **Validated** and the decision is recorded in the history and the audit log.

### Refusing

1. Click **Refuse**.
2. Enter the **Refusal reason**: it is shown to the organizer on the portal. Without a reason, WawID records "Refus motivé par la DPAF".

Only a **Submitted** delegation can be validated or refused.

### Adding or removing members

- **Add members** (**Submitted** or **Validated** delegation): paste the new lines in the same format and click **Add**. New members are pre-screened; a passport already in the list is rejected. When added to a validated delegation, they benefit from its entry regime.
- **Remove** a member: trash icon on their row, after confirmation (**Submitted** delegation).

### Closing

After the delegation has left, click **Close**. The delegation becomes **Closed**: its members are no longer recognized at the counter and the collective authorization ends immediately.

## The collective entry authorization

For a **Validated** delegation with a collective authorization, the risk engine treats each member as holding an approved travel authorization during the stay window: **from 3 days before arrival to 3 days after departure**. At the counter, the **Travel authorization (e-Visa)** line is then **OK** and shows the delegation reference (for example `DL260001 — APPROUVEE (until …)`). eGates also recognize this authorization; the gate's other eligibility conditions still apply.

Key points:

- the authorization only matters for nationalities that need a visa; for a visa-exempt nationality, it changes nothing;
- an approved individual e-Visa takes precedence if one exists;
- outside the stay window, or after closing, the member is an ordinary traveler again;
- without a collective authorization, the delegation is still recognized at the counter (banner), but each member who needs a visa must hold an individual e-Visa;
- **counter checks remain mandatory** for everyone: watchlists, document, chip, biometrics. A member flagged at the counter is handled like any traveler.

## At the counter: receiving a member

1. Check the member normally in **Counter check** (document, chip, biometrics).
2. At the **Checks** step, a blue banner appears above the results if the passport belongs to a validated delegation and today is within the stay window: **Member of delegation DL…** (with **(VIP — protocol reception)** where relevant), the delegation's name and type, the role, the passport type and, where relevant, **Collective entry authorization valid during the stay.**
3. Read the checks and the risk assessment as for any traveler, then decide. The banner does not affect the recommendation, except through the travel authorization.
4. Click **View the delegation** in the banner (or open the **Delegations** tile), then **Check in** on the member's row to record the arrival.

Check-in is manual and separate from the crossing decision: it tracks the group's arrival (**Arrived** indicator, **Arrival** column). The **Check in** button only appears for a **Validated** delegation and for a role with the control permission.

## Declaration by the organizer (traveler portal)

Organizers declare their delegation on the traveler portal, **Delegations** tab, **Declare a delegation** section, **at least 72 hours before arrival** (recommended). The form has the same fields as the DPAF space, without the protocol, and requires the consent box (Law 2008-12). The organizer receives a `DL…` reference; the delegation appears in the DPAF space as **Submitted**, with the source **Portail organisateurs**.

In the **Track a delegation** section, the organizer enters the **reference** and the **contact e-mail** to see the status, the dates, the number of members, the entry regime granted and, if refused, the reason. They never see the pre-screening result. See *Traveler guide (portal and iPhone app)*.

## Worked example: a sports team for a tournament

Japan's national volleyball team (fictitious) takes part in an international tournament in Dakar: 14 members, arriving on the 12th at AIBD on a scheduled flight, leaving on the 22nd. Japanese nationals need a visa.

1. **D-10 — Declaration.** The organizing committee declares the delegation on the portal (type **Sports competition**, event "Dakar international tournament", host "Senegalese volleyball federation"). It pastes the list of 14 members from its spreadsheet and gets the reference `DL260007`.
2. **D-10 — Pre-screening.** A staff member scores 65 (name match on a watchlist). A **High** severity **Delegation (pre-screening)** alert appears in the Threat Monitor; the **Delegations** tile shows "1 to validate".
3. **D-9 — Clearing the doubt.** The analyst takes ownership of the alert and compares the date of birth and nationality with the watchlist entry: it is a namesake. They close the alert with "False alert — namesake" and note the distinguishing element.
4. **D-8 — Extra member.** The committee phones in a physiotherapist who was left out. The analyst clicks **Add members** and pastes the line; the new member is pre-screened (low score).
5. **D-8 — Validation.** The analyst clicks **Validate**, leaves the collective authorization ticked and confirms. The delegation is **Validated**; it counts as an e-Visa from the 9th to the 25th.
6. **D-7 — Tracking.** The committee opens **Track a delegation**: "Validated — Collective entry authorization granted: present passports on arrival."
7. **D-1 — Preparation.** The AIBD post chief opens the record, clicks **Print the list** and hands it to the officers at the dedicated counters.
8. **Day D — Arrival.** Each player goes through the counter. At the **Checks** step, the "Member of delegation DL260007" banner appears and the **Travel authorization (e-Visa)** line is **OK**. The officer decides, then checks in the arrival on the record. At the end of the day, the record shows "15 arrived".
9. **D+11 — Closing.** After the group has left, the analyst clicks **Close**.

> The demonstration data contains three fictitious delegations: `DL260001` (Gambian official visit, VIP, validated with a collective authorization), `DL260002` (Nigerian women's basketball team, declared on the portal and awaiting validation, with one flagged member) and `DL260003` (conference delegation, validated, one member already arrived).

## Audit log

| Action | Code |
|---|---|
| Registration (DPAF space or portal) | `DELEGATION_CREATION` |
| Validation | `DELEGATION_VALIDER` |
| Refusal | `DELEGATION_REFUSER` |
| Closing | `DELEGATION_CLOTURER` |
| Arrival checked in | `DELEGATION_ARRIVEE` |
| Members added | `DELEGATION_AJOUTER` |
| Member removed | `DELEGATION_RETIRER` |

## Frequently asked questions

### Does a flagged member prevent validation?

No. The validation window recalls the number of flagged members, but the decision belongs to the authorized officer. Handle the Threat Monitor alert first, then remove the member or refuse the delegation if the match is confirmed. At the counter, the member is in any case checked like any traveler.

### Can the organizer find out that a member was flagged?

No. The portal and the public API return no score and no factor. Never disclose this result to the organizer.

### A member arrives before the delegation. Are they recognized?

Yes, if they arrive within the 3 days before the declared arrival date. Earlier than that, they are not recognized: they need an individual e-Visa if their nationality requires one.

### A member changes passport after validation.

Members are recognized by their passport number. Add a new line with the new passport (**Add members**). The old line can no longer be removed from the interface once the delegation is validated; mention the change in the alert or case if necessary.

### Should every arrival be checked in?

Yes, to track the group's arrival and inform the organizer or protocol. The crossing decision does not check members in automatically.

### Can a refused or closed delegation be reopened?

No. Register a new delegation (or ask the organizer to declare it again); it gets a new reference.

### The banner does not appear at the counter for a member.

Check that the delegation is **Validated** (not **Submitted** or **Closed**), that today is within the stay window (arrival − 3 days to departure + 3 days) and that the passport number read matches the one in the list exactly.
