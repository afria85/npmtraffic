import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeRecentSearches } from "../lib/recent-searches";

test("merges and dedupes recent searches", () => {
  const merged = mergeRecentSearches(["react", "vue"], "React");
  // Recent searches are stored in normalized (lower-case) form.
  assert.deepEqual(merged, ["react", "vue"]);
});

test("caps recent searches at 10 items", () => {
  const items = Array.from({ length: 12 }, (_, i) => `pkg-${i}`);
  const merged = mergeRecentSearches(items, "new");
  assert.equal(merged.length, 10);
  assert.equal(merged[0], "new");
});
