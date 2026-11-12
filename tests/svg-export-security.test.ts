import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { serializeChartSvg } from "../components/charts/serialize-svg";

test("chart serialization resolves paint without substituting markup-like label text", () => {
  const { window } = new JSDOM('<html style="--chart-test: rgb(1, 2, 3)"><body><svg><title></title><path stroke="var(--chart-test)"/></svg></body></html>');
  const svg = window.document.querySelector("svg")!;
  const label = `<script>bad()</script> " & <svg onload='bad()'> var(--chart-test)`;
  svg.querySelector("title")!.textContent = label;
  const markup = serializeChartSvg(svg);
  const parsed = new window.DOMParser().parseFromString(markup, "image/svg+xml");
  assert.equal(parsed.querySelector("parsererror"), null);
  assert.equal(parsed.querySelector("title")?.textContent, label);
  assert.equal(parsed.querySelector("path")?.getAttribute("stroke"), "rgb(1, 2, 3)");
  assert.equal(parsed.querySelector("script,[onload]"), null);
  window.close();
});
