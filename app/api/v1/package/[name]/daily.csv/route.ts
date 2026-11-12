import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildCsv } from "@/lib/csv";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { clampDays, rangeForDays } from "@/lib/query";
import { fetchTraffic, getCachedTraffic, TrafficError, type TrafficResponse } from "@/lib/traffic";
import { buildExportCommentHeader, buildExportMeta, packageCsvRows } from "@/lib/export";
import { buildExportFilename } from "@/lib/export-filename";


export async function GET(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/package/[name]/daily.csv";
  let upstreamStatus: number | undefined;
  let pkgName: string | undefined;
  let daysValue: number | undefined;
  let cacheStatus: TrafficResponse["meta"]["cacheStatus"] | undefined;
  let isStale: boolean | undefined;
  let staleReason: TrafficResponse["meta"]["staleReason"] | undefined;

  try {
    const limit = await rateLimit(req, route);
    if (!limit.allowed) {
      const { name: rawName } = await ctx.params;
      let name = "";
      try {
        name = decodeURIComponent(rawName ?? "");
      } catch {
        name = "";
      }
      const url = new URL(req.url);
      const days = clampDays(url.searchParams.get("days") || "30");
      pkgName = name;
      daysValue = days;
      const cacheRange = rangeForDays(days);
      const cached = getCachedTraffic(name, cacheRange, "UNKNOWN");
      if (cached) {
        cacheStatus = cached.meta.cacheStatus;
        isStale = cached.meta.isStale;
        staleReason = cached.meta.staleReason ?? undefined;
        const range = cached.range;
        const generatedAt = cached.meta.fetchedAt;
        const rows = packageCsvRows(cached);
        const exportMeta = buildExportMeta(
          range,
          generatedAt,
          requestId,
          cacheStatus ?? "MISS",
          Boolean(isStale),
          staleReason ?? null
        );
        const filename = buildExportFilename({
          packages: [name],
          days,
          range,
          format: "csv",
        });
        const csv = buildExportCommentHeader(exportMeta, cached.coverage, cached.meta.registryFetchedAt) + "\n" + buildCsv(rows);
        logApiEvent({
          requestId,
          route,
          status: 200,
          ms: Date.now() - start,
          package: name,
          days,
          cacheStatus,
          isStale,
          staleReason,
        });
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "no-store",
            "Retry-After": String(limit.retryAfter),
            "x-request-id": requestId,
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      logApiEvent({
        requestId,
        route,
        status: 429,
        ms: Date.now() - start,
        package: name,
        days,
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

    const { name: rawName } = await ctx.params;
    let name = "";
    try {
      name = decodeURIComponent(rawName ?? "");
    } catch {
      name = "";
    }
    pkgName = name;
    const url = new URL(req.url);
    const days = clampDays(url.searchParams.get("days") || "30");
    daysValue = days;

    const data = await fetchTraffic(name, days);
    cacheStatus = data.meta.cacheStatus;
    isStale = data.meta.isStale;
    staleReason = data.meta.staleReason ?? undefined;
    const range = data.range;
    const generatedAt = data.meta.fetchedAt;
    const rows = packageCsvRows(data);

    const exportMeta = buildExportMeta(
      range,
      generatedAt,
      requestId,
      cacheStatus ?? "MISS",
      Boolean(isStale),
      staleReason ?? null
    );
    const filename = buildExportFilename({
      packages: [name],
      days,
      range,
      format: "csv",
    });
    const csv = buildExportCommentHeader(exportMeta, data.coverage, data.meta.registryFetchedAt) + "\n" + buildCsv(rows);
    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "x-request-id": requestId,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

    logApiEvent({
      requestId,
      route,
      status: 200,
      ms: Date.now() - start,
      package: name,
      days,
      cacheStatus,
      isStale,
      staleReason,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof TrafficError) {
      upstreamStatus = error.upstreamStatus;
      if (error.code === "INVALID_REQUEST") {
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

      if (error.code === "PACKAGE_NOT_FOUND") {
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
    }

    const status = error instanceof TrafficError ? error.status : 500;
    logApiEvent({
      requestId,
      route,
      status,
      ms: Date.now() - start,
      upstreamStatus,
      package: pkgName,
      days: daysValue,
    });
    return NextResponse.json(
      {
        error: {
          code: status == 500 ? "INTERNAL_ERROR" : "UPSTREAM_UNAVAILABLE",
          message:
            status == 500 ? "Internal server error" : "npm API temporarily unavailable",
        },
        status: upstreamStatus ?? status,
      },
      { status, headers: { "x-request-id": requestId } }
    );
  }
}
