# Registry Ledger implementation

This slice applies the Registry Ledger layout with the plot priority explored in Signal Instrument. It changes the home, Package and Compare reading order and presentation. The existing logo, navigation destinations, SSR boundaries, downloads API, storage and observation logic remain in place. The design can be reviewed independently of the research branch.

[390 px light before and after](before-after-390-light.jpg) · [1440 px dark before and after](before-after-1440-dark.jpg)

## Iterations

1. Moved the Package and Compare plots above insights. Replaced separate Package KPI cards with a compact two-value summary. The 390 px Package plot went from 1844 to 571 px. Five-package Compare went from 1882 to 518 px. Coverage and cached-data warnings stayed above the plots.
2. Converted Compare's package totals into a named table with the shared observation denominator stated once. The Compare page now keeps its existing tray after the main content at every width. At 1440 px this removed the measured hydration displacement and lowered the five-package plot from 610 to 467 px. Controls keep their keyboard order when the viewport crosses the former portal breakpoint. Legend swatches represent the actual line pattern and the full package ID can wrap.
3. Replaced home marketing cards with search, package links and an observation rule ledger. The documentation and Compare entry remain visible. The light series palette now has at least 4.7:1 contrast against the light plot surface. Observation captions let assistive technology and tests distinguish the daily tables from the shared totals table. At 200% base text, the header, chart toolbar, event actions and the homepage rules table wrap, and range controls scroll within their own group.

## Geometry

Production-mode Next.js builds used the same deterministic npm fixture, with a real warm-to-stale transition in the fixture server. The working layout was captured across 12 routes, eight viewport sizes and both themes. The plots retained their existing chart inputs and axis calculations.

| Route | 320 px before / after | 390 px before / after | 1440 px before / after |
| --- | ---: | ---: | ---: |
| Package 365-day plot top | 1880 / 588 | 1844 / 570 | 1090 / 503 |
| Compare 365-day plot top | 1444 / 485 | 1392 / 465 | 993 / 467 |
| Compare five-package plot top | 1902 / 517 | 1882 / 517 | 1127 / 467 |

At 390×844 the entire 365-day Package and Compare plots fit in the first viewport in the representative fixture. At 320×720 the same viewport shows 55% of the Package plot and 92% of the two-package Compare plot. No document overflow was detected in the screenshot matrix. The header measured 61 px versus 73 px on main. The homepage search is now in the first 320 px viewport. These are lab geometry measurements.

## Boundaries

The table denominator, chart rows, gaps, UTC ranges, derived insight math, exporter behavior and API contracts are unchanged. The new named totals and daily table support navigation through the browser accessibility tree. Real operating-system screen reader output and field metrics require separate evidence. The proposed visual identity and tray presentation are for owner review.


## Focused iteration — Compare scale and readable axes (16 Nov 2026)

This additional draft-only revision follows independent critiques by Claude, DeepSeek and Gemini. These reviews did not independently open all three concept galleries or live PR previews; their overlap is triage guidance, not a visual research sample.

- Both Package and Compare chart Y axes now round upward to friendly intervals with compact download labels. Original integer downloads remain unchanged in tooltips, tables, derived metrics, JSON, CSV and Excel CSV.
- Compare defaults to **Absolute** daily downloads. A keyboard-operable button provides opt-in **Indexed (base 100)** trends to compare growth when package volumes differ. The baseline is the first UTC day when **all selected packages have a shared, strictly positive observation**. Each is 100 on that same date. If no such day exists, indexed mode is disabled rather than inventing an observation. Verified zero after the baseline is zero; missing/unverified remain gaps. The indexed Y axis is explicitly zoomed around the visible relative variation and must never be interpreted as absolute traffic.
- The selected chart mode affects only rendered SVG/PNG chart representation and its accessibility description. Compare absolute shared-day totals, source status, semantic table, hover raw counts, keyboard observation control, data downloads, and API v1 contracts remain unchanged.
- Unit regression tests cover nice ticks, shared baseline, no-positive-baseline, verified zero, and null gaps. A focused Chromium smoke test exercises toggling back to Absolute and checks unchanged totals, with an all-severity WCAG 2.2 AA axe scan (not a substitute for native screen-reader or zoom testing).

### Release gates still pending

This is a **Draft, not approved for merge or production**. Require exact-head CI, exact-SHA Vercel Preview and hosted interactions, light/dark 320/390/768/1440 screenshots, pointer/keyboard/tooltip touch checks in both modes, native 200%/400% browser zoom, focus visibility and touch target inspection, manual screen-reader evaluation where feasible, and before/after cold-load performance. The new relative axis must be labeled clearly in any screenshot. A11y and real-user performance must not be claimed from CI alone. No Redis, secrets, production environment, public API, payment or infrastructure changes are in scope.
