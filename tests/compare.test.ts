import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompareData } from "../lib/compare";
import { cacheClear } from "../lib/cache";
import { rangeForDays } from "../lib/query";

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const makeResponse = (downloads: Array<{ day: string; downloads: number }>) =>
  new Response(
    JSON.stringify({
      start: downloads[0]?.day ?? "2024-01-01",
      end: downloads[downloads.length - 1]?.day ?? "2024-01-02",
      package: "stub",
      downloads,
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );

const makeRangeResponse = (start: string, end: string) =>
  makeResponse([
    { day: start, downloads: 5 },
    { day: end, downloads: 7 },
  ]);

test("buildCompareData trims to max packages and warns", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    makeResponse([
      { day: "2024-01-01", downloads: 10 },
      { day: "2024-01-02", downloads: 12 },
    ]);

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const data = await buildCompareData(
    ["react", "vue", "angular", "svelte", "lodash", "ember"],
    30
  );
  assert.equal(data.packages.length, 5);
  assert.ok(data.warnings?.some((warning) => warning.includes("first 5")));
});

test("buildCompareData drops invalid packages and keeps valid ones", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    makeResponse([
      { day: "2024-01-01", downloads: 5 },
      { day: "2024-01-02", downloads: 6 },
    ]);

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const data = await buildCompareData(["react", "bad name", "vue"], 30);
  assert.equal(data.packages.length, 2);
  assert.ok(data.warnings?.some((warning) => warning.includes("Ignored invalid package")));
});

test("buildCompareData aligns series and computes deltas", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    const expectedRange = rangeForDays(30);
    const secondDay = nextDate(expectedRange.startDate);
    if (url.includes("/react")) {
      return makeResponse([
        { day: expectedRange.startDate, downloads: 10 },
        { day: secondDay, downloads: 15 },
      ]);
    }
    if (url.includes("/vue")) {
      return makeResponse([
        { day: expectedRange.startDate, downloads: 6 },
        { day: secondDay, downloads: 4 },
      ]);
    }
    return new Response("not found", { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const data = await buildCompareData(["react", "vue"], 30);
  assert.equal(data.series.length, 30);
  const day1 = data.series[0];
  const day2 = data.series[1];
  assert.equal(day1.values.react?.delta, null);
  assert.equal(day2.values.react?.delta, 5);
  assert.equal(day2.values.vue?.delta, -2);
});

test("buildCompareData supports 90-day ranges", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    const match = url.match(/downloads\/range\/([0-9-]+):([0-9-]+)\//);
    if (!match) {
      return new Response("not found", { status: 404 });
    }
    return makeRangeResponse(match[1], match[2]);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const data = await buildCompareData(["react", "vue"], 90);
  assert.equal(data.series.length, 90);
  assert.equal(data.range.days, 90);
});
