import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildCsv } from "@/lib/csv";
import { getPackageDaily } from "@/lib/package-daily";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { UpstreamError } from "@/lib/npm-client";
import { clampDays } from "@/lib/query";

export const revalidate = 21600;

export async function GET(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/package/[name]/daily.csv";
  let upstreamStatus: number | undefined;

  try {
    const limit = await rateLimit(req, route);
    if (!limit.allowed) {
      logApiEvent({
        requestId,
        route,
        status: 429,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        { requestId, error: "rate_limited", retryAfter: limit.retryAfter },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const { name: rawName } = await ctx.params;
    const name = decodeURIComponent(rawName);
    const url = new URL(req.url);
    const days = clampDays(url.searchParams.get("days") || "30");

    const data = await getPackageDaily(name, days);
    const rows: Array<Array<string | number | null>> = [
      ["date", "downloads", "delta", "avg7"],
      ...data.series.map((row) => [row.date, row.downloads, row.delta, row.avg7]),
    ];

    const csv = buildCsv(rows);
    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        "x-request-id": requestId,
      },
    });

    logApiEvent({
      requestId,
      route,
      status: 200,
      ms: Date.now() - start,
    });
    return response;
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (error instanceof UpstreamError) {
      upstreamStatus = error.status;
    }

    if (msg.startsWith("BAD_REQUEST")) {
      logApiEvent({
        requestId,
        route,
        status: 400,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        { requestId, error: "bad_request", message: msg.replace("BAD_REQUEST: ", "") },
        { status: 400 }
      );
    }

    if (msg.startsWith("NPM_NOT_FOUND")) {
      logApiEvent({
        requestId,
        route,
        status: 404,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        { requestId, error: "not_found", message: "Package not found" },
        { status: 404 }
      );
    }

    logApiEvent({
      requestId,
      route,
      status: 502,
      ms: Date.now() - start,
      upstreamStatus,
    });
    return NextResponse.json(
      {
        requestId,
        error: "upstream_unavailable",
        status: upstreamStatus ?? 502,
        message: "npm API temporarily unavailable",
      },
      { status: 502 }
    );
  }
}
