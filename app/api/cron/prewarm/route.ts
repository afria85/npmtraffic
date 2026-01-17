import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { normalizePackageInput } from "@/lib/package-name";
import { prewarmTraffic } from "@/lib/prewarm";

export async function handlePrewarmRequest(
  req: Request,
  runner: typeof prewarmTraffic = prewarmTraffic
) {
  const requestId = crypto.randomUUID();
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
