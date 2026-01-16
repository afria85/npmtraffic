import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCsv } from "../lib/csv";

test("buildCsv outputs header and rows", () => {
  const csv = buildCsv([
    ["date", "downloads"],
    ["2024-01-01", 10],
    ["2024-01-02", 12],
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], "date,downloads");
  assert.equal(lines.length, 3);
});
