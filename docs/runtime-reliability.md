# Runtime reliability

Traffic windows end on the last complete UTC calendar day. The traffic cache key includes package and exact UTC bounds. Registry-wide observation cache keys include the same bounds. Traffic and registry observations refresh after five minutes. When an upstream refresh fails, a matching traffic snapshot can be served for up to 24 hours from its original fetch. It retains its fetch time, observation coverage, and stale warning. A successful partial refresh is a new observation snapshot. See [npm observation integrity](npm-observation-integrity.md) for eligibility and revision rules.

Traffic snapshots, search and existence results, and registry metadata use bounded process memory. A cold instance starts with an empty cache and a new health snapshot. Concurrent traffic requests share work within an instance. Traffic JSON and CSV responses use `Cache-Control: no-store`. Successful public search and existence responses can be served by the CDN for 15 minutes with stale-while-revalidate up to 24 hours. A CDN cache hit can skip the origin handler and its rate-limit check. Redis is used for shared rate-limit counters when configured.

| Environment configuration | API behavior |
| --- | --- |
| Neither Redis binding | Instance-local rate limiting |
| A missing or blank binding, unless both are absent | Fail closed without contacting Redis or granting a local allowance. Existing retry and cache fallback behavior applies. |
| Both Redis bindings, valid response | Shared sliding-window decision |
| Both Redis bindings, unsafe URL, timeout, HTTP error or invalid response | Request denied for the configured shared limiter. Existing public HTTP response and retry contract apply. |

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` together in the intended Vercel environment. The November 12, 2026 audit found neither binding in production. Keep both values in secure environment bindings. The limiter requires HTTPS and rejects URLs with embedded credentials before sending a request. The shared limiter uses Redis TIME inside the same atomic EVAL that updates the sliding window. It does not send application timestamps.

Before enabling shared limiting in production, run `npm run verify:upstash` only with authorization and the dedicated staging credentials. The verifier pins the owner-attested staging origin and identity. Supply the pinned HTTPS origin and its read/write credential through the staging runner's environment, set `UPSTASH_STAGING_ATTESTATION` to the confirmed identity, and opt in with `UPSTASH_VERIFY_STAGING=1`. A run uses at most 64 REST attempts, including up to 20 reserved for cleanup, rejects any failed limiter response outside the deliberate fault probes, and reports success only after confirming its temporary keys are absent.

`/status` reads the current runtime's configuration and recent traffic and Redis outcomes without contacting an upstream service. A shared configuration can show no observed decisions when the status request lands on a fresh instance. Serving a cache hit or stale snapshot updates the latest cache result while the last successful upstream fetch keeps its original timestamp. Public health output uses internal error codes and timestamps.

The local reproduction `{ "result": [1, null, null] }` previously granted an allowance because the limiter converted every returned value to a number. Only an integer decision and count plus a valid in-window timestamp can now authorize a request. The mocked regression verifies that this malformed response fails closed. No live Redis verification was performed against production.

## Shared limiter activation checklist

Keep the code release and Redis activation separate. The deployed `/status` page describes the runtime that handled the request. It is useful for checking the intended mode, but a new runtime may have no shared outcome and the last outcome cannot replace deployment-wide monitoring.

1. Run the guarded verifier from the exact release commit on the pinned staging database. Archive a redacted result with the commit, command budget, quota, Redis TIME, skew, expiry and independent cleanup checks. Capture the provider's billing counter before and after a quiet staging run. Account for the verifier's non-EVAL commands and separate TIME probe when estimating billed commands per limiter EVAL. Record any mismatch between REST attempts and provider command counts.
2. Use a separate production database and a least-privilege write-capable credential where supported. Confirm its HTTPS origin, deployment scope, region and grant from the provider console. Use paired server-side bindings scoped to the Production environment for an approved deployment. Keep the token out of client bundles, logs and diagnostic output, and keep the staging verifier pinned to staging.
3. Measure at least seven representative days of limiter-gated origin traffic, including peak minute throughput, cache revalidations and invalid or denied requests that reach the limiter. Count all package and Compare data/export routes, search, validate and eligible dynamic OG images. One application REST EVAL is attempted per limiter decision, including denials. Some requests return before admission, and CDN cache hits can skip the function. Function invocations per route give an upper-bound proxy for grouped handlers. Confirm actual provider command, bandwidth, storage and throughput accounting before choosing capacity.
4. Before promoting the configured deployment, record an eligible known-good deployment with both bindings absent. Verify alert delivery, assign a responder, and confirm that old application-clock and Redis-clock versions cannot write to the same keyspace concurrently. During overlap, an instance-local deployment and a shared deployment enforce different quotas. A partially promoted release cannot demonstrate one global quota for all traffic.
5. Verify the new deployment SHA and runtime mode after promotion. Sample ordinary package, Compare, search, validation and OG responses. Monitor shared latency, provider usage, transport failures, 429s and cached fallbacks. Do not infer shared behavior from HTTP 200 responses or use public traffic to exhaust the quota.

### Usage and alerting

Use billable commands per EVAL measured in staging times the forecast number of origin decisions, plus other commands issued against the database. The Redis script invokes four Redis commands for a denial and six on admission. These are script operations and may differ from the provider's billing units. Include Upstash storage and bandwidth and Vercel runtime cost where applicable.

Start with warning and critical thresholds at 70% and 90% of monthly or daily quota and sustained throughput limits. Confirm the applicable limits for the selected database in the provider console. Provisional service alerts are shared decision p95 above 250 ms for 10 minutes, Redis faults at or above 1% for five minutes with at least 100 decisions, and unexpected cold 429s above twice the baseline over 10 minutes. Tune thresholds to measured volume and the release latency budget. Treat incomplete binding configuration as a release blocker. Use synthetic checks or an absolute failure count on low-volume routes.

Log or count route, outcome category and elapsed time without credentials, keys or raw IPs. Aggregate quota denials and Redis faults separately. The public 429 response intentionally shares the same status in both cases, and warm package responses or generic images may return 200. This version does not emit dedicated deployment-wide limiter outcome telemetry. Establish and test the telemetry before activation.

### Rollback

Use the pre-verified deployment with both bindings absent, or an independently approved redeployment with both bindings removed together. Vercel Instant Rollback restores prior deployment configuration alongside code. Verify the restored SHA and runtime mode, representative APIs and cached data. Drain old writers before reuse of the same Redis keyspace and let the counters expire for a full window after the last possible write. Keep staging credentials and production credentials separate.

- [Upstash pricing and budgets](https://upstash.com/pricing/redis)
- [Upstash usage metrics](https://upstash.com/docs/redis/howto/metrics-and-charts)
- [Vercel CDN caching](https://vercel.com/docs/how-vercel-cdn-works)
- [Vercel Observability](https://vercel.com/docs/observability/insights)
- [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback)
