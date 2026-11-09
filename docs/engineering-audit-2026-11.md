# Engineering audit — 2026-11-09

## Executive summary

Baseline: `233d84e18aed92dfb46e83171b035a732b35d9d0`. Branch: `audit/engineering-2026-11`.

Pembaruan ini menutup masalah integritas data yang dapat menghasilkan nol palsu, memperbarui dependensi produksi, memperkeras rate limit dan batas waktu upstream, memperbaiki sitemap dan kontras aksesibilitas, serta menambahkan perbandingan tersimpan lokal. Produksi tidak diubah. Pengujian data npm asli masih diblokir kebijakan jaringan cloud; pengujian browser menggunakan fixture yang dinyatakan secara eksplisit.

This is a source and local-runtime audit, not a production penetration test or a claim that every deployment assumption was verified. Read the evidence classifications below before release.

## Evidence and findings

| Classification | Severity | Finding / affected files | Evidence and remediation |
| --- | --- | --- | --- |
| VERIFIED, fixed | P0 correctness | `lib/traffic.ts` manufactured zero observations for missing rows | Baseline normalization filled every missing requested day with 0; tests explicitly expected it. Now rejects empty, partial, duplicate, out-of-window and invalid counts before totals, metrics, comparison or exports. Only explicit npm zeros are accepted. |
| VERIFIED, fixed | Critical/high dependency advisories | Baseline Next.js and transitive dependencies | `npm audit` baseline: 1 critical, 7 high, 11 moderate across all dependencies. Registry stable tags confirmed Next 16.4.5 / React 19.3.1. Updated together with Next ESLint and React typings; refreshed compatible dependencies and PostCSS override 8.5.32. Production audit now has zero advisories. This is advisory matching, not exploit reproduction. |
| VERIFIED, fixed | P1 reliability | `lib/npm-client.ts` cleared timeout before `res.json()` | Timeout now spans headers and body. Regression holds body open after headers. Repository lookup and internal OG requests also receive deadlines. |
| VERIFIED, fixed | P1 correctness | Downloads 404 classified as package absence | Registry 404 is now required before permanent not-found. Existing package with unavailable downloads returns 502 or complete stale data. No new public success schema required. |
| VERIFIED, fixed | P1 abuse | `lib/rate-limit.ts` non-atomic pipeline, unchecked Redis errors, rejected requests inserted | Single Lua EVAL executes pruning, limit decision and conditional insertion atomically. HTTP/error/malformed/network responses fail closed for 3 seconds instead of silently creating fresh local allowance. Unit tests mock REST protocol; live Upstash not available. |
| VERIFIED, fixed | P1 trust | Arbitrary forwarding headers and UA could choose rate-limit identity | Only syntactically valid `x-vercel-forwarded-for` with `VERCEL=1` is used. Other deployments share an anonymous bucket. Vercel must overwrite that header at ingress; validate actual deployment before release. Memory fallback is capped at 10,000 keys. |
| VERIFIED, fixed | P1 workload | `lib/prewarm.ts` unbounded custom package list | Validated, deduplicated packages capped at 12; day selections deduplicated; maximum 36 tasks, concurrency 3. Existing production CRON_SECRET enforcement retained. |
| VERIFIED, fixed | P2 SEO | Sitemap listed redirect `/support`, fabricated per-request modification dates and preview host | Redirect remains; sitemap excludes it and omits unverified lastmod. Robots/sitemap use shared production canonical resolution. Production localhost/preview configured origins are rejected. Scoped encoding regression covered. |
| VERIFIED, fixed | P2 accessibility | axe reported contrast failures on homepage and package controls | Theme-aware accent foreground, darker light-theme accent, positive and tertiary text. Mobile search gets named dialog, unique ID, focus wrap and Escape restoration. Browser tests verify representative views and themes. |
| VERIFIED | Informational | `/$` is intentionally unknown | Local production smoke confirms 404. No catch-all redirect added. |
| INFERRED, retained | Design tradeoff | CSP permits inline scripts/styles for Next hydration | Enforced CSP already removes eval in production, denies framing/objects and sets base/form boundaries; stronger report-only mode exists. End-to-end nonces would need separate rendering changes; do not remove inline allowance without hydration testing. |
| VERIFIED limitation | Development advisories | 8 moderate audit entries in ESLint/typescript-eslint chain | Root minimatch globparts amplification advisory GHSA-g3hv-75wg-m249; no production nodes. npm suggests downgrading Next ESLint, which would misalign toolchain. No forced incompatible override. See dependency-audit JSON; restrict linting to trusted checkout content pending compatible upstream fix. |

## Scope reviewed and retained behavior

Reviewed manifests/lockfile, CI, Next headers, metadata/robots/sitemap/canonical builders, public daily/compare/search/validation/cron and OG routing, npm downloads/metadata clients, cache/stale handling, UTC ranges, derived statistics, insights, CSV/export metadata, local event payload bounds, search controls, theme and comparison components, and existing regression suites. This inventory describes review domains, not proof that every branch is covered.

- Input package validation and search query bounds already exist. Comparison fan-out remains at five packages. CSV has formula-prefix handling, safe filenames and UTC metadata; existing export regressions retained.
- MA3/MA7 require full trailing windows; MAD zero dispersion yields no outliers by existing documented method. No causal interpretation of release markers added.
- UTC range ends yesterday; leap-year, midnight and DST-independent boundaries tested. Response rows are validated against the exact requested UTC dates then ordered chronologically. Upstream completeness means one valid observation per requested day; it does **not** prove npm has finalized or will never revise counts.
- Cache remains process-local, bounded at 1,000 entries with 15-minute/12-hour freshness and 24-hour stale lifetime. Incomplete refreshes never overwrite complete cached series. No persistent uptime history is implied.
- Logs contain route, request ID, package, status, duration and cache state, not raw visitor IP, token or authorization headers. Visitor identity hashes remain in runtime limiter memory/Redis only.
- Public v1 success keys and numeric series shape retained. Partial data now returns existing 502 error shape (or explicit stale fallback), rather than fabricated success. Clients relying on fabricated zero padding will see fewer successes; this is intentional correctness hardening.
- Package/compare UI explains complete requested observations and distinguishes stale cache. It does not label unverified data provisional or claim to know npm's global latest reporting day. Existing export range and stale metadata carries the same distinction; no CSV column changes.

## Product changes

`lib/saved-comparisons.ts` and `components/compare/SavedComparisons.tsx` add browser-only saved comparisons. Maximum 20, canonical deduplication, 2–5 validated packages, supported day ranges, removal, storage-error feedback, version-one envelope and migration from bare arrays. No accounts, server profile, telemetry or external storage. Existing share URLs remain intact. Readable status and native controls support keyboard use.

## Verification and reproducibility

Baseline `npm ci` installed 412 packages, and **108 tests passed**. Node 24.22.1 and npm 11.9.0 match the documented Node 24 workflow. HTTPS Git read of origin HEAD succeeded using existing platform authentication. No GitHub token was requested.

**Final results:** 143 unit/integration tests passed; 8 browser/axe tests passed; lint, TypeScript and production build passed. Zero failed, skipped or cancelled unit tests in final run. Production audit: zero advisories. Full audit: eight moderate development-only entries.

Final commands (run in `/workspace/npmtraffic`):

```sh
npm ci --cache /tmp/npm-cache --no-audit --no-fund
npm test
npm run lint
npx --cache /tmp/npm-cache tsc --noEmit
npm run build
npm audit --cache /tmp/npm-cache --omit=dev
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:smoke
```

Browser smoke starts a dedicated production-mode server using `smoke/upstream-fixture.mjs`. That preload mocks **only** npm upstream hosts and is never imported by application code. It covers package/scoped package rendering, complete data messaging, CSV, comparison local storage, home/mobile HTML/hydration, invalid input, correct 404, legacy redirect, robots/sitemap and real PNG OG rendering. axe scans four representative routes in both themes; focus regression covers mobile search. These are deterministic integration tests, not a live npm validation or complete screen-reader/manual accessibility audit.

Next 16.4.5 generates AGENTS.md on dev startup; retained generated guidance intentionally. Type errors in old mocks/fixtures were corrected rather than suppressing test files or disabling checks. CI now runs explicit type checking, production vulnerability gate, production build and browser/axe smoke; read-only GitHub Actions permissions added. Dependabot runs weekly npm updates and monthly Actions updates, grouping Next and React families.

## BLOCKED / NOT TESTED / deployment unknowns

- **BLOCKED:** Live `api.npmjs.org` CONNECT returns 403 from environment policy. App's live daily endpoint returns explicit 502. Draft adds api.npmjs.org; retry only after settings save applies it. npm registry installation works. Actual npm omissions, newly published/scoped package history semantics and last finalized reporting day cannot be independently asserted here. Policy favors explicit unavailable over guessed zeros.
- Browser archive download from cdn.playwright.dev also returns policy 403. Existing `/usr/bin/chromium` works; draft includes browser archive domains for reproducibility. CI uses Playwright's pinned browser, local run uses system Chromium; browser-version equivalence is not claimed.
- **NOT TESTED:** Live Upstash EVAL permissions/latency, actual Vercel ingress header overwrite, deployed cron credentials, Vercel CDN behavior and upstream revisions. Unit tests exercise Redis response handling; real distributed concurrency/TTL still requires staging Redis.
- **NOT TESTED:** GitHub hosted workflow execution and branch protection. Existing workflow source inspected; no CI remote status claimed. Local commits are supplied; no pushes, PRs, merges, deployment or production settings changes.
- **NOT TESTED:** Production Search Console/Google Rich Results validation and real-user Core Web Vitals. WebSite/SearchAction JSON-LD retained as semantic markup, with no promise of a Google search feature.
- **NOT TESTED:** Exhaustive chart interactions, every dialog state, full screen-reader and touch-device matrix, or every 365-day route under real upstream load. No speculative virtualization/bundle restructure introduced.
- Home currently calls request headers and produces per-render export example UUID/time, making it dynamic. This is a verified rendering characteristic, not a measured bottleneck. Preserve correct canonical/request examples until production profiling justifies an explicit static strategy.
- Rate limiting without Redis remains local to an instance; non-Vercel ingress shares one bucket. External deployments must install a verified trusted identity boundary before relying on per-visitor quotas. Redis outage intentionally reduces availability (429) rather than removing abuse controls.

## Deployment checklist (owner review only)

1. Review workstream commits, API error behavior and remaining dev advisory. Ensure clean checkout at the approved final commit; retain previous known-good deployment ID and baseline SHA.
2. Run fresh `npm ci`, tests, lint, `tsc`, build, production audit and smoke in CI. Confirm browser artifacts correspond to current commit.
3. In staging, verify api.npmjs.org/registry access, complete 7/30/365-day data for real and scoped packages, new-package history and missing final day behavior, compare/CSV/JSON/Excel/OG. Missing observations must never appear as zero.
4. Verify Vercel overwrites `x-vercel-forwarded-for`, `VERCEL=1`, canonical env contains the intended public HTTPS origin, CRON_SECRET enforcement, and Upstash EVAL permissions/atomic limits/expiry. Do not copy local URLs into production settings.
5. Check hydration, CSP reports, keyboard dialog, themes, donation/legacy links and unknown-path 404. Check crawlable sitemap entries and canonical HTML in staging with bot user-agent.
6. Owner approves and deploys through existing Vercel process. Observe 429/502/stale rates, latency and error logs without adding visitor tracking. Set rollback thresholds appropriate to baseline traffic before release.

## Rollback checklist

1. Stop rollout and promote the recorded previous Vercel deployment using the normal owner-controlled process. No database migrations were added.
2. Validate homepage, representative package/compare APIs, CSV and OG, canonical host and cron authorization. Invalidate only affected CDN paths if necessary.
3. Revert the relevant workstream commits through a reviewed branch/PR, rerun CI, and redeploy only after owner approval. Do not reset/force-push main.
4. A rollback to baseline restores known dependency advisories and zero-padding behavior; prefer a narrow forward fix if possible. Local saved comparisons are versioned browser data and may remain unused by older code; no server cleanup required.

## Future roadmap (design only)

| Candidate | Value | Effort / cost | Maintenance / caution |
| --- | --- | --- | --- |
| Release impact | Medium | Medium, current API only | Specify baseline windows; correlation is not causation; incomplete data must block analysis |
| Public badges/charts | Medium | Medium, CDN requests | Cache and rate-limit rendering; accessibility and abuse testing |
| Longer history exports | Medium | Medium/high API and memory | Bound date ranges and chunks; preserve reporting completeness |
| Alerts/webhooks | Potentially high | High, persistent scheduler/storage | Requires owner-approved infrastructure, credentials, delivery retries and privacy design |
| Educational pages | Medium | Low infrastructure, editorial effort | Publish only useful reviewed content; avoid programmatic thin SEO pages |

Prefer staged live upstream/Redis validation and production performance measurement before additional features. Persistent uptime monitoring needs an owner-approved external probe; runtime-local status is not historical availability.

## Local performance sample (VERIFIED, not field CWV)

Production home served on port 3002, system Chromium, 390×844 viewport, no network/CPU throttling, three sequential navigations:

| Navigation | TTFB | DOMContentLoaded | Script transfer |
| --- | --- | --- | --- |
| Cold browser cache | 162 ms | 309 ms | 155,382 bytes |
| Warm browser cache | 14 ms | 54 ms | 300 bytes |
| Warm browser cache | 12 ms | 36 ms | 300 bytes |

These are single-machine lab samples, not p75 field measurements, Lighthouse scores, LCP/INP/CLS results or a before/after improvement claim. No measured evidence justifies a rendering architecture change in this patch.

## Reviewable local commits

- `57dc8a4`: dependency/security updates and compatible type fixtures.
- `2a723c7`: data integrity, request deadlines, rate limiting and prewarm bounds.
- `c8c81a0`: SEO/canonical and accessibility fixes.
- `c9026d9`: local saved comparisons and data-quality explanation.
- `df22b1d`: production fixture and accessibility smoke/CI gates.
- `65edf0e`: audit evidence, dependency report and deployment/rollback documentation.
- `2388cbb`: reject unsafe-integer accumulated totals and add regression coverage.

These are exactly the seven commits from baseline `233d84e` through `2388cbb`, in chronological order. Follow-up verification and publication status is recorded in [final-verification-2026-11.md](final-verification-2026-11.md).

## Cloud onboarding persistence

Saved `install_script`, `start_skill` and custom network requirements for `api.npmjs.org`, `cdn.playwright.dev`, `storage.googleapis.com` in the environment draft. No secrets requested or stored. Settings review/save and Publish are user actions; the draft save is confirmed, application/publication and restoration in a fresh task are not. Current instance supports install/build/test and deterministic browser workflows, while live npm-data workflow remains blocked until network policy is applied and retested.

Final data review also rejects safe-integer overflow in accumulated totals, covered by an explicit regression.
