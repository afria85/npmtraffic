# Compare export selection

The v1 Compare API applies the same selection rules to JSON, standard CSV, and Excel CSV. It trims and lowercases input, discards empty entries, removes duplicates, sorts the remaining names in the existing alphabetical order, and takes at most five. It validates and fetches only those candidates. An invalid or not-found candidate consumes its slot. An entry beyond the cap is omitted without a validation or availability decision. At least two candidates must remain after both checks for the API to return an export.

The Compare page uses that same cap order and keeps the original request entries in its range and export links when they affect selection. Opening a mixed deep link can therefore show fewer packages than the previous page, which discarded invalid entries before applying the cap. Ordinary comparisons keep their existing canonical URLs. Share links continue to identify the canonical candidate set.

## Successful response metadata

Both JSON routes, `/api/v1/compare` and `/api/v1/compare.json`, return a top-level `selection` object alongside the existing payload and `warnings`. Warning text is preserved. Multiple not-found warnings follow candidate order.

| JSON field | Type | Meaning |
| --- | --- | --- |
| `requestedCount` | Integer | Distinct nonempty normalized names before the cap |
| `exportedPackages` | String array | Two to five validated package names in exactly the same order as `packages` and the CSV columns |
| `exportedCount` | Integer | Number of exported packages |
| `capApplied` | Boolean | Whether more than five distinct normalized names were requested |
| `capOmittedCount` | Integer | Number of distinct names beyond the cap |
| `invalidCount` | Integer | Candidates rejected by name validation |
| `unavailableCount` | Integer | Evaluated candidates reported not found by npm |
| `duplicateCount` | Integer | Extra entries removed by normalized deduplication, excluding empty entries |

Counts are nonnegative. `requestedCount` equals the sum of `exportedCount`, `capOmittedCount`, `invalidCount` and `unavailableCount`. `duplicateCount` is separate from that total. The exported names have the existing package-name length limit of 214 characters. Upstream service errors continue to use the existing error contracts.

All four routes include these successful-response headers: `X-Compare-Cap-Applied` (`true` or `false`), `X-Compare-Exported-Count`, `X-Compare-Cap-Omitted-Count`, `X-Compare-Invalid-Count`, `X-Compare-Unavailable-Count` and `X-Compare-Duplicate-Count` (decimal integers). The headers contain only counts and a boolean.

## Saved filenames and CSV import

Attachments use exported names in payload order. A filename ending with `__truncated-5-of-6__7d__2026-11-08-2026-11-14__utc.csv` describes five exported packages out of six distinct requested names where the cap applied. The count can be below five when candidates are also invalid or not found. When the cap did not apply and some distinct names were excluded, `__partial-2-of-3__` identifies that outcome. The marker, range, UTC suffix, and extension remain present within the 180-character limit. When shortening is necessary, a 16-digit SHA-256 prefix represents the full ordered package list. Use the JSON package list or CSV columns for exact names.

Both CSV variants preserve the existing 12 metadata comments, column order and row count. Excel CSV retains `sep=;` before the comments. A selection comment would move the header row for importers that skip a fixed number of lines. The filename and column headers preserve the selection signal after saving. The website explains the selection before download, and the HTTP headers expose the omission reasons to API clients.

Strict JSON validators should allow `selection`. Filename-dependent import automation should accept the canonical order and new suffixes. A Compare page and a later HTTP download can see different npm observations or UTC windows. The notice describes the snapshot rendered by the page. The Package and Compare menus link to the export endpoints, and the response attachment header supplies the saved filename. If the response is an API error, the browser opens that response without creating an export file.

### Client migration

A reader that rejects unknown root properties needs to allow the new selection object or update its schema. Existing reader code that selects only the known properties can continue using them. CSV automation can recognize both filename families by checking for the csv or excel.csv extension and an optional truncated or partial marker. Use the CSV column names for package identity and the existing from and to metadata for the range, including when older hashed names drop part of the date suffix. Scripts that match the complete historical basename or assume one segment per package need to change. These checks cover fixed-offset parser fixtures and both CSV wire formats. Desktop spreadsheet applications and third-party importers were not exercised.
