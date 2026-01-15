import { NextResponse } from "next/server";
import { getPackageDaily } from "@/lib/package-daily";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  try {
    const { name: rawName } = await ctx.params;
    const name = decodeURIComponent(rawName);

    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get("days") || "30");

    const data = await getPackageDaily(name, daysParam);
    const series = data.series.map(({ date, downloads, delta, avg7 }) => ({
      date,
      downloads,
      delta,
      avg7,
    }));

    return NextResponse.json({ requestId: data.requestId, series }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e);

    if (msg.startsWith("BAD_REQUEST")) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: msg.replace("BAD_REQUEST: ", "") } },
        { status: 400 }
      );
    }

    if (msg.startsWith("NPM_NOT_FOUND")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Package not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Upstream error or network timeout" } },
      { status: 502 }
    );
  }
}
