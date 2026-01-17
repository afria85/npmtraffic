import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPackageCanonical, buildCompareCanonical } from "../lib/canonical";

test("buildPackageCanonical encodes name and days", () => {
  const url = buildPackageCanonical("https://npmtraffic.com", "react", 14);
  assert.equal(url, "https://npmtraffic.com/p/react?days=14");
});

test("buildCompareCanonical sorts and encodes packages", () => {
  const canonical = buildCompareCanonical("https://npmtraffic.com", ["react", "vue"], 30);
  assert.equal(canonical, "https://npmtraffic.com/compare?packages=react,vue&days=30");
});
