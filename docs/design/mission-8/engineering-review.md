# Mission 8 engineering review

## Execution and baseline

The order was to verify production and the existing drafts, capture the #26 baseline, ship one reversible UI and provenance slice, then test candidate builds and the exact Preview. The stack is rooted at Draft #26 commit `06b413038eb47f0022695fed51b91c1252b95b2c`. Production and remote main were observed at `da9b1989d84869a8f79538afd32e01d1d2e4381e`. Production Status rendered an instance-local view. Draft #25 supplies visual research. The stacked base retains #26's plot scale, indexed baseline and custom color work.

## Defect ledger

| Finding | Class | Evidence and change | Regression check |
| --- | --- | --- | --- |
| Popular Angular link identified the wrong package. | Verified defect | The former shared catalog entry was `angular`. Home and search fallback now use `@angular/core`. | Browser follows the encoded scoped link. |
| Sitemap indexed range-specific package URLs. | Verified inconsistency | Sitemap now uses the same canonical URL builder as package metadata. | Unit test verifies a scoped entry, no range query and no redirect. |
| Long active ranges disappeared into More. | Reproduced UX issue | The existing trigger displays the selected range on mobile for 30 days and whenever a longer menu option is current. It retains its focus target and constrains menu height. | Browser keyboard, touch, history and native zoom exercises. |
| Coverage conflated the requested and observed end, while a generic header guessed freshness. | Verified copy defect | Observation details separate the requested UTC dates, latest eligible observation, snapshot and source. The compact state keeps the denominator and supplied gap counts. | Partial fixture with missing and unverified dates and valid zero. |
| Compare label did not describe the measured increase. | Verified copy defect | “Largest relative increase” identifies the comparison. The detail supplies the two equal observation windows. Roadmap now lists saved comparisons as shipped. | Existing insight tests and local saved-comparison browser coverage. |
| Series names were below the plot and a five-series table overflowed. | Reproduced friction | The key precedes the plot and carries the line pattern. A native selector projects one package without changing the date range, chart or export. | Five-series fixture checks the legend, scope, valid zero, exclusions and return to the full table. |
| A horizontal scroll hint could cover a focused table without horizontal overflow. | Reproduced regression | The initial implementation retained the full-table hint because the container width did not change. Focused mode disables hints and leaves the same scroll container mounted. | Smoke test waits for the full-table hint, verifies its absence when focused and its return in full view. |

## Functional and accessibility matrix

- Browser chart smoke exercises the supported 7, 14, 30, 90, 180 and 365 day windows and asserts dates from the receipt. Unit fixtures cover UTC midnight, leap day and year rollover.
- Data/API non-regression uses the existing zero, missing, unverified, stale, revision, shared-date and export fixtures. The Mission 8 diff changes presentation and sitemap. It leaves observation validation, aggregation, export writers and API endpoints in the base.
- The existing suite exercises search and export keyboard/touch flows, chart inspection, saved comparisons and chart style migration. The focused receipt and table probe adds a scoped package and a five-package partial comparison.
- Native Chromium zoom used the browser tab API at 200% and 400% with 632 and 316 CSS pixels available. This is separate from the 200% root text-size check. Test headers, focus, range menu, chart inspection, export menu and Compare table. Manual checks remain for NVDA or Narrator, VoiceOver, real mobile devices and perceptual color differentiation. Automated axe is one input to the review.
- Record the exact candidate SHA, CI/Preview URLs and current test counts in the Draft PR. Keep browser screenshots and lab logs with their SHA, viewport and theme. See also the design contract for the visual alternatives.

## Reliability and security memo

| Item | Classification | Evidence and next step |
| --- | --- | --- |
| Server-rendered traffic bypasses API-route limiting. | Accepted architectural tradeoff with a source-backed capacity risk | Package and Compare call the shared fetchers directly. Compare fans out to the bounded selection. Quantify cold origin request volume before proposing page-level admission control. |
| Cache and outage behavior depend on route. | Source-backed risk | Download/export API responses are no-store. Search successes permit CDN caching and only requests reaching the origin are metered. Status and in-memory traffic cache describe a single runtime. Revisit alerts and exhaustion models with operational evidence. |
| npm range response body is timeout-bounded but lacks an explicit byte limit. | Source-backed risk | The five-second abort signal remains active through JSON parsing in lib/npm-client.ts. lib/npm-versions.ts uses the shared bounded reader for packuments. Evaluate a separately tested range-body limit with real upper-bound measurements. |
| Package existence and failure semantics | Existing safeguards | A downloads 404 needs registry 404 confirmation. Failed or unverified observations stay distinct from zero. Stale cache can serve on upstream fault. Keep regression fixtures for status, generic OG and availability. |
| Browser security and payloads | Existing safeguards and manual scope | Check CSP and hydration in real browser runs. Event import and URL decompression have byte limits. CSV/JSON fixture tests cover injection-sensitive input and request IDs. This iteration does not establish a production penetration test. |

Operational changes involving cache policy, rate limiting, secrets, Redis, security headers or export contracts remain separate owner decisions. This stack requires no migration or activation. After an independently approved release, the presentation changes can be reverted as a stack.
