import { test } from "node:test";
import assert from "node:assert/strict";
import { getCompareButtonLabel, isCompareReady } from "../lib/compare-ui";

test("compare CTA label and readiness helpers", () => {
  assert.equal(getCompareButtonLabel(0), "Compare (0)");
  assert.equal(getCompareButtonLabel(3), "Compare (3)");
  assert.equal(isCompareReady(1), false);
  assert.equal(isCompareReady(2), true);
});
