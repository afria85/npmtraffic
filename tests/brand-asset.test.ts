import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("public SVG brand mark matches the established cyan npmtraffic OG palette", () => {
  const svg = readFileSync(new URL("../public/brand-mark.svg", import.meta.url), "utf8");
  for (const color of ["#06b6d4", "#22d3ee", "#0891b2"]) {
    assert.ok(svg.includes(color), `Missing canonical brand color ${color}`);
  }
  assert.doesNotMatch(svg, /#6d34ff|#e11d48/i, "Retired purple/red mark should not return");
  assert.match(svg, /<title[^>]*>npmtraffic<\/title>/);
});
