import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { assertValidPackageName, normalizePackageInput } from "@/lib/package-name";
import { config } from "@/lib/config";
import { logApiEvent } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";

async function fetchPackageExists(name: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const encoded = encodeURIComponent(name);
  const url = `https://registry.npmjs.org/${encoded}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "npmtraffic/0.2.0 (https://npmtraffic.com)",
      },
      signal: controller.signal,
    });

    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`UPSTREAM_${res.status}`);
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const route = "GET /api/v1/validate/[name]/exists";
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
    const decoded = normalizePackageInput(decodeURIComponent(rawName ?? ""));
    assertValidPackageName(decoded);

    const cacheKey = `validate:${decoded.toLowerCase()}`;
    const cached = cacheGet<{ exists: boolean }>(cacheKey);
    if (cached.hit && cached.value) {
      const exists = cached.value.exists;
      logApiEvent({
        requestId,
        route,
        status: exists ? 200 : 404,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        { requestId, name: decoded, exists },
        { status: exists ? 200 : 404 }
      );
    }

    const exists = await fetchPackageExists(decoded);
    const ttlSeconds = exists ? config.cache.validatePositiveTTLSeconds : config.cache.validateNegativeTTLSeconds;

    cacheSet(cacheKey, { exists }, ttlSeconds);

    logApiEvent({
      requestId,
      route,
      status: exists ? 200 : 404,
      ms: Date.now() - start,
    });
    return NextResponse.json(
      { requestId, name: decoded, exists },
      { status: exists ? 200 : 404 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error ?? "");
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

    logApiEvent({
      requestId,
      route,
      status: 502,
      ms: Date.now() - start,
    });
    return NextResponse.json(
      {
        requestId,
        error: { code: "UPSTREAM_ERROR", message: "Registry lookup failed" },
      },
      { status: 502 }
    );
  }
}
