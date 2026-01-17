import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";

const packagePagePath = path.join(__dirname, "../app/p/[name]/page.tsx");
const comparePagePath = path.join(__dirname, "../app/compare/page.tsx");

test("package page includes JSON and Excel export links", () => {
  const content = fs.readFileSync(packagePagePath, "utf-8");
  assert.ok(content.includes("daily.csv?days=${days}"));
  assert.ok(content.includes("daily.excel.csv?days=${days}"));
  assert.ok(content.includes("daily.json?days=${days}"));
});

test("compare page includes JSON and Excel export links", () => {
  const content = fs.readFileSync(comparePagePath, "utf-8");
  assert.ok(content.includes("compare.csv?packages="));
  assert.ok(content.includes("compare.excel.csv?packages="));
  assert.ok(content.includes("compare.json?packages="));
});
