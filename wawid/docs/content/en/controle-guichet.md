# Counter check (MRZ, NFC chip, biometrics)

The **Counter check** application guides the officer through a traveler check: reading the document and its chip, capturing biometrics, querying watchlists and files, assessing risk and recording a justified decision. It is available to roles with the counter check permission (**Border officer**, **Supervisor**, **Administrator**).

To start, open the **Counter check** tile or the **New check** create tile. The **New check** button, top right, abandons the current check and starts over; **Verify a QR** opens e-Visa verification.

The wizard has four steps, shown at the top of the page: **Document**, **Biometrics**, **Checks**, **Decision**. The **Previous** and **Next** buttons let you go back without losing what you entered.

## Step 1 — Document

### Crossing context

1. Choose the direction: **Entry** or **Exit**.
2. Check the border post (your assigned post is preselected).
3. If needed, fill in **Flight / vessel / vehicle** (for example `HC 404`) and **Origin / destination (code)** (for example `CDG`). These details are saved with the crossing and can trigger targeting rules.

### Reading the MRZ

Present the document to the reader: the MRZ appears in the **Machine readable zone (MRZ)** field. Without a reader, you can type or paste it. Two formats are recognized:

- **TD3** passport: 2 lines of 44 characters;
- **TD1** identity card: 3 lines of 30 characters.

The **Document reading** panel immediately shows the document type, surname, given names, nationality, issuing state, date of birth, sex, document number and expiry date (marked **Expired** when relevant). Below, the **ICAO 9303 check digits** section shows **Valid** or **Invalid** for each check digit: document number, date of birth, expiry date, personal data (passport) and composite check. An invalid digit means a misread MRZ or a tampered data page.

If the MRZ contains forbidden characters or has the wrong format, an error message is shown and the next step stays locked.

### Demo scenarios

The **Demo scenarios (simulated reader)** buttons fill the MRZ with a typical case: **Valid passport**, **Interpol Red Notice**, **Stolen passport (SLTD)**, **No e-Visa**, **Cloned chip** and **Forged MRZ** (date of birth altered on the printed page; the chip holds the genuine data). They are meant for training and demonstrations.

### Reading the chip (NFC)

The **Contactless chip (NFC)** panel reads the chip of biometric documents (DG1 data, DG2 portrait, SOD signature). Reading the chip is recommended for every biometric passport.

1. Once the MRZ is valid, click **Read chip**.
2. Place the document on the reader. Chip access (PACE or BAC) is derived from the MRZ.
3. The panel shows the chip portrait and two results:
   - **Passive authentication: valid / failed**: is the chip signature genuine? A failure points to a cloned chip or a forged document.
   - **Chip ↔ printed MRZ: consistent / different**: does the chip data (number, date of birth, surname, nationality, expiry) match the printed MRZ? A difference points to a tampered data page.

A browser cannot talk to a passport chip directly. WawID uses a **local NFC bridge** installed on the workstation and connected to the document reader; its address is set in **Settings**, under **NFC reader of this workstation**, with a **Test** button. When no bridge can be reached, chip reading is **simulated**: the panel says "(simulated)" and the portrait shown is a placeholder. If the chip cannot be read, check the document's physical security features.

Changing the MRZ after reading the chip clears the chip result: read it again.

Click **Capture biometrics** to move to the next step.

## Step 2 — Biometrics

### Face

1. Click **Turn on camera**: the browser asks for permission to use the workstation camera (grant it the first time).
2. Frame the traveler's face, looking straight ahead, without sunglasses or headwear.
3. Click **Capture**. The image is frozen and the camera turns off.

If no camera is available, a message says so and a simulated capture is produced.

The result shows the **1:1 match with the chip** (as a percentage, compared with the DG2 portrait when the chip was read) and **Liveness detection: passed / failed**. A score below 80% is shown in red.

> In this version, biometric scores are **simulated**. In production they are supplied by the certified biometric SDK of the terminal.

### Attack simulation

For training, the list next to the buttons simulates a presentation attack: **Simulate: 3D mask**, **Simulate: screen replay**, **Simulate: printed photo**, **Simulate: deepfake / injection**. Leave **Real traveler** for a normal check. A simulated attack makes liveness detection fail, lowers the face score and adds the factor "Presentation attack detected".

### Fingerprints and iris

- **Fingerprints (4 fingers)**: click each finger (**Left index**, **Right index**, **Left thumb**, **Right thumb**) or **Capture all**. Each captured finger shows its NFIQ quality.
- **Iris (optional)**: click **Capture**. Recommended for risk profiles. A score below 80% adds a risk factor.

Face capture is required to continue; fingerprints and iris are optional. Click **Run checks**.

### How the traveler's image is captured and what is stored

- The image is taken by the workstation camera, in the browser, only when you click **Capture**. The camera turns off right after the capture or when you leave the step.
- The captured photo and the portrait read from the chip **stay on the workstation**: they are neither sent to the server nor saved with the crossing.
- Only **results** are sent: face match score, liveness result, the simulated attack type if any, number of captured fingerprints, iris score, and for the chip: read or not, passive authentication, protocol, source (reader or simulation) and DG1 data (to check consistency with the MRZ).
- Biometric templates are encrypted and do not leave the terminal.

## Step 3 — Checks

WawID queries national and international files and computes the risk score. The number of sources queried is shown in the header. Each row shows **OK**, **Warning** (orange) or **Alert** (red):

| Check | What is checked |
| --- | --- |
| **MRZ authenticity (ICAO 9303)** | MRZ check digits. |
| **Electronic chip (NFC)** | Passive authentication and chip ↔ MRZ consistency. "Not read at the counter" (Warning) if the chip was not read. |
| **Document validity** | Expiry date. |
| **Interpol SLTD — lost / stolen documents** | Document number against lost or stolen document reports. |
| **Interpol notices, FPR, WAPIS, POI** | Name match (approximate names, transliterations, date of birth) in watchlists. |
| **Travel authorization (e-Visa)** | Approved and valid e-Visa for this document, collective authorization of a validated delegation (`DL…` reference), or "Visa exempt". Not required on exit. |
| **Face match** | Face score against the threshold; Warning if the score is just above the threshold. |
| **Liveness detection and anti-deepfake (ISO 30107-3)** | Liveness failure or presentation attack. |
| **Identity reuse** | Same document already presented under another identity (Alert), or same identity presented with several documents within 90 days (Warning). |
| **Targeting rules** | Active rules triggered (nationality, origin, age, crossing frequency…). |
| **Travel history** | Number of crossings in the last 30 days (Warning above 6). |

If an external source is unavailable, an **Unavailable sources** banner says so: the check then runs against the local copy of the list.

### Delegation member

If the passport belongs to a **validated** delegation and today is between 3 days before arrival and 3 days after departure, a blue banner appears above the checks: **Member of delegation DL…** (with **(VIP — protocol reception)** for a VIP delegation), followed by the delegation's name and type, the member's role, the passport type and, if granted, **Collective entry authorization valid during the stay.** In that case, the **Travel authorization (e-Visa)** line is **OK** and shows the delegation reference.

The banner is for information only: all checks and the decision remain mandatory. The **View the delegation** link opens the delegation record, where the **Check in** button records the member's arrival. See *Delegations: official visits, competitions, conferences*.

### Risk assessment

The **Risk assessment** panel shows:

- a gauge of the **risk score** from 0 to 100 and its level: **Low** (0 to 29), **Moderate** (30 to 59), **High** (60 to 100);
- the **Recommendation**:
  - **Clear the crossing** when the score is below 30;
  - **Refer to secondary inspection** from 30;
  - **Refuse and hold — escalate to supervisor** from 80, or as soon as a document is reported lost or stolen or a critical-severity match is found, whatever the score;
- the **Explanatory factors**: each factor found, its details and the points it adds to the score.

For details on factors and weighting, see "Understanding the risk score".

Click **Decide**.

## Step 4 — Decision

1. Choose one of the three decisions: **Clear** (stamp and let through), **Secondary inspection** (interview and further checks) or **Refuse** (notified refusal, detention if a warrant exists). The recommended decision is labeled **Recommended** and preselected.
2. Fill in the **Reason**. It is **mandatory when your decision differs from the recommendation**; confirmation is refused while it is empty.
3. Add **Remarks** if needed.
4. Review the **Summary** (traveler, document, direction, border post, face score, number of fingerprints, risk score).
5. Click **Confirm decision**.

## What is recorded

On confirmation, WawID recomputes the assessment on the server and records the crossing, with an identifier of the form `PX-…`:

- date and time, border post, **Counter** channel, direction, flight and origin;
- identity from the MRZ (surname, given names, date of birth, sex, nationality, issuer, document type and number, expiry);
- biometric results (face score, liveness, number of fingerprints, iris score) and a summary of the chip reading;
- score, level, risk factors and fraud indicator;
- decision, reason, remarks, officer name and check duration.

An alert is created automatically in the **Threat Monitor** when the score reaches 35 or the decision is **Refused**. The decision is written to the audit log. The crossing page then opens: from there you can open a case, add the traveler as a person of interest or print the page (see "Crossings, traveler search, QR and vehicles").
