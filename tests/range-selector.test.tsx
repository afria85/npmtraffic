import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import RangeSelector from "../components/RangeSelector";

test("range selector renders More options for long ranges", () => {
  const html = renderToString(
    <RangeSelector currentDays={30} getHref={(days) => `/p/react?days=${days}`} />
  );
  assert.ok(html.includes("More"));
  assert.ok(html.includes("/p/react?days=90"));
  assert.ok(html.includes("/p/react?days=180"));
  assert.ok(html.includes("/p/react?days=365"));
});
