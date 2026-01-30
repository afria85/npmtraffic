import { NextRequest } from "next/server";

export const runtime = "edge";

function pickHeader(res: Response, name: string) {
  const v = res.headers.get(name);
  return v && v.trim() ? v : null;
}

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

  let res: Response;
  try {
    res = await fetch(apiUrl.toString(), {
      headers: { accept: "image/png" },
      // Cache is controlled by /api/og (ImageResponse headers). We keep this fetch
      // default so the platform can honor s-maxage / SWR at the edge.
    });
  } catch {
    return new Response("OG image upstream fetch failed.", { status: 502 });
  }

  if (!res.ok) {
    return new Response(await res.text().catch(() => "OG image error."), {
      status: res.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Buffer the upstream ImageResponse before returning.
  // Some scrapers are more reliable with a stable, fully-buffered PNG response.
  const buf = await res.arrayBuffer();
  const cacheControl =
    pickHeader(res, "cache-control") ?? "public, s-maxage=900, stale-while-revalidate=86400";

  const headers = new Headers();
  headers.set("Content-Type", "image/png");
  headers.set("Cache-Control", cacheControl);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Length", String(buf.byteLength));

  return new Response(buf, { status: 200, headers });
}
