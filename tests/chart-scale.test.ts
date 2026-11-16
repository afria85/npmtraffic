import assert from "node:assert/strict";
import { test } from "node:test";
import type { CompareSeriesRow } from "../lib/compare";
import { buildNiceYAxis, findIndexedBaseline, indexedPoint } from "../components/charts/scale-utils";

const row = (date: string, a: number | null, b: number | null): CompareSeriesRow => ({
  date,
  included: a != null && b != null,
  values: {
    a: { downloads: a, delta: null, status: a == null ? "unverified" : "available" },
    b: { downloads: b, delta: null, status: b == null ? "missing" : "available" },
  },
});

test("nice axis uses rounded compact ticks and leaves raw counts unchanged", () => {
  const axis = buildNiceYAxis(45_300_000);
  assert.equal(axis.maxValue, 50_000_000);
  assert.deepEqual(axis.ticks.map((tick) => tick.label), ["50M", "37.5M", "25M", "12.5M", "0"]);
  assert.deepEqual(axis.ticks.map((tick) => tick.ratio), [0, 0.25, 0.5, 0.75, 1]);
});

test("indexed baseline is first common positive date, never zero or unavailable", () => {
  const rows = [
    row("2026-11-01", 0, 10),
    row("2026-11-02", 20, null),
    row("2026-11-03", 20, 40),
    row("2026-11-04", 0, 60),
    row("2026-11-05", null, 70),
  ];
  const baseline = findIndexedBaseline(rows, ["a", "b"]);
  assert.equal(baseline?.date, "2026-11-03");
  assert.equal(indexedPoint(rows[2], "a", baseline), 100);
  assert.equal(indexedPoint(rows[3], "a", baseline), 0);
  assert.equal(indexedPoint(rows[3], "b", baseline), 150);
  assert.equal(indexedPoint(rows[4], "a", baseline), null);
});

test("index is unavailable without a common positive baseline", () => {
  const rows = [row("2026-11-01", 0, 5), row("2026-11-02", null, 5)];
  assert.equal(findIndexedBaseline(rows, ["a", "b"]), null);
  assert.equal(indexedPoint(rows[0], "a", null), null);
  assert.equal(findIndexedBaseline(rows, []), null);
});

test("indexed scale uses plain labels and downloaded count axis supports sparse counts", () => {
  assert.deepEqual(buildNiceYAxis(145, "index").ticks.map((tick) => tick.label), ["200", "150", "100", "50", "0"]);
  assert.equal(buildNiceYAxis(1, "downloads").maxValue, 4);
});
