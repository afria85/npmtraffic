# Data-trust iteration — npmTraffic (16 November 2026)

**Status:** stacked Draft only; owner review and production release still HOLD.

## Scope and source of truth

- Base: exact Draft PR #27 HEAD `703739cabe01d6fdc2f6cf0d62904bb2e54e6076`, itself stacked on Draft #26. Do not merge this Draft independently.
- Findings: [Issue #30](https://github.com/afria85/npmtraffic/issues/30) concerning global MAD and normal weekly cycles; [Issues #28](https://github.com/afria85/npmtraffic/issues/28) and [#29](https://github.com/afria85/npmtraffic/issues/29) remain separate reliability/hardening investigations.
- Observed external review of 2026-11 React numbers is *not* a fresh npm verification by this project change. The code-based conclusion is grounded in the exact `lib/derived.ts` formula and reproducible synthetic fixtures.

## Implemented (no data-contract change)

1. Document, rather than silently replace, **global MAD**. The existing `computeOutliersMAD` formula compares all eligible days against one median and MAD regardless of weekday. The visual Insights card now uses **Global MAD flags** and warns that weekly patterns may be flagged. The Data documentation describes this limitation. Daily derived-table tooltip clarifies it. Raw counts, date classifications, API v1 `is_outlier` and `score`, CSV/Excel/JSON exports and static method description remain untouched.
2. Add small, textual **Sat/Sun UTC indicators** next to ISO dates in the *existing* Package daily table to help interpret recurring weekend drops. No Week View, extra network request, new dependency, or export-schema change.
3. Replace package metadata copy describing a borrowed "GitHub-style table" with a truthful description of npmTraffic's UTC observations, coverage and exports. Preserve canonical package URL and intentional range-specific OG share URL; dynamic per-package OG image remains first, fallback second. An OG URL differing from a query-free canonical is not itself proof of a broken share card.
4. Add deterministic tests for:
   - 30 days of stable weekly 41M weekday / 23M weekend observations, where the **existing global MAD correctly flags exactly 10 weekend troughs**, demonstrating why it should not be marketed as incident detection.
   - Missing/unverified gap neutrality, legitimate zeros, zero MAD without divide-by-zero.
   - Disjoint package availability (no shared eligible dates): all totals and shares **null**, never fabricated zero, with preserved upstream values.
   - Verified zero on shared included dates: zero stays a valid observation and is part of the shared denominator, with correct next-day deltas and package totals.
   - Existing Indexed baseline rules are already covered in `tests/chart-scale.test.ts` (first shared positive date, missing baseline unavailable); do not duplicate working tests.
   - Mobile Package display of UTC weekends and global MAD caveat; dynamic metadata vs canonical/share image.

## Explicitly deferred

- No new seasonality-adjusted anomaly metric until the owner approves independently named output, sufficient-history policy, and false-positive/false-negative benchmarks. Three observations per weekday is not automatically robust. 7/14-day windows often lack evidence for stable seasonal baselines.
- No full weekly heatmap, Week View, direct line labels, new typography or revised visual identity. Those are feature/design proposals, not proven release defects.
- No rewrite of SSR rate admission, npm byte caps, Vercel security, Upstash/Redis, credentials or API v1.
- No manual screen-reader, physical iOS/Android, field performance or protected live browser claims without executed evidence.

## Verification

This document describes code changes and expected tests, not test completion. Record final exact-head GitHub Actions run and Vercel Preview only when verified; CI pass is not proof of all possible bugs or manual WCAG compliance.

**Release disposition:** keep #26, #27 and the stacked data-trust PR Draft; production HOLD.
