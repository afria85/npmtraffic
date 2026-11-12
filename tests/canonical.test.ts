import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPackageCanonical, buildPackageShareUrl, buildCompareCanonical } from "../lib/canonical";

test("package canonical identifies the package and its share URL retains the range", () => {
  assert.equal(buildPackageCanonical("https://npmtraffic.com", "@scope/name"), "https://npmtraffic.com/p/%40scope%2Fname");
  assert.equal(buildPackageShareUrl("https://npmtraffic.com", "react", 14), "https://npmtraffic.com/p/react?days=14");
});

test("comparison canonical identifies the normalized package set and collapses incomplete selections", () => {
  const canonical = buildCompareCanonical("https://npmtraffic.com", ["vue", "React", "@scope/name", "react"]);
  assert.equal(canonical, "https://npmtraffic.com/compare?packages=%40scope%2Fname,react,vue");
  assert.equal(buildCompareCanonical("https://npmtraffic.com", ["react"]), "https://npmtraffic.com/compare");
});
