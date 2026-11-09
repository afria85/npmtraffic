/** Read-only live probes. No fixtures, private endpoints, or date-window shifting. */
import { fetchTraffic } from '../lib/traffic';
import { rangeForDays } from '../lib/query';
import { cacheClear } from '../lib/cache';

async function main() {
  const packages = ['react', '@types/node'];
  const observations: unknown[] = [];
  const originalFetch = globalThis.fetch;
  let upstreamRequests = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const isDownloads = url.hostname === 'api.npmjs.org' && url.pathname.includes('/downloads/range/');
    if (isDownloads) upstreamRequests++;
    const res = await originalFetch(input, init);
    if (url.hostname === 'api.npmjs.org' && url.pathname.includes('/downloads/range/')) {
      if (res.ok) {
        const payload = await res.clone().json() as {start?: string; end?: string; downloads?: Array<{day: string; downloads: number}>};
        const requested = url.pathname.match(/range\/([0-9-]+):([0-9-]+)\//);
        const rows = Array.isArray(payload.downloads) ? payload.downloads : [];
        observations.push({
          package: decodeURIComponent(url.pathname.split('/').at(-1)!),
          requestedStart: requested?.[1], requestedEnd: requested?.[2],
          responseStart: payload.start, responseEnd: payload.end,
          rows: rows.length, latestReturnedDay: rows.map(row => row.day).sort().at(-1) ?? null,
          finalDayPresent: rows.some(row => row.day === requested?.[2]),
          explicitZeros: rows.filter(row => row.downloads === 0).length,
        });
      }
    }
    return res;
  };
  const checks: unknown[] = [];
  let failures = 0;
  try {
    for (const pkg of packages) for (const days of [7, 30, 365]) {
      cacheClear();
      const range = rangeForDays(days);
      const start = Date.now();
      try {
        const response = await fetchTraffic(pkg, days);
        checks.push({package: pkg, days, requestedRange: range, status: 'VERIFIED', rows: response.series.length,
          latestObservation: response.series.at(-1)?.date, total: response.totals.sum,
          cacheStatus: response.meta.cacheStatus, elapsedMs: Date.now() - start});
      } catch (error) {
        failures++;
        checks.push({package: pkg, days, requestedRange: range, status: 'FAILED_OR_BLOCKED',
          error: error instanceof Error ? error.message : 'Unknown upstream failure', elapsedMs: Date.now() - start});
      }
    }
    console.log(JSON.stringify({observedAt: new Date().toISOString(), mode: 'LIVE_NO_FIXTURES', upstreamRequests, checks, observations,
      note: 'One point-in-time sample cannot establish reporting availability near UTC midnight. No dates are silently shifted.'}, null, 2));
    process.exitCode = failures ? 2 : 0;
  } finally { globalThis.fetch = originalFetch; cacheClear(); }

}
main().catch(() => { console.error("Live npm verification failed before completion; no success claimed."); process.exitCode = 1; });
