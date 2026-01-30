import { buildOgImageResponse } from "@/lib/og-image";
import { loadOgLogoDataUrl } from "@/lib/og-logo";
import { fetchDailyDownloadsRange } from "@/lib/npm-client";
import { canonicalizePackages, parsePackageList } from "@/lib/query";
import { toYYYYMMDD } from "@/lib/dates";
import type { NextRequest } from "next/server";

export const runtime = "edge";

type OgMode = "home" | "pkg" | "compare";

type OgDateRange = { start: string; end: string };
type OgPkgStats = {
  total: number;
  percentChange: number | null;
  dateRange: OgDateRange;
  sparkline?: number[];
};
type OgCompareStats = OgPkgStats & { packages: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickSparkline(data: unknown): number[] | null {
  // Accept either { days: [{downloads}], ... } or { series: [{downloads}], ... } shapes.
  if (!isRecord(data)) return null;

  const maybeDays = data.days;
  const maybeSeries = data.series;
  const arr = Array.isArray(maybeDays) ? maybeDays : Array.isArray(maybeSeries) ? maybeSeries : null;
  if (!arr) return null;

  const out: number[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const v = item.downloads;
    if (typeof v === "number" && Number.isFinite(v)) out.push(v);
  }
  return out.length ? out : null;
}

function pickTotal(data: unknown): number | null {
  if (!isRecord(data)) return null;
  const direct = data.total;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const totals = data.totals;
  if (isRecord(totals)) {
    const sum = totals.sum;
    if (typeof sum === "number" && Number.isFinite(sum)) return sum;
    const downloads = totals.downloads;
    if (typeof downloads === "number" && Number.isFinite(downloads)) return downloads;
  }

  const spark = pickSparkline(data);
  if (!spark) return null;
  return spark.reduce((acc, v) => acc + v, 0);
}

function pickPercentChange(data: unknown): number | null {
  if (!isRecord(data)) return null;
  const candidates = [
    data.percentChange,
    data.pctChange,
    data.changePct,
    data.deltaPct,
    data.percent_delta,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return null;
}

function pickDateRange(data: unknown): { start: string; end: string } | null {
  if (!isRecord(data)) return null;
  const candidates = [data.dateRange, data.range, data.window];
  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const start = c.start ?? c.startDate;
    const end = c.end ?? c.endDate;
    if (typeof start === "string" && typeof end === "string" && start && end) {
      return { start, end };
    }
  }

  const maybeDays = data.days;
  const maybeSeries = data.series;
  const arr = Array.isArray(maybeDays) ? maybeDays : Array.isArray(maybeSeries) ? maybeSeries : null;
  if (!arr || arr.length === 0) return null;

  let first: string | null = null;
  let last: string | null = null;
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const date = item.date ?? item.day;
    if (typeof date !== "string") continue;
    if (!first) first = date;
    last = date;
  }
  if (first && last) return { start: first, end: last };
  return null;
}

function safeInt(value: string | null, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseIsoDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));
  if (!year || !month || !day) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDaysUtc(isoDate: string, deltaDays: number): string | null {
  const base = parseIsoDate(isoDate);
  if (!base) return null;
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return toYYYYMMDD(base);
}

function sumDownloads(rows: Array<{ downloads?: number | null }> | null): number {
  if (!rows || rows.length === 0) return 0;
  return rows.reduce((acc, row) => acc + (typeof row.downloads === "number" ? row.downloads : 0), 0);
}

async function computePreviousPeriodTotal(pkg: string, startDate: string, days: number): Promise<number | null> {
  const prevEnd = addDaysUtc(startDate, -1);
  const prevStart = addDaysUtc(startDate, -days);
  if (!prevEnd || !prevStart) return null;
  const prev = await fetchDailyDownloadsRange(pkg, { start: prevStart, end: prevEnd });
  return sumDownloads(prev.downloads);
}

async function bufferImageResponse(resp: Response) {
  const buf = await resp.arrayBuffer();
  const headers = new Headers(resp.headers);
  headers.set("Content-Length", String(buf.byteLength));
  return new Response(buf, { status: resp.status, headers });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const modeParam = (url.searchParams.get("mode") || "").toLowerCase();
    const requestedMode: OgMode = modeParam === "compare" ? "compare" : modeParam === "home" ? "home" : "pkg";

    const hasPkgishParam =
      url.searchParams.has("pkg") ||
      url.searchParams.has("name") ||
      url.searchParams.has("pkgs") ||
      url.searchParams.has("packages");

    // If nothing is specified, treat it as the homepage OG.
    if (!modeParam && !hasPkgishParam) {
      const logoSrc = await loadOgLogoDataUrl(url.origin);
      return bufferImageResponse(await buildOgImageResponse({ mode: "home", logoSrc }));
    }

    const mode: Exclude<OgMode, "home"> = requestedMode === "compare" ? "compare" : "pkg";

    // Accept a few aliases so callers can be flexible.
    // - pkg/name: single package name OR comma-separated list for compare
    // - pkgs/packages: compare list alias
    const pkgParam =
      url.searchParams.get("pkg") ||
      url.searchParams.get("name") ||
      url.searchParams.get("pkgs") ||
      url.searchParams.get("packages") ||
      "react";
    const days = safeInt(url.searchParams.get("days"), 30);

    const parsedPackages = parsePackageList(pkgParam);
    const packages =
      mode === "compare" ? canonicalizePackages(parsedPackages) : parsedPackages.length ? parsedPackages : ["react"];

    // Prefer your actual logo from public/icon.png.
    const logoSrc = await loadOgLogoDataUrl(url.origin);

    // Build best-effort stats for the OG renderer. If the upstream fetch fails,
    // we still render a valid OG image with just the title/subtitle framing.
    let stats: OgPkgStats | OgCompareStats | undefined;
    // For compare mode, keep the raw backend payload to preserve per-package totals/shares.
    let rawCompare: unknown | undefined;
    try {
      if (mode === "compare") {
        const compareUrl = new URL("/api/v1/compare", url.origin);
        // The backend logs use `package=...` (comma-separated). Keep aliases compatible.
        compareUrl.searchParams.set("packages", packages.join(","));
        compareUrl.searchParams.set("days", String(days));
        const resp = await fetch(compareUrl.toString(), { cache: "no-store" });
        const json = (await resp.json()) as unknown;
        rawCompare = json;
        // Keep a minimal rollup in case normalization fails.
        const dateRange = pickDateRange(json);
        const total = pickTotal(json);
        const percentChange = pickPercentChange(json);
        if (dateRange && typeof total === "number") {
          stats = {
            packages,
            total,
            percentChange: typeof percentChange === "number" ? percentChange : null,
            dateRange,
            sparkline: pickSparkline(json) ?? undefined,
          };
        }
      } else {
        const name = packages[0] || "react";
        const dailyUrl = new URL(`/api/v1/package/${encodeURIComponent(name)}/daily`, url.origin);
        dailyUrl.searchParams.set("days", String(days));
        const resp = await fetch(dailyUrl.toString(), { cache: "no-store" });
        const json = (await resp.json()) as unknown;
        const dateRange = pickDateRange(json);
        const total = pickTotal(json);
        let percentChange = pickPercentChange(json);
        if (typeof percentChange !== "number" && dateRange && typeof total === "number") {
          try {
            const prevTotal = await computePreviousPeriodTotal(name, dateRange.start, days);
            if (typeof prevTotal === "number" && prevTotal > 0) {
              percentChange = ((total - prevTotal) / prevTotal) * 100;
            } else {
              percentChange = null;
            }
          } catch {
            percentChange = null;
          }
        }

        if (dateRange && typeof total === "number") {
          stats = {
            total,
            percentChange: typeof percentChange === "number" ? percentChange : null,
            dateRange,
            sparkline: pickSparkline(json) ?? undefined,
          };
        } else {
          stats = undefined;
        }
      }
    } catch {
      stats = undefined;
    }

    type ComparePkgStats = { name: string; total: number; share: number };
    type CompareStats = { dateRange?: { start: string; end: string }; packages: ComparePkgStats[] };

    function normalizeCompareStats(raw: unknown): CompareStats | undefined {
      if (!raw || typeof raw !== "object") return undefined;
      const r = raw as Record<string, unknown>;
      const pkgsRaw = r["packages"];
      if (!Array.isArray(pkgsRaw)) return undefined;

      const packages: ComparePkgStats[] = pkgsRaw
        .map((p): ComparePkgStats | null => {
          if (typeof p === "string") return { name: p, total: 0, share: 0 };
          if (!p || typeof p !== "object") return null;
          const pr = p as Record<string, unknown>;
          const name = typeof pr["name"] === "string" ? pr["name"] : "";
          const totalRaw = pr["total"];
          const shareRaw = pr["share"];
          const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
          const share = typeof shareRaw === "number" ? shareRaw : Number(shareRaw);
          return {
            name,
            total: Number.isFinite(total) ? total : 0,
            share: Number.isFinite(share) ? share : 0,
          };
        })
        .filter((p): p is ComparePkgStats => Boolean(p && p.name));

      const dr = r["dateRange"] ?? r["range"];
      let start = "";
      let end = "";
      if (dr && typeof dr === "object") {
        const drr = dr as Record<string, unknown>;
        start =
          typeof drr["start"] === "string"
            ? (drr["start"] as string)
            : typeof drr["startDate"] === "string"
              ? (drr["startDate"] as string)
              : typeof drr["from"] === "string"
                ? (drr["from"] as string)
                : "";
        end =
          typeof drr["end"] === "string"
            ? (drr["end"] as string)
            : typeof drr["endDate"] === "string"
              ? (drr["endDate"] as string)
              : typeof drr["to"] === "string"
                ? (drr["to"] as string)
                : "";
      }

      if (!packages.length) return undefined;
      return { dateRange: { start, end }, packages };
    }

    if (mode === "compare") {
      const compareStats = normalizeCompareStats(rawCompare) ?? normalizeCompareStats(stats);
      const comparePkgs = compareStats?.packages.map((pkg) => pkg.name) ?? packages;
      return bufferImageResponse(
        await buildOgImageResponse({ mode: "compare", days, pkgs: comparePkgs, logoSrc, stats: compareStats })
      );
    }

    const pkgName = packages[0] || pkgParam;
    const pkgStats = stats && !("packages" in stats) ? (stats as OgPkgStats) : undefined;
    return bufferImageResponse(await buildOgImageResponse({ mode: "pkg", days, pkg: pkgName, logoSrc, stats: pkgStats }));
  } catch (error) {
    console.error("OG render failed", error);
    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";
    const message =
      error instanceof Error ? `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}` : "Unknown error";
    return new Response(debug ? message : "OG render failed.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
