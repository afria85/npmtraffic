import { buildOgImageResponse } from "@/lib/og-image";
import { decodePkg } from "@/lib/og-encode";
import { fetchTraffic } from "@/lib/traffic";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function parseDays(value: string | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(365, Math.floor(n)));
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  // Node (dev) fallback
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof Buffer !== "undefined") return Buffer.from(buf).toString("base64");

  // Edge/web runtime
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getLogoDataUri(origin: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${origin}/icon.png`, { cache: "force-cache" });
    if (!res.ok) return undefined;
    const buf = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    return `data:image/png;base64,${b64}`;
  } catch {
    return undefined;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ encoded: string; days: string }> }
) {
  const { encoded, days: daysParam } = await params;
  const pkg = decodePkg(encoded) || "";
  const days = parseDays(daysParam);

  let stats: { total: number; percentChange: number | null; sparkline: number[]; dateRange: { start: string; end: string } } | undefined;
  
  try {
    const traffic = await fetchTraffic(pkg, days);
    // Map TrafficResponse to PkgStats format expected by buildOgImageResponse
    stats = {
      total: traffic.totals.sum,
      percentChange: null,
      sparkline: traffic.series.map((row) => row.downloads),
      dateRange: { start: traffic.range.startDate, end: traffic.range.endDate },
    };
  } catch {
    stats = undefined;
  }

  const logoSrc = await getLogoDataUri(new URL(request.url).origin);

  return buildOgImageResponse({
    mode: "pkg",
    pkg,
    days,
    stats,
    logoSrc,
  });
}
