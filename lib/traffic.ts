import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { assertValidPackageName, normalizePackageInput } from "@/lib/package-name";
import { clampDays, rangeForDays, type RangeForDaysResult } from "@/lib/query";
import { fetchDailyDownloadsRange, UpstreamError } from "@/lib/npm-client";
import { recordError, recordCacheResult } from "@/lib/health";
import { buildDerivedMetrics, DERIVED_METHOD_DESCRIPTION, type DerivedMetrics } from "@/lib/derived";

import { fetchRegistryObservations, normalizeObservations, OBSERVATION_TTL_SECONDS, summarizeCoverage, type Observation } from "@/lib/observations";

const STALE_TTL_SECONDS = 60 * 60 * 24;

export type TrafficSeriesRow = Pick<Observation, "date" | "downloads"> & Partial<Omit<Observation, "date" | "downloads">>;

export type TrafficResponse = {
  package: string;
  range: RangeForDaysResult;
  series: Observation[];
  coverage: ReturnType<typeof summarizeCoverage> & { missingDays: number; unverifiedDays: number };
  totals: { sum: number | null; avgPerDay: number | null };
  derived: DerivedMetrics;
  meta: {
    source: "npm";
    fetchedAt: string;
    registryFetchedAt: string | null;
    cacheStatus: "HIT" | "MISS" | "STALE";
    isStale: boolean;
    staleReason: "UPSTREAM_401" | "UPSTREAM_429" | "UPSTREAM_5XX" | "TIMEOUT" | "UNKNOWN" | null;
    derivedMethod: string;
  };
  warning?: string;
};

type TrafficCacheValue = {
  package: string;
  range: RangeForDaysResult;
  series: Observation[];
  registryFetchedAt: string | null;
  fetchedAt: string;
};

const inflightRequests = new Map<string, Promise<TrafficResponse>>();

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

function buildResponse(
  cached: TrafficCacheValue,
  cacheStatus: TrafficResponse["meta"]["cacheStatus"],
  staleReason: TrafficResponse["meta"]["staleReason"] | null
): TrafficResponse {
  const derived = buildDerivedMetrics(cached.series);
  const coverage = {
    ...summarizeCoverage(cached.series, (row) => row.downloads !== null),
    missingDays: cached.series.filter((row) => row.status === "missing").length,
    unverifiedDays: cached.series.filter((row) => row.status === "unverified").length,
  };
  const sum = cached.series.reduce((total, row) => total + (row.downloads ?? 0), 0);
  const isStale = cacheStatus === "STALE";
  return {
    package: cached.package,
    range: cached.range,
    series: cached.series,
    derived,
    coverage,
    totals: {
      sum: coverage.includedDays ? sum : null,
      avgPerDay: coverage.includedDays ? Math.round(sum / coverage.includedDays) : null,
    },
    meta: {
      source: "npm",
      fetchedAt: cached.fetchedAt,
      registryFetchedAt: cached.registryFetchedAt,
      cacheStatus,
      isStale,
      staleReason: isStale ? staleReason : null,
      derivedMethod: DERIVED_METHOD_DESCRIPTION,
    },
    warning: isStale ? "Showing cached data (upstream error)."
      : cached.registryFetchedAt === null ? "Registry totals unavailable. Package counts are unverified." : undefined,
  };
}

function getStaleReason(error: unknown) {
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return "UPSTREAM_401";
    if (error.status === 429) return "UPSTREAM_429";
    if (error.status >= 500 && error.status <= 599) return "UPSTREAM_5XX";
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return "TIMEOUT";
  }
  return "UNKNOWN";
}

export function trafficCacheKey(pkg: string, range: RangeForDaysResult) {
  return ["traffic", "observations-v1", pkg.toLowerCase(), range.startDate, range.endDate].join(":");
}

export function getCachedTraffic(
  pkg: string,
  range: RangeForDaysResult,
  reason?: TrafficResponse["meta"]["staleReason"]
) {
  const key = trafficCacheKey(pkg, range);
  const cached = cacheGetWithStale<TrafficCacheValue>(key);
  if (!cached.hit || !cached.value) return null;
  const status = cached.stale ? "STALE" : "HIT";
  return buildResponse(cached.value, status, cached.stale ? reason ?? "UNKNOWN" : null);
}

export async function fetchTraffic(pkgInput: string, daysInput?: string | number, now = new Date()) {
  const pkg = normalizePackageInput(pkgInput);
  const days = clampDays(daysInput);

  try {
    assertValidPackageName(pkg);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Invalid package");
    throw new TrafficError("INVALID_REQUEST", 400, message);
  }

  const range = rangeForDays(days, now);
  const key = trafficCacheKey(pkg, range);
  const cached = cacheGetWithStale<TrafficCacheValue>(key);
  if (cached.hit && cached.value && !cached.stale) {
    recordCacheResult("HIT");
    return buildResponse(cached.value, "HIT", null);
  }

  const existingRequest = inflightRequests.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      const failMode = process.env.NPMTRAFFIC_TEST_UPSTREAM_FAIL;
      if (failMode) {
        const code = Number(failMode);
        throw new UpstreamError(code, "Test upstream failure");
      }

      const [packageResult, registryResult] = await Promise.allSettled([
        fetchDailyDownloadsRange(pkg, { start: range.startDate, end: range.endDate }),
        fetchRegistryObservations(range),
      ]);
      if (packageResult.status === "rejected") throw packageResult.reason;
      if (registryResult.status === "rejected" && cacheGetWithStale(key).hit) throw registryResult.reason;
      const registry = registryResult.status === "fulfilled" ? registryResult.value : null;
      const nextValue: TrafficCacheValue = {
        package: pkg,
        range,
        series: normalizeObservations(packageResult.value.downloads, range, registry),
        registryFetchedAt: registry?.fetchedAt ?? null,
        fetchedAt: new Date().toISOString(),
      };
      if (registry) {
        cacheSetWithStale(key, nextValue, OBSERVATION_TTL_SECONDS, STALE_TTL_SECONDS);
        recordCacheResult("MISS", nextValue.fetchedAt);
      } else {
        recordError("REGISTRY_OBSERVATIONS_UNAVAILABLE");
        recordCacheResult("MISS");
      }
      return buildResponse(nextValue, "MISS", null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error ?? "");
      if (msg.startsWith("NPM_NOT_FOUND")) {
        recordError("PACKAGE_NOT_FOUND");
        throw new TrafficError("PACKAGE_NOT_FOUND", 404, "Package not found");
      }

      const fallback = cacheGetWithStale<TrafficCacheValue>(key).value;
      if (fallback) {
        const staleReason = getStaleReason(error);
        recordError(staleReason);
        recordCacheResult("STALE");
        return buildResponse(fallback, "STALE", staleReason);
      }

      const upstreamStatus = error instanceof UpstreamError ? error.status : undefined;
      recordError(getStaleReason(error));
      throw new TrafficError(
        "UPSTREAM_UNAVAILABLE",
        502,
        "npm API temporarily unavailable",
        upstreamStatus
      );
    }
  })();

  inflightRequests.set(key, request);

  try {
    return await request;
  } finally {
    inflightRequests.delete(key);
  }
}
