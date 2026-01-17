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
  assert.ok(spike?.score > 3);
  const normal = result.find((item) => item.date === "2024-01-02");
  assert.ok(normal);
  assert.equal(normal?.is_outlier, false);
});
