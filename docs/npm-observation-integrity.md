# npm download observation integrity

## Incident evidence

At 12:51 UTC on 2026-11-12, the React 30-day production endpoint returned October 13 through November 11, inclusive. Its metadata reported a fresh application cache miss at 12:51:27.724 UTC. Vercel reported a cache miss with age zero. The production series matched all 30 npm React range records. The old total was 911,327,529 and the average was 30,377,584, calculated over 30 rows. [Production endpoint](https://npmtraffic.com/api/v1/package/react/daily?days=30) · [npm React range](https://api.npmjs.org/downloads/range/2026-10-13:2026-11-11/react)

| UTC date | Production React | npm React | npm Vue | npm registry total | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| 2026-10-14 | 0 | 0 | 0 | 0 | Unverified |
| 2026-10-15 | 0 | 0 | 0 | 0 | Unverified |
| 2026-10-19 | 0 | 0 | 0 | 0 | Unverified |
| 2026-10-20 | 0 | 0 | 0 | 0 | Unverified |
| 2026-11-11 | 41,360,749 | 41,360,749 | 4,110,746 | 50,167,841,549 | Available in this sample |

The range probes returned the same four zeros across both packages and the registry-wide series. Individual npm point queries also returned zero for React and the registry on those dates. The point and range endpoints may share a data source. No replacement count can be established from those probes. An earlier production observation supplied with the incident had a zero for November 11. The later React and registry point queries both returned positive values for November 11, and the registry's last-day query identified November 11 as its latest published date. The earlier response's upstream snapshot and cache headers were unavailable, so the transition is consistent with delayed publication or a revision and its exact timing and cache path remain unknown. [npm Vue range](https://api.npmjs.org/downloads/range/2026-10-13:2026-11-11/vue) · [npm registry range](https://api.npmjs.org/downloads/range/2026-10-13:2026-11-11) · [November 11 point](https://api.npmjs.org/downloads/point/2026-11-11/react)

An explicit React query through November 13 returned zero for both November 12 and November 13 while it was still November 12 UTC. npm documents that counts are processed after UTC midnight and that the relative last-day endpoint can fall back to an earlier date if the latest counts have yet to land. Calendar completion and publication are separate. [npm download-count documentation](https://github.com/npm/registry/blob/main/docs/download-counts.md)

The previous normalizer validated date membership, uniqueness, and safe nonnegative integer counts. It required every date to appear, so the four explicit zeros passed validation. The response builder calculated its denominator, moving averages, and MAD from all normalized rows. For example, the October 16 MA3 was 12,110,411.3 using the October 14 and 15 zeros. The previous comparison code also defaulted an absent package/date value to zero. The application could retain long-window snapshots for 12 hours and API responses allowed an additional CDN stale-while-revalidate period. Those caches could extend exposure to a provisional value. The reproduced production response was fresh, so the cache was unnecessary to reproduce the defect.

At 13:00 UTC, local normalization against the live npm endpoints yielded 26 available days, four unverified dates, a sum of 911,327,529 and an available-day average of 35,051,059. October 16 MA3 was unavailable. November 11 remained 41,360,749.

## Observation policy

The requested window contains exactly the selected number of UTC calendar days through yesterday. Its dates stay fixed even when npm publication lags. Each package row carries the original package and registry counts in `upstreamDownloads` and `registryDownloads`. A null source count means no usable source value was obtained. `downloads` is the value eligible for statistics.

| Status | Rule | Eligible value |
| --- | --- | --- |
| Available | Package supplies an integer count and the registry supplies a positive count at least as large | Package count, including explicit zero |
| Missing | The package response omits the date | Null |
| Unverified | The package supplies a count while the registry value is missing, zero, unavailable, or smaller than the package count | Null |

A zero from the package alongside positive registry activity can represent a valid zero. A registry-wide zero is evidence that npmTraffic cannot verify that day. These rules use publication signals, with no inference of a replacement count. Duplicate dates, dates outside the requested window, invalid payloads, and unsafe numeric totals are upstream errors. An otherwise valid incomplete response supersedes an older snapshot for that window. Each response exposes the requested and included day counts, latest included date, and package observation and registry fetch timestamps. Package responses also report counts of missing and unverified days.

## Calculations and representations

- Package total is the sum over available days. Average is that total divided by available days, rounded to the nearest integer. Both are null when coverage is zero.
- MA3 and MA7 are the means of the last three and seven consecutive available calendar days, rounded to one decimal. A gap resets the trailing window.
- MAD uses the median of available counts and the median of their absolute deviations. The score is `(x − median) / (1.4826 × MAD)` and the outlier threshold is `|score| ≥ 3`. An excluded day has no score or classification. With zero MAD, available days keep score zero and the detector flags no outliers.
- A daily delta is the difference between adjacent available calendar days. Trend uses the latest two adjacent windows of `min(7, floor(requestedDays / 2))` days. Both windows must be complete. Percentage is `100 × (recent − prior) / prior` for a positive prior total, rounded to one decimal. A zero denominator leaves the percentage unavailable. Comparison growth ranking requires a defined percentage.
- Peak and activity use available days. Active rate is the fraction of available days with a positive count. Consistency uses the population standard deviation divided by the available-day mean, with no consistency classification at a zero mean.
- Comparison uses the intersection of available dates across every included package. A date outside that intersection contributes to no package total, delta, trend, or chart line. Per-package raw values and statuses remain in the comparison payload. A package's share is its shared-day total divided by the sum of shared-day totals, expressed as a percentage rounded to two decimals. A zero denominator leaves shares unavailable.
- JSON uses null for excluded counts and statistics. Standard and Excel CSVs use blank cells and retain the raw counts and status in additional columns. Charts break their paths at gaps, including moving average paths, and tooltips and tables label unavailable observations. Package KPIs show their available-day denominator. Comparison KPIs show their shared-day denominator.

## Freshness and limits

Package and registry snapshots have a five-minute fresh TTL, matching the upstream cache header observed during the incident. The registry request is shared by concurrent requests for the same UTC range. Package cache entries are versioned to exclude snapshots created before this policy. A transport or validation failure can return a stale, previously checked snapshot for the exact same range for up to 24 hours after its fetch, with explicit cache status and the original timestamps. A successful partial refresh replaces the prior snapshot. If only the registry request fails and there is no cached snapshot, raw package counts are returned as unverified and that response is uncached. Statistics and exports use HTTP `no-store` so a CDN cannot extend a provisional or stale snapshot past the application policy.

npm supplies counts without a per-package finality or completeness flag. A plausible positive package count can be partial, and a package-specific zero with positive registry activity can later be revised. The registry signal cannot detect those cases. Snapshots are re-fetched after expiry and do not preserve a historical revision log. API consumers need to handle nullable counts and totals, appended CSV fields, and the coverage denominator.
