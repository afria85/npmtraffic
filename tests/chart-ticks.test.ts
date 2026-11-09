import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMonthTicks, formatMonthLabel, formatMonthLabelFromDate } from "../components/charts/time-ticks";

test("formatMonthLabel uses full year when requested", () => {
  assert.equal(formatMonthLabel(2026, 0, true), "Jan 2026");
  assert.equal(formatMonthLabel(2026, 0, false), "Jan");
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

test("365-day timeline labels reach the final month on mobile and desktop", () => {
  const start = Date.UTC(2025, 10, 9);
  const dates = Array.from({ length: 365 }, (_, index) =>
    new Date(start + index * 86_400_000).toISOString().slice(0, 10)
  );
  for (const maxTicks of [3, 6]) {
    const ticks = buildMonthTicks(dates, maxTicks, "first-or-change", maxTicks === 3);
    assert.equal(ticks.length, maxTicks);
    assert.equal(ticks[0]?.label, "Nov 2025");
    assert.equal(ticks.at(-1)?.label, "Nov");
    assert.ok(ticks.at(-1)!.index > 300, "last tick must cover the end of the year");
    assert.ok(ticks.some((tick) => tick.label.includes("2026")), "year transition must remain visible");
    assert.ok(ticks.every((tick, index) => index === 0 || tick.index > ticks[index - 1].index));
  }
});

test("short ranges preserve all distinct month labels", () => {
  const ticks = buildMonthTicks(["2025-12-31", "2026-01-01", "2026-01-31"], 3, "first-or-change", true);
  assert.deepEqual(ticks.map((tick) => tick.label), ["Dec 2025", "Jan 2026"]);
});
