import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import CompareSeriesTable from "../components/compare/CompareSeriesTable";

test("compare table header groups packages by metric", () => {
  const packageNames = ["react", "vue"];
  const html = renderToStaticMarkup(
    <CompareSeriesTable packageNames={packageNames} series={[]} />
  );

  const colspanMatches = html.match(/colspan="2"|colSpan="2"/g) ?? [];
  assert.equal(
    colspanMatches.length,
    packageNames.length,
    "Each package should consume two numeric columns"
  );
  const downloadsMatches = html.match(/>Downloads</g) ?? [];
  assert.equal(
    downloadsMatches.length,
    packageNames.length,
    "Downloads label should appear once per package"
  );
  const deltaMatches = html.match(/title="Δ vs previous day"/g) ?? [];
  assert.equal(
    deltaMatches.length,
    packageNames.length,
    "Delta label should appear once per package"
  );
  assert.ok(html.includes('rowSpan="2"'));
});
