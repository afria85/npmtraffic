import assert from "node:assert/strict";
import { test } from "node:test";
import { adjustMonthTicksForOverlap, buildMonthTicks, formatMonthLabel, formatMonthLabelFromDate } from "../components/charts/time-ticks";

test("formatMonthLabel uses full year when requested", () => {
  assert.equal(formatMonthLabel(2026, 0, true, true), "Jan 2026");
  assert.equal(formatMonthLabel(2026, 0, false, true), "Jan");
});

test("formatMonthLabelFromDate uses UTC month and full year", () => {
  assert.equal(formatMonthLabelFromDate("2025-12-01", true), "Dec 2025");
  assert.equal(formatMonthLabelFromDate("2026-01-15", true), "Jan 2026");
});

test("buildMonthTicks includes year on first tick and year changes", () => {
  const dates = [
    "2025-12-15",
    "2025-12-16",
    "2026-01-01",
    "2026-01-02",
    "2026-02-01",
  ];
  const ticks = buildMonthTicks(dates, 6, "first-or-change", true);
  assert.equal(ticks[0]?.label, "Dec 2025");
  assert.equal(ticks[1]?.label, "Jan 2026");
});


test("adjustMonthTicksForOverlap prevents Dec/Jan overlap when the range starts on a year boundary", () => {
  // Simulate a 33-day range starting on 2025-12-31, so Jan tick lands at index 1 (very close to the left edge).
  const dates: string[] = [];
  for (let i = 0; i < 33; i++) {
    const d = new Date(Date.UTC(2025, 11, 31 + i));
    dates.push(d.toISOString().slice(0, 10));
  }

  const raw = buildMonthTicks(dates, 6, "first-or-change", false);
  const adjusted = adjustMonthTicksForOverlap(raw, { seriesLength: dates.length, innerW: 960, axisFontSize: 12 });

  // Keep the more-informative tick (Jan) and blank the edge label (Dec) to avoid collisions.
  assert.equal(adjusted[0]?.label, "");
  assert.equal(adjusted[1]?.label, "Jan ’26");
});
