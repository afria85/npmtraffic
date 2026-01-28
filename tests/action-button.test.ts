import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTION_BUTTON_CLASSES } from "../components/ui/action-button";

test("action button class includes consistent sizing and alignment", () => {
  assert.ok(ACTION_BUTTON_CLASSES.includes("inline-flex"));
  assert.ok(ACTION_BUTTON_CLASSES.includes("h-10"));
  assert.ok(ACTION_BUTTON_CLASSES.includes("rounded-lg"));
  assert.ok(ACTION_BUTTON_CLASSES.includes("transition-colors"));
});
