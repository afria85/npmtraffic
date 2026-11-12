import { registryFixture } from "./support/npm-observations";
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompareData } from "../lib/compare";
import { cacheClear } from "../lib/cache";

const completeResponse = (input: string | URL | Request) => {
  const registry = registryFixture(input);
  if (registry) return registry;
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const match = url.pathname.match(/range\/([0-9-]+):([0-9-]+)\/(.+)$/)!;
  const [start, end, pkg] = match.slice(1);
  const count = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  return new Response(JSON.stringify({ start, end, package: decodeURIComponent(pkg),
    downloads: Array.from({ length: count }, (_, i) => ({
      day: new Date(Date.parse(start) + i * 86400000).toISOString().slice(0,10),
      downloads: pkg === "react" ? (i === 0 ? 10 : 15) : (i === 0 ? 6 : 4),
    })),
  }));
};

test("buildCompareData trims to max packages and warns", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => completeResponse(input);

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
  globalThis.fetch = async (input) => completeResponse(input);

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
  globalThis.fetch = async (input) => completeResponse(input);

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
  globalThis.fetch = async (input) => completeResponse(input);

  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const data = await buildCompareData(["react", "vue"], 90);
  assert.equal(data.series.length, 90);
  assert.equal(data.range.days, 90);
});

test("comparison totals and deltas use shared days and retain excluded raw values", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const response = completeResponse(input);
    const payload = await response.json();
    if (payload.package === "vue") payload.downloads.splice(1, 1);
    return Response.json(payload);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const data = await buildCompareData(["react", "vue"], 7);
  assert.equal(data.coverage.includedDays, 6);
  assert.equal(data.observations.react.coverage.includedDays, 7);
  assert.equal(data.series[1].included, false);
  assert.equal(data.series[1].values.react.downloads, null);
  assert.equal(data.series[1].values.react.upstreamDownloads, 15);
  assert.equal(data.series[1].values.react.status, "available");
  assert.equal(data.series[1].values.vue.status, "missing");
  assert.equal(data.series[2].values.react.delta, null);
  assert.equal(data.packages[0].total, 85);
  assert.equal(data.packages[1].total, 26);
});
