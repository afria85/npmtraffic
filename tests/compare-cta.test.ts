import { test } from "node:test";
import assert from "node:assert/strict";
import { getCompareButtonLabel, getCompareStatusLabel, isCompareReady } from "../lib/compare-ui";

test("compare CTA label and readiness helpers", () => {
  assert.equal(getCompareButtonLabel(0), "Compare (0)");
  assert.equal(getCompareButtonLabel(3), "Compare (3)");
  assert.equal(getCompareStatusLabel(0), "Select 2–5 packages to compare");
  assert.equal(getCompareStatusLabel(1), "1 selected • add 1 more to compare");
  assert.equal(getCompareStatusLabel(2), "2 selected");
  assert.equal(isCompareReady(1), false);
  assert.equal(isCompareReady(2), true);
});
