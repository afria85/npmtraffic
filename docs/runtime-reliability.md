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
