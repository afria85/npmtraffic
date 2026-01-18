import assert from "node:assert/strict";
import { test } from "node:test";
import ReactDOMServer from "react-dom/server";
import StatusPage from "../app/status/page";
import { resetHealthSnapshot } from "../lib/health";

test("status page renders even without health data", async () => {
  resetHealthSnapshot();
  const element = await StatusPage();
  const html = ReactDOMServer.renderToStaticMarkup(element);
  assert.ok(html.includes("No health data recorded yet"), "should mention missing health data");
});
