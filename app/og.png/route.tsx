import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // Unify all OG images behind a single stable path that ends with .png.
  //
  // Supported query params:
  // - /og.png                       -> home
  // - /og.png?type=package&pkg=...   -> package
  // - /og.png?type=compare&pkgs=a,b  -> compare
  //
  // We proxy to /api/og to keep data-fetching + rendering logic in one place.
  const apiUrl = new URL("/api/og", url.origin);
  const out = new URLSearchParams();

  const type = (url.searchParams.get("type") || "").toLowerCase();
  const days = url.searchParams.get("days");
  if (days) out.set("days", days);

  if (type === "package") {
    const pkg = url.searchParams.get("pkg") || url.searchParams.get("name");
    if (pkg) out.set("pkg", pkg);
    out.set("mode", "pkg");
  } else if (type === "compare") {
    const pkgs = url.searchParams.get("pkgs") || url.searchParams.get("packages");
    if (pkgs) out.set("pkgs", pkgs);
    out.set("mode", "compare");
  } else {
    // Back-compat passthrough for callers using /og.png?pkg=... or /og.png?pkgs=...
    for (const key of ["mode", "pkg", "pkgs", "days"]) {
      const v = url.searchParams.get(key);
      if (v) out.set(key, v);
    }
  }

  apiUrl.search = out.toString();

  const res = await fetch(apiUrl.toString(), {
    headers: { accept: "image/png" },
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
