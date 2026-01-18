import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePackageShares } from "../lib/compare";

test("calculatePackageShares returns equal shares for even totals", () => {
  const packages = [
    { name: "react", total: 50 },
    { name: "vue", total: 50 },
  ];
  const results = calculatePackageShares(packages);
  assert.equal(results.length, 2);
  assert.equal(results[0].share, 50);
  assert.equal(results[1].share, 50);
});

test("calculatePackageShares handles zero total without dividing by zero", () => {
  const packages = [
    { name: "a", total: 0 },
    { name: "b", total: 0 },
  ];
  const results = calculatePackageShares(packages);
  assert.equal(results[0].share, 0);
  assert.equal(results[1].share, 0);
});
