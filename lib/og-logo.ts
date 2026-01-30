import type { NextRequest } from "next/server";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  // Prefer Buffer in Node; fall back to btoa for Edge-safe base64 encoding.
  if (typeof (globalThis as { Buffer?: unknown }).Buffer !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const B = (globalThis as any).Buffer as typeof Buffer;
    return B.from(buf).toString("base64");
  }
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    // Avoid Buffer; convert Uint8Array chunks into a binary string.
    // Chunking prevents "Maximum call stack size" for larger images.
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa is available in the Edge runtime.
  return btoa(binary);
}

const DEFAULT_LOGO_PATHS = [
  "/icon.png", // your canonical brand mark
  "/brand-mark.png",
  "/favicon-32.png",
] as const;

/**
 * Loads the brand logo as a data URL for Next.js OG Image (Edge runtime).
 *
 * Why:
 * - Edge runtime can't use fs.
 * - next/og prefers <img src="data:..."> to avoid external fetch at render time.
 */
export async function loadOgLogoDataUrl(
  originOrReq: string | NextRequest,
  paths: readonly string[] = DEFAULT_LOGO_PATHS,
): Promise<string> {
  const origin = typeof originOrReq === "string" ? originOrReq : new URL(originOrReq.url).origin;

  for (const path of paths) {
    try {
      const url = new URL(path, origin);
      const fetchInit: RequestInit & { next?: { revalidate?: number } } = {
        // Allow Vercel/Next to cache the static asset fetch.
        next: { revalidate: 60 * 60 * 24 },
      };
      const res = await fetch(url, fetchInit);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "image/png";
      const base64 = arrayBufferToBase64(await res.arrayBuffer());
      return `data:${contentType};base64,${base64}`;
    } catch {
      // try next candidate
    }
  }

  // 1x1 transparent PNG fallback
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
}
