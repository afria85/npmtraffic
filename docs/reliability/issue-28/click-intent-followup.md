# Focused WebKit click-intent investigation — 17 November 2026

**Status:** diagnostic-only Draft stacked on RC #34. Production release remains HOLD.

## Why this exists

[PR #34](https://github.com/afria85/npmtraffic/pull/34) recorded two **distinct** WebKit observations at its exact HEAD `530c1f5a387dc46569c184351025829b3e027720`:

1. A local 1280px Home → React click after history navigation once left the browser on Home. Original click event/trust and overlay state were not captured.
2. Separate local 320px Back/Forward emitted three RSC `access-control` page exceptions while the expected routes, charts and CSV worked.

Neither event proves the other caused it, and neither demonstrates failure on authenticated Preview or physical Safari.

## Code and scope

- `scripts/diagnose-webkit-react-click.mjs` performs 3 independent attempts for **each** Chromium/WebKit × 320/1280 viewport (12 attempts) against a local production build with existing fixture/proxy.
- It captures read-only DOM event evidence (trusted pointerdown/pointerup/click, element hit-test, link href path, defaultPrevented state, document readiness), plus URL, navigation/RSC request phase, status/content type, and categorized console/page errors.
- Raw error messages, URL query parameters, cookies, credentials, download contents, request bodies and browser storage are **not** persisted. RSC query keys are hashed. The diagnostic does not patch runtime code, cancel events, override navigation, retry failed clicks within an attempt, or bypass Preview sign-in.
- `scripts/verify-webkit-navigation-local.mjs` selects the new probe with `NPMTRAFFIC_NAVIGATION_PROBE=click`; default behavior of the existing comprehensive runner remains unchanged.
- `smoke/navigation-after-history.spec.ts` adds two required **Chromium** regression tests at 320/1280. These validate visible route and chart after Back/Forward and are not a substitute for WebKit testing.

## How to run the targeted WebKit probe

From an isolated local checkout with Node, dependencies and installed Chromium/WebKit Playwright browsers:

```sh
npm ci
npm run build
npx playwright install chromium webkit
NPMTRAFFIC_NAVIGATION_PROBE=click node scripts/verify-webkit-navigation-local.mjs ./test-results/webkit-click-intent
```

On PowerShell, set `$env:NPMTRAFFIC_NAVIGATION_PROBE='click'` first, then run the Node command. Unset it after the session.

The diagnostic uses the existing local fixture proxy because WebKit upgrades loopback HTTP subresources under the production CSP. It **never changes hosted CSP**.

A nonzero exit code means at least one attempted browser navigation failed. Review each `<engine>-<width>-attempt<N>.json`; a failed attempt also saves `*-FAILED.png`. Report denominator, browser version, OS, exact build SHA and every failure—not only successful retries. The diagnostic is intentionally **not** automatically included in GitHub's Chromium-only test job.

## Required release decision

If misses recur, compare actual trusted click events, overlay hit-testing and request phases, and reproduce a minimal cause before changing application behavior. If they do not recur, do not declare the historical problem fixed: state the sample count and that a physical Safari/legitimately authenticated Preview run is still required.

Physical iPhone Safari, Android, OS screen reader, and field LCP/INP/CLS remain **NOT TESTED** unless separately performed with evidence. Owner must explicitly approve any merge and production deployment. SSR HTML admission (#29) and seasonal MAD research (#30) remain separate.

**No security/CSP/Redis/API/export/observation changes are permitted in this diagnostic branch.**
