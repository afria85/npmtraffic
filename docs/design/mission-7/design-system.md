# Registry Observatory design evaluation

Registry Observatory is a working product hypothesis. The proposed interface keeps the npmtraffic name, existing logo and navigation. The executable prototypes compare different structures and use labeled illustrative values.

## Concepts

- **Registry Ledger** uses a ruled dataset, monospace package identifiers and totals, and a plain surface. Its desktop identity comes from an editorial data table and plot divided by a fine rule. On mobile, use a compact summary and move explanatory notes after the plot.
- **Signal Instrument** gives the graph the largest visual area, places controls in a compact horizontal band and uses a dark plotting surface in both themes. Its mobile chart discovery is the best starting point. The extra nested surfaces and cross-theme plot treatment make the system heavier.
- **Calm Research Notebook** uses reading order, an observation note, and a daily ledger beside or immediately after the chart. Headings use the system serif. It accommodates explanation well, but its soft hierarchy and extra prose make repeated navigation slower in the other two prototypes.

[390 px light gallery](concepts-390-light.jpg) · [1440 px dark gallery](concepts-1440-dark.jpg)

| Weighted criterion | Maximum | Ledger | Instrument | Notebook |
| --- | ---: | ---: | ---: | ---: |
| Hierarchy and task clarity | 20 | 17 | 19 | 15 |
| Developer-product identity | 20 | 19 | 16 | 17 |
| Graph and numeric readability | 20 | 17 | 19 | 16 |
| Accessibility and mobile ergonomics | 15 | 13 | 11 | 13 |
| Integrity and provenance clarity | 10 | 10 | 8 | 10 |
| Performance and feasibility | 10 | 9 | 8 | 9 |
| Visual originality | 5 | 4 | 3 | 4 |
| **Total** | **100** | **89** | **84** | **84** |

The Ledger wins on provenance and density. Its exact comparison of headings, numeric weights and package names transfers well to the existing HTML. Instrument supplies the chart sequence, but introduces a dark island on light and uses low-contrast annotation in the prototype. Notebook gives explanatory prose the largest share of attention and pushes records down on narrow displays. Adopt Ledger's structure, borrow Instrument's plot priority and reserve Notebook's longer prose for below the plot.

## Adversarial review

The proposed design must earn distinctiveness through useful content and the relationships between it. A package name, real denominator, plot and source do that better than a generic badge or mock metric. A walled-off instrument skin could look like a dashboard template. A decorative chart on home could imply false data. A note should sit before the graph only if it qualifies the observations. Scope names must wrap without losing identity. Changing layout must not change chart geometry calculations, gap handling, controls, client settings or exports. A noncolor series cue must reflect the actual dash setting. Keyboard order should follow the reading order.

## Visual specification

- Use the installed sans stack for prose and headings. Give package IDs and tabular numbers the system monospace stack. Sentence-case labels describe metrics. Avoid additional typefaces.
- Use a shared content rail with 16 px mobile padding and a 70 rem desktop limit. Use a two-column essential summary where it fits. Put the plot before interpretation and registry metadata. Below the plot, Compare uses three aligned columns with package, downloads and share.
- Use one muted green rule to mark the active data region and warm amber for partial or cached evidence. Preserve light/dark text and focus semantics. Draw the existing series palette and show actual line styles in legends. Keep plot panels squared and controls comfortably actionable.
- Formatting uses decimals and localized grouping with tabular alignment. Package names can wrap. Daily tables keep their existing semantics, horizontal scroll affordance, and access to all fields.
- Use explicit copy for unavailable, stale and partial data. Preserve the failure and retry controls. A route fallback should reserve plot space. Keep reduced-motion rules and existing focus restoration. Avoid new animation and JavaScript for layout.

## Reproduce

Run `npm run build` with Next telemetry options as appropriate for the local environment. Then run `node docs/design/mission-7/capture.mjs <output-folder>` from the repo root for fixture screenshots and measurements. The script launches a loopback-only production-mode build. It seeds a warm cache and then advances a deterministic fixture clock to produce a stale response. It uses the checked-in smoke fixture and clears both Redis bindings for its child process. It does not contact production. Use `M7_MODE=perf` for serial lab measurements only or `M7_MODE=quick` for a smaller screenshot pass. View prototypes by running `node docs/design/mission-7/capture-prototypes.mjs <output-folder>`. This generates all 72 prototype screenshots from a temporary loopback server.
