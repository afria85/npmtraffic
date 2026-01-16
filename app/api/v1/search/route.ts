import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePackageInput } from "@/lib/package-name";

type SearchResult = {
  name: string;
  version?: string;
  description?: string;
  score?: number;
  links?: Record<string, string>;
};

async function fetchSearch(q: string, limit: number) {
  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", q);
  url.searchParams.set("size", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "user-agent": "npmtraffic/0.2.0 (https://npmtraffic.com)",
    },
  });

  return res;
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/search";
  let upstreamStatus: number | undefined;

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
        { requestId, error: "rate_limited", retryAfter: limitCheck.retryAfter },
        { status: 429, headers: { "Retry-After": String(limitCheck.retryAfter) } }
      );
    }

    const url = new URL(req.url);
    const q = normalizePackageInput(url.searchParams.get("q") ?? "");
    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitParam) ? Math.min(10, Math.max(1, limitParam)) : 10;

    if (!q) {
      logApiEvent({
        requestId,
        route,
        status: 200,
        ms: Date.now() - start,
      });
      return NextResponse.json({ requestId, q, results: [] });
    }

    const res = await fetchSearch(q, limit);
    upstreamStatus = res.status;

    if (!res.ok) {
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
          status: res.status,
          message: "npm API temporarily unavailable",
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      objects?: Array<{
        package?: {
          name?: string;
          version?: string;
          description?: string;
          links?: Record<string, string>;
        };
        score?: { final?: number };
      }>;
    };

    const results: SearchResult[] = (data.objects ?? [])
      .map((item) => ({
        name: item.package?.name ?? "",
        version: item.package?.version,
        description: item.package?.description,
        links: item.package?.links,
        score: item.score?.final,
      }))
      .filter((item) => item.name);

    logApiEvent({
      requestId,
      route,
      status: 200,
      ms: Date.now() - start,
      upstreamStatus,
    });

    return NextResponse.json({ requestId, q, results });
  } catch {
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
