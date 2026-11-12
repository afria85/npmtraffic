import { buildCompareData } from "@/lib/compare";
import { buildOgImageResponse } from "@/lib/og-image";
import { buildOgComparisonStats, buildOgPackageStats } from "@/lib/og-stats";
import { validatePackageName } from "@/lib/package-name";
import { canonicalizePackages, clampDays, parsePackageList } from "@/lib/query";
import { rateLimit } from "@/lib/rate-limit";
import { fetchTraffic } from "@/lib/traffic";

type OgMode = "home" | "pkg" | "compare";

export async function renderOg(request: Request, mode: OgMode, rawPackages?: string | null, rawDays?: string | null) {
  try {
    if (mode === "home") return await bufferImage(await buildOgImageResponse({ mode }));

    const days = clampDays(rawDays?.replace(/\.png$/i, ""));
    const names = parsePackageList(rawPackages).filter((name) => validatePackageName(name).ok);
    const packages = canonicalizePackages(names).slice(0, 5);
    const pkg = names[0] ?? (rawPackages ? "npm package" : "react");
    let packageStats: ReturnType<typeof buildOgPackageStats> | undefined;
    let comparisonStats: ReturnType<typeof buildOgComparisonStats> | undefined;
    const validSelection = mode === "compare" ? packages.length >= 2 : validatePackageName(pkg).ok;

    if (validSelection && (await rateLimit(request, "GET /og")).allowed) {
      try {
        if (mode === "compare") comparisonStats = buildOgComparisonStats(await buildCompareData(packages, days));
        else packageStats = buildOgPackageStats(await fetchTraffic(pkg, days));
      } catch {
        // The existing image framing remains available during upstream failures.
      }
    }

    const stats = mode === "compare" ? comparisonStats : packageStats;
    const response = await buildOgImageResponse(mode === "compare"
      ? { mode, days, pkgs: comparisonStats?.packages.map(({ name }) => name) ?? packages, stats: comparisonStats }
      : { mode, days, pkg, stats: packageStats });
    return await bufferImage(response, !stats || stats.isStale ? "no-store" : "public, max-age=0, s-maxage=300");
  } catch (error) {
    console.error("OG render failed", error);
    return new Response("OG render failed.", { status: 500 });
  }
}

async function bufferImage(response: Response, cacheControl?: string) {
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set("Content-Length", String(body.byteLength));
  if (cacheControl) headers.set("Cache-Control", cacheControl);
  return new Response(body, { status: response.status, headers });
}
