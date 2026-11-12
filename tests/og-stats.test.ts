import assert from "node:assert/strict";
import { test } from "node:test";
import { listDatesBetween } from "../lib/dates";
import { buildOgComparisonStats, buildOgPackageStats } from "../lib/og-stats";
import { summarizeCoverage, type Observation } from "../lib/observations";
import { rangeForDays } from "../lib/query";
import type { TrafficResponse } from "../lib/traffic";

const range = rangeForDays(7, new Date("2026-01-04T00:00:00Z"));
const meta: TrafficResponse["meta"] = {
  source: "npm", fetchedAt: "2026-01-04T01:00:00Z", registryFetchedAt: "2026-01-04T01:00:00Z",
  cacheStatus: "STALE", isStale: true, staleReason: "UPSTREAM_5XX", derivedMethod: "fixture",
};

test("package share statistics keep UTC gaps, confirmed zeros and stale provenance", () => {
  const values = [7, 0, null, 3, 5, null, 4];
  const series: Observation[] = listDatesBetween(range.startDate, range.endDate).map((date, index) => {
    const downloads = values[index];
    return {
      date, downloads, upstreamDownloads: index === 2 ? 0 : downloads, registryDownloads: 100,
      status: index === 2 ? "unverified" : downloads === null ? "missing" : "available",
    };
  });
  const coverage = { ...summarizeCoverage(series, ({ downloads }) => downloads !== null), missingDays: 1, unverifiedDays: 1 };
  const stats = buildOgPackageStats({ series, range, coverage, totals: { sum: 19, avgPerDay: 4 }, meta });
  assert.deepEqual(stats.sparkline, values);
  assert.equal(stats.percentChange, null);
  assert.equal(stats.total, 19);
  assert.equal(stats.coverage.includedDays, 5);
  assert.equal(stats.isStale, true);
});

test("comparison share statistics retain null totals and zero shared coverage", () => {
  const packages = [{ name: "react", total: null, share: null }, { name: "vue", total: null, share: null }];
  const coverage = { requestedDays: 7, includedDays: 0, latestIncludedDate: null };
  const stats = buildOgComparisonStats({ packages, coverage, range, meta });
  assert.deepEqual(stats.packages, packages);
  assert.deepEqual(stats.coverage, coverage);
});
