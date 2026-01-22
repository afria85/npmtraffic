import { buildOgImageResponse } from "@/lib/og-image";

export const runtime = "edge";

function parseDays(value: string | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(365, Math.round(n)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "pkg").toLowerCase();
  const days = parseDays(searchParams.get("days"));

  if (mode === "compare") {
    const raw = searchParams.get("pkgs") ?? "";
    const pkgs = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    return buildOgImageResponse({ mode: "compare", pkgs, days });
  }

  const pkg = searchParams.get("pkg") ?? "";
  return buildOgImageResponse({ mode: "pkg", pkg, days });
}
