import assert from "node:assert/strict";
import { test } from "node:test";
import { isCompareTrayAllowed } from "../lib/compare-tray";

test("compare tray allowlist includes analysis pages", () => {
  assert.equal(isCompareTrayAllowed("/"), true);
  assert.equal(isCompareTrayAllowed("/compare"), true);
  assert.equal(isCompareTrayAllowed("/data"), true);
  assert.equal(isCompareTrayAllowed("/p/react"), true);
});

test("compare tray allowlist excludes content pages", () => {
  assert.equal(isCompareTrayAllowed("/about"), false);
  assert.equal(isCompareTrayAllowed("/roadmap"), false);
  assert.equal(isCompareTrayAllowed("/transparency"), false);
  assert.equal(isCompareTrayAllowed("/status"), false);
  assert.equal(isCompareTrayAllowed("/donate"), false);
});
