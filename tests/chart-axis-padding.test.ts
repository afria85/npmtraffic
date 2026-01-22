import assert from "node:assert/strict";
import { test } from "node:test";
import { computeLeftPad } from "../components/charts/axis-padding";

test("computeLeftPad grows for large axis labels", () => {
  const small = computeLeftPad("1", 11);
  const large = computeLeftPad("123,456,789,012", 11);
  assert.equal(small, 46);
  assert.ok(large > 46);
  assert.ok(large <= 130);
});
