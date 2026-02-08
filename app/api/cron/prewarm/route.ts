import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { normalizePackageInput } from "@/lib/package-name";
import { prewarmTraffic } from "@/lib/prewarm";

// FIX: Verify authorization for the prewarm endpoint.
// Without auth, anyone can trigger mass upstream requests and abuse
// this as an amplification vector or exhaust npm API rate limits.
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret configured, allow only in development.
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  // Primary: standard Authorization header.
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  // Secondary: Vercel Cron sends this header for scheduled jobs.
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader === secret) return true;
  return false;
}

export async function handlePrewarmRequest(
  req: Request,
  runner: typeof prewarmTraffic = prewarmTraffic
) {
  const requestId = crypto.randomUUID();

  // Generic 401 — intentionally does not distinguish missing vs wrong
  // credentials to avoid leaking whether CRON_SECRET is configured.
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  const url = new URL(req.url);
  const packagesParam = url.searchParams.get("packages");
  const daysParam = url.searchParams.get("days");

  const packages =
    packagesParam
      ?.split(",")
      .map((pkg) => normalizePackageInput(pkg))
      .filter(Boolean) ?? undefined;
  const days =
    daysParam
      ?.split(",")
      .map((value) => Number(value))
      .filter((value) => [7, 14, 30].includes(value)) ?? undefined;

  const result = await runner({ packages, days });

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "x-request-id": requestId,
    },
  });
}

export async function GET(req: Request) {
  return handlePrewarmRequest(req);
}
