import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ExportDropdown from "../components/ExportDropdown";

test("export dropdown renders package and compare links", () => {
  const itemList = [
    { label: "CSV", href: "/api/v1/package/react/daily.csv?days=30", download: "react.csv" },
    { label: "Excel CSV", href: "/api/v1/package/react/daily.excel.csv?days=30", download: "react-excel.csv" },
    { label: "JSON", href: "/api/v1/package/react/daily.json?days=30", download: "react.json" },
  ];
  const html = renderToStaticMarkup(<ExportDropdown items={itemList} />);
  assert(html.includes('href="/api/v1/package/react/daily.csv?days=30"'));
  assert(html.includes('href="/api/v1/package/react/daily.excel.csv?days=30"'));
  assert(html.includes('href="/api/v1/package/react/daily.json?days=30"'));
});

test("export dropdown supports compare list links", () => {
  const compareList = [
    {
      label: "CSV",
      href: "/api/v1/compare.csv?packages=react,vue&days=14",
      download: "compare.csv",
    },
    {
      label: "Excel CSV",
      href: "/api/v1/compare.excel.csv?packages=react,vue&days=14",
      download: "compare-excel.csv",
    },
    {
      label: "JSON",
      href: "/api/v1/compare.json?packages=react,vue&days=14",
      download: "compare.json",
    },
  ];
  const html = renderToStaticMarkup(<ExportDropdown items={compareList} />);
  assert(html.includes('href="/api/v1/compare.csv?packages=react,vue&days=14"'));
  assert(html.includes('href="/api/v1/compare.excel.csv?packages=react,vue&days=14"'));
  assert(html.includes('href="/api/v1/compare.json?packages=react,vue&days=14"'));
});

test("export dropdown button references menu for accessibility", () => {
  const html = renderToStaticMarkup(
    <ExportDropdown
      items={[
        { label: "CSV", href: "/api/export.csv", download: "export.csv" },
      ]}
    />
  );
  assert(/aria-controls="[^"]+"/.test(html));
  assert.ok(/role="menu"/.test(html));
  assert.ok(/aria-labelledby="[^"]+"/.test(html));
});
