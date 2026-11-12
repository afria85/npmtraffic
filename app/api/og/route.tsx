import { renderOg } from "@/lib/og-route";

export function GET(request: Request) {
  const { searchParams: query } = new URL(request.url);
  const packages = query.get("pkg") || query.get("name") || query.get("pkgs") || query.get("packages");
  const mode = query.get("mode")?.toLowerCase();
  return renderOg(request,
    mode === "compare" ? "compare" : mode === "home" || (!mode && !packages) ? "home" : "pkg",
    packages, query.get("days"));
}
