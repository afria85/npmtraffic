import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheClear, cacheSetWithStale } from "../lib/cache";
import { fetchTraffic, TrafficError } from "../lib/traffic";
import { rangeForDays } from "../lib/query";

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

test("serves stale cache when upstream fails", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(14);

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
        downloads: [
          { day: expectedRange.startDate, downloads: 10 },
          { day: nextDate(expectedRange.startDate), downloads: 12 },
        ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
    delete process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
  });

  const firstResponse = await fetchTraffic("react", 14);
  const cacheKey = `traffic:${firstResponse.package.toLowerCase()}:${firstResponse.range.days}:${firstResponse.range.startDate}`;
  cacheSetWithStale(
    cacheKey,
    {
      package: firstResponse.package,
      range: firstResponse.range,
      series: firstResponse.series,
      totals: firstResponse.totals,
      fetchedAt: firstResponse.meta.fetchedAt,
    },
    -1,
    60
  );
  process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL = "401";

  const stale = await fetchTraffic("react", 14);
  assert.equal(stale.meta.cacheStatus, "STALE");
  assert.equal(stale.meta.isStale, true);
  assert.equal(stale.meta.staleReason, "UPSTREAM_401");
  assert.equal(typeof stale.warning, "string");
});

test("returns upstream error without cache", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("not found", { status: 404 });

  try {
    process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL = "500";
    await assert.rejects(
      () => fetchTraffic("react", 14),
      (error) => error instanceof TrafficError && error.code === "UPSTREAM_UNAVAILABLE"
    );
  } finally {
    globalThis.fetch = originalFetch;
    cacheClear();
    delete process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
  }
});

test("normalizes missing dates and totals for the requested range", async (t) => {
  const originalFetch = globalThis.fetch;
  const expectedRange = rangeForDays(14);

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (
      url.startsWith(
        `https://api.npmjs.org/downloads/range/${expectedRange.startDate}:${expectedRange.endDate}/react`
      )
    ) {
      return new Response(
        JSON.stringify({
          start: expectedRange.startDate,
          end: expectedRange.endDate,
          package: "react",
          downloads: [
            { day: expectedRange.startDate, downloads: 5 },
            { day: expectedRange.endDate, downloads: 20 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
    delete process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
  });

  const data = await fetchTraffic("react", 14);
  assert.equal(data.series.length, 14);
  assert.equal(data.series[0].date, expectedRange.startDate);
  assert.equal(data.series.at(-1)?.date, expectedRange.endDate);
  const totalDownloads = data.series.reduce((total, row) => total + row.downloads, 0);
  assert.equal(data.totals.sum, totalDownloads);
  assert.equal(data.series[1].downloads, 0);
  assert.equal(data.series.at(-2)?.downloads, 0);
  assert.equal(data.series[13].downloads, 20);
});
