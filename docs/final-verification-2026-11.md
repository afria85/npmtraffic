# Follow-up verification — 2026-11-09

Status: **STAGING REQUIRED — do not merge or deploy yet.** Continues the existing branch; the master audit was not restarted.

## Commit reconciliation (VERIFIED)

`git log --reverse --format='%H %s' 233d84e..2388cbb` contains exactly seven commits:

| SHA | Workstream |
| --- | --- |
| `57dc8a4a36625d6957ad4f5b5a9a5bddeae0cfcc` | Patched dependencies and type fixtures |
| `2a723c78019befba392958b3f60135ce044e04dc` | Data completeness, upstream deadlines, Redis and prewarm hardening |
| `c8c81a02b8b8a661f3abdd1d00ec07abf495c921` | Canonical/indexing and accessible controls |
| `c9026d94eb4cf2f09b008567f00b3d4401d385e9` | Local saved comparisons and data quality |
| `df22b1dc6f99c84849941c3751d06c5065477733` | Browser/axe smoke and CI |
| `65edf0e5a9def17362bff79a5cde15669c892c21` | Audit/deployment/rollback documentation |
| `2388cbb0e55dc4f60e7056c0b2a8f168eedbb439` | Integer-overflow protection and regression |

Initial working tree was clean; branch and full HEAD matched the continuation request. No original commit was reset, squashed or omitted. Original audit commit listing corrected.

## External evidence

| Check | Result | Meaning |
| --- | --- | --- |
| Runtime status | Current observations, revision 1 enforced, custom allowed hosts empty | Saved onboarding draft has not been applied to this instance |
| Live npm Downloads API | Fresh curl CONNECT fails with proxy 403 | **BLOCKED**, not a response from npm |
| Live app data client | `npm run verify:live-npm` executes six probes: react and @types/node × 7/30/365 days; exit 2, all unavailable | No returned daily observations, no successful live data validation; numeric zero was not substituted |
| Latest requested day | All six probes request through 2026-11-08 UTC | Actual latest npm reporting day and missing-final-day frequency remain unknown |
| Upstash | No configured runtime binding, no exported URL/token, no local credential env file | **BLOCKED**; no Redis command sent |
| Vercel | No token/runtime deployment identity, no .vercel/project.json | Actual ingress/header rewriting and deployment settings **NOT TESTED** |
| GitHub API | `gh api repos/afria85/npmtraffic` receives Forbidden; api.github.com absent from enforced allowlist | Draft PR and remote Actions observations blocked by API route; this does not establish missing Git authentication |
| Git read | Existing HTTPS origin read succeeds; main still 233d84e, audit branch initially absent | Read access verified; write permission must be tested independently |

The network draft now preserves existing custom hosts and adds `api.github.com` alongside `api.npmjs.org`, `cdn.playwright.dev`, `storage.googleapis.com`. Save is confirmed; runtime application and publication are not. Review/save in environment settings, then refresh status and retry with a fresh connection. Never paste credential values into chat.

## Reusable external checks

`npm run verify:live-npm` uses the actual `fetchTraffic` client with inherited proxy/trust and no fixture preload. It records raw returned window bounds, latest returned day, explicit zeros, final-day presence and normalized app output when access works. Exit 2 means one or more checks failed or were blocked; it must never be reported as a pass.

Sample established and scoped packages at 7, 30 and 365 days after access is applied. Repeat around UTC midnight and during the npm reporting delay before concluding that yesterday is routinely complete. Add a known newly published package when its history semantics can be observed. A single successful sample does not establish a publication SLA. Do not shift only one comparison dataset or silently alter a v1 requested range. Any availability-based fallback must use a consistent explicit window, preserve date/export metadata, and retain missing-middle-day rejection with regressions.

`npm run verify:upstash` sends no commands unless both staging URL/token bindings exist and `UPSTASH_VERIFY_STAGING=1` is explicitly set. Use an isolated staging database/token via secure environment settings. The script exercises actual application EVAL under 20 concurrent requests (limit 5), checks exactly five allowed, sorted-set size, TTL, expiry and recovery, and deletes only its uniquely generated temporary key. It must not be pointed at production by default. Missing prerequisites exit 2. A passing local mock is not a live Redis pass.

Do not change production variables or create a Vercel deployment as part of this task. Verify Vercel's managed header at the real staging ingress before treating the local identity unit tests as proof of deployment safety. Confirm Redis failure behavior under staging traffic so intentional fail-closed 429s are operationally acceptable.

## Local revalidation

Commands rerun from the existing checkout:

- `npm ci --cache /tmp/npm-cache --no-audit --no-fund`
- `npm test`: 143 passed, zero failed/skipped/cancelled.
- `npm run lint`, `npx --cache /tmp/npm-cache tsc --noEmit`, `npm run build`: passed.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:smoke`: eight fixture-backed browser/axe tests passed in 10.6 seconds.
- `npm audit --cache /tmp/npm-cache --omit=dev`: zero advisories.
- Full audit: eight moderate development-only advisories, zero high/critical; same chain as initial audit.

Follow-up changes are limited to verification scripts, npm script entries, precise audit commit inventory, this evidence document and enabling CI on `audit/**` pushes. No application data-window or limiter behavior was changed without new upstream evidence. No credential values are stored in these files.

## Review gate

Keep the PR draft and merge/deployment blocked until live npm range semantics, Upstash permissions/concurrency and Vercel ingress are verified in staging, and the GitHub workflow for the reviewed head passes. Local success alone does not satisfy those gates. Use the deployment and rollback checklist in the original audit only after owner review.

## GitHub publication evidence

`git push -u origin HEAD:refs/heads/audit/engineering-2026-11` succeeded for follow-up commit `a833eb83a1c831bf6fba87a00507173fc8b54c58`. A subsequent `git ls-remote` confirmed that exact branch SHA and unchanged main `233d84e18aed92dfb46e83171b035a732b35d9d0`.

The public GitHub Actions page independently confirmed [CI run #157](https://github.com/afria85/npmtraffic/actions/runs/42683129626) was triggered by that push for the correct branch/SHA. Its observed status at inspection was **In progress**, not passed. This proves remote CI started, not its final conclusion. Authenticated logs and PR creation still need the API route. An unauthenticated curl to api.github.com independently confirmed a CONNECT 403 from the proxy, distinguishing policy denial from GitHub token rejection.

The prepared Draft PR title is `Harden npm data integrity and security; add staging verification gates`; its complete body is [draft-pr-2026-11.md](draft-pr-2026-11.md). Once api.github.com is applied to the runtime policy, use the existing GitHub binding and check for an existing head-branch PR before creating one:

```sh
gh pr list --repo afria85/npmtraffic --head audit/engineering-2026-11 --json number,url,isDraft
gh pr create --repo afria85/npmtraffic --base main --head audit/engineering-2026-11 --draft --title 'Harden npm data integrity and security; add staging verification gates' --body-file docs/draft-pr-2026-11.md
```

No PR has been created in this session. Do not substitute a compare/create URL for evidence of an actual Draft PR. No merge or deployment was invoked. The documentation publication record is committed after `a833eb8`; use remote HEAD and the latest matching CI run to review the final branch.
