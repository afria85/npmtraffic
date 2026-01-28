import { buildOgImageResponse } from "@/lib/og-image";
import { fetchTraffic } from "@/lib/traffic";
import { validatePackageName } from "@/lib/package-name";

export const runtime = "edge";

function parseDays(value: string | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(365, Math.round(n)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "pkg").toLowerCase();
  const days = parseDays(searchParams.get("days"));

  if (mode === "compare") {
    const raw = searchParams.get("pkgs") ?? "";
    const pkgs = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((name) => validatePackageName(name).ok)
      .slice(0, 5);

    return buildOgImageResponse({ mode: "compare", pkgs, days });
  }

  const rawPkg = searchParams.get("pkg") ?? "";
  const pkg = validatePackageName(rawPkg).ok ? rawPkg : "";

  // Enrich OG for package mode with lightweight stats (best effort).
  try {
    if (!pkg) return buildOgImageResponse({ mode: "pkg", pkg, days });

    const compareDays = Math.min(365, days * 2);
    const data = await fetchTraffic(pkg, compareDays);
    const series = data.series;
    const last = series.slice(-days);
    const prev = series.slice(-(days * 2), -days);

    const sum = (rows: typeof last) => rows.reduce((acc, r) => acc + (r.downloads ?? 0), 0);
    const total = sum(last);
    const prevTotal = prev.length === days ? sum(prev) : null;
    const percentChange = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

    const sparkline = last.slice(-Math.min(14, last.length)).map((r) => r.downloads ?? 0);
    const dateRange = last.length
      ? { start: last[0]!.date, end: last[last.length - 1]!.date }
      : undefined;

    return buildOgImageResponse({
      mode: "pkg",
      pkg,
      days,
      stats: { total, percentChange, sparkline, dateRange },
    });
  } catch {
    // If anything fails (upstream/caching), fall back to the basic OG.
    return buildOgImageResponse({ mode: "pkg", pkg, days });
  }
}
