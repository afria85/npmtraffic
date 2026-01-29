import type { NextRequest } from "next/server";
import { decodePkg } from "@/lib/og-encode";

export const runtime = "edge";

function parseDays(raw: string): number {
  const cleaned = raw.replace(/\.png$/i, "");
  const n = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(1, n));
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ encoded: string; days: string }> }) {
  const { encoded, days: rawDays } = await ctx.params;
  const decoded = decodePkg(encoded);
  if (!decoded) return new Response("Not found", { status: 404 });

  const days = parseDays(rawDays);
  const url = new URL(request.url);
  const origin = url.origin;

  const og = new URL("/api/og", origin);
  og.searchParams.set("mode", "compare");
  og.searchParams.set("pkgs", decoded);
  og.searchParams.set("days", String(days));

  // Forward cache-busting params (e.g. ?v=0.3.8) if present.
  for (const [k, v] of url.searchParams.entries()) {
    if (!og.searchParams.has(k)) og.searchParams.set(k, v);
  }

  const resp = await fetch(og.toString(), { cache: "no-store" });
  return new Response(resp.body, { status: resp.status, headers: resp.headers });
}
