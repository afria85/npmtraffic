import { cacheGet, cacheSet } from "@/lib/cache";
import { config } from "@/lib/config";
import { listDatesBetween } from "@/lib/dates";
import { fetchDailyDownloadsRange, UpstreamError, type NpmRangeRow } from "@/lib/npm-client";
import type { RangeForDaysResult } from "@/lib/query";

export const OBSERVATION_TTL_SECONDS = config.cache.dailyTTLSeconds;

export type ObservationStatus = "available" | "missing" | "unverified";
export type Observation = {
  date: string;
  downloads: number | null;
  upstreamDownloads: number | null;
  registryDownloads: number | null;
  status: ObservationStatus;
};

type RegistrySnapshot = { counts: Map<string, number>; fetchedAt: string };
const inflight = new Map<string, Promise<RegistrySnapshot>>();

function indexObservations(rows: NpmRangeRow[], timeline: string[]) {
  const dates = new Set(timeline);
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    if (!dates.has(row.day) || counts.has(row.day) ||
        !Number.isSafeInteger(row.downloads) || row.downloads < 0) {
      throw new UpstreamError(502, "Invalid npm daily observations");
    }
    total += row.downloads;
    if (!Number.isSafeInteger(total)) throw new UpstreamError(502, "Unsafe npm download total");
    counts.set(row.day, row.downloads);
  }
  return counts;
}

export function fetchRegistryObservations(range: RangeForDaysResult) {
  const key = `registry-observations:${range.startDate}:${range.endDate}`;
  const cached = cacheGet<RegistrySnapshot>(key).value;
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetchDailyDownloadsRange(null, { start: range.startDate, end: range.endDate })
    .then(({ downloads }) => {
      const counts = indexObservations(downloads, listDatesBetween(range.startDate, range.endDate));
      const snapshot = { counts, fetchedAt: new Date().toISOString() };
      cacheSet(key, snapshot, OBSERVATION_TTL_SECONDS);
      return snapshot;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

export function normalizeObservations(
  rows: NpmRangeRow[],
  range: RangeForDaysResult,
  registry: RegistrySnapshot | null,
): Observation[] {
  const timeline = listDatesBetween(range.startDate, range.endDate);
  const counts = indexObservations(rows, timeline);
  return timeline.map((date) => {
    const upstreamDownloads = counts.get(date) ?? null;
    const registryDownloads = registry?.counts.get(date) ?? null;
    const status = upstreamDownloads === null ? "missing"
      : registryDownloads === null || registryDownloads === 0 || upstreamDownloads > registryDownloads
        ? "unverified" : "available";
    return {
      date,
      downloads: status === "available" ? upstreamDownloads : null,
      upstreamDownloads,
      registryDownloads,
      status,
    };
  });
}

export function summarizeCoverage<Row extends { date: string }>(
  series: Row[], isIncluded: (row: Row) => boolean,
) {
  const included = series.filter(isIncluded);
  return {
    requestedDays: series.length,
    includedDays: included.length,
    latestIncludedDate: included.at(-1)?.date ?? null,
  };
}
