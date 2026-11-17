# Issue #29 · Bound the npm download-range response

## Evidence and limit

The former reader passed the complete response to Fetch JSON parsing under a five-second deadline, so a server could send more bytes than expected within the deadline. Three negative tests failed against pinned Draft #31 `3062df3bcae42e0bbda65f5f65ea3b78be726f11`: the baseline accepted oversized streams with and without Content-Length, and refreshed a stale cache with the same oversized payload. This is a source-backed resource risk. There is no observed exploit or production incident.

Three benign public GETs on 17 November 2026 sampled React, scoped @angular/core and registry-wide totals over the same full 365-day window. Decoded payloads were 15,278, 14,751 and 16,360 bytes respectively. All were gzip responses with no Content-Length header. The 18,532-byte synthetic upper comparison uses 365 canonical rows with 16-digit values and a 214-character package name. It is a conservative shape calculation, since real observation validation also bounds the sum. A 65,536-byte cap gives more than 3.5× headroom over that shape and four times the largest sampled response. This small sample does not estimate a production distribution. [Raw size metadata](range-sample.json)

## Parsing and cache contract

- `lib/npm-client.ts` reuses the shared reader and checks the **decoded** stream bytes. The code consumes the decoded body even if Content-Length is absent, misleading, or represents a compressed wire size. A real loopback gzip test accepts exactly 65,536 decoded bytes and rejects 65,537 under a small wire Content-Length.
- The existing AbortSignal is passed to Fetch, remains active through body consumption, and is checked before decoding/parsing. Timeouts retain their original exception. Default UTF-8 decoding matches the previous Fetch JSON behavior. Empty, malformed, partial and oversized JSON use the existing parse failure.
- `lib/bounded-bytes.ts` initiates cancel on overflow and releases its lock in finally. The failure does not await a pending cancellation promise. No partial body is parsed. The original package 404 and registry confirmation path is unchanged.
- The package cold-error path retains 502 UPSTREAM_UNAVAILABLE. An oversized refresh preserves stale observations and prior metadata. An oversized registry response results in unverified package observations on a cold read and leaves the cache empty. Once registry reads recover, an explicit verified zero remains zero. The endpoint paths, response fields, observation states and export contracts are unchanged.

Run `node --import tsx --test tests/npm-range.test.ts` for the focused regressions. The tests use mocks or a local compressed HTTP fixture. They do not connect to Redis or public npm. Exact CI and Preview are linked from the Draft.

## Read-only SSR risk memo

Package and Compare pages call the observation services directly. API route rate limiting is at the API handlers and does not meter these page entry points. Compare accepts no more than five package names. A cold instance can make one downloads-range request per package and one shared registry-total range request. Requests for the same keys on that instance coalesce in flight. Traffic and registry caches are instance-local. The observation cache has a five-minute fresh window and traffic can reuse known stale observations for up to 24 hours on upstream failure. Repository/version metadata has its own reads and bounds. CDN hits may avoid origin work when policy permits. Platform-wide admission controls and live origin load were not measured.

| Option | Tradeoff |
| --- | --- |
| Decoded range cap in this Draft | Bounds retained upstream body size without an additional network round trip. A future upstream expansion could take the existing unavailable/stale path. |
| HTML admission at the platform or application | Requires route/cache measurements and an explicit availability decision. It can reject legitimate page loads and may bill for additional work. |
| Distributed limiter or cache | May reduce cross-instance duplication and add provider latency, reliability, secret-management and usage costs. This requires a separate owner decision. |

No page admission, rate limit, security setting, Vercel configuration or production change is part of this Draft. Keep physical Safari and Android, OS screen reader, and field CWV checks marked NOT TESTED. The companion #28 handoff contains the concrete manual flow.
