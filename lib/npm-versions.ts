import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { config } from "@/lib/config";
import { readBoundedBytes } from "@/lib/bounded-bytes";
import { EVENT_LABEL_MAX_LENGTH, publicationUtcDay } from "@/lib/events";
import { classifyVersion } from "@/lib/npm-semver";
import { normalizePackageInput, validatePackageName } from "@/lib/package-name";
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

const MAX_PACKUMENT_BYTES = 48 * 1024 * 1024;
const MAX_IMPORT_RELEASES = 500;

type VersionPublication = { version: string; publishedAt: string; date: string; kind: "stable" | "prerelease" };
type ReleaseSelection = { entries: VersionPublication[]; total: number };
export type ReleaseImports = { stable: ReleaseSelection; all: ReleaseSelection; isStale: boolean };

export function buildReleaseImports(
  time: Record<string, string>, range: Pick<RangeForDaysResult, "startDate" | "endDate">,
  isStale = false,
): ReleaseImports {
  const all = Object.entries(time).flatMap(([version, publishedAt]): VersionPublication[] => {
    const kind = classifyVersion(version);
    const date = typeof publishedAt === "string" ? publicationUtcDay(publishedAt) : null;
    return kind && version.length < EVENT_LABEL_MAX_LENGTH && date && date >= range.startDate && date <= range.endDate
      ? [{ version, publishedAt, date, kind }] : [];
  }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.version.localeCompare(b.version));
  const stable = all.filter((entry) => entry.kind === "stable");
  const limit = (entries: VersionPublication[]) => ({ entries: entries.slice(0, MAX_IMPORT_RELEASES), total: entries.length });
  return { stable: limit(stable), all: limit(all), isStale };
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

function analyzeTime(
  time: Record<string, string>,
  distTags: Record<string, string>,
  range: Pick<RangeForDaysResult, "startDate" | "endDate">
) {
  let totalVersions = 0;
  let releasesInRange = 0;

  let mostRecentIso = "";
  let mostRecentTime = -Infinity;
  let mostRecentVersion: string | null = null;

  for (const [key, iso] of Object.entries(time)) {
    if (key === "created" || key === "modified") continue;
    const kind = classifyVersion(key);
    if (!kind) continue;
    if (typeof iso !== "string") continue;

    const day = publicationUtcDay(iso);
    if (!day) continue;

    totalVersions += 1;

    const publishedTime = Date.parse(iso);
    if (publishedTime > mostRecentTime) {
      mostRecentIso = iso;
      mostRecentTime = publishedTime;
      mostRecentVersion = key;
    }

    if (day >= range.startDate && day <= range.endDate && kind === "stable") {
      releasesInRange += 1;
    }
  }

  const distTagLatest = typeof distTags.latest === "string" ? distTags.latest : null;
  const latestVersion = distTagLatest ?? mostRecentVersion;
  const publication = distTagLatest ? time[distTagLatest] : mostRecentIso;
  const latestPublishedDateUtc = typeof publication === "string" ? publicationUtcDay(publication) : null;

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
    if (classifyVersion(key) !== "stable") continue;
    if (typeof iso !== "string") continue;

    const day = publicationUtcDay(iso);
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
  releaseImports: ReleaseImports;
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
  if (!validatePackageName(pkg).ok) return null;

  const key = buildCacheKey(pkg);
  const cached = cacheGetWithStale<VersionTimeCacheValue>(key);
  if (cached.hit && cached.value && !cached.stale) {
    const distTags = cached.value.distTags ?? {};
    const analysis = analyzeTime(cached.value.time, distTags, range);

    return {
      package: pkg,
      markers: extractVersionMarkersFromTime(cached.value.time, range),
      releaseImports: buildReleaseImports(cached.value.time, range),
      fetchedAt: cached.value.fetchedAt,
      cacheStatus: "HIT",
      isStale: false,
      ...analysis,
    };
  }

  async function fetchMeta(): Promise<{ time: Record<string, string>; distTags: Record<string, string> }> {
    const url = `https://registry.npmjs.org/${encodeURIComponent(pkg)}`;
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
      if (!res.ok || !res.body) {
        throw new Error(`Upstream HTTP ${res.status}`);
      }
      const bytes = await readBoundedBytes(res.body, MAX_PACKUMENT_BYTES);
      const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as RegistryMetaResponse;
      if (!data?.time || typeof data.time !== "object" || Array.isArray(data.time)) {
        throw new Error("Publication history unavailable");
      }
      return {
        time: data.time,
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
      releaseImports: buildReleaseImports(time, range),
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
        releaseImports: buildReleaseImports(cached.value.time, range, true),
        fetchedAt: cached.value.fetchedAt,
        cacheStatus: "STALE",
        isStale: true,
        ...analysis,
      };
    }
    return null;
  }
}
