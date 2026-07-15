import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPARE_ACTION_CONTAINER_CLASSES,
  COMPARE_TABLE_WRAPPER_CLASSES,
} from "../components/compare/compare-classes";
import {
  SCROLL_HINT_LEFT_FADE_CLASSES,
  SCROLL_HINT_OVERLAY_CLASSES,
  SCROLL_HINT_RIGHT_FADE_CLASSES,
} from "../components/ScrollHintContainer";

test("compare action container includes mobile wrapping and overflow", () => {
  assert(COMPARE_ACTION_CONTAINER_CLASSES.includes("flex-wrap"));
  assert(COMPARE_ACTION_CONTAINER_CLASSES.includes("overflow-x-auto"));
});

test("compare table wrapper enables horizontal scrolling", () => {
  assert(COMPARE_TABLE_WRAPPER_CLASSES.includes("overflow-x-auto"));
});

test("scroll hints leave the horizontal scrollbar visible on mobile", () => {
  assert(SCROLL_HINT_OVERLAY_CLASSES.includes("bottom-3"));
  assert(!SCROLL_HINT_OVERLAY_CLASSES.includes("bottom-0"));
});

test("scroll hint fade uses a narrow surface gradient", () => {
  assert(SCROLL_HINT_LEFT_FADE_CLASSES.includes("w-3"));
  assert(SCROLL_HINT_RIGHT_FADE_CLASSES.includes("w-3"));
  assert(SCROLL_HINT_LEFT_FADE_CLASSES.includes("from-[var(--surface)]"));
  assert(SCROLL_HINT_RIGHT_FADE_CLASSES.includes("from-[var(--surface)]"));
});
