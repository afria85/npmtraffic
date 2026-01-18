import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompareTableHeader } from "../app/compare/page";

test("compare table header groups packages by metric", () => {
  const packageNames = ["react", "vue"];
  const html = renderToStaticMarkup(
    <table>
      <CompareTableHeader packageNames={packageNames} />
    </table>
  );

  const colspanMatches = html.match(/colspan="2"/g) ?? [];
  assert.equal(
    colspanMatches.length,
    packageNames.length,
    "Each package should consume two numeric columns"
  );
  const downloadsMatches = html.match(/Downloads/g) ?? [];
  assert.equal(
    downloadsMatches.length,
    packageNames.length,
    "Downloads label should appear once per package"
  );
  const deltaMatches = html.match(/Delta vs prev day/g) ?? [];
  assert.equal(
    deltaMatches.length,
    packageNames.length,
    "Delta label should appear once per package"
  );
  assert.ok(html.includes('rowspan="2"'));
});
