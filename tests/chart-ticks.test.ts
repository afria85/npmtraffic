import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMonthTicks, formatMonthLabel } from "../components/charts/time-ticks";

test("formatMonthLabel includes compact year when requested", () => {
  assert.equal(formatMonthLabel(2026, 0, true), "Jan \u201926");
  assert.equal(formatMonthLabel(2026, 0, false), "Jan");
});

test("buildMonthTicks includes year on first tick and year changes", () => {
  const dates = [
    "2025-12-15",
    "2025-12-16",
    "2026-01-01",
    "2026-01-02",
    "2026-02-01",
  ];
  const ticks = buildMonthTicks(dates, 6);
  assert.equal(ticks[0]?.label, "Dec \u201925");
  assert.equal(ticks[1]?.label, "Jan \u201926");
});
