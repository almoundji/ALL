# Traveler guide (portal and iPhone app)

This guide is for travelers going to or leaving Senegal. It describes the WawID **traveler portal** (a website, no account needed) and the **WawID e-Visa iPhone app**. Everything is done online; no prior registration is required.

| Service | Where | What it is for |
| --- | --- | --- |
| Do I need a visa? | Portal home page | Check whether your nationality is visa-exempt |
| e-Visa | Portal (**e-Visa** tab) or iPhone app | Apply for a travel authorization online |
| Tracking | Portal (**Tracking** tab) or iPhone app | Check the application status, answer the administration, get the QR code |
| WawPass | Portal (**WawPass** tab) | Pay the airport security fee and get a QR receipt |
| eGate | Portal (**eGate** tab) | Pre-enroll for the automated gates |

Portal address: `https://wawid-waw-telecom.netlify.app`

The traveler platform consists of the portal (`/`) and the public help center (`/aide/`). The mobile apps are downloaded from the `/app/` page (**Mobile app** link on the portal): Android by direct APK download, iPhone through TestFlight. The spaces for DPAF officers and airlines are separate platforms, reserved for their users; the portal gives no access to them.

> Demonstrator: on the demonstration version, **no real payment is made** and all displayed data is fictitious.

## Do I need a visa?

1. Open the portal home page.
2. In the **Do I need a visa?** card, select your nationality.
3. The portal shows immediately:
   - **Visa-exempt (stay ≤ 90 days)**: you do not need to apply;
   - **e-Visa required**: follow the **Apply** link.

The list of exempt nationalities is set by the administration and may change. If in doubt, check again just before you travel.

## Applying for an e-Visa on the portal

The form has **4 steps**: Identity, Trip, Health, Payment. Fields marked with an asterisk (*) are required. The **Back** button returns to the previous step without losing what you entered.

### Step 1 — Identity (auto-fill from the MRZ)

The **MRZ** is the 2-line band of characters at the bottom of your passport photo page (for example `P<FRAMARTIN<<CLAIRE<<<…`).

1. Type or paste the 2 MRZ lines into the box at the top of the form.
2. The portal fills in surname, given names, date of birth, sex, nationality, passport number and expiry date.
3. If the message says **check digits invalid**, the MRZ probably contains a typo: check each field.
4. Enter your **e-mail** (required) and **phone** (optional).

### Step 2 — Trip

- **Purpose**: tourism, business, family visit, conference, studies or transit.
- **Arrival date** and **length of stay** (nights).
- **Point of entry**: Blaise Diagne International Airport (AIBD), Port of Dakar, Ziguinchor Airport, or the land border posts of Rosso, Kidira or Karang.
- **Address during stay**: hotel, address or host.

### Step 3 — Health declaration

- Yellow fever vaccination (international certificate).
- Fever or infectious symptoms in the last 14 days.
- Countries visited in the last 21 days.

### Step 4 — Payment and consent

1. Check the **processing fee** (50,000 FCFA in the default configuration, non-refundable).
2. Choose a payment method: Wave, Orange Money, Free Money or bank card.
3. Tick the **consent** box: you agree that your data is processed by the immigration services to process the application and for border control (Law 2008-12), and you certify that the information is accurate. Without consent, the application cannot be submitted.
4. Click **Pay and submit**.

### After submission

The **Application recorded** screen shows:

- your **reference** (starting with `EV`, for example `EV1234567`): **keep it**;
- the amount paid and the receipt number;
- a **Track my application** button.

An answer is usually given **within 72 hours**. Your application goes through automatic pre-screening and is then processed by an officer.

## Tracking an application and answering the administration

1. Open the **Tracking** tab.
2. Enter the **reference** (EV…) and the **passport number** used in the application. Both must match.
3. Click **View**.

| Status | Meaning | What to do |
| --- | --- | --- |
| Submitted | Application received, awaiting processing | Wait |
| Under review | An officer is reviewing the application | Wait |
| Info requested | The administration needs more information | Read the message and reply |
| Approved | e-Visa issued | Download or print the QR code |
| Refused | Application rejected (reason in the messages) | Read the reason |

### Answering a request for information

When the status is **Info requested**, the officer's message appears under **Messages** and a **Your reply** box is shown.

1. Write your reply (1,000 characters maximum).
2. Click **Send**.
3. The application automatically returns to **Under review**.

You can only reply when information is expected.

## The e-Visa QR code

When the application is **approved**, the tracking page shows:

- the **e-Visa number** (format `SN-EV-…`);
- the **expiry date** (90 days after approval);
- an electronically signed **QR code**.

Print the page (**Print** button) or keep it on your phone. At the border, show **the QR code and your passport**, at the counter or at the eGate. The QR code is signed: any change makes it invalid. The officer checks in real time that the e-Visa is approved and still valid.

## WawPass: paying the security fee

WawPass lets you pay the **airport security fee** (15,000 FCFA in the default configuration) online before your flight.

1. Open the **WawPass** tab.
2. Enter surname, given names, nationality, passport number, flight (for example `HC 404`) and travel date. The date must be **today or later**.
3. Choose a payment method (Wave, Orange Money or bank card), then click **Pay**.
4. The **Payment confirmed** screen shows a **QR code** and a `WP…` reference. Print or save it.

At the airport, an officer scans the QR code. **It can be used only once**: a receipt that was already presented is reported as "Receipt already used".

## Using the eGates

### How an eGate works

1. Place your **open biometric passport** on the reader. The gate reads the MRZ and the passport **chip**.
2. Look at the **camera**: your face is compared with the photo stored in the chip, and the gate checks that you are a live person (liveness detection).
3. If everything is in order, **the gates open** (about 15 seconds).

The gate **refers you to a counter** (this does not prejudge your situation), in particular if:

- you are a minor (automated crossing is for adults only);
- the document is unreadable or expired, or the chip could not be verified;
- the face match or liveness detection fails;
- your nationality is not eligible at this gate, or no travel authorization is found;
- an additional check is required;
- the gate is closed or under maintenance.

### Pre-enrolling

1. Open the **eGate** tab.
2. Paste the **2 MRZ lines** of your passport and your **e-mail**.
3. Tick the **biometric consent** box (capture of your biometric data at your first crossing, for border control purposes).
4. Click **Register**. An `EN…` reference is shown.

Conditions: valid MRZ, **adult** traveler, **unexpired** passport. A passport that is already pre-enrolled returns the existing reference. Your face and fingerprints are captured at your **first crossing at a counter**; after that, the eGates are open to you.

## The WawID e-Visa iPhone app

The app lets you apply for an e-Visa by reading your passport's **electronic chip** directly, which strengthens verification and speeds up processing. Install it from the portal's `/app/` page (iPhone: TestFlight; an Android version is also offered as a direct download).

> The app interface is currently in French. The button and screen names below are English translations; the original French label is given in parentheses where useful.

### What you need

- A **biometric passport** (chip logo on the cover).
- An **iPhone 7 or newer** (NFC reading is not available on older models).
- A payment method: Wave, Orange Money, Free Money or card.

### Step 1 — Scan the MRZ

1. Tap **Scan with the camera** (*Scanner avec la caméra*) and frame the 2-line band at the bottom of the photo page, or type it in.
2. Check the summary (surname, given names, passport, nationality, expiry).
3. The **Check digits valid** badge must appear. Otherwise, correct the entry: the MRZ is the **key** that opens the chip.

### Step 2 — Read the chip with NFC

1. Tap **Read NFC chip** (*Lire la puce NFC*).
2. Place the passport **closed** on a table and bring the **top of the iPhone** to the cover.
3. **Hold still** during the read (5 to 15 seconds) until the message "Passport read successfully".
4. The app shows the chip photo and two results: **Authentic passport** (*Passeport authentique*, passive authentication) and **Chip and MRZ match** (*Puce et MRZ concordantes*).

Tips for a good read:

- remove the iPhone case and the passport cover;
- move the iPhone slowly if the read does not start: the chip position varies between passports (cover or data page);
- avoid metal surfaces;
- if it fails, check the MRZ: a single error prevents access to the chip.

You can **continue without reading the chip**; processing will then take longer.

### Step 3 — Your stay

Complete identity (surname, given names, e-mail, phone), trip (purpose, arrival, 1 to 90 nights, point of entry, address) and the health declaration.

### Step 4 — Payment and submission

1. Check the fee (50,000 FCFA) and choose a payment method.
2. Turn on **consent** (Law 2008-12).
3. Tap **Pay and submit** (*Payer et déposer*). The app shows your **reference**: keep it.

### Tracking in the app

Tap **Track my application**, enter the reference and passport number, then **Check**. The app shows the status, e-Visa number, expiry date, messages from the administration and, if approved, the **QR code to show at the border**. To answer a request for information, use the **Tracking** tab of the web portal.

## Personal data

Your data is processed in accordance with **Law 2008-12 on the protection of personal data** (Personal Data Protection Commission, CDP).

| Data | Use |
| --- | --- |
| Identity and passport | Processing the application, border control, checks against official lists |
| E-mail, phone | Answering your application, contact by the administration |
| Trip and health declaration | Processing the application, public health |
| Chip data (iPhone app) | Only the chip MRZ, the authentication result and the protocol are sent; **the chip photo stays on your iPhone** |
| eGate biometrics | Captured at a counter at your first crossing, with your consent |

Data is kept for the period set by the administration (5 years in the default configuration). Every lookup and decision is recorded in an audit log.

## Changing the language

The portal is available in **French** and **English**. By default it follows your browser language; use the **FR / EN** switch in the header to change it. Your choice is remembered on your device. The moon or sun button switches between light and dark theme.
