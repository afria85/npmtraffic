import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPARE_ACTION_CONTAINER_CLASSES,
  COMPARE_TABLE_WRAPPER_CLASSES,
} from "../components/compare/compare-classes";

test("compare action container includes mobile wrapping and overflow", () => {
  assert(COMPARE_ACTION_CONTAINER_CLASSES.includes("flex-wrap"));
  assert(COMPARE_ACTION_CONTAINER_CLASSES.includes("overflow-x-auto"));
});

test("compare table wrapper enables horizontal scrolling", () => {
  assert(COMPARE_TABLE_WRAPPER_CLASSES.includes("overflow-x-auto"));
});
