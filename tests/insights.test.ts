import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompareInsights, buildPackageInsights, buildWindowTrend } from "../lib/insights";

test("buildWindowTrend compares the latest week with the prior week", () => {
  const trend = buildWindowTrend([10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20]);

  assert.equal(trend.windowSize, 7);
  assert.equal(trend.previousTotal, 70);
  assert.equal(trend.recentTotal, 140);
  assert.equal(trend.delta, 70);
  assert.equal(trend.percent, 100);
  assert.equal(trend.direction, "up");
});

test("buildPackageInsights summarizes peak, activity, and outliers", () => {
  const series = [
    { date: "2026-07-01", downloads: 10 },
    { date: "2026-07-02", downloads: 0 },
    { date: "2026-07-03", downloads: 30 },
    { date: "2026-07-04", downloads: 20 },
  ];
  const insights = buildPackageInsights(series, {
    outliers: [
      { date: "2026-07-01", is_outlier: false, score: 0 },
      { date: "2026-07-02", is_outlier: false, score: -1 },
      { date: "2026-07-03", is_outlier: true, score: 4.2 },
      { date: "2026-07-04", is_outlier: false, score: 0.5 },
    ],
  });

  assert.ok(insights);
  assert.deepEqual(insights.peak, { date: "2026-07-03", downloads: 30 });
  assert.equal(insights.latest?.delta, -10);
  assert.equal(insights.activeDays, 3);
  assert.equal(insights.activeRate, 75);
  assert.equal(insights.outlierCount, 1);
  assert.equal(insights.strongestOutlier?.date, "2026-07-03");
});

test("buildCompareInsights finds leader and fastest mover independently", () => {
  const series = Array.from({ length: 14 }, (_, index) => {
    const recent = index >= 7;
    return {
      date: `2026-07-${String(index + 1).padStart(2, "0")}`,
      values: {
        alpha: { downloads: recent ? 20 : 10, delta: null },
        beta: { downloads: recent ? 35 : 30, delta: null },
      },
    };
  });

  const insights = buildCompareInsights(
    [
      { name: "alpha", total: 210, share: 31.58 },
      { name: "beta", total: 455, share: 68.42 },
    ],
    series
  );

  assert.ok(insights);
  assert.equal(insights.leader?.name, "beta");
  assert.equal(insights.growthLeader?.name, "alpha");
  assert.equal(insights.latestLeader?.name, "beta");
  assert.equal(insights.closestPair?.shareGap, 36.84);
});
