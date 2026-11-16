# npmTraffic — comprehensive second-pass owner UX / source audit

Date: 2026-11-16 · Scope: `afria85/npmtraffic` Mission 8 stacked Draft PR #27, with #26 as the design base. **Draft-only audit. No production changes or release approval.**

## Verification boundary

Reviewed the repository's complete 310-path tree and specifically inspected homepage, shared header/footer, logo/brand components and public mark, all informational pages, Package and Compare route structure, API/export/observation modules, tests, latest CI, Vercel deployment metadata, Notion handoff and earlier screenshot/geometry/a11y evidence. Earlier 9-route/4-width/2-theme screenshots are tied to original SHA `80bce0fc723507e08feeceac68ed7d3fd8a812ca`; do **not** present them as new screenshots of the final brand refinements. No authenticated independent interactive Preview browser run, real device test, live screen-reader session, field CWV capture or penetration test was completed by this review. Green Chromium CI does not establish the absence of all bugs.

## Brand and presentation decisions

- The **actual shared wordmark already highlights `npm` via `var(--accent)`**, in `Logo.tsx` and `BrandText.tsx`, and OG imagery uses the established cyan accent. We deliberately did **not** recolor the entire site or replace the existing logo.
- The homepage title now selectively colors the exact `npm` word with the same theme-aware accent; accessible full heading remains `Explore npm downloads`. A new light/dark Chromium regression test checks the computed accent and accessible name.
- The public **`brand-mark.svg` still contained a retired purple/red identity** while active images/OG use cyan; it is now reconciled to the existing three-part cyan motif, not a new brand. A regression checks its three canonical colors and the absence of retired colors. Existing favicon/PNG icons and the live header are unchanged.
- Keep restrained Registry Observatory visual language; do not add logo variants, arbitrary decoration or duplicate accents in every `npm` mention.
- `BrandMark.tsx` currently maps `ui` and `solid` variants to the same `icon.png` file; this is an unused/ambiguous API, **not a confirmed visible bug**. Simplification should be separate and only if callers/asset provenance are verified.

## Verified source issues fixed in this Draft iteration

| Priority | Finding / source | Draft correction and check |
| --- | --- | --- |
| P2 | Home heading did not share the brand accent despite existing cyan logo — `app/page.tsx` | Theme-aware `npm` accent; two-theme rendered test `smoke/home-brand.spec.ts` |
| P2 | Generic 404 falsely said `Package not found` — `app/not-found.tsx` | Page-or-package neutral 404 text; navigation status and heading smoke |
| P2 | About described `Fastest mover` although Compare now shows `Largest relative increase` — `app/about/page.tsx` | Truthful Compare overview copy and smoke |
| P2 | About and Donate had no explicit route-specific canonical/OG identity — their `metadata` | Explicit page canonical, OG title/URL and Twitter metadata; smoke |
| P2 | Homepage document title was generic while layout applies a title template — `app/page.tsx` | Descriptive npm download trends/comparison title and matching OG/Twitter labels; smoke |
| P2 | Data/export API reference had no footer resource link — `components/Footer.tsx` | Added `Data & exports` under Resources; smoke |
| P3 | `public/brand-mark.svg` used legacy purple/red vector despite cyan header/OG | Replaced only the standalone vector with cyan shape/background; unit test `tests/brand-asset.test.ts` |

The dark-mode test first failed because it mutated the DOM manually before theme hydration; the real ThemeToggle cookie/localStorage/system initialization restored light. The test was corrected to use `page.emulateMedia({ colorScheme })` before navigation instead of weakening the selected-color assertion. This is a **test setup error**, not a discovered runtime theme bug.

## Audit coverage by layer

| Area | Source/evidence reviewed | Current conclusion |
| --- | --- | --- |
| Home / Package / Compare | Route markup, chart/legend and existing screenshot matrices | Chart-first layout and status visibility preserved in Draft. Brand only on Home title; no layout rework needed |
| Header / footer / navigation | `Header.tsx`, `Footer.tsx`, `Logo.tsx` and 320 WebKit matrix | Earlier 101→61px Safari header correction retained; data/export footer link added |
| Reference routes | About, Data, Transparency, Status, Roadmap, Donate, support redirect, 404 | Visual consistency established in previous pass; corrected mismatched About text, 404, About/Donate metadata |
| Range / chart controls | `RangeDropdown`, CompareChart, legend, theme and selection tests | Existing approved active-range/selected-scale/legend paging unchanged |
| Search / comparison selection | `SearchBox`, `CompareAddBar`, Compare Tray and Saved Comparisons | Existing limits, local-storage handling and no duplicate tray preserved; no new confirmed defect |
| Daily data / uncertainty | `observations.ts`, `traffic.ts`, `compare.ts`, `derived.ts` and existing unit regressions | Available vs missing/unverified, verified zero, shared-day totals and mathematical calculation contracts intentionally unchanged. This audit is **not** an independent live npm data reconciliation |
| Outputs / exports | CSV, Excel CSV, JSON, SVG, PNG routes and existing tests | Format contracts unchanged by this Draft; previous regression suite required to pass |
| SEO / sharing | Home and package/Compare canonical, sitemap, robots, OG, About and Donate metadata | Homepage sample `@angular/core`, canonical sitemap intact; supplementary page metadata improved. Structured-data efficacy in search engines not measured |
| Accessibility | Source semantic landmarks, 18 zero-violation axe scans in previous exact-SHA evidence; prior nonblank zoom 200/400 | Automated evidence strong but **not** a full WCAG certification; OS screen reader and actual touch-device checks still HOLD |
| Performance | Previously published matched lab work | No new field LCP/CLS/INP claim; no heavyweight assets or new dependencies added |
| Reliability/security | Cache, API limiter, SSR upstream, saved project issues | Two separately tracked engineering investigations below; no security/provisioning changes |

## Open work and release gates

**Issue [#28](https://github.com/afria85/npmtraffic/issues/28) — P1/P2 pending user-impact classification.** Public production automated WebKit rapid-navigation trace recorded two RSC `access-control` console exceptions, with no unique matched failing HTTP request. They predate this Draft stack and were also seen in protected Preview runs. Must verify whether users actually experience failed navigation; if reproducible functional failure, treat as release blocker. If canceled prefetch only, document and repair separately without weakening Vercel protection.

**Issue [#29](https://github.com/afria85/npmtraffic/issues/29) — separate security/reliability design decision.** SSR HTML routes can fetch npm observations without passing API route's limiter; range JSON fetch deadline exists but no explicit response-size cap. No demonstrated abuse. Review resource ceiling/admission controls without unsafe load, Redis/provider/env/API mutation.

**Manual release checks:** Real iPhone Safari and Android 320/390 touch, legend swipe/pager, compare table focus, CSV/share; OS NVDA/Narrator/VoiceOver/TalkBack speaking of verified/missing/unverified and controls; production-ready field performance monitoring; direct signed-in hosted Preview browse. Record OS/browser/version and measured outcomes. Earlier Chromium/Firefox/WebKit lab work is not proof of actual Safari configuration.

**Minor, not currently release-blocking:** retired public starter SVG assets (`next.svg`, `vercel.svg`, etc.) still exist but are not shown as production UI in the inspected source. Remove only after a separate reference/usage audit; do not confuse unused files with security defects. BrandMark variant aliasing is another cleanup candidate.

## Decision

**GO FOR OWNER VISUAL REVIEW after exact-head CI and Preview verification; MERGE / PRODUCTION HOLD.** Preserve stacked PR order #26→#27 and all data/API/export contracts. If the final CI reports any failure, this verdict is revoked until root cause is corrected and exact-head CI passes.
