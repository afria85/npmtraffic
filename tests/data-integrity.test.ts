import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchTraffic, TrafficError } from '../lib/traffic';
import { rangeForDays } from '../lib/query';
import { cacheClear } from '../lib/cache';

const range = rangeForDays(7);
const complete = () => Array.from({length: 7}, (_, i) => ({
  day: new Date(Date.parse(range.startDate) + i * 86400000).toISOString().slice(0,10), downloads: i,
}));
for (const kind of ['middle', 'final', 'empty', 'duplicate', 'outside', 'negative', 'fraction', 'null', 'wrong-range', 'wrong-package']) {
  test(`rejects ${kind} observations without manufacturing zeroes`, async (t) => {
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; cacheClear(); });
    const rows = complete();
    if (kind === 'middle') rows.splice(3,1);
    if (kind === 'final') rows.pop();
    if (kind === 'empty') rows.length = 0;
    if (kind === 'duplicate') rows[3] = rows[2];
    if (kind === 'outside') rows[0].day = '2000-01-01';
    if (kind === 'negative') rows[0].downloads = -1;
    if (kind === 'fraction') rows[0].downloads = 0.5;
    globalThis.fetch = async () => Response.json({
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

test('body deadline remains active after headers arrive', async (t) => {
 const original = globalThis.fetch;
 t.after(() => { globalThis.fetch = original; cacheClear(); });
 globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
   start(controller) {
     init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), {once:true});
   },
 }));
 await assert.rejects(fetchTraffic('react',7), (e) => e instanceof TrafficError && e.code === 'UPSTREAM_UNAVAILABLE');
});

test('incomplete refresh serves only a previously complete stale series', async (t) => {
 const { cacheSetWithStale } = await import('../lib/cache');
 const original = globalThis.fetch;
 t.after(() => { globalThis.fetch = original; cacheClear(); });
 globalThis.fetch = async () => Response.json({package:'react',start:range.startDate,end:range.endDate,downloads:complete()});
 const first=await fetchTraffic('react',7);
 const key=`traffic:react:7:${range.label}:${range.startDate}:${range.endDate}`;
 cacheSetWithStale(key,{package:'react',range,series:first.series,totals:first.totals,fetchedAt:first.meta.fetchedAt},-1,60);
 globalThis.fetch = async () => Response.json({package:'react',start:range.startDate,end:range.endDate,downloads:complete().slice(1)});
 const stale=await fetchTraffic('react',7);
 assert.equal(stale.meta.cacheStatus,'STALE');
 assert.deepEqual(stale.series,first.series);
});
