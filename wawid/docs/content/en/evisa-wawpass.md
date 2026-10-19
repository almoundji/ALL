# e-Visa and eGate pre-enrollments

The **e-Visa & travelers** space of the back office handles applications submitted on the traveler portal:

- **e-Visa**: processing of travel authorization applications (Visa Management System);
- **eGate pre-enrollments**: pre-enrollments in the eGate program and, on a second tab, the history of former WawPass receipts;
- **Verify a QR** (**Border control** space): checking e-Visa QR codes at the border.

> The security fee (12 USD per passenger) is included in the plane ticket price and collected by airlines (see *Security fee*). Travelers pay nothing separately: the former WawPass online payment has been removed from the portal.

| Action | Permission |
|---|---|
| View applications, receipts and pre-enrollments, verify a QR | `read` |
| **Request information**, **Approve**, **Refuse** | `evisa` (intelligence analyst, supervisor, administrator) |

## Process e-Visa applications

### Tabs

| Tab | Statuses shown |
|---|---|
| **To process** | **Submitted** and **Under review** |
| **Info requested** | Waiting for the applicant's answer |
| **Approved** | e-Visas issued |
| **Refused** | Refused applications |
| **All** | Every application |

The table shows **Reference** (`EV…`), **Applicant** (nationality and passport), **Stay** (purpose, arrival date, number of nights), **Pre-screening** (score and level), **Submitted** and **Status**. The **Health** badge means that no yellow fever vaccination was declared.

### Application page

Click a row to open the application page. It contains:

- **Applicant and document**: surname, given names, birth, sex, nationality, passport, expiry, e-mail, phone, submission **Channel** (Web, app…) and **Chip (NFC)**;
- **Stay, health and payment**: purpose, arrival and length of stay, **Point of entry**, address in Senegal, **Yellow fever**, **Symptoms**, **Countries visited**, payment amount, method and receipt;
- **Exchanges with the applicant**: history of messages between the officer and the applicant;
- **Previous crossings**: the latest crossings recorded with the same passport (8 at most), with their decision;
- **Automatic pre-screening**: score, level and factors;
- **e-Visa issued**: for an approved application, the signed QR code, the e-Visa number, the end of validity and the deciding officer.

#### Chip (NFC) field

If the applicant read the passport chip with a phone (NFC), the field shows:

| Display | Meaning |
|---|---|
| **Passport authenticated** | Passive authentication succeeded and chip data (DG1) match what was entered |
| **Verification failed** | Invalid chip signature, or data differ from what was entered |
| **Unread** | No chip reading |

The reading source is shown next to it.

#### Automatic pre-screening

On submission, WawID computes a risk score (channel `EVISA`, entry direction) from:

- the local copy of the **watchlists**, including the e-mail, phone and device blacklist;
- the enabled **targeting rules**;
- the **NFC chip** (passive authentication, consistency with what was entered);
- **remote eKYC**: document authenticity (screen recapture, printed copy, alteration or AI generation), selfie vs document photo comparison, liveness challenges, deepfake, video injection through a virtual camera, image quality;
- the **identity network** (see below).

The score is frozen at submission. It is not recalculated if the lists change later. Point details are in *Understanding the risk score*.

> In the demo, the eKYC provider is "simulation": document authenticity, face comparison and AI-generated content detection are simulated. Image quality and virtual camera detection are actually measured in the applicant's browser. Payment is simulated too (default amount: 50,000 FCFA).

### Request information

1. On the application page, click **Request information**.
2. State the document you need (e.g. hotel booking, invitation letter). The text is mandatory.
3. Click **Send**. The application moves to **Info requested** and the message appears in **Exchanges with the applicant**.

The applicant replies from the traveler portal (reference and passport number). The reply is added to the exchanges and the application returns to **Under review**.

### Approve

1. Check the pre-screening, the chip, the health declaration and the exchanges.
2. Click **Approve**.

WawID assigns an `SN-EV-…` number, sets validity to **90 days** from approval and generates a **signed QR code** (server-side HMAC signature). The applicant sees the decision and downloads the e-Visa on the portal.

### Refuse

1. Click **Refuse**.
2. Enter the **Refusal reason** (mandatory). It is shown to the applicant.
3. Click **Send**.

An **Approved** or **Refused** application can no longer be changed: the action buttons disappear. Each decision is written to the audit log.

### Effect at the border

At the counter and at eGates, the risk engine looks up the e-Visa for the passport presented. An approved, still valid e-Visa adds no factor. For a visa-required nationality, an application that is not approved, an expired e-Visa or no application at all adds 30 points (`VISA` factor) on entry.

## Verify a QR code

1. Open **Verify a QR** from the **Border control** space.
2. Paste the QR code content (or use a handheld scanner), or click **Scan** to read it with the camera (browsers supporting BarcodeDetector).
3. Click **Verify**.

The server checks the signature. A forged QR is reported as invalid or forged. For an e-Visa, the QR is **Valid** if the application is approved and not expired. Compare the holder and document number shown with the passport presented.

> Former WawPass receipts (`WP…` tokens) issued before the traveler payment was removed can still be verified for the record: the first verification marks them as **Used**, the next one answers "Receipt already used.". No new receipts are issued.

## WawPass history (former receipts)

Traveler payment of the security fee (WawPass) has been removed: the fee is included in the ticket. Open **eGate pre-enrollments**, **WawPass history** tab, to view receipts issued before:

| Column | Content |
|---|---|
| **Receipt** | `WP…` reference |
| **Traveler** | Name and passport number |
| **Flight** | Flight number and travel date |
| **Amount** | Amount (15,000 FCFA by default) and payment method |
| **Status** | **Valid** or **Used** |

This history is read-only; no new receipts are added.

## eGate pre-enrollments

Open the **eGate pre-enrollments** tile (route `#/wawpass`): the default tab, **eGate pre-enrollments**, lists travelers who signed up on the portal for the automated crossing program: **Reference** (`EN…`), **Traveler** (nationality and passport), **Date** and **Status**. The status shown, "Biometrics to be captured at first crossing", is a reminder that the face is captured at the first crossing at a counter.

The portal only accepts a pre-enrollment when:

- the MRZ entered is valid (correct check digits);
- the traveler is an adult and the passport has not expired;
- the e-mail address is valid and biometric consent is given.

A passport already pre-enrolled returns the existing reference, with no duplicate.

## Detect an identity network

Organized fraud often reuses the same contact details for several identities. When each e-Visa application is submitted, WawID looks for **other applications with other passport numbers** that share:

- the same **e-mail** address (case-insensitive);
- the same **phone** (digits compared, at least 8);
- the same **device** (stable identifier generated by the browser or app).

If at least one application is linked, the factor **Contact details or device shared with *n* other identity(ies)** adds 15 points plus 10 per linked identity, up to 45, and states the link (e-mail, phone, device). Contact details on the blacklist also add the **Blacklist** factor.

### What to do about a network

1. Open an application with the network factor and note the link shown.
2. Find the other applications concerned (same phone, same address) on the **All** tab.
3. Request additional documents or refuse the applications, with a reason.
4. Have the phone, e-mail or device added to the contact-details blacklist to block future applications (see *Threat Monitor, cases, watchlists, rules and connectors*).

> The demo dataset contains a fictitious ring: four applications with different identities and nationalities, submitted from the same device with the same phone number, which is itself on the blacklist.
