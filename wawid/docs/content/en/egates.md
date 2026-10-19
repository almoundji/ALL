# eGates and ABC kiosks

The **eGates & ABC** application monitors automated border control equipment in real time: biometric gates (eGates), ABC kiosks and the biometric boarding corridor. It shows transactions, explains referrals to counters and, for supervisors and administrators, lets you control equipment remotely.

All roles can view the page. Commands and settings require the **eGate control** permission (**Supervisor**, **Administrator**).

## Page header

- The **All border posts** list filters equipment and statistics on one post (for example AIBD airport or the Port of Dakar).
- **Open kiosk** launches the eGate kiosk screen (`/gate/`) in a new tab.

The page refreshes automatically every 30 seconds.

## Key indicators

| Indicator | How it is computed |
| --- | --- |
| **Open** | Equipment **In service** and in automatic mode, out of the total number of devices. |
| **Alarms** | Equipment with the status **Alarm** (intervention required). Red when there are any. |
| **Transactions (24 h)** | eGate or kiosk crossings in the last 24 hours, with the number of gate openings. |
| **Counter referral rate** | Share of the last 24 hours' transactions that did not end in a gate opening (rejections and additional checks). |
| **Average duration** | Average duration of an automated crossing, in seconds. |

## Equipment cards

Each device is shown on a card:

- name, identifier (for example `EG-AIBD-A01`) and zone (**Arrivals**, **Departures**, **Boarding**, **Passenger terminal**);
- **status** and **mode**;
- type (eGate, ABC kiosk, biometric corridor) and firmware version;
- **crossings today** and the number **referred to counter** (rolling 24 hours);
- peripheral status: **Reader**, **Camera**, **Fingerprints**, **Gates** (green if OK, red on failure);
- a reminder of the settings (face threshold, minimum age, eligibility) and the time of the last heartbeat.

A card in alarm is highlighted.

### Statuses and modes

| Status | Meaning |
| --- | --- |
| **In service** | The device is working. |
| **Maintenance** | Taken out of service for intervention; it is closed. |
| **Out of service** | Stopped. |
| **Alarm** | A fault was detected (for example a camera fault); intervention required. |

| Mode | Meaning |
| --- | --- |
| **Automatic mode** | The gate accepts travelers and decides on its own whether to open. |
| **Assisted mode** | Crossing under an officer's guidance. |
| **Closed mode** | The gate accepts no travelers. |

A gate only accepts transactions when it is **In service** and in **automatic mode**. In every other case, the kiosk shows "Gate closed" and directs the traveler to a counter.

## Remote commands

The buttons appear at the bottom of each card for authorized roles:

| Button | Effect |
| --- | --- |
| **Settings** | Opens the device settings window (see below). |
| **Close** | Puts the gate in closed mode (it stays In service). |
| **Open** | Returns a closed gate to automatic mode. |
| **Put back in service** | For a device in maintenance, out of service or in alarm: status In service and automatic mode. |
| Power button | **Remote restart**. |
| Padlock button | **Switch to maintenance**: status Maintenance and closed mode. |
| Play button | **Open this kiosk**: opens the kiosk screen directly on this device. |

Each command shows "Command sent to …" and is written to the audit log with the user's name. When idle, the kiosk re-reads its status every 15 seconds: a remote closing or return to service therefore takes effect within 15 seconds, without interrupting a traveler already in the middle of a crossing.

## Device settings

1. Click **Settings** on the card.
2. Change the values.
3. Click **Apply remotely** (or **Cancel**).

| Setting | Default | Effect |
| --- | --- | --- |
| **Face match threshold (%)** | 82 | Below this score, the face is considered not matching and the traveler is referred to a counter. Values from 50 to 99. |
| **Maximum accepted risk score** | 29 | Above it, referral to a counter. Values from 0 to 100. |
| **Minimum age** | 18 | Younger travelers are referred to a counter. Values from 0 to 21. |
| **Eligibility** | All nationalities | **All nationalities**, **ECOWAS nationals** or **Custom list**. |
| **Eligible nationalities** | empty | Used with **Custom list**: 3-letter ISO codes separated by commas (for example `SEN, FRA, MLI`). |
| **Liveness detection required** | checked | When checked, any transaction without a passed liveness detection is referred to a counter. |
| **Check travel authorization** | checked | When checked, a visa-required traveler without a valid e-Visa is referred with the reason "Travel authorization not found". |

> **Important**: the maximum risk score can only make the policy **stricter**. Whatever its value, the eGate never opens when the risk engine's recommendation is not "clear" (score of 30 or more), nor when there is a watchlist match or a lost or stolen document. Likewise, unchecking **Check travel authorization** only changes the reason: a missing e-Visa adds points to the score and usually still leads to a referral for "Additional check required".

## eGate decision rules

For each traveler, the eGate assesses the document and the risk as at the counter (files, rules, chip, biometrics), using the device's face threshold. Rules are applied in the order below; the first one that applies results in a **referral to a counter** with its message. If none applies, the gates open.

| Order | Condition | Message shown to the traveler |
| --- | --- | --- |
| 1 | Unreadable MRZ | Unreadable document — please go to a counter. |
| 2 | Invalid MRZ check digits | The document could not be authenticated. |
| 3 | Age below the minimum age | Minors are processed at the counter. |
| 4 | Nationality not eligible (ECOWAS or list) | Nationality not eligible for automated crossing. |
| 5 | No face captured | Face capture failed — please go to a counter. |
| 6 | Liveness not confirmed while required | Biometric verification failed. |
| 7 | Chip not read, failed passive authentication, or chip differing from the MRZ | Your passport chip could not be verified. |
| 8 | Presentation attack or reused document | Additional check required — an officer will assist you. |
| 9 | Failed liveness detection | Biometric verification failed. |
| 10 | Face score below the threshold | Your face does not sufficiently match the document photo. |
| 11 | Expired document | Expired document. |
| 12 | e-Visa required and missing (if the check is enabled) | Travel authorization not found. |
| 13 | Critical match, watchlist match, SLTD document, or a recommendation other than "clear" | Additional check required — an officer will assist you. |
| 14 | Score above the maximum accepted score | Additional check required — an officer will assist you. |
| — | None of the above | Have a good trip! The gates are opening. |

Every transaction with a readable MRZ is recorded as a crossing (channel **eGate / ABC**, officer "eGate (automatic)"): decision **Cleared** when the gate opens, **Secondary inspection** when the traveler is referred, with the reason prefixed by "eGate:". The direction (entry or exit) is derived from the device zone: **Departures** and **Boarding** for exits, the other zones for entries. As at the counter, an alert is created in the Threat Monitor when the score reaches 35. Unreadable-MRZ rejections do not create a crossing but are written to the audit log.

## Live feed

The **Live feed** panel lists the last 12 automated transactions in the last 24 hours: time, traveler (surname and first initial), device and result (**Gate opening** in green or **Counter** in orange). Click a row to open the crossing page.

## Referral reasons (24 h)

The **Referral reasons (24 h)** panel ranks the six most frequent reasons for not opening over the last 24 hours (the messages in the table above). It helps you spot a recurring problem: a face threshold that is too strict, a poorly adjusted camera, a wave of non-eligible travelers or passports with unreadable chips.
