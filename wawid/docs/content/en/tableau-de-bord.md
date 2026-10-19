# Dashboard

The **Dashboard** consolidates entry and exit flows, crossing channels (counter or eGate) and fraud indicators across all border posts. All roles can open it from the **Dashboard** tile in the **Border control** space.

Figures are computed from recorded crossings (counter checks and eGate / ABC transactions). The page refreshes automatically every 30 seconds and keeps the selected filters.

## Filters

The filter bar sits below the page title.

| Filter | Values | Effect |
| --- | --- | --- |
| **Period** | **24 hours**, **7 days** (default), **14 days** | 24 hours: the last 24 full hours, split by hour. 7 or 14 days: the last N calendar days, today included, split by day. |
| **Border post** | **All border posts** or one post (AIBD, Port of Dakar, Rosso, Kidira, Karang, Ziguinchor…) | Limits every indicator, chart and table to that post. |
| **Channel** | **All**, **Counter**, **eGate / ABC** | Limits the figures to crossings through that channel. |

Filters are stored in the page address: bookmark it or share it with a colleague to get exactly the same view.

> Tip: in the **By border post** table, clicking a row applies the filter for that post.

## Key indicators

| Indicator | How it is computed | Subtitle |
| --- | --- | --- |
| **Crossings** | Number of crossings in the filtered period. | Change in % compared with the previous period of the same length (▲ up, ▼ down, "stable"). |
| **Entries** | Crossings in the Entry direction. | Share of entries in total flow. |
| **Exits** | Crossings in the Exit direction. | Net balance (entries minus exits). |
| **eGate / ABC share** | eGate or ABC kiosk crossings ÷ total crossings. | Number of automated crossings. |
| **Suspected fraud** | Crossings whose assessment found at least one fraud factor (lost or stolen document, invalid MRZ, invalid chip or chip differing from the MRZ, failed liveness detection, insufficient face match, presentation attack, reused document…). | Change compared with the previous period. Shown in red when non-zero. |
| **Entry / exit refusal** | Crossings with the decision **Refused**. | Number of alerts not yet closed (for the filtered post, if any). |
| **Average duration** | Average crossing duration, in seconds. | Average duration at the counter and at the eGate. |

The duration of a counter crossing runs from the start of the check wizard to the confirmation of the decision; the duration of an eGate crossing runs from passport presentation to the result.

## Charts

### Entries and exits per day (or per hour)

Bar chart of entries and exits, per hour over 24 hours or per day over 7 and 14 days. Hover a bar to see exact values. The **Chart** / **Table** switch shows the same data as a table (with an extra **Fraud** column); the choice is kept for the session.

### Decisions and crossing channel

Two share bars:

- **Decisions**: share of crossings **Cleared**, **Secondary inspection** and **Refused**;
- **Crossing channel**: share of **Counter** and **eGate / ABC**.

### Suspected fraud per day (or per hour)

Line chart of the number of suspicious crossings, with the period total in the header.

### Fraud and reports by type

Horizontal bars ranking reports by type, most frequent first: lost / stolen document (SLTD), document reused under another identity, invalid chip (passive authentication), chip differing from the printed MRZ, presentation attack or deepfake, wanted person or person of interest, face mismatch, failed liveness detection, forged MRZ, expired document, no travel authorization. One crossing can count under several types.

### By border post

Table of the border posts with at least one crossing in the period: **Entries**, **Exits**, **eGate**, **Fraud**, **Refusals** and **Avg. duration**. Each post name is followed by its type (air, sea, land) and region. Click a row to filter the dashboard on that post.

### Top nationalities

The eight most frequent nationalities among crossings in the period.

### Latest suspected fraud

The eight most recent suspicious crossings: date and time, traveler, nationality and document, main risk factors, border post and channel, risk score and decision. Click a row to open the crossing page, or click **See all** to open the **Crossings** list filtered on suspected fraud for the period.

## Export and print

- **Export** downloads a CSV file (`wawid-tableau-de-bord-<period>.csv`) containing the **By border post** table for the current filters: border post, entries, exits, eGate/ABC, suspected fraud, refusals and average duration in seconds. The separator is a semicolon, so the file opens directly in Excel with French regional settings; with other settings, use Excel's import feature and choose the semicolon separator.
- **Print** opens the browser print dialog. The filter bar and the top bar are hidden when printing; choose "Save as PDF" to produce a document you can send.

## Frequently asked questions

**Why does the total differ from the home page tile?** The **Dashboard** tile counts crossings over the last rolling 24 hours, across all posts and channels, whereas the dashboard applies the selected period and filters.

**A change shows "—".** There were no crossings in the previous period, so the comparison cannot be computed.
