# User guide by profile

This guide describes, profile by profile, what each WawID user sees and does day to day at Senegal's border posts: Air and Border Police (DPAF) officer at the counter, eGate supervisor, intelligence analyst, post supervisor, administrator, Treasury officer, airline and traveler. It focuses on procedures; the details of each screen are in the specialized help center pages, cited in italics (for example *Counter check (MRZ, NFC chip, biometrics)*).

> **Demonstrator.** The version currently online is a demonstrator: data is fictitious, biometrics and payments are simulated, and chip reading is simulated as long as no real reader is connected. Never enter real personal data into the demonstrator. The procedures below are those intended for operations; they can be practiced identically on the demonstrator for training.

## Quick start

Each DPAF space user (`/dpaf/`) has **a single role**, assigned by the administrator. The role determines the tiles visible on the home page and the actions allowed.

| Profile | WawID role | Main tiles | Reference pages |
| --- | --- | --- | --- |
| DPAF counter officer | Border officer | **New check**, **Counter check**, **Verify a QR**, **Crossings**, **Traveler search**, **Threat Monitor**, **Cases** | *Counter check (MRZ, NFC chip, biometrics)*; *Crossings, traveler search, QR and vehicles* |
| eGate supervisor | Supervisor | **eGates & ABC**, **eGate kiosk**, **System monitoring**, **Crossings** | *eGates and ABC kiosks*; *eGate kiosk: setup and journey* |
| Intelligence analyst | Intelligence analyst | **Threat Monitor**, **Cases**, **Watchlists**, **Targeting rules**, **Connectors**, **Announced flights**, **e-Visa** | *Threat Monitor, cases, watchlists, rules and connectors*; *APIS and PNR*; *e-Visa and eGate pre-enrollments* |
| Post supervisor (shift leader) | Supervisor | **Dashboard**, **Threat Monitor**, **Cases**, **eGates & ABC**, **Counter check**, **Audit log** | *Dashboard*; *Understanding the risk score* |
| Administrator | Administrator | **Users & roles**, **Create a user**, **Settings**, **Audit log**, **System monitoring**, **Connectors** | *Administration (devices, users, audit, settings)*; *Deployment and configuration* |
| Treasury officer | Treasury officer (fee) | **Security fee**, **Airline invoices**, **Payments to validate**, **Transfers to the State**, **Reconciliation**, **Revenue split** | *Security fee* |
| Airline | Airline (account bound to an IATA code) and gateway key | Airline platform (`/compagnies/`): **Dashboard**, **Submit**, **Messages**, **Flights**, **Security fee**, **API**; no access to the DPAF space; automatic submission to `/api/carrier/messages` | *Airline platform*; *API reference (airlines, devices, connectors)* |
| Traveler | No account | Traveler portal (`/`), WawID e-Visa mobile app (iPhone and Android) | *Traveler guide (portal and iPhone app)* |

The same person may need two profiles (for example a supervisor who also oversees the eGates): the **Supervisor** role covers both. The **Intelligence analyst** role does not allow counter checks; the **Treasury officer (fee)** role gives access to no control action.

## First day: checklist

Before your first shift on WawID, check the following with your post chief or the administrator.

1. You have received your **Username** and an **initial password** through a channel handed to you in person (never through a shared message).
2. You can sign in at `/dpaf/` and the home page shows "Hello" followed by your first name.
3. Your **role** and **post** shown in the avatar menu are correct (for example "Border officer", post AIBD). Otherwise, report it to the administrator before doing anything: the post is recorded with every crossing.
4. The dot in front of the post name, in the top bar, is **green** (connected).
5. You can find the tiles of your profile (see the table above) in **My home**.
6. For a counter: **Settings → NFC reader on this workstation → Test** answers "Connected" with the reader name (the test is done by the administrator or the technician, since the **Settings** page is reserved for them). If the test answers that the bridge is unreachable and reading is simulated, the workstation is not ready for operations.
7. The browser is allowed to use the workstation **camera** (requested on the first click on **Enable camera**).
8. You know how to open contextual help with the **?** button and switch language with **FR | EN**.
9. You have performed at least one complete check in training using the **Demo scenarios** (valid passport, red notice, stolen passport, cloned chip).
10. You know your post's on-call number and the escalation chain (see the end of this guide).

## Rules common to all profiles

- **Personal account**: your account is nominative. All your actions are written to the **Audit log** (sign-ins, decisions, sensitive lookups, changes). Never lend your account and never work under a colleague's session.
- **12-hour session**: the session covers one shift. Sign out at the end of duty (avatar → **Sign out**); on a shared workstation, do so at every change of officer.
- **Password**: there is no self-service password change in this version. To change it (forgotten, suspected compromise), contact the administrator, who resets it in **Users & roles**.
- **Quick search**: press **/** or **Ctrl + K** to search for a traveler, a document or an application.
- **Notifications**: the bell shows the number of new alerts; data refreshes every 30 seconds.
- **Justified decisions**: any decision that differs from WawID's recommendation requires a written reason. The reason must be factual and understandable by a third party (no internal abbreviations).
- **Discretion**: a referral or a match is not an accusation. Never tell the traveler the content of a watchlist or the risk score.

## DPAF counter officer

### What you see

With the **Border officer** role, the home page shows the **Border control** space (Dashboard, Counter check, eGates & ABC, Crossings, Traveler search, Verify a QR, Vehicles (VRS), **New check** tile) and, under **Intelligence**, the **Threat Monitor** and **Cases**. You can view watchlists and rules but not change them. Under **e-Visa & travelers**, the **Delegations** tile lets you view expected delegations and check in their members' arrival.

### Starting your shift

1. Sign in at `/dpaf/` and check your post in the top bar.
2. Open the **Threat Monitor**, **New** tab, to review current alerts for your post (for example flagged passengers on an expected flight).
3. Check the day's instructions with the shift leader (flights to watch, closed eGates, unavailable sources).
4. Run a test check if the post chief asks for it (**Valid passport** scenario) to verify reader, chip and camera, without confirming the decision.

### Checking a traveler

1. Click **New check**.
2. Choose the direction (**Entry** or **Exit**), check the post and fill in **Flight / vessel / vehicle** and the origin or destination.
3. Present the document to the reader: the MRZ appears in the dedicated field. Check that all **ICAO 9303 check digits** are **Valid**.
4. For a biometric passport, click **Read chip** and leave the document on the reader until the result appears. Check **Passive authentication: valid** and **Chip ↔ printed MRZ: matching**.
5. Click **Capture biometrics**, then **Enable camera**. Frame the face from the front, without sunglasses or headwear, and click **Capture**.
6. Capture fingerprints (**Capture all**) according to post instructions; iris is optional.
7. Click **Run checks**. Read each line (**OK**, **Warning**, **Alert**) and the **Risk assessment** panel.
8. Click **Decide**. The recommended decision is preselected: **Clear**, **Secondary inspection** or **Refuse**.
9. If you choose another decision, enter the **Reason** (mandatory). Add **Remarks** if useful.
10. Check the summary and click **Confirm decision**. The crossing record (`PX-…`) opens.
11. If the traveler presents an e-Visa, open **Verify a QR** (button in the counter check), scan the QR and compare the holder and document number with the passport.

### Common situations

| Situation | What you see | What to do |
| --- | --- | --- |
| Watchlist match (Interpol notice, FPR, WAPIS, POI) | **Alert** line in the checks; recommendation "Refuse and hold — supervisor escalation" if the severity is critical | Show nothing to the traveler. Do not decide alone: call the supervisor. Choose **Secondary inspection** or **Refuse** according to their instructions, give the reason, then **Open a case** from the crossing record. |
| Probable namesake | Name match, but different date of birth or nationality | Check the full identity (date and place of birth, parentage if available). If the doubt is cleared, the analyst or you close the alert with the resolution "False alert — namesake". |
| Document reported lost or stolen (SLTD) | **Interpol SLTD** line in **Alert**; refusal recommended | Retain the document according to service instructions, call the supervisor, choose **Refuse** and open a case. |
| Unreadable chip | **Electronic chip (NFC)**: "Not read at counter" (Warning) | Reposition the document (data page flat, no cover) and click **Read chip** again. If reading still fails, examine the document's physical security features and mention the failure in **Remarks**. An unreadable chip alone is not proof of fraud. |
| Passive authentication failed, or chip different from the MRZ | **Passive authentication: failed** or **Chip ↔ printed MRZ: different** | Strong indication of a cloned chip or an altered data page: **Secondary inspection**, call the supervisor, open a case. |
| Invalid MRZ check digits | **Invalid** shown on one or more digits | Re-read the document (damaged print, glare). If the printed MRZ is genuinely inconsistent, treat it as a suspicious document. |
| Chip reading "(simulated)" on an operational workstation | The NFC panel shows "(simulated)" | The workstation's NFC bridge is stopped or misconfigured. Notify technical support immediately; meanwhile, apply the post's degraded-mode instruction (enhanced visual check). |
| Traveler referred by an eGate | The traveler arrives with a message from the gate | Perform a normal check. The referral reason is on the eGate crossing (**eGate / ABC** channel, reason prefixed with "eGate:") in **Crossings**. Most referrals have a simple cause (minor, damaged chip, lighting, expired passport). |
| Traveler requiring a visa without an e-Visa | **Travel authorization (e-Visa)** in Warning or Alert | Check whether the traveler has an `EV…` reference (search in **Traveler search** or **e-Visa**). Without a valid authorization, apply the regulations in force and the post chief's instructions. |
| Delegation member | Blue **Member of delegation DL…** banner above the checks, with the role, passport type and, where relevant, the collective entry authorization | Check and decide as for any traveler: the banner exempts no one from any check. Then click **View the delegation** and **Check in** on the member's row. For a VIP delegation, follow the post's protocol reception instructions. See *Delegations: official visits, competitions, conferences*. |
| e-Visa QR rejected | "Invalid or forged QR code" or status not approved | A modified QR is a forged document: secondary inspection. An e-Visa that is not approved or has expired does not authorize entry. |
| Traveler showing a former WawPass receipt or asked to pay a fee | — | The security fee is included in the ticket: no receipt is required from the traveler. A former WawPass receipt only has historical value (**WawPass history** tab of **eGate pre-enrollments**). |
| Camera unavailable | Message that no camera is available; simulated capture | Check the connection and the browser permission. In production, do not confirm a crossing with a simulated capture: notify support. |
| Unavailable sources | **Unavailable sources** banner | The check uses the local copy of the lists. Continue, and report the outage to the supervisor if it lasts. |

### End of shift

1. Complete or hand over the cases you opened (**Cases**, **Open** status).
2. Add a **Note** to alerts you took ownership of without closing them, for the next colleague.
3. Sign out.

## eGate supervisor

### What you see

The **Supervisor** role displays the **eGates & ABC** application with the command buttons (**Close**, **Open**, **Put back in service**, restart, **Set to maintenance**, **Settings**). The **Open**, **Alarms**, **Transactions (24 h)**, **Counter referral rate** and **Average duration** indicators summarize the fleet; the **Live feed** and **Referral reasons (24 h)** panels show activity.

### Opening the gates

1. Open **eGates & ABC** and filter on your post (**All border posts** list).
2. For each card, check the **In service** status, automatic mode, the last heartbeat and the state of peripherals (**Reader**, **Camera**, **Fingerprints**, **Gates** in green).
3. Visually check each kiosk: home screen displayed, correct device name at the top right.
4. Open gates closed the previous day with **Open** (or **Put back in service** for a device in maintenance) once the assistance officer is in place.
5. Have a test traveler or a volunteer officer go through if post instructions require it.

### During the shift

1. Watch the **Counter referral rate** and the **Referral reasons (24 h)**. A sudden increase of one reason often indicates a hardware problem (camera, lighting, reader).
2. Handle any card in **Alarm** without delay: set the device to maintenance (padlock button), notify the technician and direct travelers to the counters.
3. In case of a rush at the counters or an incident, close a gate with **Close**: the kiosk applies the closure within 15 seconds, without interrupting the traveler in progress.
4. Any settings change goes through **Settings → Apply remotely** and is logged. Only change thresholds on written instruction from the chain of command.

### Common situations

| Situation | What to do |
| --- | --- |
| Card in **Alarm** (camera, gates) | **Set to maintenance**, technical intervention, then **Put back in service** after a test. |
| Kiosk showing that the WawID server is unreachable | Check the kiosk network and reload the page; if the outage persists, close the gate and notify support. |
| Kiosk showing "Key rejected by the server" | The device key has changed or is wrong: have it re-entered by the authorized technician. Never give the key to an unauthorized officer. |
| Many referrals "Your passport chip could not be verified" | Check the kiosk's document reader and NFC bridge; if the problem is general, close the gate. |
| Many referrals "Your face does not sufficiently match…" | Check lighting and camera cleanliness before any discussion of the face threshold (82% by default). |
| Queue in front of a gate in closed mode | Make sure signage directs travelers to the counters; reopen as soon as possible. |

Reminder: a gate's maximum risk score can only tighten the policy; an eGate never opens on a watchlist match, an SLTD document or a recommendation other than "clear".

## Intelligence analyst

### What you see

The **Intelligence analyst** role gives access to the **Intelligence** space (Threat Monitor, Cases, Watchlists, Targeting rules, Connectors, **Add an entry** tile), the **APIS & PNR** space (Announced flights, Carrier gateway, Carrier compliance, **Receive a message**) and the **e-Visa & travelers** space. It does not allow counter checks.

### Daily routine

1. **Threat Monitor**, **New** tab: take ownership of alerts by severity (**Critical**, **High**, **Medium**) with **Take ownership**.
2. For each alert: read the **Factors**, open the related crossing or flight, record your checks with **Note**, then **Open a case** or **Close** with a **Resolution**.
3. **Announced flights**: open flights due in the coming hours, review flagged passengers (score of 30 or more) and send the shift leader the list of passengers to check on arrival.
4. **Carrier compliance**: identify airlines marked **Follow up** (punctuality below 95% or completeness below 98%).
5. **e-Visa**, **To process** tab: process applications (see below).
6. **Delegations**: process delegations **to validate** and the related **Delegation (pre-screening)** alerts (see below).
7. **Watchlists** and **Targeting rules**: update entries and rules according to instructions received, always filling in the **Reference** and the **Reason**.
8. **Connectors**: at the start of the shift, click **Test** for connected sources.

### Processing an e-Visa application

1. Open the application from the **To process** tab.
2. Review the automatic pre-screening, the **Chip (NFC)** field (**Passport authenticated**, **Verification failed** or **Not read**), the health declaration and the **Previous crossings**.
3. If a document is missing, click **Request information** and specify the expected document.
4. Decide: **Approve** (number `SN-EV-…`, 90-day validity, signed QR) or **Refuse** with a reason, which is sent to the applicant.

### Processing a delegation

1. Open the **Delegations** tile and filter on the **Submitted** status (or use **Register a delegation** to enter yourself a delegation announced by a ministry or an embassy).
2. Open the record: check the dates, the point of entry, the member list and the **Pre-screening** column.
3. For each flagged member (score of 60 or more), handle the **Delegation (pre-screening)** alert in the Threat Monitor; if the match is confirmed, remove the member (trash icon) or refuse the delegation.
4. If needed, add members announced late with **Add members** (format `Nom;Prénoms;Nationalité;Sexe;Naissance;Passeport;Fonction;Type de passeport`).
5. Click **Validate**, leaving the **collective entry authorization** ticked (it counts as an e-Visa for each member from 3 days before arrival to 3 days after departure) or unticking it (individual e-Visas required), or **Refuse** with a reason, which is shown to the organizer.
6. After the group has left, click **Close**.

Never disclose the pre-screening result to the organizer. See *Delegations: official visits, competitions, conferences*.

### Common situations

| Situation | What to do |
| --- | --- |
| Confirmed match on an announced passenger (APIS) | Open a case and inform the shift leader at the arrival post with the flight and seat; nothing is sent back to the airline. |
| Namesake | Close with "False alert — namesake" and state the distinguishing element (date of birth, nationality). |
| Identity network in e-Visa (shared contact details or device) | Search for linked applications in the **All** tab, request documents or refuse with a reason, and have the contact detail added to the blacklist. |
| Information request with no answer | The application stays in **Info requested**; the applicant answers from the portal. Monitor the **Info requested** tab and follow up according to service procedure. |
| Delegation member flagged at pre-screening | Handle the **Delegation (pre-screening)** alert like any alert. Namesake: close with "False alert — namesake". Confirmed match: remove the member while the delegation is **Submitted**, or refuse it, and inform the post chief at the point of entry. |
| PAXLST message received late | The flight shows **late transmission**; pre-screening is still recalculated. Report repeated delays so the airline is reminded (**Carrier compliance** tab). |
| Message rejected by the gateway | Open the message in **Carrier gateway** and read the errors (unknown format, missing flight, flight of another airline). Notify the airline's technical contact. |
| Airline not connected | Upload its manifest with **CSV manifest** (format `seat;surname;given names;birth date;nationality;document;expiry`). |
| Connector unreachable | Checks continue on the local copy; notify the administrator, who checks the connector's URL and token. |

## Post supervisor (shift leader)

### What you see

The **Supervisor** role combines the officer's and the analyst's rights with eGate control. It gives no access to user management, system settings or the finance module.

### Shift procedure

1. **Taking over**: open the **Dashboard** filtered on your post, then the **Threat Monitor** (open alerts) and **eGates & ABC** (fleet status).
2. Assign officers to counters; check that each one is signed in with their own account and the right post.
3. Share with officers the list of flagged passengers on expected flights (prepared by the analyst) and the list of delegations expected at your post (**Delegations** tile, **Print the list** button on each record). If needed, assign a dedicated counter for large or VIP delegations.
4. **During the shift**, handle escalations: "Refuse and hold — supervisor escalation" recommendations and any critical match must be presented to you before confirmation.
5. Review decisions that differ from the recommendation (**Decision** filter in **Crossings**) and the quality of the reasons entered.
6. Follow open cases and ensure continuity of interviews (**Structured interview**).
7. **End of shift**: open the **Audit log**, check the **Chain intact** message and copy the beginning of the head hash into the shift report.

### Common situations

| Situation | What to do |
| --- | --- |
| Escalation for a red notice | Confirm the identity, apply service instructions (Interpol NCB, prosecutor), record everything in the case and close the alert with the appropriate resolution ("Handed over to the border police", "Notice sent to Interpol (NCB)"…). |
| Officer can no longer sign in | Session expired (12 h) or account deactivated: have the administrator check. |
| Post network outage | Apply the post's degraded-mode procedure and notify support (see "Service continuity" below). In the demonstrator there is no offline mode yet (planned in the target architecture). |
| Audit log integrity broken | Do not touch anything, note the entry number displayed and immediately notify the administrator and the security officer. |

## Administrator

### What you see

The **Administrator** role has every right, including **Users & roles**, **Settings** (`system` permission) and the finance module.

### Common tasks

1. **Create an account**: **Create a user**, full name, username (3 to 40 characters), role, post, initial password of at least 10 characters. Hand over the initial password in person.
2. **Change a password** (forgotten, departure, suspicion): **Users & roles → Edit**, enter a new password, **Save**. This is also how you change your own password.
3. **Deactivate an account** (transfer, departure, suspension): untick **Account active**. The current session is cut immediately. An account is never deleted.
4. **Set up a counter**: on the workstation, **Settings → NFC reader on this workstation**, bridge address (default `http://127.0.0.1:8765`), **Save**, **Test**.
5. **Connectors**: enable or disable a source (**Enable** / **Disable**); the URL and token are configured server side (environment variables).
6. **Audit**: regularly review the **Audit log** (failed sign-ins, user changes, eGate commands).
7. **Access review**: at least at every staff movement, check that each active account matches an officer in post with the right role.

### Common situations

| Situation | What to do |
| --- | --- |
| Officer transferred to another post | **Edit** the account and change the **Post**. |
| Officer promoted to supervisor | Change the **Role**; the effect is immediate. |
| eGate key or airline key compromised | Generate a new key, update it server side (see *Installation guide — Senegal*) and redistribute it; record the incident. |
| Request to "reset the demo" | Only on a demonstration environment, never in operations. |

## Treasury officer (security fee)

### What you see

The **Treasury officer (fee)** role displays the **Finance** space: **Security fee** (summary), **Airline invoices**, **Payments to validate**, **Transfers to the State**, **Reconciliation**, **Revenue split** and **Model simulator**. You can validate or reject the payments declared by airlines, record collections and transfers to the State, and export; you cannot change the fee settings (rate, operator share, penalty, IATA rate, collection flow), which are reserved for the administrator.

By default, WawID applies the "airlines → WawID → Public Treasury" flow: airlines pay WawID (collection account) and WawID transfers the State's share to the Receiver General of the Treasury. This flow differs from the current legal framework (Decree No. 2012-519, decision of 4 December 2012) and requires a new regulatory text and a collection-mandate agreement with the State; see *Security fee*, "Collection flow".

### Monthly calendar

The calendar follows the interministerial order of 3 February 2012; the payment steps depend on the collection flow:

1. **From the 1st to the 9th of month M+1**: statistics collection (airline declarations and WawID count). Use **Current month fee base (WawID)** for a first estimate.
2. **On the 10th of month M+1**: invoices issued in FCFA at the IATA rate of month M. Check in **Airline invoices** that each airline has its `RS-YYYYMM-XX` invoice.
3. **During month M+1**: airlines declare their transfers on their platform; in **Payments to validate**, match each declaration against the collection account statement, then **Validate** or **Reject** (with a reason). In the `TRESOR` flow, also record the collection on receipt of each receipt from the Receiver General of the Treasury.
4. **End of month M+1**: due date. Invoices not settled by validated payments become **EN RETARD** (overdue); the 5% penalty per month of delay applies to the remaining balance.
5. **15th of month M+2** (`OPERATEUR` flow): in **Transfers to the State**, record the transfer of the State's share to the Receiver General of the Treasury with its reference.
6. **Every month**: review the **Reconciliation** tab and export the data (**Export**) for public accounting.

### Recording a collection

For a payment the airline did not declare on its platform:

1. Open **Airline invoices** and click the invoice.
2. In **Record a payment (collection account statement)** or **Record a collection (Treasury receipt)** depending on the flow, check the amount (prefilled with the remaining balance and penalties) and correct it if the statement or receipt shows a different amount.
3. Enter the exact **Receipt reference**.
4. Click **Save**.

### Common situations

| Situation | What to do |
| --- | --- |
| Partial payment | Validate the declared payment (or record the amount actually collected): the invoice becomes **PARTIELLE** (partial) and the remaining balance is kept. |
| Declared payment not found on the statement | **Reject** it with a precise reason; the airline sees the reason and can declare again with the correct reference. |
| Gap above 3% between WawID count and declaration | The line is shown in red in **Reconciliation**. Build the file (month, airline, gap, unbilled amount) for DGCPT control and litigation. |
| Airline disputing a penalty | Check the due date, collection dates and invoice details; the decision lies with the DGCPT. |
| Collection entered by mistake | A recorded collection can be neither edited nor deleted in this version (and a negative amount is refused). Do not re-enter it: report the error in writing to the administrator and the accountant, with the invoice reference; the entry remains visible in the audit log. |

> In the demonstrator, airlines, amounts and collections are fictitious.

## Airline (API and PNR transmission)

Airlines have no access to the DPAF space. They use the **airline platform** (`/compagnies/`), with accounts of the **Airline** role bound to their IATA code: manual message submission, acknowledgements, completeness per flight, security fee invoices and payment declaration (see *Airline platform*). Their systems also send messages to the carrier gateway with their own key, bound to their IATA code.

### Onboarding

1. The airline appoints a technical contact and a security contact.
2. The administrator creates its user accounts (role **Airline**, airline selected from the list) and the administration hands over its `X-Carrier-Key` through a secure channel.
3. The airline sends test messages (PAXLST and PNR) to the environment indicated by the administration and checks the **202** response and the `MSG-…` reference.
4. The analyst confirms receipt in **Carrier gateway** (**ACCEPTÉ** (accepted) status, completeness).

### Daily transmission

1. **PNR**: at H-48 then H-24 before scheduled departure.
2. **API (PAXLST)**: at check-in closure, at the latest when the doors close.
3. Keep the `MSG-…` reference of each acknowledgment; all acknowledgements remain available in the **Messages** screen of the airline platform.

### Common situations

| Response or situation | Meaning | What to do |
| --- | --- | --- |
| 401 | Invalid key | Check the key; if in doubt, request a new key. |
| 422 with errors | Message rejected (format, missing flight, no passenger, flight of another airline) | Fix and resend. |
| 202 with warnings | Message integrated with anomalies (passenger without SSR DOCS…) | Complete the data in the next transmission. |
| Flight marked "late transmission" | Message received after the deadline | Review the sending schedule; punctuality target: 95% of flights. |
| **Follow up** status | Punctuality below 95% or completeness below 98% | Corrective plan with the administration. |

No targeting result is ever sent back to the airline: neither on the platform nor in the gateway acknowledgement (no number of flagged passengers).

## Traveler

### On the portal (`/`)

1. Check whether your nationality is visa-exempt (**Do I need a visa?**).
2. If an e-Visa is required, complete the 4 steps (Identity with the MRZ, Trip, Health, Payment), give your consent and click **Pay and submit**. Keep the `EV…` reference.
3. Track the application in the **Tracking** tab (reference and passport number). If the status is **Info requested**, answer in **Your reply**.
4. Once the e-Visa is **Approved**, print or save the QR code and present it with your passport at the border.
5. Where applicable, pre-enroll for the eGates in the **eGate** tab. The security fee is included in the ticket: you have nothing to pay (**Security fee** card on the home page).

### With the WawID e-Visa mobile app (iPhone and Android)

The app lets you apply by reading your passport chip. It works on **iPhone 7 or later (iOS 15.5 or later)** and on **Android 7 or later with NFC**.

1. **Scan the MRZ** with the camera (or type it). The check digits must be valid: the MRZ is the key that opens the chip.
2. **Read the chip**: passport closed and flat, bring the top of the iPhone or the back of the Android phone (NFC area) close to the cover, and stay still until the success message. The app reads the identity data (DG1) and the photo (DG2) and checks their integrity against the chip signature (SOD).
3. **Complete** the stay information and the health declaration.
4. **Pay and submit** (demo payment in the current version). Keep the reference.
5. **Track** the application in the app: status, messages and, after approval, the QR code to present. The app is available in French and English (FR / EN switch).

### Common situations

| Situation | What to do |
| --- | --- |
| "Invalid check digits" | A typo in the MRZ: check each character (0 and O, 1 and I, 8 and B). |
| The chip cannot be read | Remove the phone case and the passport cover, move away from metal surfaces, move the phone slowly (the chip may be in the cover or in the data page). On Android, check that NFC is enabled in the settings. You can continue without the chip; processing will take longer. |
| **Info requested** status | Reply from the portal's **Tracking** tab. |
| Referred by the eGate to a counter | Go to the counter: it is not a penalty. |
| Request to pay a security fee | Do not act on it: the fee is included in the ticket price and is never asked of you directly. |

## Service continuity: degraded mode, failover and maintenance

In national operations, WawID is hosted in **two active data centers in Senegal**, with a third site for backups, and each post will have a **post server** able to work without a link (see *Deployment plan — high-availability infrastructure in Senegal*). This section describes what you see and what you do in each situation. It distinguishes what exists today in the demonstrator from what is planned (Target, To be developed).

### Possible situations

| Situation | What you notice | What you do |
| --- | --- | --- |
| Planned maintenance | Advance notice from the post chief or the administrator; possibly a request to sign in again during the window | Finish ongoing checks before the announced time; sign in again if the sign-in screen appears |
| Failover from one data center to the other | A few errors or slowdowns for a short time; possibly a return to the sign-in screen | Wait, reload the page, sign in again; check that your last action was recorded before redoing it |
| Post link cut | Error messages when saving; data no longer refreshing; kiosks showing that the WawID server is unreachable | Apply the post's degraded-mode procedure (below) and notify support |
| Both data centers unavailable | The same at every post | Degraded mode; instructions are given by the crisis unit through the post chief |

The dot in front of the post name, in the top bar, only shows that your workstation's browser has a network connection. It can stay green while the WawID server is not responding: when in doubt, rely on the error messages and notify support.

### Degraded mode at the post

**Today (demonstrator)**: there is no offline mode. Without a link, no crossing can be recorded in WawID. The post applies its written **manual checking procedure**, validated by the DPAF.

**Target (To be developed)**: the post server will take over automatically. With it:

| Function | Without a link to the central system |
| --- | --- |
| MRZ reading and check digits | Available |
| Chip reading and passive authentication | Available (CSCA certificates copied to the post server) |
| Face comparison with the chip photo (1:1) | Available |
| Watchlist check | Available on the **local copy**, as of the last synchronization |
| Recording crossings | Available; crossings are queued then sent when the link returns |
| e-Visa verification | On the local copy of approved e-Visas; an e-Visa approved after the cut is not known to the post |
| Real-time queries to Interpol, WAPIS or other sources | Unavailable |
| 1:N biometric search, new API/PNR messages | Unavailable |
| eGates | According to the policy set by the DPAF for degraded mode (closure or restricted operation) |

### Manual checking procedure (as long as offline mode does not exist)

1. The shift leader declares degraded mode and notes the time.
2. The supervisor closes the eGates (**Close**) if the DPAF space is still reachable; otherwise, travelers are directed to the counters.
3. Officers apply the reinforced visual document check set out in the DPAF procedure and consult the lists available outside WawID according to service instructions.
4. Each crossing is recorded in the designated register (paper or authorized local file), with the time, document, decision and officer's name.
5. When service returns, the shift leader organizes deferred entry of the crossings according to DPAF instructions and closes degraded mode, noting the time.

The exact arrangements (register, deferred entry, eGate policy) are set by the DPAF before go-live (**To be checked**).

### During a central site failover

- The failover is decided and carried out by the operator; you have no technical action to take.
- Your session may remain valid, but you may be asked to sign in again: do so with your own account.
- If an action was in progress when the error occurred (crossing decision, collection, declaration, message), **first check that it was not recorded** (**Crossings**, invoice record, **Messages** screen) before redoing it, to avoid duplicates.
- The post supervisor then checks the **Audit log** (**Chain intact**).

### Planned maintenance

Maintenance is carried out site by site and, barring exceptions, without service interruption. It is announced in advance to posts, airlines and the Treasury, preferably during off-peak hours. Any maintenance requiring an interruption is approved with the DPAF.

### Notes per profile

| Profile | During failover, link cut or maintenance |
| --- | --- |
| DPAF counter officer | Follow the shift leader's instructions; do not confirm a crossing twice; note the time and the exact message displayed |
| eGate supervisor | Close the gates whose kiosk shows that the WawID server is unreachable; reopen them after a test crossing once service returns |
| Intelligence analyst | Checks rely on the local copy of the lists: when service resumes, check the **Connectors** (**Test**) and the alerts received during the cut |
| Post supervisor | Declare and close degraded mode; after a failover, check **Chain intact** and that your post's data has come back |
| Administrator | Relay maintenance announcements; after a failover, check sign-ins and **Connectors**; never reset the demo in operations |
| Treasury officer | Before re-entering an interrupted collection or transfer, check the invoice record: a recorded collection can be neither edited nor deleted in this version |
| Airline | See below |
| Traveler | The portal and the app may be briefly unavailable; try again later and keep your `EV…` reference |

### Airlines: resending messages

- If the gateway does not respond or returns a server error (`500` or no response), resend the **same** message a little later. A `401` or `422` response is not fixed by resending the same message.
- **Existing**: a resend creates a new message with a new `MSG-…` reference (both appear in the **Messages** screen), but passengers of the same flight, on the same date, are merged by document number: the resend does not create duplicate passengers.
- **To be developed**: an explicit idempotency key (same reference returned for a message already received) and automatic resend guidelines documented in *API reference (airlines, devices, connectors)*.
- Security fee payment declaration: in case of error, first check in the invoice whether the declaration appears; a resent declaration creates a second declaration, which the Treasury will reject as a duplicate.

### Backups and restorations (administrator)

- Backups are automatic and managed by the operator; no user action is required.
- A restoration request (data deleted or modified by mistake, incident) is sent in writing by the administrator to the operator (level L2), with the item, the date and time concerned and the reason. It requires the DPAF's agreement and the intervention of two authorized people.
- A restoration must never be used to erase a trace from the **Audit log**; after any restoration, the administrator checks **Chain intact**.
- In the demonstrator there is no dedicated backup; resetting the demo is not a restoration.

## Support and escalation

| Level | Who | For what |
| --- | --- | --- |
| L1 | Shift leader and post WawID focal point | Any operational question, escalation of a check, closing an eGate; reader, NFC bridge, camera, kiosk, local network, declaring degraded mode |
| L2 | Central WawID administrator, operator support and 24/7 network operations center (NOC) | Accounts and roles, settings, connectors, device and airline keys; post links; data center status; restoration requests |
| L3 | Operator experts (infrastructure, database) and development team | Software defects, central site failover, restoration |
| Security | Security officer and SOC | Security incident, broken audit chain, key leak |
| Crisis | Crisis unit (operator and DPAF) | General outage, loss of a data center, ransomware, prolonged degraded mode |

Contact details for each level are set by the DPAF and the operator at go-live (see *Installation guide — Senegal*). The network operations center (NOC) can be reached 24/7; it may already be aware of a general outage before you call, but always report an incident observed at the post. For any incident, note the time, post, device, the exact message displayed and, where applicable, the reference (`PX-…`, `EV…`, `MSG-…`).
