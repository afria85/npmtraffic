import assert from "node:assert/strict";
import { test } from "node:test";
import { toObservationPath } from "../components/charts/observation-path";

test("SVG paths keep a measured zero and break at unavailable observations", () => {
  const path = toObservationPath([
    { x: 1, y: 8 }, { x: 2, y: 10 },
    { x: 3, y: null },
    { x: 4, y: 2 }, null, { x: 6, y: 5 },
  ]);
  assert.equal(path, "M 1.00 8.00 L 2.00 10.00 M 4.00 2.00 h 0 M 6.00 5.00 h 0");
});
