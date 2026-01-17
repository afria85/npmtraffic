import assert from "node:assert/strict";
import { test } from "node:test";
import { homepageJsonLd } from "../lib/jsonld";

test("homepage JSON-LD contains SearchAction for npmtraffic search", () => {
  const baseUrl = "https://npmtraffic.com";
  const jsonLd = homepageJsonLd(baseUrl);
  assert.equal(jsonLd["@type"], "WebSite");
  assert.equal(jsonLd.url, baseUrl);
  const action = jsonLd.potentialAction;
  assert.equal(action["@type"], "SearchAction");
  assert.equal(action.target, `${baseUrl}/p/{search_term_string}`);
});
