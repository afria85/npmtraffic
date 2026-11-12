# Runtime reliability

Traffic windows end on the last complete UTC calendar day. The traffic cache key includes package and exact UTC bounds. Registry-wide observation cache keys include the same bounds. Traffic and registry observations refresh after five minutes. When an upstream refresh fails, a matching traffic snapshot can be served for up to 24 hours from its original fetch. It retains its fetch time, observation coverage, and stale warning. A successful partial refresh is a new observation snapshot. See [npm observation integrity](npm-observation-integrity.md) for eligibility and revision rules.

Traffic snapshots, search and existence results, and registry metadata use bounded process memory. A cold instance starts with an empty cache and a new health snapshot. Concurrent traffic requests share work within an instance. Traffic JSON and CSV responses use `Cache-Control: no-store`. Successful public search and existence responses can be served by the CDN for 15 minutes with stale-while-revalidate up to 24 hours. A CDN cache hit can skip the origin handler and its rate-limit check. Redis is used for shared rate-limit counters when configured.

| Environment configuration | API behavior |
| --- | --- |
| Neither Redis binding | Instance-local rate limiting |
| One Redis binding | Instance-local rate limiting, with an incomplete configuration notice |
| Both Redis bindings, valid response | Shared sliding-window decision |
| Both Redis bindings, timeout, HTTP error or invalid response | Request denied for the configured shared limiter. Existing public HTTP response and retry contract apply. |

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` together in the intended Vercel environment. The November 12, 2026 audit found neither binding in production. Validate Redis EVAL permissions, concurrency, TTL, and recovery with an isolated staging database and `UPSTASH_VERIFY_STAGING=1 npm run verify:upstash` before enabling the shared limiter in production. Keep both values in secure environment bindings.

`/status` reads the current runtime's configuration and recent traffic and Redis outcomes without contacting an upstream service. A shared configuration can show no observed decisions when the status request lands on a fresh instance. Serving a cache hit or stale snapshot updates the latest cache result while the last successful upstream fetch keeps its original timestamp. Public health output uses internal error codes and timestamps.

The local reproduction `{ "result": [1, null, null] }` previously granted an allowance because the limiter converted every returned value to a number. Only an integer decision and count plus a valid in-window timestamp can now authorize a request. The mocked regression verifies that this malformed response fails closed. No live Redis verification was performed against production.
