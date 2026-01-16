import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildCompareData } from "@/lib/compare";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { parsePackageList } from "@/lib/query";
import { UpstreamError } from "@/lib/npm-client";

export const revalidate = 21600;

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/compare";
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
    const pkgsRaw = url.searchParams.get("pkgs");
    const daysParam = url.searchParams.get("days") ?? undefined;

    const pkgs = parsePackageList(pkgsRaw);
    const data = await buildCompareData(pkgs, daysParam);

    const response = NextResponse.json(
      { requestId, ...data },
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
