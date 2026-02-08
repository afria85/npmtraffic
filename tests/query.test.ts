import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalizePackages, clampDays, rangeForDays } from "../lib/query";

test("clampDays defaults and clamps to allowed values", () => {
  assert.equal(clampDays(undefined), 30);
  assert.equal(clampDays("7"), 7);
  assert.equal(clampDays("14"), 14);
  assert.equal(clampDays("30"), 30);
  assert.equal(clampDays("90"), 90);
  assert.equal(clampDays("180"), 180);
  assert.equal(clampDays("365"), 365);
  assert.equal(clampDays("100"), 30);
});

test("canonicalizePackages sorts and dedupes", () => {
  const result = canonicalizePackages(["Vue", "react", "vue", "logshield-cli"]);
  // Package inputs are normalized to lower-case for consistent URLs/cache keys.
  assert.deepEqual(result, ["logshield-cli", "react", "vue"]);
});

test("rangeForDays returns yesterday-based window", () => {
  const now = new Date("2026-01-17T12:00:00Z");
  const range = rangeForDays(14, now);
  assert.equal(range.days, 14);
  assert.equal(range.startDate, "2026-01-03");
  assert.equal(range.endDate, "2026-01-16");
  assert.equal(range.label, "last-14-days");
});

test("rangeForDays handles long ranges", () => {
  const now = new Date("2026-01-17T12:00:00Z");
  const range90 = rangeForDays(90, now);
  assert.equal(range90.days, 90);
  assert.equal(range90.startDate, "2025-10-19");
  assert.equal(range90.endDate, "2026-01-16");
  assert.equal(range90.label, "last-90-days");

  const range365 = rangeForDays(365, now);
  assert.equal(range365.days, 365);
  assert.equal(range365.startDate, "2025-01-17");
  assert.equal(range365.endDate, "2026-01-16");
  assert.equal(range365.label, "last-365-days");
});
