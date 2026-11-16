# Registry Observatory design contract

## Reading order

Home opens with package search and routes into Package and Compare. Its observation rules use a static explanatory table. The table makes a verified zero explicit and keeps missing and unverified observations distinct. It adds no registry request.

Package reads from identifier and range through coverage, totals and the plot. Events and releases can be reached directly after the plot. Compare reads from package selection and range through shared coverage and the above-chart series key. The daily table defaults to all packages and provides a one-package view that keeps the dates and shared eligibility. Exports continue to use the full comparison.

About, Data, Transparency, Status, Roadmap and Donate use the global type, foreground, surface, border and focus tokens. Status copy describes an instance-local view. Roadmap lists shipped local saves separately from proposed work. The primary dashboard treatment is reserved for analytical pages. A broader pass on static-page spacing and navigation remains open.

## Type, spacing and contrast

Use the existing system sans for headings, controls, explanatory copy and navigation. Use the existing monospace treatment for package identifiers and dates and use tabular numerals for comparable metrics. Keep labels secondary to the numbers and chart. Use the product heading once per page and sentence case for section labels.

Use existing spacing utilities, with tight gaps inside controls, more separation between sections and one bordered surface where a table or group requires it. Keep the chart and its labels on the normal surface. Use the existing ledger rule, ink and partial-observation tokens with matched light and dark values. State labels carry meaning independently of color. Keep existing visible focus treatments for buttons and use native controls where they fit the interaction.

## Charts and data

Show every visible series name before the Compare plot. Allow long identifiers to wrap. Preserve the saved user color, use the assigned dash pattern as a second cue and give each line legend entry a text name and pattern. Indexing changes the ordinate and baseline annotation. The table, exports and raw tooltip counts retain download units.

Show coverage in a one-line disclosure when space allows. Keep the requested UTC dates, most recent included UTC date, oldest included package snapshot for Compare, npm source and methodology in the expanded receipt. Report missing and unverified counts only when supplied by the existing data contract. Highlight stale observations with the existing retry behavior. Keep verified zero visible and spell out Missing, Unverified and Excluded in daily tables.

At narrow widths, let controls wrap and keep overflow inside the table when all packages are visible. The one-package view keeps the date column and leaves the chart and URL untouched. Show the focused package in the native selector and identify the number of packages in the comparison. At the desktop breakpoint the active 30-day range remains in the main range group.

## Alternatives within the Observatory direction

The compact ledger uses an inline coverage disclosure above the plot. The instrument treatment presents the same fields as an expanded audit block above the plot. Both keep the same typography, chart and data. The rubric scores are design assessments on a 1–5 scale. Use the rendered evidence before treating a width or performance observation as verified.

| Criterion | Weight | Compact ledger | Instrument |
| --- | ---: | --- | --- |
| Task clarity | 20% | 5. Coverage is readable before opening details. | 4. All fields appear before results. |
| Quantitative readability | 20% | 5. Leaves the first viewport available for totals and plot. | 4. The receipt uses vertical space above the plot. |
| Visual originality | 20% | 4. Coverage and mechanism read as part of the ledger. | 4. Explicit evidence fields make a visible audit block. |
| Provenance | 15% | 4. Dates and timestamp take one disclosure action. | 5. UTC dates and snapshot are immediately visible. |
| Mobile and accessibility | 15% | 4. Native disclosure keeps keyboard and touch operation compact. | 4. Plain reading order avoids a disclosure action and adds scrolling. |
| Performance and feasibility | 10% | 5. Native disclosure and the existing payload. | 5. Same DOM and payload with its initial state open. |
| Weighted assessment | 100% | **4.50/5** | **4.25/5** |

The working Draft uses the compact ledger. The open receipt remains available in the product and serves as the rendered study of the instrument treatment. Visual identity remains an owner decision.

## Operational boundaries

The receipt and focused table reuse existing response fields and do not add upstream requests. The comparison service can fetch observations for up to five packages. The public API limiter guards its route handlers, while server-rendered pages call the shared observation code directly. The stale read path and package-cache bounds still matter for upstream outages and fan-out. Any work on admission controls, cache strategy or production configuration needs its own review.
