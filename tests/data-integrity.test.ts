import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchTraffic, trafficCacheKey, TrafficError } from '../lib/traffic';
import { rangeForDays } from '../lib/query';
import { registryFixture } from './support/npm-observations';
import { cacheClear, cacheSetWithStale } from '../lib/cache';

const range = rangeForDays(7);
const complete = () => Array.from({length: 7}, (_, i) => ({
  day: new Date(Date.parse(range.startDate) + i * 86400000).toISOString().slice(0,10), downloads: i,
}));
for (const kind of ['duplicate', 'outside', 'negative', 'fraction', 'null', 'wrong-range', 'wrong-package', 'overflow']) {
  test(`rejects ${kind} observations without manufacturing zeroes`, async (t) => {
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; cacheClear(); });
    const rows = complete();
    if (kind === 'duplicate') rows[3] = rows[2];
    if (kind === 'outside') rows[0].day = '2000-01-01';
    if (kind === 'negative') rows[0].downloads = -1;
    if (kind === 'fraction') rows[0].downloads = 0.5;
    if (kind === 'overflow') rows.forEach(row => {row.downloads = Number.MAX_SAFE_INTEGER;});
    globalThis.fetch = async (input) => registryFixture(input) ?? Response.json({
      package: kind === 'wrong-package' ? 'vue' : 'react',
      start: kind === 'wrong-range' ? '2000-01-01' : range.startDate, end: range.endDate,
      downloads: kind === 'null' ? [null] : rows,
    });
    await assert.rejects(fetchTraffic('react',7), (e) => e instanceof TrafficError && e.code === 'UPSTREAM_UNAVAILABLE');
  });
}
for (const status of [401,403,429,500,503]) {
 test(`upstream ${status} remains unavailable, not not-found`, async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; cacheClear(); });
  globalThis.fetch = async () => new Response('',{status});
  await assert.rejects(fetchTraffic('react',7), (e) => e instanceof TrafficError && e.status === 502);
 });
}
for (const exists of [true,false]) {
 test(`downloads 404 with registry existence ${exists}`, async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; cacheClear(); });
  globalThis.fetch = async (input) => new Response('',{status: String(input).includes('registry.npmjs.org') && exists ? 200 : 404});
  await assert.rejects(fetchTraffic('react',7), (e) => e instanceof TrafficError && e.code === (exists ? 'UPSTREAM_UNAVAILABLE' : 'PACKAGE_NOT_FOUND'));
 });
}
test('UTC windows cross leap day and year boundaries independently of DST', () => {
 assert.equal(rangeForDays(7,new Date('2024-03-01T00:00:00Z')).endDate,'2024-02-29');
 assert.equal(rangeForDays(7,new Date('2026-01-01T00:00:00Z')).endDate,'2025-12-31');
 assert.deepEqual(rangeForDays(7,new Date('2026-03-29T00:00:00Z')),rangeForDays(7,new Date('2026-03-29T23:59:59Z')));
});

test('body deadline remains active after headers arrive', { timeout: 15_000 }, async (t) => {
 const original = globalThis.fetch;
 // A real request keeps the event loop alive. The mocked stream has no socket,
 // and AbortSignal.timeout() alone does not keep the process running.
 const keepAlive = setInterval(() => {}, 1000);
 t.after(() => { clearInterval(keepAlive); globalThis.fetch = original; cacheClear(); });
 globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
   start(controller) {
     init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), {once:true});
   },
 }));
 await assert.rejects(fetchTraffic('react',7), (e) => e instanceof TrafficError && e.code === 'UPSTREAM_UNAVAILABLE');
});

for (const days of [7, 30, 90, 365]) {
  test("preserves coverage, upstream zeros, and year transitions for " + days + " days", async (t) => {
    const now = new Date("2026-01-04T00:00:00Z");
    const { startDate: start, endDate: end } = rangeForDays(days, now);
    const rows = Array.from({ length: days }, (_, index) => ({
      day: new Date(Date.parse(start) + index * 86_400_000).toISOString().slice(0, 10),
      downloads: index === 1 || index === days - 1 ? 0 : 12,
    }));
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; cacheClear(); });
    globalThis.fetch = async (input) => registryFixture(input)
      ? Response.json({ start, end, downloads: rows.map(({ day }, index) => ({
          day, downloads: index === days - 1 ? 0 : 500,
        })) })
      : Response.json({ start, end, package: "react", downloads: rows.filter((_, index) => index !== 2) });

    const result = await fetchTraffic("react", days, now);
    assert.equal(result.range.endDate, "2026-01-03");
    assert.equal(result.series.length, days);
    assert.equal(result.series[1].downloads, 0);
    assert.equal(result.series[1].status, "available");
    assert.equal(result.series[2].status, "missing");
    assert.equal(result.series[2].upstreamDownloads, null);
    assert.equal(result.series.at(-1)?.status, "unverified");
    assert.equal(result.series.at(-1)?.upstreamDownloads, 0);
    assert.equal(result.series.at(-1)?.registryDownloads, 0);
    assert.equal(result.series.at(-1)?.downloads, null);
    assert.equal(result.coverage.includedDays, days - 2);
    assert.equal(result.coverage.latestIncludedDate, "2026-01-02");
    assert.equal(result.totals.sum, 12 * (days - 3));
    assert.equal(result.totals.avgPerDay, Math.round(12 * (days - 3) / (days - 2)));
    assert.equal(result.derived.ma3[3].value, null);
    assert.equal(result.derived.ma3[5].value, 12);
    assert.equal(result.derived.ma7.at(-1)?.value, null);
    assert.equal(result.derived.outliers[2].score, null);
    assert.equal(result.derived.outliers.at(-1)?.is_outlier, null);
  });
}

test("a successful partial refresh supersedes the previous complete snapshot", async (t) => {
  const original = globalThis.fetch;
  let rows = complete();
  t.after(() => { globalThis.fetch = original; cacheClear(); });
  globalThis.fetch = async (input) => registryFixture(input) ?? Response.json({
    package: "react", start: range.startDate, end: range.endDate, downloads: rows,
  });
  const first = await fetchTraffic("react", 7);
  const key = trafficCacheKey("react", range);
  cacheSetWithStale(key, {
    package: "react", range, series: first.series,
    fetchedAt: first.meta.fetchedAt, registryFetchedAt: first.meta.registryFetchedAt,
  }, -1, 60);
  rows = rows.slice(1);
  const partial = await fetchTraffic("react", 7);
  assert.equal(partial.meta.cacheStatus, "MISS");
  assert.equal(partial.series[0].status, "missing");
  assert.equal(partial.coverage.includedDays, 6);
});

test("an expired snapshot is replaced when npm backfills a provisional zero", async (t) => {
  const original = globalThis.fetch;
  let backfilled = false;
  let registryRequests = 0;
  let packageRequests = 0;
  t.after(() => { globalThis.fetch = original; cacheClear(); });
  globalThis.fetch = async (input) => {
    const registry = Boolean(registryFixture(input));
    if (registry) registryRequests++;
    else packageRequests++;
    return Response.json({
      start: range.startDate, end: range.endDate, ...(registry ? {} : { package: "react" }),
      downloads: complete().map(({ day }, i) => ({
        day, downloads: i === 6 && !backfilled ? 0 : registry ? 100 : 10,
      })),
    });
  };

  const initial = await fetchTraffic("react", 7);
  assert.equal(initial.series.at(-1)?.downloads, null);
  backfilled = true;
  assert.equal((await fetchTraffic("react", 7)).meta.cacheStatus, "HIT");
  assert.equal(packageRequests, 1);
  assert.equal(registryRequests, 1);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 301_000;
  try {
    const revised = await fetchTraffic("react", 7);
    assert.equal(revised.meta.cacheStatus, "MISS");
    assert.equal(revised.series.at(-1)?.downloads, 10);
    assert.equal(revised.totals.sum, 70);
    assert.equal(packageRequests, 2);
    assert.equal(registryRequests, 2);
  } finally {
    Date.now = originalNow;
  }
});

test("registry failure without a cache retains raw counts and withholds metrics", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; cacheClear(); });
  globalThis.fetch = async (input) => registryFixture(input) ? new Response("", { status: 503 })
    : Response.json({ start: range.startDate, end: range.endDate, package: "react", downloads: complete() });
  const data = await fetchTraffic("react", 7);
  assert.equal(data.meta.registryFetchedAt, null);
  assert.equal(data.coverage.unverifiedDays, 7);
  assert.deepEqual(data.totals, { sum: null, avgPerDay: null });
  assert.deepEqual(data.series.map((row) => row.upstreamDownloads), [0, 1, 2, 3, 4, 5, 6]);
});
