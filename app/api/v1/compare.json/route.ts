// app/api/v1/compare.json/route.ts
// Alias for /api/v1/compare (JSON). Next.js route config must be declared locally.

export { GET } from "../compare/route";

// Keep this value identical to the canonical route's revalidate (do not re-export).
// If you change caching policy in /compare/route.ts, update this too.
export const revalidate = 60;
export const dynamic = "force-dynamic";
