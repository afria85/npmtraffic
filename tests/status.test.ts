import assert from "node:assert/strict";
import { test } from "node:test";
import ReactDOMServer from "react-dom/server";
import StatusPage from "../app/status/page";
import { recordCacheResult, recordError, resetHealthSnapshot } from "../lib/health";

test("status page renders even without health data", async () => {
  resetHealthSnapshot();
  const element = await StatusPage();
  const html = ReactDOMServer.renderToStaticMarkup(element);
  assert.ok(
    html.includes("No traffic health data recorded in this runtime yet"),
    "should mention missing runtime health data"
  );
});

test("cached and stale results keep the actual last successful snapshot time", async () => {
  resetHealthSnapshot();
  recordCacheResult("MISS", "2026-11-12T12:00:00.000Z");
  recordCacheResult("HIT");
  recordError("UPSTREAM_429");
  recordCacheResult("STALE");
  const html = ReactDOMServer.renderToStaticMarkup(await StatusPage());
  assert.match(html, /Last successful traffic fetch: Thu, 12 Nov 2026 12:00:00 GMT/);
  assert.match(html, /UPSTREAM_429/);
  assert.match(html, /served stale/);
});
