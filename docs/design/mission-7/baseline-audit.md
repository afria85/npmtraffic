# Mission 7 baseline audit

Review date 2026-11-16. Main and production were both at `da9b1989d84869a8f79538afd32e01d1d2e4381e`. Vercel reported deployment `dpl_2G4bhTyMaW35djwds4n9UpYws154` READY. Production `/status` reported that shared limiting was disabled and limits were instance-local. The latest main CI passed. Open PRs were Dependabot #2–#8. [GitHub Actions](https://github.com/afria85/npmtraffic/actions/runs/43786075135) · [Production status](https://npmtraffic.com/status) · [Canonical project audit](https://app.notion.com/p/4172c266720a81b0a0d6efb4d09529a1)

## Architecture and constraints

Next.js 16.4.5 App Router serves the page hierarchy, metadata, summaries and tables through Server Components. Existing charts are dynamically imported from Client Component wrappers. Search, export menus, chart inspection, the Compare Tray and saved comparisons keep existing client boundaries. The theme is set before hydration. Chart observation controls expose native keyboard inspection and an associated date/value report. Compare export Option B already uses legacy JSON by default, explicit opt-in, response-controlled downloads and fixed CSV offsets. The presentation slice should leave these data paths and public contracts intact.

Observation validity belongs to the traffic and comparison layers. A verified zero is data. Missing and unverified dates remain out of totals and plots. Compare totals and shares refer to the intersection of available days. The selected range remains UTC inclusive and charts retain gaps and dates. GitHub links, assets, domain, rate limits and service configuration are outside the redesign. Existing Chromium smoke covers routes, ranges, keyboard controls, exports, chart dates, axe checks and hydration. Installed Playwright engines are Chromium, Firefox and WebKit. The scope is the exercised engines. [Observation integrity](../../npm-observation-integrity.md) · [Compare export contract](../../compare-export-selection.md)

## Measurements

A production-mode Next build used deterministic local npm fixtures. The screenshot set contains 192 captures across twelve routes, eight viewports and both themes. The routes include three Package ranges, two Compare ranges, five selected packages, missing and unverified observations, stale cached data, invalid and error routes, and the empty builder. No captured page threw an application exception. The separate serial lab set contains 18 observations from three runs per route and viewport. The sticky header measured 73 px. The measurements record SVG position, visible percentage, viewport-height distance, axis dimensions, interaction counts, layout shifts, LCP proxy, transfer, and Chrome trace counters. Counts come from enabled inputs, buttons and links in the first viewport and are an approximation of control density.

| Route | Chart top at 320 px | Chart top at 390 px | Chart top at 768 px | Chart top at 1440 px |
| --- | ---: | ---: | ---: | ---: |
| Package, 365 days | 1880 | 1844 | 1142 | 1090 |
| Compare two, 365 days | 1444 | 1392 | 959 | 993 |
| Compare five, 30 days | 1902 | 1882 | 1227 | 1127 |
| Package, missing and unverified | 1920 | 1820 | 1162 | 1110 |
| Package, stale | 2017 | 1874 | 1216 | 1164 |

At 390×844, Package required about 1.18 additional viewport heights and five-package Compare about 1.23 to reach the top of the plot. At 320×720, home had no interactive main-content control visible in the first viewport. At 390 px, the first viewport held 8 enabled main controls on Package and 18 on five-package Compare. At this width the chart labels measured 14 px minimum for Package and 13 px for Compare, with widest labels 68 px and 63 px. No horizontal overflow was observed in the baseline capture. Desktop Compare median sampled CLS was 0.09 at 1440 px. This is a local lab measurement, with no conclusion about field p75.

| Route and width | Median chart insertion, ms | Lab LCP, ms | JavaScript transferred, bytes | Chrome task duration, ms |
| --- | ---: | ---: | ---: | ---: |
| Home 390 | — | 236 | 157032 | 295 |
| Package 390 | 707 | 576 | 187211 | 529 |
| Compare 390 | 744 | 632 | 173756 | 535 |
| Home 1440 | — | 260 | 157032 | 292 |
| Package 1440 | 769 | 624 | 187211 | 645 |
| Compare 1440 | 838 | 672 | 173756 | 641 |

Chrome task and script durations include rendering and scheduling around hydration. They cannot isolate React hydration cost. Lab key-to-attribute timing measures the full Playwright round trip and does not measure INP. Use a fresh browser context per sample and equal build, fixture and browser settings when comparing versions.

## Ranked UX findings

| Rank | Problem and consequence | Evidence or assessment |
| --- | --- | --- |
| 1 | Package plot is delayed by insights and registry metadata, so users scroll past interpretation before reaching the observations. | Source order and mobile geometry |
| 2 | Five-package Compare stacks totals cards before the plot, making series inspection a second-screen task. | Five-package plot starts at 1882 px on 390×844 |
| 3 | Home search can start below the first viewport on narrow phones. | 320 px capture and first-viewport control count |
| 4 | Compare repeats identity in a title line, package links, removal chips, cards and legend. | DOM and screenshot inspection |
| 5 | Shared totals have the right denominator, but it is repeated in every card while the shared exclusion rule is separated from the graph. | Source and fixture |
| 6 | Desktop Compare can shift after its tray hydrates. | Three-run lab median CLS of 0.09 at 1440 px |
| 7 | Homepage cards repeat product capabilities after the hero and use synthetic examples. A user seeking evidence must distinguish format examples from observations. | Source and screenshot inspection |
| 8 | Single-package KPIs on mobile use two separate full-width surfaces for figures of equal rank. | 390 px baseline screenshot |
| 9 | Color swatches alone make it harder to match customized dashed or dotted chart lines to package names. | Compare plot and legend source |
| 10 | Gradient headline, translucent site header and repeated rounded surfaces weaken product identity. | Subjective visual critique |

[390 px before gallery](baseline-mobile.jpg). Regenerate all screenshots and the tab sequence, label widths, interaction proxy and lab counters with the commands in the [design specification](design-system.md).
