import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { assertValidPackageName, normalizePackageInput } from "@/lib/package-name";
import { config } from "@/lib/config";

function mkRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchPackageExists(name: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const encoded = encodeURIComponent(name);
  const url = `https://registry.npmjs.org/${encoded}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`UPSTREAM_${res.status}`);
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const requestId = mkRequestId();
  try {
    const { name: rawName } = await ctx.params;
    const decoded = normalizePackageInput(decodeURIComponent(rawName ?? ""));
    assertValidPackageName(decoded);

    const cacheKey = `validate:${decoded.toLowerCase()}`;
    const cached = cacheGet<{ exists: boolean }>(cacheKey);
    if (cached.hit && cached.value) {
      const exists = cached.value.exists;
      return NextResponse.json(
        { requestId, name: decoded, exists },
        { status: exists ? 200 : 404 }
      );
    }

    const exists = await fetchPackageExists(decoded);
    const ttlSeconds = exists ? config.cache.validatePositiveTTLSeconds : config.cache.validateNegativeTTLSeconds;

    cacheSet(cacheKey, { exists }, ttlSeconds);

    return NextResponse.json(
      { requestId, name: decoded, exists },
      { status: exists ? 200 : 404 }
    );
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.startsWith("BAD_REQUEST")) {
      return NextResponse.json(
        {
          requestId,
          error: { code: "BAD_REQUEST", message: msg.replace("BAD_REQUEST: ", "") },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        requestId,
        error: { code: "UPSTREAM_ERROR", message: "Registry lookup failed" },
      },
      { status: 502 }
    );
  }
}
