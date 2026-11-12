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
  assert.equal(csv.split("\n")[1], "-42,'-SUM(A1:A2)");
});

test("standard and Excel CSV guard text after ignored whitespace and preserve numeric negatives", () => {
  for (const [delimiter, excelSafe] of [[",", false], [";", true]] as const) {
    for (const prefix of ["=", "+", "-", "@", "\t", "\r", "  \t="]) {
      const csv = buildCsv([[-42, prefix + "1"]], delimiter, { excelSafe });
      assert.ok(csv.startsWith("-42" + delimiter));
      assert.match(csv.slice(4), /^"?'/);
    }
    assert.equal(buildCsv([["literal" + delimiter + "text"]], delimiter, { excelSafe }),
      '"literal' + delimiter + 'text"');
  }
});
