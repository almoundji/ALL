# Security fee

The **Security fee** module (**Finance** space) tracks the fee owed by airlines for each passenger: fee base, exemptions, invoices, collections by the Treasury, late payment penalties, reconciliation with WawID passenger counts, and revenue split.

It is intended for **Treasury officers** and administrators.

| Action | Permission | Roles |
|---|---|---|
| View the module, export, compute the month's fee base, record a collection | `finance` | Treasury officer (fee), Administrator |
| Change the security fee **Settings** (rate, operator share, penalty, IATA rate) | `system` | Administrator |

> **Fictitious volumes.** In the demo, airlines, passengers, amounts, exchange rates and collections are generated for illustration. They reflect neither actual traffic nor actual revenue.

## Legal basis

| Text | Date | Content |
|---|---|---|
| Decree No. 2011-652 | 26 May 2011 | Creates the security fee: **12 USD per passenger embarking or disembarking** on an international commercial flight, included in the ticket and settled by the airline; **5 %** penalty for late payment. |
| Interministerial order (Interior / Transport) on collection procedures | 3 February 2012 | Exemptions; invoicing in **FCFA at the IATA rate of the month**; passenger statistics collected from the 1st to the 9th of the following month, invoices issued on the 10th, due at the end of the following month. |
| Decree No. 2012-519 | 18 May 2012 | Collection is assigned to the **Directorate General of Public Accounting and Treasury (DGCPT)**; airlines pay the **Receiver General of the Treasury**; audit and litigation by the DGCPT. |
| Decision of the Minister of Economy and Finance | 4 December 2012 | Monthly payment to the system operator of **75 % of the revenue** collected by the Treasury (current share). |

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
| Due date and payment to the Receiver General of the Treasury | End of month M+1 |
| Late payment penalty | 5 % per month overdue after the due date |

## The tabs

The **Export** button (top right) downloads all invoices as CSV (`wawid-redevance.csv`): passengers counted, exempt, taxable, declared, rate, amounts, paid, balance due, penalty and status.

### Summary

- Six-month indicators: **Invoiced (6 months)**, **Collected by the Treasury** (with the collection rate), **Balance due** (and number of overdue invoices), **Late payment penalties**, **Undeclared passengers** (and estimated missing fee base).
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
| **Status** | **PAYÉE** (paid), **PARTIELLE** (partial), **ÉMISE** (issued) or **EN RETARD** (overdue, with the number of months) |

**Invoice amount** = declared passengers × 12 USD × IATA rate of the month (FCFA per 1 USD), rounded to the franc.

**Penalty** = balance due × 5 % × number of months overdue. Each started 30-day period after the due date counts as one month. The penalty is not compounded.

#### Record a Treasury collection

1. Click the invoice.
2. The dialog details the period, passengers counted by WawID, each exemption, taxable passengers, passengers declared (with any gap), the rate, the amount, the dates, the amount collected, the balance due, penalties and collections already recorded.
3. Under **Record a collection (Treasury receipt)**, check the **Amount (FCFA)**, prefilled with the balance due plus penalties.
4. Enter the **Receipt reference** issued by the Treasury (if left blank, an `RGT-…` reference is generated).
5. Click **Save**.

The collection is dated, recorded under your name and written to the audit log (`REDEVANCE_ENCAISSEMENT`). A partial payment moves the invoice to partial; a zero balance moves it to paid.

#### Compute the current month's fee base

The **Current month fee base (WawID)** button computes a provisional fee base from the crossings WawID recorded (counters and eGates) during the current month: per airline code, number of passengers checked, of which children aged 0 to 2, and estimated amount in USD. Final invoices are still issued on the 10th of the following month.

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

- **Operator share**: currently 75 % (decision of 4 December 2012), paid monthly;
- **State share**: the remaining 25 %, for the Treasury.

An administrator can open **Settings** to change:

1. **Rate (USD per passenger)**;
2. **Operator share (%)**;
3. **Monthly penalty (%)**;
4. **IATA rate of the month (FCFA / USD)**, applied to the current month.

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

- views the summary, invoices, reconciliation and revenue split;
- records collections from the receipts of the Receiver General of the Treasury;
- exports data for public accounting;
- cannot change the security fee settings, and cannot act on border checks, alerts or e-Visas.

Every action is recorded in the **Audit log**.
