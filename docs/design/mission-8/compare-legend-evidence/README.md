# Compare chart visibility follow-up

The independent review of Draft #27 identified a mobile visibility regression. This follow-up measures it on the exact #26 base `06b413038eb47f0022695fed51b91c1252b95b2c` and #27 checkpoint `76999bffb0fa96b4672351ef6942b8ef209e0505`. Candidate application and tests are pinned to `4dc18bf2ac2283cc4fa61ae1e9117a98d6413192`.

## Fixture and method

Built both pinned commits and the candidate with Next.js 16.4.5. Served all three against the same Playwright npm fixture, with local Chromium and default font size. Captured at the top of the main Compare page in both themes after fonts and the chart were ready. The fixture is 30 days for each run.

- Familiar packages are angular, axios, react, svelte and vue.
- Scoped packages are @angular/core, @scope/long-scoped-fixture-with-a-readable-name, axios, react and vue.

Visible SVG fraction is the intersection of the SVG's vertical bounds and the initial viewport divided by SVG height. The chart is 256 CSS px high throughout. The regression test also verifies that all five labels and their pattern descriptions are exposed, the document does not overflow, and the legend and tooltip do not intersect after chart inspection. The 320 px test failed against the checkpoint with 16.7% visible against a 42% minimum. The candidate passed all six Chromium tests in the new file.

## Measured results

| Viewport and set | #26 visible | #27 checkpoint visible | Candidate visible | Candidate legend |
| --- | ---: | ---: | ---: | ---: |
| 320×720 familiar | 107 px · 42% | 43 px · 17% | 123 px · 48% | 24 px |
| 320×720 scoped | 55 px · 21% | 0 px · 0% | 63 px · 25% | 40 px |
| 390×844 familiar | 231 px · 90% | 219 px · 85% | 256 px · 100% | 24 px |
| 390×844 scoped | 179 px · 70% | 119 px · 46% | 239 px · 93% | 40 px |
| 768×1024 and 1440×900 | See raw matrix | See raw matrix | 256 px · 100% for both | 24–40 px |

The scale controls remained a single 44 px row in all measurements. The candidate has no page-level horizontal overflow in the 16-record matrix. The legend can scroll internally at narrow widths. Long labels can wrap within an item and retain their full names. See [all 60 measurements](geometry.json).

[Base at 320 px](pr26-320.png) · [Checkpoint at 320 px](checkpoint-320.png) · [Candidate at 320 px](candidate-320.png) · [Scoped checkpoint at 320 px dark](checkpoint-scoped-320-dark.png) · [Scoped candidate at 320 px dark](candidate-scoped-320-dark.png) · [Candidate at 390 px dark](candidate-390-dark.png) · [Candidate at 768 px](candidate-scoped-768.png) · [Candidate at 1440 px](candidate-scoped-1440.png).

## Alternatives

Both browser prototypes moved the Absolute explanation below the SVG. At 320 px the [two-column grid](grid-320.png) fit every ordinary label together but required 54 px for its familiar labels and 102 px with the scoped labels. It delivered 33% and 0% first-view visibility. The [single-row prototype](rail-320.png) delivered 46% and 20% with a 20–36 px legend. The list scrolled using Arrow Right.

The selected row adds a visible touch and keyboard pager, confines scrolling to the legend, and places the plot immediately after it. At wide widths the five labels fit without paging. Labels, text descriptions, and both color and line pattern remain available. The Indexed UTC baseline stays above the plot and inside chart image exports. Raw download counts, exports, and saved styles use existing logic. The 320 px familiar fixture regained 80 visible CSS px and exceeded the pinned #26 reference by 16 px. With the deliberately long scoped set, most of the plot still requires vertical scrolling.

Native Chromium was set to 200% and 400% using the browser's tab zoom API. The scoped chart retained five labels, keyboard legend paging, the Indexed baseline and chart inspection with no root overflow at 632 and 316 CSS px. [Zoom data](native-zoom.json) · [200%](compare-indexed-200.png) · [400%](compare-indexed-400.png). Real OS screen-reader and physical-device checks remain open.

## WebKit trace

Network recording includes document requests, redirects, RSC prefetch markers, selected response headers, request failures and exception categories. It omits cookies, auth values, response bodies and query tokens. No Vercel protection settings were changed.

- [Pinned #26](webkit-pr26.json) and [pinned #27](webkit-pr27-checkpoint.json) both returned an initial 302 followed by a 307 to Vercel login from a fresh browser session. Application RSC requests could not be observed in these unauthenticated runs.
- [Public production](webkit-production.json) completed the same rapid hard navigation and a same-origin Compare visit. This sample saw 21 RSC requests and no page exceptions. It does not exercise the Preview access path.
- Prior authenticated Mission 8 probes reproduced the WebKit access-control exceptions on both pinned Previews. A separate #27 client navigation probe passed. The new traces establish the protection redirect difference, but do not connect it causally to the authenticated exceptions. A matched authenticated WebKit trace is still needed before any security or routing change.

Keep the work in Draft. Exact-head CI, Vercel Preview metadata and hosted access scope are recorded in the PR description.
