import { renderOg } from "@/lib/og-route";

export function GET(request: Request) {
  const { searchParams: query } = new URL(request.url);
  const type = query.get("type")?.toLowerCase();
  const mode = query.get("mode")?.toLowerCase();
  const packages = query.get("pkgs") || query.get("packages");
  const name = query.get("pkg") || query.get("name");
  const days = query.get("days");
  if (type === "compare" || mode === "compare" || (!mode && packages)) return renderOg(request, "compare", packages || name, days);
  if (type === "package" || mode === "pkg" || name) return renderOg(request, "pkg", name, days);
  return renderOg(request, "home");
}

export async function HEAD(request: Request) {
  const response = await GET(request);
  return new Response(null, { status: response.status, headers: response.headers });
}
