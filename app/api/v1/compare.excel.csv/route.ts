import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildCompareData } from "@/lib/compare";
import { buildCsv } from "@/lib/csv";
import { buildExportCommentHeader, buildExportMeta } from "@/lib/export";
import { buildExportFilename } from "@/lib/export-filename";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { parsePackageList } from "@/lib/query";
import { TrafficError } from "@/lib/traffic";

export const revalidate = 900;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/compare.excel.csv";
  let upstreamStatus: number | undefined;
  let pkgList: string | undefined;
  let daysValue: number | undefined;

  try {
    const url = new URL(req.url);
    const pkgsRaw = url.searchParams.get("packages") ?? url.searchParams.get("pkgs");
    const pkgs = parsePackageList(pkgsRaw);
    const days = url.searchParams.get("days") ?? undefined;
    daysValue = days ? Number(days) : undefined;

    if (pkgs.length < 2) {
      logApiEvent({
        requestId,
        route,
        status: 400,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Provide at least two packages for comparison.",
          },
        },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const limit = await rateLimit(req, route);
    if (!limit.allowed) {
      logApiEvent({
        requestId,
        route,
        status: 429,
        ms: Date.now() - start,
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

    pkgList = pkgs.join(",");

    const data = await buildCompareData(pkgs, days);

    const header: Array<string | number | null> = ["date"];
    for (const pkg of data.packages) {
      header.push(`${pkg.name} downloads`, `${pkg.name} delta`);
    }

    const rows: Array<Array<string | number | null>> = [
      header,
      ...data.series.map((row) => {
        const line: Array<string | number | null> = [row.date];
        for (const pkg of data.packages) {
          const value = row.values[pkg.name];
          line.push(value?.downloads ?? 0, value?.delta ?? null);
        }
        return line;
      }),
    ];

    const exportMeta = buildExportMeta(
      data.range,
      data.meta.fetchedAt,
      requestId,
      data.meta.cacheStatus,
      data.meta.isStale,
      data.meta.staleReason ?? null
    );
    const filename = buildExportFilename({
      packages: pkgs,
      days: data.days,
      range: data.range,
      format: "excel.csv",
    });
    const csv =
      ["sep=;"].concat(buildExportCommentHeader(exportMeta).split("\n")).join("\n") +
      "\n" +
      buildCsv(rows, ";", { excelSafe: true });
    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
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
      package: pkgList,
      days: data.days,
    });
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error ?? "");
    if (error instanceof TrafficError) {
      upstreamStatus = error.upstreamStatus;
    }

    if (msg.startsWith("BAD_REQUEST")) {
      logApiEvent({
        requestId,
        route,
        status: 400,
        ms: Date.now() - start,
        package: pkgList,
        days: daysValue,
      });
      return NextResponse.json(
        {
          error: { code: "INVALID_REQUEST", message: msg.replace("BAD_REQUEST: ", "") },
        },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    logApiEvent({
      requestId,
      route,
      status: 502,
      ms: Date.now() - start,
      upstreamStatus,
      package: pkgList,
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
