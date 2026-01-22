import { buildOgImageResponse } from "@/lib/og-image";
import { decodePkg } from "@/lib/og-encode";
import type { NextRequest } from "next/server";

function parseDays(value: string | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(365, Math.round(n)));
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ encoded: string; days: string }> }
) {
  const params = await context.params;
  const pkgName = decodePkg(params.encoded);
  if (!pkgName) {
    return new Response("Invalid encoded package name", { status: 400 });
  }

  const days = parseDays(params.days);
  return buildOgImageResponse({ mode: "pkg", pkg: pkgName, days });
}
