# FAQ and glossary

## Frequently asked questions

### Travelers

#### How do I know whether I need a visa?

On the traveler portal home page, select your nationality under **Do I need a visa?**. The portal tells you whether you are exempt (stay of 90 days or less) or whether an e-Visa is required. The exemption list is set by the administration.

#### How long does it take to get an e-Visa?

An answer is usually given **within 72 hours**. Apply well before your departure. When the passport chip was read with the iPhone app, processing is usually faster.

#### I lost my application reference. What should I do?

The reference (starting with `EV`) is shown on the confirmation screen and in the app. Tracking requires the reference **and** the passport number; without the reference, contact the immigration services.

#### The administration asks for more information. How do I reply?

Open **Tracking**, enter the reference and passport number, read the officer's message, then answer in **Your reply**. The application automatically goes back under review.

#### Do I need to print my e-Visa?

It is not required: you can show the QR code on your phone. A printed copy is useful if your battery runs out. Always show the QR code **together with your passport**.

#### My WawPass receipt was refused at the airport.

A WawPass QR code can be used **only once**. If it was already scanned, it is reported as "Receipt already used". Also check that the flight and date match your trip.

#### Why did the eGate refer me to a counter?

A referral does not prejudge anything. It happens for example if you are a minor, if the chip or document could not be verified, if the face match or liveness detection failed, if your nationality is not eligible at this gate, or if an additional check is needed. An officer then handles your crossing at a counter.

#### My iPhone does not read the passport chip.

You need an iPhone 7 or newer and a biometric passport. Check the MRZ (a single error blocks access to the chip), remove the case, place the closed passport on a non-metal surface, bring the top of the iPhone to it and hold still for 5 to 15 seconds. You can also continue without reading the chip.

### Airlines

#### How do we get a key for the API/PNR gateway?

The `X-Carrier-Key` is issued by the administration to each airline and bound to its IATA code. It only allows sending that airline's flights.

#### Which formats are accepted?

UN/EDIFACT **PAXLST** (D02B, IATA/WCO profile) for API, and **PNR in IATA text format** (RLOC, segments, SSR DOCS, CTCE/CTCM, FP). PNRGOV messages are accepted after conversion by the integration service. Maximum size: 2 MB.

#### When should data be sent?

PNR 48 h then 24 h before departure; API at check-in close, no later than gate close. Delays are tracked in carrier compliance (targets: 95% or more of flights on time, 98% or more completeness).

#### Do we receive the screening result for our passengers?

No. The gateway returns an acknowledgment (`MSG-…` reference, number of passengers, completeness, punctuality, errors), but **no targeting result** is shared with the carrier.

### Officers

#### The chip is shown as "simulated" at the counter. Is that normal?

Yes, if the NFC bridge is not running or no reader is connected. Check the bridge address in **Administration → Settings → NFC reader on this workstation** and click **Test**.

#### How do I verify an e-Visa or WawPass QR code?

Use the QR verification feature of the back office (session required). The signature is checked, then the e-Visa status or WawPass usage is verified in real time.

#### Why must I enter a reason for some decisions?

When your decision differs from the risk score recommendation, a reason is required. It is stored with the crossing and recorded in the audit log.

#### My session expired.

Sessions last 12 hours (one shift). Sign in again. If your account was deactivated, contact an administrator.

## Glossary

| Term | Definition |
| --- | --- |
| ABC (Automated Border Control) | Automated border control: eGates, kiosks and biometric corridors that allow crossing without an officer. |
| Active authentication (AA) / chip authentication | Mechanism proving that the chip has not been cloned (private key stored in the chip, DG15/DG14). |
| Alert | Signal raised when a crossing or an announced passenger has a high risk score or a watchlist match. |
| API (Advance Passenger Information) | Passenger identity and document data sent by the airline before the flight arrives or departs. |
| APIS | System processing API data: receiving manifests and pre-screening announced passengers. |
| BAC (Basic Access Control) | Passport chip access protocol using keys derived from the MRZ. Gradually replaced by PACE. |
| CDP | Personal Data Protection Commission, the Senegalese supervisory authority (Law 2008-12). |
| Check digits | MRZ digits computed according to ICAO 9303 to detect reading or typing errors. |
| CSCA / ICAO PKD | Root certificates of passport-issuing states; the ICAO PKD distributes them for passive authentication. |
| DG1, DG2 | Chip data groups: DG1 holds the MRZ, DG2 the holder's photo. |
| e-Visa | Travel authorization applied for and issued online, shown at the border as a signed QR code. |
| eGate | Automated gate that reads the passport, compares the traveler's face with the chip photo, and opens or refers to a counter. |
| eKYC | Remote identity verification: document authenticity, face match with a selfie, liveness detection. |
| FCFA (XOF) | West African CFA franc, the currency of e-Visa fees and the security fee. |
| ICAO 9303 (ICAO Doc 9303) | International standard for machine readable travel documents: MRZ, chip, security protocols. |
| Liveness detection | Check that a presented face belongs to a live person and not a photo, screen or mask. |
| MRZ (Machine Readable Zone) | 2-line (passport, TD3 format) or 3-line (card, TD1) band at the bottom of the identity page, readable by machine. |
| NFC | Short-range contactless communication used to read the chip of biometric passports. |
| PACE (Password Authenticated Connection Establishment) | Chip access protocol stronger than BAC, also based on the MRZ. |
| Passive authentication (PA) | Verification of the digital signature of the chip data (EF.SOD) with the issuing state's certificates (CSCA). It proves that the data has not been changed. |
| PAXLST | UN/EDIFACT "Passenger List" message used by airlines to send API data. |
| PNR (Passenger Name Record) | Booking record: itinerary, booking date, form of payment, contact details. |
| PNRGOV | UN/EDIFACT format for sending PNRs to public authorities. |
| POI (person of interest) | Person flagged by intelligence services on a watchlist. |
| Pre-enrollment | Registering a passport in advance on the portal in order to use the eGates. |
| Risk score | Score from 0 to 100 computed from explainable factors (lists, rules, document, biometrics); it produces a recommendation: Cleared, Secondary inspection or Refused. |
| Security fee | Fee collected from airlines on passengers of commercial flights, tracked in the Finance module. In the traveler portal, WawPass also refers to the airport security fee paid by the traveler. |
| SLTD (Stolen and Lost Travel Documents) | Interpol database of lost or stolen travel documents. |
| SSR DOCS | PNR element holding the passenger's travel document data. |
| WAPIS | West African Police Information System, a regional program supported by Interpol. |
| WawPass | Online payment service for the airport security fee, with a QR receipt valid once. |
