import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalizePackages, clampDays } from "../lib/query";

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
