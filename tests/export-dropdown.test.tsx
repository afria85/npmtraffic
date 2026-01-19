import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ExportDropdown from "../components/ExportDropdown";

test("export dropdown renders package and compare links", () => {
  const itemList = [
    { key: "csv", label: "CSV", href: "/api/v1/package/react/daily.csv?days=30", downloadName: "react.csv" },
    {
      key: "excel",
      label: "Excel CSV",
      href: "/api/v1/package/react/daily.excel.csv?days=30",
      downloadName: "react-excel.csv",
    },
    { key: "json", label: "JSON", href: "/api/v1/package/react/daily.json?days=30", downloadName: "react.json" },
  ];
  const html = renderToStaticMarkup(<ExportDropdown items={itemList} />);
  assert(html.includes('href="/api/v1/package/react/daily.csv?days=30"'));
  assert(html.includes('href="/api/v1/package/react/daily.excel.csv?days=30"'));
  assert(html.includes('href="/api/v1/package/react/daily.json?days=30"'));
});

test("export dropdown supports compare list links", () => {
  const compareList = [
    {
      key: "csv",
      label: "CSV",
      href: "/api/v1/compare.csv?packages=react,vue&days=14",
      downloadName: "compare.csv",
    },
    {
      key: "excel",
      label: "Excel CSV",
      href: "/api/v1/compare.excel.csv?packages=react,vue&days=14",
      downloadName: "compare-excel.csv",
    },
    {
      key: "json",
      label: "JSON",
      href: "/api/v1/compare.json?packages=react,vue&days=14",
      downloadName: "compare.json",
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
        { key: "csv", label: "CSV", href: "/api/export.csv", downloadName: "export.csv" },
      ]}
    />
  );
  assert(/aria-controls="[^"]+"/.test(html));
  assert.ok(/role="menu"/.test(html));
  assert.ok(/aria-labelledby="[^"]+"/.test(html));
});
