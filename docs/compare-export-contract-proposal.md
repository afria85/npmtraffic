# Compare export selection contract proposal

**Proposal for owner review.** This document describes observed behavior and two contract options. It applies to `/api/v1/compare`, its JSON alias `/api/v1/compare.json`, `/api/v1/compare.csv`, and `/api/v1/compare.excel.csv`.

## Current behavior

A production-mode Next.js fixture produced 48 responses across twelve request shapes and four routes. Forty returned HTTP 200 and eight returned HTTP 400. A read-only production sample confirmed the six-input mismatch across JSON and both CSV variants. Reproduce using `?packages=react,vue,svelte,angular,axios,next&days=7` on each route. URL-encode mixed or invalid names.

| Input order | HTTP | Actual payload order | Attachment package segment | JSON warnings |
| --- | --- | --- | --- | --- |
| react, vue | 200 | react, vue | react, vue | none |
| vue, react | 200 | react, vue | vue, react | none |
| vue, react, svelte, angular, axios | 200 | angular, axios, react, svelte, vue | all five in input order | none |
| react, vue, svelte, angular, axios, next | 200 | angular, axios, next, react, svelte | all six in input order, including omitted vue | cap message |
| next, axios, angular, svelte, vue, react | 200 | angular, axios, next, react, svelte | all six in the given input order | cap message |
| react, vue, svelte, angular, axios, next, !invalid | 200 | angular, axios, next, react | seven sanitized input names | cap and invalid item messages |
| vue, REACT, react, Vue | 200 | react, vue | vue, react, react, vue | none |
| react, react | 400 | no data | no attachment | `INVALID_REQUEST`, compare requires 2–5 packages |
| react, vue, !invalid | 200 | react, vue | react, vue, invalid | ignored invalid package |
| react, !invalid | 400 | no data | no attachment | `INVALID_REQUEST`, compare requires 2–5 packages |
| react, vue, invalid name with filename punctuation | 200 | react, vue | punctuation sanitized in requested segment | ignored invalid package |
| integrity-fixture, react | 200 | integrity-fixture, react | integrity-fixture, react | none |

Filenames join requested package segments with double underscores and include UTC dates and range. For example, the six-input JSON request produced `npmtraffic__react__vue__svelte__angular__axios__next__7d__2026-11-08-2026-11-14__utc.json` in the fixture. Both CSV variants substitute their own extensions and preserve the requested segment order. JSON reports “Only the first 5 packages are compared.” The implementation normalizes, deduplicates, sorts and caps before syntax validation and existence checks. This can leave fewer than five even with five or more valid inputs. CSV comment headers carry provenance and coverage without the selection warnings.

The observation fixture's first shared day contained a verified zero. Its missing and unverified days used JSON null and blank normalized CSV cells. An available value from the other package was excluded from that shared comparison on both dates. Original upstream values appear in separate fields. The two CSV dialects use comma and semicolon respectively.

## Options

| Option | Compatibility | Operational behavior |
| --- | --- | --- |
| A. Reject requests above five distinct valid names | Existing 200 responses for broad requests become validation errors. Clients would need to choose inputs or partition them. Partitioning can change shared observation denominators. Version this change or announce a migration window. | Cap validation can occur before observation fetches. Publish the counting rule and a stable validation code. |
| B. Keep the cap and make selection explicit | Preserves successful status and selection. Filename-sensitive scripts may need to accept both attachment patterns. Strict JSON validators may reject new fields. Importers that skip a fixed number of metadata lines may break if the CSV preamble grows. | Reports actual exported packages and cap status in each format while preserving data serialization. |

## Recommendation

Approve B for the existing endpoints. Preserve the current normalization, candidate order, cap position, HTTP status, dates and observation semantics. Changing the position of validation relative to the cap should be a separate selection change.

1. Generate every attachment filename from the exported packages in payload order. Reuse filename character sanitization and its existing length cap. Document that long names can be shortened and exact identity is available from the payload.
2. Add a bounded JSON selection object with distinct normalized input count, exported packages, a cap-applied boolean and omitted counts by documented reason. Retain existing warnings during migration. Separate invalid or unavailable candidates that were evaluated from candidates beyond the cap. Keep arbitrary invalid input out of HTTP headers.
3. Publish bounded response headers for cap status and aggregate omitted counts on both CSV variants. Keep the existing comment count, header row, delimiter, date order, and cell encodings in the first release. CSV headers are available during HTTP download. A saved file retains the filename and column headings for package identity. A revised offline format can add selection comments after importer testing.
4. Preserve verified zero as zero, unavailable normalized values as null or blank, and per-package source values and statuses. Continue to escape CSV cells and sanitize filenames. Use fixed, bounded reason codes for machine-readable diagnostics.

## Rollout and tests

The owner must approve status and selection policy, metadata shape and filename migration before runtime work. Test two, five, six and seven inputs, reordering, normalized duplicates, invalid or unavailable packages, scoped names, extreme filename lengths, verified zero and unavailable observations. Compare package order and dates across all formats. Exercise strict JSON readers and spreadsheet importers for both dialects.

Rollback is a revert of the approved runtime change. Document the filename transition so consumers can accept both patterns during rollout.
