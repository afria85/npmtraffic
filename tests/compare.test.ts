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


test("disjoint available dates never manufacture a shared zero total, share, or Indexed baseline", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const response = completeResponse(input);
    const payload = await response.json();
    if (payload.package === "react") {
      payload.downloads = payload.downloads.filter((_: unknown, index: number) => index % 2 === 0);
    } else if (payload.package === "vue") {
      payload.downloads = payload.downloads.filter((_: unknown, index: number) => index % 2 === 1);
    }
    return Response.json(payload);
  };
  t.after(() => { globalThis.fetch = originalFetch; cacheClear(); });

  const data = await buildCompareData(["react", "vue"], 7);
  assert.equal(data.coverage.includedDays, 0);
  assert.ok(data.series.every((row) => row.included === false));
  assert.ok(data.series.every((row) =>
    row.values.react.downloads === null && row.values.vue.downloads === null));
  assert.deepEqual(data.packages.map(({ total, share }) => [total, share]), [
    [null, null],
    [null, null],
  ]);
  assert.ok(data.series.some((row) => row.values.react.upstreamDownloads !== null));
  assert.ok(data.series.some((row) => row.values.vue.upstreamDownloads !== null));
});

test("shared verified-zero observations remain eligible while missing dates do not", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const response = completeResponse(input);
    const payload = await response.json();
    // Keep the registry-wide daily total positive: a package-level zero is verified
    // only when the registry-wide observation for that date remains nonzero.
    if (payload.package === "react" || payload.package === "vue") {
      payload.downloads[0].downloads = 0;
    }
    return Response.json(payload);
  };
  t.after(() => { globalThis.fetch = originalFetch; cacheClear(); });

  const data = await buildCompareData(["react", "vue"], 7);
  assert.equal(data.coverage.includedDays, 7);
  assert.equal(data.series[0].included, true);
  assert.equal(data.series[0].values.react.downloads, 0);
  assert.equal(data.series[0].values.vue.downloads, 0);
  assert.equal(data.series[0].values.react.status, "available");
  assert.equal(data.series[1].values.react.delta, 15);
  assert.equal(data.series[1].values.vue.delta, 4);
  assert.equal(data.packages[0].total, 90);
  assert.equal(data.packages[1].total, 24);
});
