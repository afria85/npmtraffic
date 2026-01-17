import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalizePackages, clampDays, rangeForDays } from "../lib/query";

test("clampDays defaults and clamps to allowed values", () => {
  assert.equal(clampDays(undefined), 30);
  assert.equal(clampDays("7"), 7);
  assert.equal(clampDays("14"), 14);
  assert.equal(clampDays("30"), 30);
  assert.equal(clampDays("100"), 30);
});

test("canonicalizePackages sorts and dedupes", () => {
  const result = canonicalizePackages(["Vue", "react", "vue", "logshield-cli"]);
  assert.deepEqual(result, ["logshield-cli", "react", "Vue"]);
});

test("rangeForDays returns yesterday-based window", () => {
  const now = new Date("2026-01-17T12:00:00Z");
  const range = rangeForDays(14, now);
  assert.equal(range.days, 14);
  assert.equal(range.startDate, "2026-01-03");
  assert.equal(range.endDate, "2026-01-16");
  assert.equal(range.label, "last-14-days");
});
