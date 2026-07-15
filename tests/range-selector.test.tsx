import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import RangeSelector from "../components/RangeSelector";

test("range selector renders fast ranges and More trigger on the server", () => {
  const html = renderToString(
    <RangeSelector currentDays={30} getHref={(days) => `/p/react?days=${days}`} />
  );
  assert.ok(html.includes("/p/react?days=7"));
  assert.ok(html.includes("/p/react?days=14"));
  assert.ok(html.includes("/p/react?days=30"));
  assert.ok(html.includes("More"));
});
