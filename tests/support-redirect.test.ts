import assert from "node:assert/strict";
import { test } from "node:test";
import { SUPPORT_REDIRECT_TARGET } from "../lib/routes";

test("support redirect target remains /donate", () => {
  assert.equal(SUPPORT_REDIRECT_TARGET, "/donate");
});
