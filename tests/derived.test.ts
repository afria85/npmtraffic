import assert from "node:assert/strict";
import { test } from "node:test";
import { computeOutliersMAD, computeTrailingMA } from "../lib/derived";

const sampleSeries = [
  { date: "2024-01-01", downloads: 10 },
  { date: "2024-01-02", downloads: 20 },
  { date: "2024-01-03", downloads: 30 },
  { date: "2024-01-04", downloads: 40 },
];

test("computeTrailingMA returns null until window is warm", () => {
  const result = computeTrailingMA(sampleSeries, 3);
  assert.equal(result[0].value, null);
  assert.equal(result[1].value, null);
  assert.equal(result[2].value, 20);
  assert.equal(result[3].value, 30);
});

test("computeOutliersMAD flags spikes with non-zero MAD", () => {
  const spikes = [
    { date: "2024-01-01", downloads: 10 },
    { date: "2024-01-02", downloads: 20 },
    { date: "2024-01-03", downloads: 30 },
    { date: "2024-01-04", downloads: 100 },
  ];
  const result = computeOutliersMAD(spikes);
  const spike = result.find((item) => item.date === "2024-01-04");
  assert.ok(spike);
  assert.ok(spike?.is_outlier);
  assert.ok(spike.score !== null && spike.score > 3);
  const normal = result.find((item) => item.date === "2024-01-02");
  assert.ok(normal);
  assert.equal(normal?.is_outlier, false);
});


test("global MAD flags regular weekend troughs; this is not a weekday-adjusted anomaly signal", () => {
  const start = Date.UTC(2026, 9, 17); // Saturday, 30 consecutive UTC dates.
  const series = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    return {
      date: date.toISOString().slice(0, 10),
      downloads: weekend ? 23_000_000 + (index % 3) * 70_000 : 41_000_000 + (index % 5) * 60_000,
    };
  });
  const outliers = computeOutliersMAD(series);
  const flagged = outliers.filter((row) => row.is_outlier === true);
  assert.equal(flagged.length, 10);
  assert.ok(flagged.every((row) => {
    const day = new Date(row.date + "T00:00:00Z").getUTCDay();
    return day === 0 || day === 6;
  }));
  // Preserve the existing legacy metric; a separate, explicitly named seasonal
  // measure would need real benchmark data and its own versioned acceptance gate.
});

test("MAD keeps missing/unverified gaps null and handles verified zero and zero MAD without spurious flags", () => {
  const series = [
    { date: "2026-10-01", downloads: 0 },
    { date: "2026-10-02", downloads: 0 },
    { date: "2026-10-03", downloads: null },
    { date: "2026-10-04", downloads: 0 },
    { date: "2026-10-05", downloads: 0 },
  ];
  const outliers = computeOutliersMAD(series);
  assert.deepEqual(outliers.map((row) => row.is_outlier), [false, false, null, false, false]);
  assert.deepEqual(outliers.map((row) => row.score), [0, 0, null, 0, 0]);
  assert.deepEqual(computeTrailingMA(series, 3).map((row) => row.value), [null, null, null, null, null]);
});
