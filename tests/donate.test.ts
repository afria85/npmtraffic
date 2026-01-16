import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveDonateLinks } from "../lib/donate";

describe("donate links", () => {
  test("returns empty when no env vars", () => {
    const links = resolveDonateLinks({});
    assert.equal(links.length, 0);
  });

  test("includes configured links", () => {
    const links = resolveDonateLinks({
      NEXT_PUBLIC_DONATE_KOFI: "https://ko-fi.com/example",
      NEXT_PUBLIC_DONATE_PAYPAL: "https://paypal.me/example",
    });
    assert.equal(links.length, 2);
    assert.ok(links[0].url.includes("ko-fi"));
  });
});
