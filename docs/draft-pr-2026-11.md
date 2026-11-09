This change prevents incomplete npm download responses from becoming fabricated zero observations, updates Next.js/React and the production dependency graph, and hardens upstream deadlines, rate limiting, and prewarm workloads. It also corrects sitemap/canonical behavior and accessibility defects, and adds browser-local saved comparisons with deterministic browser coverage.

**Keep this PR draft. Staging verification remains required before merge or deployment.**

Changes are split into seven original reviewable commits (through `2388cbb`), followed by verification tooling/documentation. Full SHA reconciliation and evidence are in `docs/final-verification-2026-11.md`; the original audit has detailed deployment and rollback checklists.

Validation rerun locally:

- 143 unit/integration tests and eight Playwright/axe tests passed.
- Clean `npm ci`, lint, TypeScript and production build passed.
- Production npm audit: zero advisories; full audit retains eight moderate development-only entries.
- Browser data journeys use explicit deterministic npm fixtures; these do not establish live upstream correctness.

Outstanding gates:

- [ ] Run `npm run verify:live-npm` with network access: established/scoped packages at 7/30/365 days, missing final day and UTC reporting lag; do not silently shift v1 ranges.
- [ ] Run `npm run verify:upstash` with isolated staging bindings and `UPSTASH_VERIFY_STAGING=1`: EVAL concurrency, blocked-request cardinality, TTL and recovery.
- [ ] Verify Vercel staging ingress overwrites the trusted IP header and confirm production canonical/cron configuration without altering it.
- [ ] GitHub Actions for the reviewed head passes.

Current cloud policy blocks api.npmjs.org and api.github.com. No staging Upstash or Vercel credentials are available. No production settings, merges or deployments have been performed. No new infrastructure, accounts or visitor tracking were added. Public v1 success shape is preserved; incomplete responses now use the existing unavailable/stale behavior instead of false zeros.
