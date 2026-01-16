import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getPackageDaily } from "@/lib/package-daily";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { UpstreamError } from "@/lib/npm-client";
import { clampDays } from "@/lib/query";

export const revalidate = 21600;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/package/[name]/daily";
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
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        }
      );
    }

    const { name: rawName } = await ctx.params;
    const name = decodeURIComponent(rawName);

    const url = new URL(req.url);
    const daysParam = clampDays(url.searchParams.get("days") || "30");

    const data = await getPackageDaily(name, daysParam);
    const series = data.series.map(({ date, downloads, delta, avg7 }) => ({
      date,
      downloads,
      delta,
      avg7,
    }));

    const response = NextResponse.json(
      { requestId, series },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      }
    );
    logApiEvent({
      requestId,
      route,
      status: 200,
      ms: Date.now() - start,
    });
    return response;
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = e instanceof UpstreamError ? 502 : 500;
    upstreamStatus = e instanceof UpstreamError ? e.status : undefined;

    if (msg.startsWith("BAD_REQUEST")) {
      logApiEvent({
        requestId,
        route,
        status: 400,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        {
          requestId,
          error: { code: "BAD_REQUEST", message: msg.replace("BAD_REQUEST: ", "") },
        },
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
        { requestId, error: { code: "NOT_FOUND", message: "Package not found" } },
        { status: 404 }
      );
    }

    logApiEvent({
      requestId,
      route,
      status: status,
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
