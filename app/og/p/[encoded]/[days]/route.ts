import { buildOgImageResponse } from "@/lib/og-image";
import { decodePkg } from "@/lib/og-encode";
import { fetchTraffic } from "@/lib/traffic";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function parseDays(value: string | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(365, Math.round(n)));
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ encoded: string; days: string }> }
) {
  const params = await context.params;
  const pkgName = decodePkg(params.encoded);
  if (!pkgName) {
    return new Response("Invalid encoded package name", { status: 400 });
  }

  const days = parseDays(params.days);

  // Best-effort live stats for world-class OG previews.
  try {
    const compareDays = Math.min(365, days * 2);
    const data = await fetchTraffic(pkgName, compareDays);
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
      pkg: pkgName,
      days,
      stats: { total, percentChange, sparkline, dateRange },
    });
  } catch {
    return buildOgImageResponse({ mode: "pkg", pkg: pkgName, days });
  }
}
