import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildCompareData } from "@/lib/compare";
import { buildCsv } from "@/lib/csv";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { parsePackageList } from "@/lib/query";
import { UpstreamError } from "@/lib/npm-client";

export const revalidate = 21600;

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/compare.csv";
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

    const url = new URL(req.url);
    const pkgs = parsePackageList(url.searchParams.get("pkgs"));
    const days = url.searchParams.get("days") ?? undefined;

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
