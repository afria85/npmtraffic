import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheClear } from "../lib/cache";
import { fetchTraffic, TrafficError } from "../lib/traffic";

test("serves stale cache when upstream fails", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;

  Date.now = () => 1_000_000;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("https://api.npmjs.org/downloads/range/last-14-days/react")) {
      return new Response(
        JSON.stringify({
          start: "2024-01-01",
          end: "2024-01-02",
          package: "react",
          downloads: [
            { day: "2024-01-01", downloads: 10 },
            { day: "2024-01-02", downloads: 12 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    cacheClear();
    delete process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
  });

  await fetchTraffic("react", 14);

  Date.now = () => 1_000_000 + 16 * 60 * 1000;
  process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL = "401";

  const stale = await fetchTraffic("react", 14);
  assert.equal(stale.meta.cacheStatus, "STALE");
  assert.equal(stale.meta.isStale, true);
  assert.equal(stale.meta.staleReason, "UPSTREAM_401");
  assert.equal(typeof stale.warning, "string");
});

test("returns upstream error without cache", async (t) => {
  t.after(() => {
    delete process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
    cacheClear();
  });

  process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL = "500";
  await assert.rejects(
    () => fetchTraffic("react", 14),
    (error) => error instanceof TrafficError && error.code === "UPSTREAM_UNAVAILABLE"
  );
});
