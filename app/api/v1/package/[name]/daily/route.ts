import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { clampDays } from "@/lib/query";
import { fetchTraffic, getCachedTraffic, TrafficError } from "@/lib/traffic";

export const revalidate = 900;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/package/[name]/daily";
  let upstreamStatus: number | undefined;
  let cacheStatus: string | undefined;
  let isStale: boolean | undefined;
  let staleReason: string | undefined;
  let pkgName: string | undefined;
  let daysValue: number | undefined;

  try {
    const { name: rawName } = await ctx.params;
    let name = "";
    try {
      name = decodeURIComponent(rawName ?? "");
    } catch {
      throw new TrafficError("INVALID_REQUEST", 400, "Invalid package name");
    }
    pkgName = name;

    const url = new URL(req.url);
    const daysParam = clampDays(url.searchParams.get("days") || "30");
    daysValue = daysParam;

    const limit = await rateLimit(req, route);
    if (!limit.allowed) {
      const cached = getCachedTraffic(name, daysParam, "UNKNOWN");
      if (cached) {
        cacheStatus = cached.meta.cacheStatus;
        isStale = cached.meta.isStale;
        staleReason = cached.meta.staleReason ?? undefined;
        const response = NextResponse.json(cached, {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
            "Retry-After": String(limit.retryAfter),
            "x-request-id": requestId,
          },
        });
        logApiEvent({
          requestId,
          route,
          status: 200,
          ms: Date.now() - start,
          package: name,
          days: daysParam,
          cacheStatus,
          isStale,
          staleReason,
        });
        return response;
      }

      logApiEvent({
        requestId,
        route,
        status: 429,
        ms: Date.now() - start,
        package: name,
        days: daysParam,
      });
      return NextResponse.json(
        {
          error: { code: "RATE_LIMITED", message: "Please retry shortly." },
          retryAfter: limit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfter),
            "x-request-id": requestId,
          },
        }
      );
    }

    const data = await fetchTraffic(name, daysParam);
    cacheStatus = data.meta.cacheStatus;
    isStale = data.meta.isStale;
    staleReason = data.meta.staleReason ?? undefined;

    const response = NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
        "x-request-id": requestId,
      },
    });
    logApiEvent({
      requestId,
      route,
      status: 200,
      ms: Date.now() - start,
      package: name,
      days: daysParam,
      cacheStatus,
      isStale,
      staleReason,
    });
    return response;
  } catch (e: any) {
    const status = e instanceof TrafficError ? e.status : 500;
    upstreamStatus = e instanceof TrafficError ? e.upstreamStatus : undefined;

    if (e instanceof TrafficError && e.code === "INVALID_REQUEST") {
      logApiEvent({
        requestId,
        route,
        status: 400,
        ms: Date.now() - start,
        package: pkgName,
        days: daysValue,
      });
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Invalid package name" } },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (e instanceof TrafficError && e.code === "PACKAGE_NOT_FOUND") {
      logApiEvent({
        requestId,
        route,
        status: 404,
        ms: Date.now() - start,
        package: pkgName,
        days: daysValue,
      });
      return NextResponse.json(
        { error: { code: "PACKAGE_NOT_FOUND", message: "Package not found" } },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    logApiEvent({
      requestId,
      route,
      status: status,
      ms: Date.now() - start,
      upstreamStatus,
      package: pkgName,
      days: daysValue,
    });
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "npm API temporarily unavailable",
        },
        status: upstreamStatus ?? 502,
      },
      { status: 502, headers: { "x-request-id": requestId } }
    );
  }
}
