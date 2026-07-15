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

test("buildCsv quotes the active delimiter", () => {
  const csv = buildCsv([["name", "description"], ["pkg", "a;b"]], ";");
  assert.equal(csv.split("\n")[1], "pkg;\"a;b\"");
});

test("buildCsv keeps negative numbers numeric while protecting formula-like strings", () => {
  const csv = buildCsv([
    ["delta", "label"],
    [-42, "-SUM(A1:A2)"],
  ]);
  assert.equal(csv.split("\n")[1], "-42,\t-SUM(A1:A2)");
});
