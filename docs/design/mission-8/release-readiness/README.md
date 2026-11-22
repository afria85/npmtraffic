# Mission 8 final release-readiness evidence

This review compares checkpoint `2b25335abe93ae1a45d5d710e572544c53f68dce` with application commit `4326263bf3b6a2c09f90dfdd5b433a7c2e567879`. The report and keyboard test harness are published on the same Draft after the application commit.

## Header regression

Identical five-package fixture, Next.js 16 production builds, 30-day Compare. WebKit at a 320 px viewport reserves 8 px for its scrollbar. The 97 px brand, 185.1 px nav and 8 px gap needed 290.1 px. The old header left 288 px. Mobile gutter changed from 12 px to 8 px per edge, giving 296 px. Desktop gutters and control dimensions were retained. The existing flexible wrap remains available at smaller effective widths.

| Engine and viewport | Header before → after | First-view SVG before → after |
| --- | ---: | ---: |
| Chromium 320×720 | 61 → 61 px | 48% → 48% |
| Firefox 320×720 | 61 → 61 px | 48% → 48% |
| WebKit 320×720 | 101 → 61 px | 32% → 48% |
| Chromium and Firefox 390×844 | 61 → 61 px | 100% → 100% |
| WebKit 390×844 | 61 → 61 px | 96% → 96% |

The 320 px WebKit regression failed at 101 px on the checkpoint against a maximum of 64 px. The candidate also enforces a minimum 42% visible SVG, no overlap or root overflow, original control dimensions, sticky top position, and mobile touch activation. Chromium and Firefox verify sequential Tab order. Playwright WebKit verifies that each header control accepts focus. Actual Safari link-tab preferences remain a manual check. Chromium CI exercises the 312 CSS px width as a scrollbar-equivalent boundary. Playwright WebKit on Windows exercised the actual 320 px viewport. Physical Safari remains a manual verification item.

[320 light before](webkit-320-light-before.png) · [after](webkit-320-light-after.png) · [320 dark before](webkit-320-dark-before.png) · [after](webkit-320-dark-after.png)

## Route consistency and screenshot index

The first viewport was captured across nine routes at 320×720, 390×844, 768×1024 and 1440×900 in both themes. There are 72 Chromium route snapshots per revision, plus eight Compare checks per revision in each of Firefox and WebKit. Reference pages were visited after a populated comparison, so their screenshots also exercise the shared tray. Footer screenshots are included separately.

| Width | Light before and after | Dark before and after |
| --- | --- | --- |
| 320 | [Light](routes-320-light.webp) | [Dark](routes-320-dark.webp) |
| 390 | [Light](routes-390-light.webp) | [Dark](routes-390-dark.webp) |
| 768 | [Light](routes-768-light.webp) | [Dark](routes-768-dark.webp) |
| 1440 | [Light](routes-1440-light.webp) | [Dark](routes-1440-dark.webp) |

[Footer before](footer-320-before.webp) · [Footer after](footer-320-after.webp) · [Geometry and browser errors](geometry.json)

| Route | 320 px Chromium heading top before → after | Change |
| --- | ---: | --- |
| Home | 85 → 85 px | Search, headline, and sample remain the primary content. |
| Package | 77 → 77 px | Coverage receipt, plot, insights, and tables keep their order. |
| Compare | 77 → 77 px | Header correction affects WebKit. The approved range, scale, legend, data and exports retain their behavior. |
| About | 295 → 255 px | Shared title and gutters, shorter lead, less padding in the first content panel. |
| Data | 319 → 255 px | Shared lead and title with duplicate brand link removed. |
| Transparency | 327 → 255 px | Shared lead and title with duplicate brand removed. |
| Status | 311 → 255 px | Shared lead and title with duplicate brand removed. Instance-local qualification stays visible. |
| Roadmap | 335 → 255 px | Shared lead and title with duplicate brand link removed. |
| Donate | 366 → 272 px | Shared title, shorter lead, redundant Support badge removed, more room inside the mobile benefits card. |
| Footer | — | Named Product, Resources and Support navigation landmarks. The logo link supplies the accessible name and its mark is decorative. |

All 88 candidate observations had no root horizontal overflow and no page exceptions.

## Accessibility and functional verification

- [All-severity axe results](axe.json) contain 18 Chromium scans in each revision, across nine routes and two themes at 320 px, with WCAG 2, 2.1, 2.2 A/AA tags and best practices. The before run found redundant logo alternative text, unnamed navigation landmarks and the populated Compare tray outside a landmark. The candidate found zero violations in this matrix. The tray still uses its existing panel and state.
- [Native 200%](native-indexed-200.webp) and [native 400%](native-indexed-400.webp) are nonblank Chromium tab captures. [Zoom results](native-zoom.json) verify actual zoom factors, no root overflow, five accessible names, legend keyboard paging, explicit Indexed UTC baseline and inspection at 632 and 316 CSS px. These supersede the older blank zoom images.
- Focused Firefox and WebKit cover header, legend, scale, keyboard, touch and CSV selection. WebKit runs against an isolated loopback fixture with its local HTTPS upgrade directive omitted in the test proxy. Preview and production HTTP security settings were not edited. The exact CI result is linked from the PR.

### Manual HOLD checklist

1. On Windows with NVDA or Narrator and macOS with VoiceOver, read the banner, reference page headings and all footer landmarks. Follow Home → Compare → About and verify visible focus and the expected header order. In Safari, test Option-Tab and the full keyboard-navigation preference.
2. In a populated comparison, use the legend pager by keyboard and touch, switch Absolute/Indexed, confirm the baseline announcement, inspect a chart date, then navigate the daily table and use its one-package control. Verify zero, missing and unverified labels are spoken distinctly.
3. On an actual iPhone and Android phone, test narrow portrait and landscape, theme switch, long names, legend swipe and pager, sticky header, table horizontal scroll and one CSV download. Record OS and browser versions.
4. Field LCP, CLS and INP remain unverified. These browser screenshots and layout measurements are fixture-level observations.

## Read-only reliability findings

The [protected checkpoint trace](webkit-network-checkpoint.json) reached Vercel sign-in via 302 → 307. There was no authenticated app or RSC traffic in that test. Two benign public production samples completed the page flow and emitted rapid hard-navigation RSC access-control exceptions. The [correlated production sample](webkit-network-production.json) recorded 16 RSC requests and two exceptions for /about. Neither exception matched a captured request ID despite hashed correlation by path and RSC token. Earlier authenticated Preview evidence found the exceptions on both #26 and #27. Protection is therefore insufficient as the sole explanation. Request cancellation or browser prefetch lifecycle remains a hypothesis. No protection setting, cache behavior or production service was modified.

Package SSR calls `fetchTraffic` directly, and Compare fans out through the same function within its selection bound. API metering in API route handlers does not cover these page fetches. Range JSON has a five-second abort deadline through body parsing but does not currently use a byte cap. Version metadata already uses the shared bounded reader. Review production traffic and response-body size distributions separately before proposing admission controls or a range-body limit. The presentation patch does not change either path.

Draft only. This evidence supports owner review and leaves release approval separate.
