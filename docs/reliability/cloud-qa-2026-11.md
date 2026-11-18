# Bounded cloud browser QA above Draft PR #35

This implementation was reconstructed from the [Cloud execution report](https://github.com/afria85/npmtraffic/pull/35#issuecomment-6962217918). The reported unpublished commit `b6c1092ba5241c1ec185e6e424141e4a3cf515f2` was unavailable in the local Git object database and on GitHub. The new branch starts directly at verified PR #35 HEAD `2c22f782d169544299fa348fc73ed9740b37df5e`. It changes test tooling and documentation only.

## Evidence boundaries

| Label | Scope |
| --- | --- |
| macOS Playwright WebKit | Real macOS runner, Playwright's WebKit build, desktop user agent at 320, 390 and 1280 CSS px. This does not establish Apple Safari behavior. |
| Simulated iPhone | Playwright WebKit with the iPhone 13 device descriptor, touch and mobile viewport behavior, at 320×720 and 390×844. Host OS remains explicit in each artifact. |
| Simulated Android | Playwright Chromium with the Pixel 7 device descriptor, touch and mobile viewport behavior, at the same widths. |
| NOT TESTED | Physical iPhone Safari, physical Android Chrome, OS VoiceOver, TalkBack and NVDA, and field LCP/INP/CLS. |
| BLOCKED | An unavailable runner, browser download, artifact quota, certificate tool or permission prevents the relevant gate from executing. A blocked gate has no functional PASS result. |

The historical #28 missed navigation and RSC access-control exceptions remain open. A functional route assertion can pass while its sanitized error list is nonempty. The reports preserve both results. Hydration and parentNode errors fail the tests. Access-control, transport cancellation, analytics fixture resource errors and unknown exceptions remain visible in the JSON attachments for review. Test success alone does not close #28 or justify a Safari reliability claim.

## Execution and isolation

```sh
npm ci
npm run build
npx tsc --noEmit
npm run lint
npm test
npm audit --omit=dev --audit-level=high
npx playwright install --with-deps chromium webkit
npx playwright test --config=playwright.cloud-qa.config.ts --project=webkit-iphone-emulated --project=chromium-android-emulated
# Execute the following on macOS.
npx playwright test --config=playwright.cloud-qa.config.ts --project=macos-webkit-diagnostic
```

OpenSSL must be on PATH. The fixture creates a one-day certificate under the OS temporary directory and removes it during normal teardown. Playwright accepts that certificate only for this fixture suite. The HTTPS adapter forwards application response headers unchanged, including the shipped CSP. Application authentication, TLS settings and infrastructure remain outside this patch.

The fixture runs the production build with the existing deterministic npm upstream module. Its child environment allowlists only process startup variables and the fixed test repository URL. Redis/Vercel bindings are not inherited. The new worktree has no environment files. The fixture refuses startup if a production-mode Next environment file is present. No production URL or credentials are needed. The configuration fixes the origin to loopback and ignores `PLAYWRIGHT_BASE_URL`. Do not copy environment files into this fixture checkout. The browser context is fresh for each test.

The first local mobile run recorded four assertion failures because the reconstructed test expected a footer URL without the `.git` suffix, while the fixture deliberately supplies a URL with that suffix. The footer contract preserves the configured value. The assertion was corrected to check the exact fixture configuration. Both automated accessibility cases passed in that initial run. This was a test expectation correction and required no application change.

The mobile journey checks actual Back/Forward destinations before Home → React, hard reload, Package 7/30/365-day charts, five-series Compare identity, scale state, Indexed UTC baseline, touch legend paging, keyboard inspector focus, both system themes, footer GitHub URL and root overflow. Compare CSV checks attachment status, filename, package identifiers, UTC metadata, column header and completed file bytes, bounded to 64 KiB in the test. This test bound applies to its known fixture and does not change an API export limit. Axe checks Home, Package and Compare and fails on serious or critical findings in its selected WCAG rule set. Remaining findings are retained. These scans do not establish full WCAG conformance.

The macOS diagnostic recreates the history sequence, observes trusted click events without intercepting them, records a DOM hit-test and asserts the actual Package URL, heading and chart. It captures all page exceptions as sanitized categories and selected navigation/RSC/CSV response fields. Query values and raw error strings are excluded, RSC keys are hashed, and event counts are capped. Each attachment records the actual checked-out SHA, requested CI SHA, browser version, OS release, project and viewport.

## GitHub Actions

`Cloud Browser QA` runs on relevant pull-request changes, including this new workflow. It does not depend on `workflow_dispatch` registration on the default branch. Both standard hosted jobs have a 20-minute cap, one worker, zero retries and independent failure outcomes. Checkout selects the PR head SHA and disables persisted Git credentials. Permissions are read-only, no secrets are supplied, and the configuration runs a local production build. GitHub's existing full CI runs separately on the child Draft PR.

The public repository uses standard `ubuntu-latest` and `macos-15` runners. These runner classes are free for public repositories under current GitHub policy. Artifacts have a 14-day retention period and upload even after test failure. Job logs retain test outcomes if an artifact upload is blocked. No paid runner, infrastructure, quota increase or account-setting change is authorized by this workflow. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

JSON results, sanitized diagnostic attachments, representative success screenshots and retained failure traces/video are uploaded from `test-results/cloud-qa/`. They contain local deterministic fixture data. Generated TLS keys stay in the OS temporary directory and are excluded from artifacts and Git. CI artifacts expire after 14 days, so preserve important results before that deadline. The final PR report links exact run, job and artifact IDs and distinguishes executed results from the earlier Cloud report.

## Independent risk review

| Risk | Classification and next evidence |
| --- | --- |
| #28 missed navigation | Open, intermittent browser-visible failure previously observed. A bounded passing sample does not prove absence. Correlate a future failure with destination, trusted click, overlay hit-test, history result and sanitized RSC transport fields. |
| Console-only access-control errors | Preserve separately from failed navigation. Underlying browser/streaming cause remains unresolved. Do not alter CSP or authentication on this evidence alone. |
| #29 HTML SSR fan-out | P2 operational risk, exposure unmeasured. Package SSR and multi-package Compare can call npm outside the API-only rate limiter. Per-instance caches and in-flight coalescing reduce repeated reads within an instance. Cold/high-cardinality requests and concurrent instances retain independent fan-out. |
| Provider costs and capacity | No production throughput or quota experiment was performed. Model cold Package and five-package Compare cost, registry metadata and global-window reads before selecting request admission, upstream concurrency limits or cross-instance coalescing. |
| Architecture decision | Evaluate origin admission for HTML, bounded upstream concurrency and shared caching separately. Require preserved streaming, verified-zero/missing-data semantics, stale-cache recovery and fixture tests for faults and cross-instance consistency before an owner-approved change. No API schema or Redis changes here. |
| Accessibility and devices | Device emulation and axe supplement the owner gate. Real OS screen readers, physical input behavior and actual Safari remain manual requirements. |
| Performance | Synthetic lab samples and field telemetry answer different questions. This patch collects no field-vitals measurement and performs no production load tests. |

## Owner checklist and decision

1. Open the exact child Preview and confirm Home, React 365-day chart and five-package Compare. Repeat in both themes at narrow and desktop widths.
2. Navigate About → Data, Back → About, Forward → Data, Home → React. Confirm the URL, heading and rendered chart each time. Save a timestamp and browser/OS version if a click misses.
3. Inspect all five legend labels using touch or keyboard, switch Absolute/Indexed, confirm the explicit UTC baseline and inspect daily values. Export CSV and open the downloaded file, checking date range, packages, metadata and values.
4. With keyboard and native 200%/400% zoom, confirm Export/More dismissal, focus visibility below the sticky header, the inspector and table. Review attached screenshots if Safari is unavailable. Record physical Safari and OS screen-reader checks as NOT TESTED until performed.

Production remains **HOLD**. A successful child CI establishes the bounded automated QA result for its exact SHA. Release still requires review of open #28 evidence and explicit owner approval.
