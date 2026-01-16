import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { fetchSearch } from "@/lib/search";
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/search";

  try {
    const limitCheck = await rateLimit(req, route);
    if (!limitCheck.allowed) {
      logApiEvent({
        requestId,
        route,
        status: 429,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        {
          error: { code: "RATE_LIMITED", message: "Please retry shortly." },
          retryAfter: limitCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitCheck.retryAfter),
            "x-request-id": requestId,
          },
        }
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitParam) ? Math.min(10, Math.max(1, limitParam)) : 10;

    const data = await fetchSearch(q, limit);

    logApiEvent({
      requestId,
      route,
      status: 200,
      ms: Date.now() - start,
      cacheStatus: data.meta.cacheStatus,
    });

    return NextResponse.json(data, {
      headers: { "x-request-id": requestId },
    });
  } catch {
    logApiEvent({
      requestId,
      route,
      status: 502,
      ms: Date.now() - start,
    });
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "npm API temporarily unavailable",
        },
      },
      { status: 502, headers: { "x-request-id": requestId } }
    );
  }
}
