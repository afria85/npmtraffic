import { cacheGet, cacheSet } from "@/lib/cache";
import { fetchDailyDownloadsRange } from "@/lib/npm-client";
import { aggregateSeries, type DailySeriesRow } from "@/lib/aggregate";
import { config } from "@/lib/config";
import { assertValidPackageName } from "@/lib/package-name";
import { rangeForDays } from "@/lib/query";

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

export async function getPackageDaily(pkg: string, daysIn: number): Promise<PackageDailyResult> {
  const requestId = mkRequestId();
  const days = normalizeDays(daysIn);

  assertValidPackageName(pkg);

  const range = rangeForDays(days);
  const key = `pkg:${pkg}:daily:${range}`;

  const ttlSeconds = config.cache.dailyTTLSeconds;

  const cached = cacheGet<PackageDailyResult>(key);
  if (cached.hit && cached.value) {
    return { ...cached.value, requestId, cache: { status: "HIT", ttlSeconds } };
  }

  const upstream = await fetchDailyDownloadsRange(pkg, range);
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
