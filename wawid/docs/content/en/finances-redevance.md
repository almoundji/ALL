# Security fee

The **Security fee** module (**Finance** space of the DPAF space) tracks the fee owed by airlines for each passenger: fee base, exemptions, invoices, payments declared by airlines and their validation, collections, late payment penalties, reconciliation with WawID passenger counts, revenue split, and transfers of the State's share to the Public Treasury.

It is intended for **Treasury officers** and administrators. Airlines view their invoices and declare their payments on the *Airline platform* (`/compagnies/`).

| Action | Permission | Roles |
|---|---|---|
| View the module, export, compute the month's fee base, record a collection | `finance` | Treasury officer (fee), Administrator |
| Validate or reject a payment declared by an airline, record a transfer to the State | `finance` | Treasury officer (fee), Administrator |
| Change the security fee **Settings** (rate, operator share, penalty, IATA rate, collection flow) | `system` | Administrator |

> **Fictitious volumes.** In the demo, airlines, passengers, amounts, exchange rates and collections are generated for illustration. They reflect neither actual traffic nor actual revenue.

## Legal basis

| Text | Date | Content |
|---|---|---|
| Decree No. 2011-652 | 26 May 2011 | Creates the security fee: **12 USD per passenger embarking or disembarking** on an international commercial flight, included in the ticket and settled by the airline; **5 %** penalty for late payment. |
| Interministerial order (Interior / Transport) on collection procedures | 3 February 2012 | Exemptions; invoicing in **FCFA at the IATA rate of the month**; passenger statistics collected from the 1st to the 9th of the following month, invoices issued on the 10th, due at the end of the following month. |
| Decree No. 2012-519 | 18 May 2012 | Collection is assigned to the **Directorate General of Public Accounting and Treasury (DGCPT)**; airlines pay the **Receiver General of the Treasury**; audit and litigation by the DGCPT. |
| Decision of the Minister of Economy and Finance | 4 December 2012 | Monthly payment to the system operator of **75 % of the revenue** collected by the Treasury (current share). |

## Collection flow

WawID supports two flows, chosen by the administrator in **Revenue split → Settings → Collection flow** (`circuit` setting):

| Flow | Value | Who collects | Operator share | State share |
|---|---|---|---|---|
| **Airlines → WawID → Public Treasury (proposed)** | `OPERATEUR` (default) | WawID, on its **collection account** | Retained by WawID | Transferred monthly by WawID to the **Receiver General of the Treasury (DGCPT)** |
| **Airlines → Public Treasury (DGCPT, Decree 2012-519)** | `TRESOR` | The Receiver General of the Treasury | Paid monthly by the Treasury to the operator | Kept by the Treasury |

In the `OPERATEUR` flow:

1. The airline collects the fee in the ticket price and transfers the invoice amount to the WawID collection account.
2. It **declares** the payment on the airline platform (amount, transfer reference, method): the payment is **Awaiting validation**.
3. The finance department (`finance` permission) **validates** or **rejects** it in the **Payments to validate** tab, after reconciliation with the collection account statement. Only validated payments settle invoices.
4. Every month, WawID computes the **State's share** of the amounts collected and validated (collected × (1 − operator share)) and transfers it to the Receiver General of the Treasury; the transfer is recorded in the **Transfers to the State** tab. WawID keeps the operator share.

The beneficiary shown to airlines follows the flow: "WawID — security fee collection account" (`OPERATEUR`) or "Receiver General of the Treasury (DGCPT)" (`TRESOR`). In both flows, airlines declare their payments on their platform and these declarations are validated in WawID.

> **Legal warning.** The "airlines → WawID → Public Treasury" flow **differs from the current legal framework**: Decree No. 2012-519 assigns collection to the DGCPT (airlines pay the Receiver General of the Treasury), and the decision of the Minister of Economy and Finance of 4 December 2012 has the Treasury pay the operator's share. Implementing it requires **a new regulatory text** and **a collection-mandate agreement** between the State and WawID. Until these texts are adopted, the `TRESOR` flow remains the legal flow. The module shows this warning at the top of the page while the `OPERATEUR` flow is active.

## Fee base, exemptions and calendar

**Fee base**: every passenger embarking or disembarking on an international commercial flight, at 12 USD.

**Exemptions** (February 2012 order), detailed on each invoice:

- Crew;
- ID tickets (staff);
- Children 0-2 years;
- Transit ≤ 24 h;
- Diverted flights.

**Regulatory calendar** (shown on the **Summary** tab):

| Step | Deadline |
|---|---|
| Embarking and disembarking passengers, excluding exemptions | Month M |
| Statistics collection: airline declarations and WawID count | 1st to 9th of month M+1 |
| Invoices issued in FCFA at the IATA rate of month M | 10th of month M+1 |
| Due date. `OPERATEUR` flow: airlines' transfer to the WawID collection account, declared on the airline platform and then validated by WawID. `TRESOR` flow: payment to the Receiver General of the Treasury | End of month M+1 |
| `OPERATEUR` flow: WawID transfers the State's share to the Receiver General of the Treasury | 15th of month M+2 |
| Late payment penalty | 5 % per month overdue after the due date |

## The tabs

The **Export** button (top right) downloads all invoices as CSV (`wawid-redevance.csv`): passengers counted, exempt, taxable, declared, rate, amounts, paid, balance due, penalty and status.

### Summary

- Six-month indicators: **Invoiced (6 months)**, **Collected by WawID** (`OPERATEUR` flow) or **Collected by the Treasury** (`TRESOR` flow), with the collection rate, **Balance due** (and number of overdue invoices), **Late payment penalties**, **Undeclared passengers** (and estimated missing fee base).
- **Invoiced and collected per month** chart, in millions of FCFA.
- **Regulatory calendar**.
- **By airline (6 months)** table: invoiced, collected, balance due, penalties and undeclared passengers.

### Airline invoices

One invoice is issued per airline and per month (reference `RS-YYYYMM-XX`, where `XX` is the IATA code). Filter by **Month** and **Status**.

| Column | Content |
|---|---|
| **Invoice** | Reference and issue date |
| **Airline** | Airline name |
| **Taxable passengers** | Passengers declared by the airline, the basis of the invoice |
| **Amount** | Amount in FCFA; "USD × IATA rate" detail |
| **Due date** | End of the month following the period |
| **Balance due** | Balance **including penalties** |
| **Status** | **PAYÉE** (paid), **PARTIELLE** (partial), **ÉMISE** (issued) or **EN RETARD** (overdue, with the number of months); the amount of declared payments **awaiting validation** is shown below |

**Invoice amount** = declared passengers × 12 USD × IATA rate of the month (FCFA per 1 USD), rounded to the franc.

**Penalty** = balance due × 5 % × number of months overdue. Each started 30-day period after the due date counts as one month. The penalty is not compounded.

Only **validated** payments (and collections entered in the DPAF space) count towards the amount collected and the balance due; a payment declared by an airline and not yet validated changes neither the status nor the penalty.

#### Invoice details

Click the invoice. The dialog details the period, passengers counted by WawID, each exemption, taxable passengers, passengers declared (with any gap), the rate, the amount, the dates, the amount collected, the balance due, penalties and the list of **Payments**. Each payment shows its date, reference, origin (for example "Compagnie (Virement)" for an airline bank transfer, or "Saisie back-office" for an entry made in the DPAF space) and status: **Awaiting validation**, **Validated** or **Rejected** (with the reason and the name of the officer who handled it). A payment **Awaiting validation** can be validated or rejected directly from this dialog (**Validate** and **Reject** buttons).

#### Record a collection

For a payment that the airline did not declare on its platform:

1. Click the invoice.
2. Under **Record a payment (collection account statement)** (`OPERATEUR` flow) or **Record a collection (Treasury receipt)** (`TRESOR` flow), check the **Amount (FCFA)**, prefilled with the balance due plus penalties.
3. Enter the **Receipt reference** (statement or receipt reference; if left blank, an `RGT-…` reference is generated).
4. Click **Save**.

The collection is dated, recorded under your name, stored directly as **Validated** and written to the audit log (`REDEVANCE_ENCAISSEMENT`). A partial payment moves the invoice to partial; a zero balance moves it to paid.

#### Compute the current month's fee base

The **Current month fee base (WawID)** button computes a provisional fee base from the crossings WawID recorded (counters and eGates) during the current month: per airline code, number of passengers checked, of which children aged 0 to 2, and estimated amount in USD. Final invoices are still issued on the 10th of the following month.

### Payments to validate

The **Payments to validate** tab (also reached through the tile of the same name in the **Finance** space, which shows the number of declared payments) lists the payments declared by airlines on their platform and not yet handled: **Declared on**, **Airline**, **Invoice**, **Reference** (of the transfer), **Method**, **Amount**. The number of pending payments is shown on the tab.

1. Match each declaration against the bank statement of the collection account (amount, transfer reference, invoice reference in the description).
2. Click **Validate** if the transfer is found: the payment becomes **Validated** and settles the invoice up to its amount.
3. Otherwise, click **Reject** and enter the **Reason for rejection** (prefilled with "Non retrouvé sur le relevé du compte de collecte", i.e. not found on the collection account statement): the payment becomes **Rejected** and the airline sees the reason on its platform.

A payment already handled can no longer be validated or rejected. Each decision is written to the audit log (`REDEVANCE_PAIEMENT_CONFIRME` or `REDEVANCE_PAIEMENT_REJETE`); so is the airline's declaration (`REDEVANCE_PAIEMENT_DECLARE`).

### Transfers to the State

The **Transfers to the State** tab (tile of the same name in the **Finance** space) tracks the transfer to the Public Treasury of the State's share of the amounts collected by WawID.

- Indicators: **State share due** (with its percentage, 1 − operator share), computed on validated payments; **Transferred to the Treasury** (and number of transfers); **Still to transfer**.
- **By billing month** table: **Collected (validated)**, **State share** (collected × (1 − operator share)), **Transferred**, **Still to transfer**.
- **Transfers to the Receiver General of the Treasury** table: date, month, reference, beneficiary, author and amount of each transfer.

To record a transfer:

1. On the month's row, click **Record the transfer**.
2. Check the **Amount (FCFA)**, prefilled with the amount still to transfer for the month.
3. Enter the **Transfer reference** (required).
4. Click **Save**.

The beneficiary is the **Receiver General of the Treasury (DGCPT)**. The transfer is written to the audit log (`REDEVANCE_REVERSEMENT_ETAT`). The button only appears in the `OPERATEUR` flow; in the `TRESOR` flow, the tab states that airlines pay the Treasury directly and that WawID owes no transfer.

### Reconciliation

Under the current arrangement, the fee base relies on **airline declarations**. WawID independently counts every **checked** passenger (biometrics at counters and eGates, API/PNR manifests). The **Reconciliation** tab lists invoices where the two figures differ:

| Column | Content |
|---|---|
| **Month**, **Airline** | Period and airline |
| **Counted by WawID (taxable)** | Passengers counted minus exemptions |
| **Declared** | Passengers declared by the airline |
| **Gap** | Difference and percentage (red above 3 %) |
| **Uninvoiced amount** | Gap × 12 USD × IATA rate |

A positive gap reveals undeclared passengers. The total appears in the tab banner. Use these figures for DGCPT audit and litigation.

### Revenue split

The **Revenue split** tab breaks down, month by month, the amounts **collected** (not invoiced):

- **Operator share**: currently 75 % (decision of 4 December 2012), **retained by WawID** in the `OPERATEUR` flow, **paid monthly by the Treasury** in the `TRESOR` flow;
- **State share**: the remaining 25 %, for the Treasury.

An administrator can open **Settings** to change:

1. **Rate (USD per passenger)**;
2. **Operator share (%)**;
3. **Monthly penalty (%)**;
4. **IATA rate of the month (FCFA / USD)**, applied to the current month;
5. **Collection flow**: **Airlines → WawID → Public Treasury (proposed)** or **Airlines → Public Treasury (DGCPT, Decree 2012-519)** (see "Collection flow" and its legal warning).

Click **Save**. The change is logged (`REDEVANCE_PARAMETRES`). The split key is configurable to reflect a new contract.

### Model simulator

The **Model simulator** compares, over several years, the State's share under the current contract and under a WawID model. Enter:

- **Taxable passengers per year** (prefilled from the 6 demo months × 2), **Rate (USD)**, **FCFA per 1 USD**, **Annual traffic growth (%)**, **Duration (years)**;
- **Current operator share (%)**;
- **Fee base gain from WawID counting (%)**: passengers not declared today;
- **WawID model**: **Revenue share** or **Annual flat fee (service contract)**, and the matching value (**WawID share (%) or flat fee (M FCFA/yr)**).

**Outcome for the State** shows gross revenue over the period, the State share under the current contract, the State share under the WawID model and the gain for the State. Results update as you type.

> The simulation relies on assumptions and on fictitious demo volumes. Enter actual traffic (AIBD / ANACIM statistics) for a costed study.

## Treasury role

The **Treasury officer (fee)** holds the `read` and `finance` permissions:

- views the summary, invoices, reconciliation, revenue split and transfers;
- validates or rejects the payments declared by airlines, after reconciliation with the collection account statement (`OPERATEUR` flow);
- records the transfers of the State's share to the Receiver General of the Treasury (`OPERATEUR` flow);
- records collections not declared by airlines, from the collection account statement or the receipts of the Receiver General of the Treasury;
- exports data for public accounting;
- cannot change the security fee settings (including the collection flow), and cannot act on border checks, alerts or e-Visas.

Every action is recorded in the **Audit log**.
