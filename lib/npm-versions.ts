import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { config } from "@/lib/config";
import { normalizePackageInput } from "@/lib/package-name";
import type { RangeForDaysResult } from "@/lib/query";
import { USER_AGENT } from "@/lib/version";

export type VersionTimelineMarker = {
  date_utc: string;
  versions: string[];
};

type RegistryMetaResponse = {
  time?: Record<string, string>;
  "dist-tags"?: Record<string, string>;
};

type VersionTimeCacheValue = {
  fetchedAt: string;
  time: Record<string, string>;
  distTags: Record<string, string>;
};

const CACHE_FRESH_SECONDS = 60 * 60 * 6; // 6h
const CACHE_STALE_SECONDS = config.cache.metadataTTLSeconds; // 7d by default

const SEMVER_LIKE_RE = /^\d+\.\d+\.\d+(?:[-+].+)?$/;

function isSemverLike(value: string) {
  return SEMVER_LIKE_RE.test(value);
}

function buildCacheKey(pkg: string) {
  return `versions:${pkg.toLowerCase()}`;
}

const MAX_MARKER_DAYS = 28;

function isZeroPatchRelease(version: string) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return false;
  return m[3] === "0";
}

function pickEvenlyIndices(indices: number[], count: number) {
  if (count <= 0) return [];
  if (indices.length <= count) return indices.slice();
  if (count === 1) return [indices[Math.floor(indices.length / 2)]!];
  const picked: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const pos = Math.round(t * (indices.length - 1));
    picked.push(indices[pos]!);
  }
  return Array.from(new Set(picked)).sort((a, b) => a - b);
}

function toUtcDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function analyzeTime(
  time: Record<string, string>,
  distTags: Record<string, string>,
  range: Pick<RangeForDaysResult, "startDate" | "endDate">
) {
  let totalVersions = 0;
  let releasesInRange = 0;

  let mostRecentIso = "";
  let mostRecentVersion: string | null = null;

  for (const [key, iso] of Object.entries(time)) {
    if (key === "created" || key === "modified") continue;
    if (!isSemverLike(key)) continue;
    if (typeof iso !== "string") continue;

    const day = toUtcDay(iso);
    if (!day) continue;

    totalVersions += 1;

    if (iso > mostRecentIso) {
      mostRecentIso = iso;
      mostRecentVersion = key;
    }

    if (day >= range.startDate && day <= range.endDate) {
      releasesInRange += 1;
    }
  }

  const distTagLatest = typeof distTags.latest === "string" ? distTags.latest : null;
  const latestVersion = distTagLatest && typeof time[distTagLatest] === "string" ? distTagLatest : mostRecentVersion;
  const latestPublishedDateUtc = latestVersion ? toUtcDay(time[latestVersion] ?? "") : null;

  return {
    totalVersions,
    releasesInRange,
    distTagLatest,
    latestVersion,
    latestPublishedDateUtc,
  };
}

export function downsampleVersionMarkers(
  markers: VersionTimelineMarker[],
  maxDays = MAX_MARKER_DAYS
): VersionTimelineMarker[] {
  if (markers.length <= maxDays) return markers;

  const mustKeep = new Set<number>();
  mustKeep.add(0);
  mustKeep.add(markers.length - 1);

  for (let i = 0; i < markers.length; i += 1) {
    const mk = markers[i];
    if (!mk) continue;
    const versions = Array.isArray(mk.versions) ? mk.versions : [];
    if (versions.length > 1) {
      mustKeep.add(i);
      continue;
    }
    if (versions.some((v) => typeof v === "string" && isZeroPatchRelease(v))) {
      mustKeep.add(i);
    }
  }

  const must = Array.from(mustKeep).sort((a, b) => a - b);

  // If the required set is already too large, keep first+last and sample the rest.
  if (must.length > maxDays) {
    const middle = must.filter((i) => i !== 0 && i !== markers.length - 1);
    const sampled = pickEvenlyIndices(middle, Math.max(0, maxDays - 2));
    const final = [0, ...sampled, markers.length - 1].sort((a, b) => a - b);
    return final.map((i) => markers[i]!).filter(Boolean);
  }

  const remainingSlots = maxDays - must.length;
  if (remainingSlots <= 0) {
    return must.map((i) => markers[i]!).filter(Boolean);
  }

  const candidates = [] as number[];
  for (let i = 0; i < markers.length; i += 1) {
    if (!mustKeep.has(i)) candidates.push(i);
  }

  const sampled = pickEvenlyIndices(candidates, remainingSlots);
  const final = Array.from(new Set([...must, ...sampled])).sort((a, b) => a - b);
  return final.map((i) => markers[i]!).filter(Boolean);
}

export function extractVersionMarkersFromTime(
  time: Record<string, string>,
  range: Pick<RangeForDaysResult, "startDate" | "endDate">,
  maxDays = MAX_MARKER_DAYS
): VersionTimelineMarker[] {
  const byDate = new Map<string, string[]>();

  for (const [key, iso] of Object.entries(time)) {
    if (key === "created" || key === "modified") continue;
    if (!isSemverLike(key)) continue;
    if (typeof iso !== "string") continue;

    const day = toUtcDay(iso);
    if (!day) continue;

    // Range dates are YYYY-MM-DD (UTC). Lexicographic comparison works.
    if (day < range.startDate || day > range.endDate) continue;

    const list = byDate.get(day) ?? [];
    list.push(key);
    byDate.set(day, list);
  }

  const markers = Array.from(byDate.entries())
    .map(([date_utc, versions]) => ({
      date_utc,
      versions: versions.slice().sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.date_utc.localeCompare(b.date_utc));

  return downsampleVersionMarkers(markers, maxDays);
}

export async function getPackageVersionTimeline(
  pkgInput: string,
  range: Pick<RangeForDaysResult, "startDate" | "endDate">
): Promise<{
  package: string;
  markers: VersionTimelineMarker[];
  fetchedAt: string;
  cacheStatus: "HIT" | "MISS" | "STALE";
  isStale: boolean;
  distTagLatest: string | null;
  latestVersion: string | null;
  latestPublishedDateUtc: string | null;
  releasesInRange: number;
  totalVersions: number;
} | null> {
  const pkg = normalizePackageInput(pkgInput);
  if (!pkg) return null;

  const key = buildCacheKey(pkg);
  const cached = cacheGetWithStale<VersionTimeCacheValue>(key);
  if (cached.hit && cached.value && !cached.stale) {
    const distTags = cached.value.distTags ?? {};
    const analysis = analyzeTime(cached.value.time, distTags, range);

    return {
      package: pkg,
      markers: extractVersionMarkersFromTime(cached.value.time, range),
      fetchedAt: cached.value.fetchedAt,
      cacheStatus: "HIT",
      isStale: false,
      ...analysis,
    };
  }

  async function fetchMeta(): Promise<{ time: Record<string, string>; distTags: Record<string, string> }> {
    const url = `https://registry.npmjs.org/${encodeURIComponent(pkg)}?fields=time,dist-tags`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Upstream HTTP ${res.status}`);
      }
      const data = (await res.json()) as RegistryMetaResponse;
      return {
        time: data.time ?? {},
        distTags: data["dist-tags"] ?? {},
      };
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const { time, distTags } = await fetchMeta();
    const fetchedAt = new Date().toISOString();
    cacheSetWithStale(key, { fetchedAt, time, distTags }, CACHE_FRESH_SECONDS, CACHE_STALE_SECONDS);

    const analysis = analyzeTime(time, distTags, range);

    return {
      package: pkg,
      markers: extractVersionMarkersFromTime(time, range),
      fetchedAt,
      cacheStatus: "MISS",
      isStale: false,
      ...analysis,
    };
  } catch {
    if (cached.hit && cached.value) {
      const distTags = cached.value.distTags ?? {};
      const analysis = analyzeTime(cached.value.time, distTags, range);

      return {
        package: pkg,
        markers: extractVersionMarkersFromTime(cached.value.time, range),
        fetchedAt: cached.value.fetchedAt,
        cacheStatus: "STALE",
        isStale: true,
        ...analysis,
      };
    }
    return null;
  }
}
