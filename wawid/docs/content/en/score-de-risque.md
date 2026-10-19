# Understanding the risk score

WawID gives every checked traveler an **explainable risk score** from 0 to 100. The same engine runs at the counter, at eGates, for e-Visa applications and for pre-screening announced passengers (APIS/PNR). Every point comes from a **factor** shown with its label, detail and points: nothing is hidden from the officer.

This page is the reference for border officers, analysts and supervisors who need to read a score, understand a recommendation and explain a decision.

## How it is calculated

1. The engine lists the factors that fire (watchlists, chip, MRZ, biometrics, eKYC, network, visa, age, targeting rules).
2. The score is the **sum of the points**, capped between 0 and 100.
3. The **level** is derived from the score.
4. The **recommendation** is derived from the score and from whether some factors are **critical**.
5. The **fraud** flag is raised when at least one fraud factor is present.

The same code can appear several times (for example two matches on two lists). Each occurrence adds its points.

> Factor codes are internal identifiers and stay in French in every language. Labels below are the English labels shown on screen.

## Factor reference

### Watchlists

| Code | Label shown | Points | Notes |
|---|---|---|---|
| `WATCHLIST` | Match *list name* | Critical 80 · High 60 · Medium 35 · Low 15 · no severity 40 | Person (approximate name ≥ 90 %). **Critical** severity makes the case critical. |
| `SLTD` | Document reported lost / stolen | 85 | Document number found (Interpol SLTD or invalidated national documents). Always **critical**. |
| `LISTE_NOIRE` | Blacklist: e-mail / phone / device flagged | Critical 80 · High 60 · Medium 35 · Low 15 · no severity 40 | Contact details or device on the blacklist. |

### Electronic chip and document

| Code | Label shown | Points | Condition |
|---|---|---|---|
| `PUCE_ABSENTE` | Chip not read (NFC reading failed) | 10 | NFC reading attempted but failed |
| `PUCE_PA` | Chip passive authentication failed | 60 | Invalid SOD signature |
| `PUCE_MRZ` | Chip data differs from the printed MRZ | 60 | DG1 inconsistent with the MRZ (number, dates, name, nationality) |
| `MRZ` | Invalid MRZ check digits | 40 | At least one wrong check digit |
| `EXPIRE` | Document expired | 35 | Expiry date passed |
| `EXPIRE_PROCHE` | Document close to expiry | 5 | Less than 90 days of validity |

### Biometrics

| Code | Label shown | Points | Condition |
|---|---|---|---|
| `FACE` | Insufficient face match | 40 | Face score below the threshold (80 % at the counter by default; each eGate has its own threshold, 82 % by default) |
| `FACE_LIMITE` | Borderline face match | 10 | Score between the threshold and threshold + 7 points |
| `LIVENESS` | Liveness detection failed (suspected spoofing) | 50 | Negative liveness detection |
| `ATTAQUE` | Presentation attack detected: 3D mask / screen replay / printed photo / deepfake / video injection | 60 | Attack reported by the terminal |
| `IRIS` | Insufficient iris match | 25 | Iris score below 80 % |

### Remote eKYC (e-Visa)

| Code | Label shown | Points |
|---|---|---|
| `EKYC_DOC` | Document: screen photo (recapture) detected | 50 |
| `EKYC_DOC` | Document: printed copy detected | 50 |
| `EKYC_DOC` | Document altered or AI-generated | 60 |
| `EKYC_FACE` | Selfie does not match the document photo (score < 80 %) | 40 |
| `ATTAQUE` | Failed liveness challenges (selfie) | 50 |
| `ATTAQUE` | Deepfake detected (generated or swapped face) | 60 |
| `INJECTION` | Video injection attack (virtual camera) | 60 |
| `EKYC_QUALITE` | Insufficient image quality | 5 |

> In the demo, document authenticity, face comparison and AI-generated content detection are **simulated** (provider "simulation"). Image quality and virtual camera detection are actually measured by the browser.

### Identity, travel and rules

| Code | Label shown | Points | Condition |
|---|---|---|---|
| `RESEAU` | Contact details or device shared with *n* other identity(ies) | 15 + 10 × *n*, capped at 45 | Same e-mail, phone or device (e-Visa), or same booking contact details within a flight (PNR) |
| `DOC_REUTILISE` | Document already presented under another identity | 70 | Same document number with a different name or date of birth in the history |
| `MULTI_DOCS` | Same identity presented with multiple documents | 15 | Other documents for the same name and date of birth over 90 days |
| `VISA` | No valid travel authorization (e-Visa) | 30 | Visa-required nationality, on entry, with no e-Visa (or a refused one) |
| `VISA` | e-Visa not valid (*status*) | 30 | e-Visa exists but is not approved, or has expired |
| `MINEUR` | Minor traveler — check exit authorization | 5 | Under 18 |
| `REGLE` | Targeting rule: *rule name* | Rule points (0 to 100) | All conditions of an enabled rule are true |

The `VISA` factor never applies on exit. The `DOC_REUTILISE` and `MULTI_DOCS` checks rely on the crossing history; they only apply at the counter and at eGates.

### Booking indicators (PNR)

Added when pre-screening passengers announced in a PNR message (`pnrFactors` function):

| Code | Label shown | Points | Condition |
|---|---|---|---|
| `PNR_ESPECES` | Ticket paid in cash | 10 | `FP CASH` element |
| `PNR_ALLER_SIMPLE` | One-way ticket with no return booked | 5 | No segment leaving from the destination |
| `PNR_DERNIERE_MINUTE` | Last-minute booking | 10 | Booked less than 48 h before the flight |

## Levels

| Level | Score |
|---|---|
| **Low** | 0 to 29 |
| **Moderate** | 30 to 59 |
| **High** | 60 to 100 |

## Recommendations

| Recommendation | Condition | Counter wording |
|---|---|---|
| **Refused** | **Critical** case or score ≥ 80 | Refuse and detain — supervisor escalation |
| **Secondary inspection** | Score from 30 to 79 | Refer to secondary inspection |
| **Cleared** | Score ≤ 29 and no critical factor | Clear crossing |

A case is **critical** when the document is on a lost or stolen documents list (`SLTD`) or when the traveler matches an entry with **Critical** severity (`WATCHLIST`). Refusal is then recommended, whatever the score.

At the counter, the officer still decides. If the officer chooses a decision that differs from the recommendation, a **reason is mandatory** and is stored with the crossing.

## Fraud flag

A crossing counts as **fraud** (dashboard, statistics) when at least one of these factors is present: `SLTD`, `MRZ`, `LIVENESS`, `FACE`, `PUCE_PA`, `PUCE_MRZ`, `ATTAQUE`, `DOC_REUTILISE`, `EKYC_DOC`, `EKYC_FACE`, `INJECTION`.

## Alert types

The Threat Monitor gives each alert a type and a title, based on the first factor found in this priority order:

| Priority | Factor | Type | Title |
|---|---|---|---|
| 1 | `SLTD` | Lost / stolen document | Document reported lost / stolen |
| 2 | `WATCHLIST` | Watchlist | Match label |
| 3 | `DOC_REUTILISE` | Document fraud | Document reused under another identity |
| 4 | `ATTAQUE` | Biometric fraud | Attack label |
| 5 | `INJECTION` | Biometric fraud | Video injection attack (virtual camera) |
| 6 | `EKYC_DOC` | Document fraud | Factor label |
| 7 | `EKYC_FACE` | Biometric fraud | Selfie does not match the document photo |
| 8 | `RESEAU` | `RESEAU` (no label in the filter) | Factor label |
| 9 | `LISTE_NOIRE` | Watchlist | Blacklist label |
| 10 | `PUCE_PA` or `PUCE_MRZ` | Document fraud | Invalid electronic chip (forged document) |
| 11 | `LIVENESS` or `FACE` | Biometric fraud | Suspected identity theft (biometrics) |
| 12 | `MRZ` | Document fraud | Suspicious document (MRZ) |
| 13 | `EXPIRE` | Document expired | Expired document presented |
| 14 | `REGLE` | Targeting rule | Rule label |
| 15 | `VISA` | No authorization | Entry without travel authorization |
| 16 | other | High risk | High risk score |

Alerts raised from announced flights have the **APIS / PNR** type. Their title starts with "API:", "PNR:" or "APIS:" followed by the title above.

Alert severity: **Critical** if score ≥ 80, **High** if ≥ 60, **Medium** otherwise. An alert is created from a score of 35 (or from a **Refused** decision at the counter).

## eGate decisions

An eGate either opens or refers the traveler to a counter. Checks run in this order; the first one that fails triggers the referral, with the code shown:

1. `ILLISIBLE`: document unreadable.
2. `MRZ`: invalid check digits.
3. `AGE`: traveler under the gate's minimum age (18 by default).
4. `ELIGIBILITE`: nationality not eligible (setting **ECOWAS nationals** or **Custom list**).
5. `BIOMETRIE`: face not captured; `LIVENESS`: no liveness result while liveness is mandatory.
6. `PUCE`: any chip factor (`PUCE_ABSENTE`, `PUCE_PA`, `PUCE_MRZ`).
7. `FRAUDE`: `ATTAQUE` or `DOC_REUTILISE` factor.
8. `LIVENESS` then `FACE`: the matching biometric factors.
9. `EXPIRE`: expired document.
10. `VISA`: `VISA` factor, when the gate checks the travel authorization.
11. `RISQUE`: critical case, recommendation other than **Cleared**, or any `SLTD` or `WATCHLIST` match, whatever the threshold.
12. `RISQUE`: score above the gate's **Maximum accepted risk score** (29 by default).

If everything passes, the gates open and the crossing is recorded as **Cleared**. Otherwise it is recorded as **Secondary inspection** with the referral reason.

> In the demo, face scores of generated crossings are simulated. In production they come from the terminal's biometric SDK.
