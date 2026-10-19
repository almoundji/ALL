# Getting started with WawID

WawID is the identity and border management platform: traveler checks at counters and eGates, intelligence (Threat Monitor, watchlists, targeting rules), airline passenger pre-screening (APIS / PNR), travel authorizations (e-Visa), the security fee paid by travelers (WawPass), the airline security fee and administration. This page introduces the interfaces, signing in, the roles and the elements shared by every back office screen.

## WawID interfaces

| Interface | Address | Users | Purpose |
| --- | --- | --- | --- |
| Back office | `/admin/` | Border officers, intelligence analysts, supervisors, administrators, Treasury officers | Counter check, eGate supervision, intelligence, APIS, e-Visa, finance, administration |
| Traveler portal | `/` | Travelers (public) | e-Visa application and tracking, WawPass payment, eGate pre-enrollment |
| eGate kiosk | `/gate/` | Screen of automated gates and ABC kiosks | Self-service traveler journey (passport, chip, face, gate opening or referral) |
| iPhone app | iOS app | Travelers | e-Visa application with NFC reading of the passport chip |

The back office runs in any recent browser (Chrome, Edge, Safari, Firefox). The **Traveler portal** and **Open eGate kiosk** links in the user menu open the other two interfaces in a new tab.

## Signing in

1. Open `/admin/` in your browser.
2. Enter the **Username** and **Password** provided by your administrator.
3. Click **Sign in**.

If the credentials are wrong, the message "Incorrect username or password" is displayed. Every attempt, successful or not, is written to the audit log, and failed attempts are deliberately slowed down to discourage repeated guessing.

To sign out, click your avatar (your initials, top right), then **Sign out**.

> **Local demo**: the accounts `admin` (password `admin`) and `agent`, `analyste`, `superviseur`, `tresor` (password `demo`) are created automatically. In production, passwords are set by the administrator.

### Session duration

A session lasts **12 hours** (one shift). After that, or if your account is deactivated, the sign-in screen comes back at your next action ("Session expired — sign in again"). Passwords are never stored in clear text (scrypt hashing), and the session is kept in a secure cookie that scripts cannot read.

## Roles

Each user has a single role, which determines the visible tiles and the allowed actions (least privilege). A page you are not allowed to open shows "Access not authorized for the role …".

| Permission | Border officer | Intelligence analyst | Supervisor | Administrator | Treasury officer |
| --- | --- | --- | --- | --- | --- |
| Read access (dashboards, crossings, lists…) | Yes | Yes | Yes | Yes | Yes |
| Counter check | Yes | — | Yes | Yes | — |
| Alert handling | Yes | Yes | Yes | Yes | — |
| Cases | Yes | Yes | Yes | Yes | — |
| Watchlists (add, edit) | — | Yes | Yes | Yes | — |
| Targeting rules | — | Yes | Yes | Yes | — |
| APIS (receive messages, manifests) | — | Yes | Yes | Yes | — |
| e-Visa decisions | — | Yes | Yes | Yes | — |
| eGate control | — | — | Yes | Yes | — |
| Security fee (finance) | — | — | — | Yes | Yes |
| Users | — | — | — | Yes | — |
| System settings | — | — | — | Yes | — |

In practice:

- **Border officer**: performs counter checks, views crossings and eGates, takes charge of alerts and opens secondary inspection cases.
- **Intelligence analyst**: handles alerts and cases, maintains watchlists and targeting rules, processes e-Visa applications and works with APIS / PNR data. Analysts do not perform counter checks.
- **Supervisor**: has the rights of both the officer and the analyst, and controls eGates and ABC kiosks remotely (open, close, maintenance, settings).
- **Administrator**: all rights, including user management, system settings and the finance module.
- **Treasury officer**: read access and the **Security fee** module (invoices, collections, reconciliation, revenue split). No control actions.

## The home page

After signing in, the home page greets you with **Hello** and your first name, followed by today's date.

### Spaces

Applications are grouped into spaces, shown as tabs: **My home**, **Border control**, **Intelligence**, **APIS & PNR**, **e-Visa & travelers**, **Finance**, **Administration** and **Project**. **My home** gathers every tile you are allowed to use; the other tabs show a single space. A space with no tile allowed for your role is not shown. The selected tab is kept for the browser session.

### Tiles and live indicators

Each tile opens an application and shows its title, a short description and, usually, a figure: for example **Dashboard** (crossings in the last 24 h), **eGates & ABC** (open gates out of the total), **Threat Monitor** (new alerts), **e-Visa** (applications to process) or **Airline invoices** (overdue invoices). A non-zero figure is shown in red (critical) or orange (warning) when the tile is set up that way. Data refreshes automatically every 30 seconds.

Tiles with a **dashed border** are create tiles that start an action directly: **New check**, **Add an entry** (watchlist), **Receive a message** (APIS / PNR), **Create a user**. The **Traveler portal** and **eGate kiosk** tiles open those interfaces in a new tab.

### Personalizing the home page

1. Click **Personalize**.
2. On each tile, click the check mark to hide it (or the eye to show it again).
3. Click **Done**.

Hidden tiles only disappear from **My home**: they remain available in their space tab. The choice is saved in the browser of your workstation.

## The top bar

| Element | Purpose |
| --- | --- |
| Back button (arrow) | Returns to the previous page in the tool, or to the home page if the page was opened directly. Shortcut: Alt + ←. Hidden on the home page. |
| WawID logo | Back to the home page. |
| Global search | Search for a traveler, a document or an application. |
| Border post | Your assigned border post, preceded by a green dot (online) or a gray dot (offline). |
| Theme (moon) | Switches between light and dark themes. |
| Bell | Notifications of new alerts. |
| Avatar | Name, role and border post; links to the eGate kiosk and the traveler portal; sign out. |

### Global search

Press **/** or **Ctrl + K** (**Cmd + K** on a Mac) to jump to the search field, type your text and press Enter:

- if the text matches the title of an application you can use (for example "eGates" or "cases"), that application opens;
- otherwise, **Traveler search** opens with your text (surname, given names or document number).

### Notifications

The bell shows the number of alerts with the status **New** (99+ above 99). Click it to see the six most recent; click an alert to open it in the Threat Monitor, or click **See all**. When new alerts arrive while you work, a message appears at the bottom of the screen.

### Dark mode

By default, WawID follows the light or dark setting of your operating system. The moon button forces one or the other; the choice is saved in the browser.

### Language (FR / EN)

The **FR | EN** switch changes the interface language between French and English. The page reloads in the selected language, which is saved in the browser. Without an explicit choice, WawID uses the browser language (French if it starts with "fr", English otherwise).

### Contextual help

The **?** button opens the page of this documentation that matches the current screen (for example the "Counter check" page from the check wizard). On the home page, it opens this page.

## Traceability and audit log

All sensitive actions are recorded in the **Audit log**: sign-ins, failed sign-ins and sign-outs, crossing decisions, commands sent to eGates, WawPass validations, case creation, watchlist and rule changes, e-Visa decisions, user management, and more. Each entry records the author, the action, the object and the time. Entries are chained with SHA-256 hashes: any later change or deletion breaks the chain and becomes detectable. The sign-in page reminds users of this: "All actions are logged".
