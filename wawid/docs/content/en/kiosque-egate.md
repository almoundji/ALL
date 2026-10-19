# eGate kiosk: setup and journey

The eGate kiosk is the screen of automated gates and ABC (Automated Border Control) kiosks. It guides travelers through a self-service journey: passport presentation, chip reading, face capture, verification, then gate opening or referral to a counter. It runs at the address `/gate/` in a browser, on the computer that drives the gate.

This page is for technicians who install a kiosk and for officers who assist travelers.

## Recommended hardware

A kiosk station consists of:

- a networked **computer** with a recent browser (Chrome or Edge recommended) running full screen (kiosk mode);
- a **screen** facing the traveler, ideally a touch screen;
- a **full-page document reader with an RFID/NFC reader**, for the passport MRZ and chip;
- the WawID **local NFC bridge** (`tools/nfc-bridge.mjs`), installed on the same computer: it links the browser to the reader and only listens on the machine itself (default address `http://127.0.0.1:8765`);
- a **front-facing camera** for face capture;
- depending on the equipment model, a fingerprint reader and the gate controller.

> When no NFC bridge can be reached, chip reading is simulated. In the demo version, face comparison is also simulated: the camera is used for display and the score comes from a simulator. In production, these results are supplied by the equipment's reader and certified biometric SDK.

## Setting up a kiosk

### 1. Activate the device

On first launch, the kiosk shows **Device activation**.

1. Enter the **Device key** provided by the WawID administrator.
2. Click **Activate**.

The key is saved in the kiosk browser. If the server refuses it, the message **Key refused by the server** appears and the key must be entered again.

Without a key, an authorized user can also sign in to the back office (`/admin/`) in the same browser: the kiosk then uses that session. This is convenient for testing; in operation, use the device key.

### 2. Choose the device

The **Choose device** screen lists the declared gates and kiosks, with their identifier, type and state (**Open** or **Closed**). Click the device that matches this station. The choice is saved in the browser.

You can also preselect the device in the address: `/gate/?gate=EG-AIBD-A01`. From the back office, the play button on a card in the **eGates & ABC** application opens the kiosk directly on that device.

The device name and zone appear at the top right of the screen. The gear button **Change device** lets you pick another one.

### Startup problems

| Message | What to do |
| --- | --- |
| **WawID server unreachable** | Check the kiosk's network connection, then reload the page. |
| **Key refused by the server** | Enter the key again; check with the administrator that it has not changed. |
| **Device not authorized.** (at the end of a journey) | The key is no longer valid: it is cleared and will be requested again. |

## The traveler journey

The bottom of the screen shows the four steps: **Passport**, **Face**, **Verification**, **Crossing**.

### 1. Passport

The welcome screen asks the traveler to **place their open passport on the reader**, photo page down. It reminds them that automated crossing is reserved for adult travelers holding a biometric passport. The welcome languages (Français, English, Wolof, العربية) are shown on screen.

### 2. Chip reading

The **Reading chip…** screen asks the traveler **not to remove their passport** while it is read.

### 3. Face

The **Look at the camera** screen asks the traveler to remove sunglasses and headwear and to stay still. A 3-second countdown precedes the capture.

### 4. Verification

The **Verification in progress…** screen is shown while the WawID server performs the biometric comparison and security checks.

### 5. Result

- **Crossing cleared**: "**Have a good trip**, *first name*!" then "The gates are opening. Proceed."
- **Referral**: "**Please go to a counter**", followed by the reason, then "An officer has been informed. Thank you for your understanding."

The result stays on screen for about 6 seconds, then the kiosk returns to the welcome screen for the next traveler.

## Messages travelers see

When referred, the traveler sees one of the following messages. They are deliberately neutral; the counter officer has the details in the back office.

| Message | Typical situation |
| --- | --- |
| Unreadable document — please go to a counter. | The MRZ could not be read. |
| The document could not be authenticated. | The data read from the document is inconsistent. |
| Minors are processed at the counter. | The traveler does not meet the age requirement for automated crossing. |
| Nationality not eligible for automated crossing. | The nationality is not accepted on this device. |
| Face capture failed — please go to a counter. | No usable face was captured. |
| Biometric verification failed. | Face verification did not succeed. |
| Your passport chip could not be verified. | The chip could not be read or validated. |
| Your face does not sufficiently match the document photo. | The face comparison is not conclusive. |
| Expired document. | The passport is no longer valid. |
| Travel authorization not found. | No valid travel authorization (e-Visa) was found. |
| Additional check required — an officer will assist you. | A check by an officer is needed. |
| Service temporarily unavailable. | The server could not process the request. |

> Advice for officers: a referral is not an accusation. Welcome the traveler at the counter and perform a normal check; most referrals have a simple cause (damaged chip, lighting, expired passport, minor traveler).

## Remote closing and reopening

The supervisor can close, reopen, put into maintenance or restart the device from the back office (**eGates & ABC** application).

- When idle, the kiosk re-reads its status every **15 seconds**. If it has been closed or put into maintenance, it shows **Gate closed**: "Please proceed to a border control counter." The **Refresh** button checks again.
- A traveler already in the middle of the journey is not interrupted. If the gate was closed in the meantime, they receive the message "This gate is closed. Please proceed to a counter." and the kiosk updates itself.
- When the gate is put back in service in automatic mode, the welcome screen reappears automatically within 15 seconds.

## Demo simulator

Below the welcome screen, the **Simulator (demo)** panel replaces the document reader and the camera for training and demonstrations. In production, this data comes from the gate peripherals.

1. Choose a scenario from the list.
2. The corresponding MRZ is shown; you can edit it.
3. Check **Use this device's camera** to show the camera during the Face step (optional).
4. Click **Present passport**.

| Scenario | Expected result |
| --- | --- |
| Regular traveler | Gate opening. |
| ECOWAS national | Gate opening (unless the device is restricted to another list). |
| Wanted person | Referral to a counter. |
| Stolen passport | Referral to a counter. |
| Minor traveler | Referral to a counter (minor). |
| No e-Visa | Referral to a counter (travel authorization). |
| Cloned chip | Referral to a counter (chip not verified). |
| Impersonation (mask) | Referral to a counter (biometric verification failed). |

Simulator transactions are processed by the server like real transactions: they appear in the live feed and in the back office crossings list. Preferably use the simulator on a demo environment.
