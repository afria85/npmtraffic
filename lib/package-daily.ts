import { cacheGet, cacheSet } from "@/lib/cache";
import { daysAgoUTC, toYYYYMMDD } from "@/lib/dates";
import { fetchDailyDownloadsRange } from "@/lib/npm-client";
import { aggregateSeries, type DailySeriesRow } from "@/lib/aggregate";

export type PackageDailyResult = {
  requestId: string;
  package: string;
  range: { days: number; start: string; end: string };
  cache: { status: "HIT" | "MISS"; ttlSeconds: number };
  series: DailySeriesRow[];
  generatedAt: string;
};

function mkRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDays(days: number) {
  return days === 7 || days === 14 || days === 30 ? days : 30;
}

function validatePackageName(name: string) {
  // npm package names: allow scoped or unscoped, basic safe filter
  // This is not a full npm spec validator, but prevents obvious abuse.
  const ok = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(name);
  if (!ok) throw new Error("BAD_REQUEST: invalid package name");
}

export async function getPackageDaily(pkg: string, daysIn: number): Promise<PackageDailyResult> {
  const requestId = mkRequestId();
  const days = normalizeDays(daysIn);

  validatePackageName(pkg);

  // npm range endpoint is inclusive; for 30 rows, request start=days-1 ago
  const end = daysAgoUTC(0);
  const start = daysAgoUTC(days - 1);

  const key = `pkg:${pkg}:daily:${days}:${toYYYYMMDD(start)}:${toYYYYMMDD(end)}`;

  // TTL: 6h (good enough for MVP; later we do 24h for historical)
  const ttlSeconds = 6 * 60 * 60;

  const cached = cacheGet<PackageDailyResult>(key);
  if (cached.hit && cached.value) {
    return { ...cached.value, requestId, cache: { status: "HIT", ttlSeconds } };
  }

  const upstream = await fetchDailyDownloadsRange(pkg, start, end);
  const series = aggregateSeries(upstream.downloads);

  const result: PackageDailyResult = {
    requestId,
    package: pkg,
    range: { days, start: upstream.start, end: upstream.end },
    cache: { status: "MISS", ttlSeconds },
    series,
    generatedAt: new Date().toISOString(),
  };

  cacheSet(key, result, ttlSeconds);
  return result;
}