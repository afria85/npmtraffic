import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompareTableHeader } from "../app/compare/page";

test("compare table header renders packages and delta columns once", () => {
  const packageNames = ["react", "vue"];
  const html = renderToStaticMarkup(
    <table>
      <CompareTableHeader packageNames={packageNames} />
    </table>
  );

  const order = [
    "Date",
    "react Downloads",
    "vue Downloads",
    "react Δ",
    "vue Δ",
  ];
  let previousIndex = -1;
  for (const entry of order) {
    const idx = html.indexOf(entry);
    assert.ok(idx > previousIndex, `${entry} should appear after the previous entry`);
    previousIndex = idx;
  }
});
