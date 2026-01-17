import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { assertValidPackageName, normalizePackageInput } from "@/lib/package-name";
import { clampDays, rangeForDays, type RangeForDaysResult } from "@/lib/query";
import { fetchDailyDownloadsRange, type NpmRangeRow, UpstreamError } from "@/lib/npm-client";
import { listDatesBetween } from "@/lib/dates";
import { recordError, recordSuccess } from "@/lib/health";

const FRESH_TTL_SECONDS = 60 * 15;
const STALE_TTL_SECONDS = 60 * 60 * 24;

export type TrafficSeriesRow = { date: string; downloads: number };

export type TrafficResponse = {
  package: string;
  range: RangeForDaysResult;
  series: TrafficSeriesRow[];
  totals: { sum: number; avgPerDay: number };
  meta: {
    source: "npm";
    fetchedAt: string;
    cacheStatus: "HIT" | "MISS" | "STALE";
    isStale: boolean;
    staleReason: "UPSTREAM_401" | "UPSTREAM_429" | "UPSTREAM_5XX" | "TIMEOUT" | "UNKNOWN" | null;
  };
  warning?: string;
};

type TrafficCacheValue = {
  package: string;
  range: RangeForDaysResult;
  series: TrafficSeriesRow[];
  totals: { sum: number; avgPerDay: number };
  fetchedAt: string;
};

export class TrafficError extends Error {
  code: "PACKAGE_NOT_FOUND" | "INVALID_REQUEST" | "UPSTREAM_UNAVAILABLE";
  status: number;
  upstreamStatus?: number;
  constructor(
    code: "PACKAGE_NOT_FOUND" | "INVALID_REQUEST" | "UPSTREAM_UNAVAILABLE",
    status: number,
    message: string,
    upstreamStatus?: number
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

function computeTotals(series: TrafficSeriesRow[]) {
  const sum = series.reduce((total, row) => total + row.downloads, 0);
  const avgPerDay = series.length ? Math.round(sum / series.length) : 0;
  return { sum, avgPerDay };
}

function normalizeSeries(rows: NpmRangeRow[], range: RangeForDaysResult) {
  if (!rows.length) {
    const empty = listDatesBetween(range.startDate, range.endDate);
    return empty.map((date) => ({ date, downloads: 0 }));
  }

  const timeline = listDatesBetween(range.startDate, range.endDate);
  if (!timeline.length) {
    return rows.map((row) => ({
      date: row.day,
      downloads: row.downloads ?? 0,
    }));
  }

  const lookup = new Map(rows.map((row) => [row.day, row.downloads ?? 0]));
  return timeline.map((date) => ({
    date,
    downloads: lookup.get(date) ?? 0,
  }));
}

function buildResponse(
  cached: TrafficCacheValue,
  cacheStatus: TrafficResponse["meta"]["cacheStatus"],
  staleReason: TrafficResponse["meta"]["staleReason"] | null
): TrafficResponse {
  const isStale = cacheStatus === "STALE";
  return {
    package: cached.package,
    range: cached.range,
    series: cached.series,
    totals: cached.totals,
    meta: {
      source: "npm",
      fetchedAt: cached.fetchedAt,
      cacheStatus,
      isStale,
      staleReason: isStale ? staleReason : null,
    },
    warning: isStale ? "Showing cached data (upstream error)." : undefined,
  };
}

function getStaleReason(error: unknown) {
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return "UPSTREAM_401";
    if (error.status === 429) return "UPSTREAM_429";
    if (error.status >= 500 && error.status <= 599) return "UPSTREAM_5XX";
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "TIMEOUT";
  }
  return "UNKNOWN";
}

function buildCacheKey(pkg: string, range: RangeForDaysResult) {
  return `traffic:${pkg.toLowerCase()}:${range.days}:${range.startDate}`;
}

export function getCachedTraffic(
  pkg: string,
  range: RangeForDaysResult,
  reason?: TrafficResponse["meta"]["staleReason"]
) {
  const key = buildCacheKey(pkg, range);
  const cached = cacheGetWithStale<TrafficCacheValue>(key);
  if (!cached.hit || !cached.value) return null;
  const status = cached.stale ? "STALE" : "HIT";
  return buildResponse(cached.value, status, cached.stale ? reason ?? "UNKNOWN" : null);
}

export async function fetchTraffic(pkgInput: string, daysInput?: string | number) {
  const pkg = normalizePackageInput(pkgInput);
  const days = clampDays(daysInput);

  try {
    assertValidPackageName(pkg);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Invalid package");
    throw new TrafficError("INVALID_REQUEST", 400, message);
  }

  const range = rangeForDays(days);
  const key = buildCacheKey(pkg, range);
  const cached = cacheGetWithStale<TrafficCacheValue>(key);
  if (cached.hit && cached.value && !cached.stale) {
    recordSuccess("HIT", false);
    return buildResponse(cached.value, "HIT", null);
  }

  try {
    const failMode = process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
    if (failMode) {
      const code = Number(failMode);
      throw new UpstreamError(code, "Test upstream failure");
    }

    const upstream = await fetchDailyDownloadsRange(pkg, {
      start: range.startDate,
      end: range.endDate,
    });
    const series = normalizeSeries(upstream.downloads, range);
    const totals = computeTotals(series);
    const fetchedAt = new Date().toISOString();
    const nextValue: TrafficCacheValue = {
      package: pkg,
      range,
      series,
      totals,
      fetchedAt,
    };
    cacheSetWithStale(key, nextValue, FRESH_TTL_SECONDS, STALE_TTL_SECONDS);
    recordSuccess("MISS", false);
    return buildResponse(nextValue, "MISS", null);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error ?? "");
    if (msg.startsWith("NPM_NOT_FOUND")) {
      recordError("PACKAGE_NOT_FOUND", msg);
      throw new TrafficError("PACKAGE_NOT_FOUND", 404, "Package not found");
    }

    if (cached.hit && cached.value) {
      const staleReason = getStaleReason(error);
      recordError(staleReason);
      recordSuccess("STALE", true);
      return buildResponse(cached.value, "STALE", staleReason);
    }

    const upstreamStatus = error instanceof UpstreamError ? error.status : undefined;
    recordError("UPSTREAM_UNAVAILABLE", String(error ?? "upstream"));
    throw new TrafficError(
      "UPSTREAM_UNAVAILABLE",
      502,
      "npm API temporarily unavailable",
      upstreamStatus
    );
  }
}
