import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { cacheClear, cacheSetWithStale } from "../lib/cache";
import { fetchDailyDownloadsRange, UpstreamError } from "../lib/npm-client";
import { rangeForDays } from "../lib/query";
import { fetchTraffic, getCachedTraffic, trafficCacheKey, TrafficError } from "../lib/traffic";

const limit = 64 * 1024;
const now = new Date("2026-11-17T00:00:00Z");
const range = rangeForDays(365, now);
const dates = { start: range.startDate, end: range.endDate };
const downloads = Array.from({ length: 365 }, (_, i) => ({
  day: new Date(Date.parse(dates.start) + i * 86400000).toISOString().slice(0, 10),
  downloads: i,
}));
const body = JSON.stringify({ ...dates, package: "react", downloads });
const padded = (size: number) => body.padEnd(size, " ");
const invalid = { name: "Error", message: "Invalid npm JSON response" };

function streamed(value: string, onCancel: () => void, keepOpen = false) {
  const bytes = new TextEncoder().encode(value);
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset < bytes.length) {
        controller.enqueue(bytes.subarray(offset, offset + 16384));
        offset += 16384;
      } else if (!keepOpen) controller.close();
    },
    cancel: onCancel,
  });
}

test("accepts a legitimate 365-day range exactly at the decoded byte limit", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(padded(limit)));
  const result = await fetchDailyDownloadsRange("react", dates);
  assert.deepEqual(result.downloads, downloads);
});

for (const withLength of [false, true]) {
  test("rejects streams over the limit " + (withLength ? "with" : "without") + " Content-Length", async t => {
    t.mock.method(globalThis, "fetch", async () => new Response(streamed(padded(limit + 1), () => {}), {
      headers: withLength ? { "Content-Length": String(limit + 1) } : {},
    }));
    await assert.rejects(fetchDailyDownloadsRange("react", dates), invalid);
  });
}

test("overflow cancels an open stream and releases its lock even if cancel does not settle", { timeout: 2000 }, async t => {
  let canceled = false;
  // A cancel hook can return a pending promise. Rejection of the oversized response must not await it.
  const stream = streamed(padded(limit + 1), () => {
    canceled = true;
    return new Promise<void>(() => {});
  }, true);
  const response = new Response(stream);
  t.mock.method(globalThis, "fetch", async () => response);
  await assert.rejects(fetchDailyDownloadsRange("react", dates), invalid);
  assert.equal(canceled, true);
  assert.equal(response.body?.locked, false);
});

test("bounds decoded bytes when a gzip response has a small wire Content-Length", async t => {
  let bytes = gzipSync(padded(limit));
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json", "Content-Encoding": "gzip", "Content-Length": bytes.length });
    res.end(bytes);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.close(); server.closeAllConnections(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const original = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, options?: RequestInit) => {
    assert.ok(bytes.length < 4096);
    return original("http://127.0.0.1:" + address.port, options);
  });
  assert.equal((await fetchDailyDownloadsRange("react", dates)).downloads.length, 365);
  bytes = gzipSync(padded(limit + 1));
  await assert.rejects(fetchDailyDownloadsRange("react", dates), invalid);
});

test("partial and absent JSON use the existing parse error", async t => {
  const replies = [new Response(body.slice(0, -1)), new Response(null)];
  t.mock.method(globalThis, "fetch", async () => replies.shift()!);
  for (let i = 0; i < 2; i++) await assert.rejects(fetchDailyDownloadsRange("react", dates), invalid);
});

test("an abort during body reading keeps its timeout classification", async t => {
  const clock = new AbortController();
  const reason = new DOMException("Test deadline", "TimeoutError");
  t.mock.method(AbortSignal, "timeout", (ms: number) => {
    assert.equal(ms, 5000);
    return clock.signal;
  });
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      clock.abort(reason);
      controller.error(reason);
    },
  }));
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, options?: RequestInit) => {
    assert.equal(options?.signal, clock.signal);
    return response;
  });
  await assert.rejects(fetchDailyDownloadsRange("react", dates), error => error === reason);
  assert.equal(response.body?.locked, false);
});

test("downloads 404 still needs registry confirmation", async t => {
  let registryStatus = 200;
  const fetch = t.mock.method(globalThis, "fetch", async (url: string) =>
    new Response(null, { status: url.startsWith("https://registry.npmjs.org/") ? registryStatus : 404 }));
  await assert.rejects(fetchDailyDownloadsRange("react", dates),
    error => error instanceof UpstreamError && error.status === 404);
  registryStatus = 404;
  await assert.rejects(fetchDailyDownloadsRange("react", dates), /^Error: NPM_NOT_FOUND:/);
  assert.equal(fetch.mock.callCount(), 4);
});

test("oversized refresh preserves the stale snapshot and cannot populate the cold cache", async t => {
  t.after(cacheClear);
  let oversize = false;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/react")) return new Response(oversize ? padded(limit + 1) : body);
    return Response.json({ ...dates, downloads: downloads.map(row => ({ ...row, downloads: 1000 })) });
  });
  const first = await fetchTraffic("react", 365, now);
  cacheSetWithStale(trafficCacheKey("react", range), {
    package: first.package, range: first.range, series: first.series,
    registryFetchedAt: first.meta.registryFetchedAt, fetchedAt: first.meta.fetchedAt,
  }, -1, 60);
  oversize = true;
  const stale = await fetchTraffic("react", 365, now);
  assert.equal(stale.meta.cacheStatus, "STALE");
  assert.equal(stale.meta.staleReason, "UNKNOWN");
  assert.deepEqual(stale.series, first.series);
  assert.equal(stale.series[0].downloads, 0);
  cacheClear();
  await assert.rejects(fetchTraffic("react", 365, now),
    error => error instanceof TrafficError && error.status === 502 && error.code === "UPSTREAM_UNAVAILABLE");
  assert.equal(getCachedTraffic("react", range), null);
  oversize = false;
  assert.equal((await fetchTraffic("react", 365, now)).meta.cacheStatus, "MISS");
  assert.equal((await fetchTraffic("react", 365, now)).meta.cacheStatus, "HIT");
});

test("oversized registry response leaves counts unverified and allows clean recovery", async t => {
  t.after(cacheClear);
  let oversize = true;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/react")) return new Response(body);
    const registry = JSON.stringify({ ...dates, downloads: downloads.map(row => ({ ...row, downloads: 1000 })) });
    return new Response(oversize ? registry.padEnd(limit + 1, " ") : registry);
  });
  const degraded = await fetchTraffic("react", 365, now);
  assert.equal(degraded.series[0].upstreamDownloads, 0);
  assert.equal(degraded.series[0].downloads, null);
  assert.equal(degraded.series[0].status, "unverified");
  assert.equal(getCachedTraffic("react", range), null);
  oversize = false;
  const recovered = await fetchTraffic("react", 365, now);
  assert.equal(recovered.meta.cacheStatus, "MISS");
  assert.equal(recovered.series[0].downloads, 0);
  assert.equal(recovered.series[0].status, "available");
});
