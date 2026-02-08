// app/api/v1/compare.json/route.ts
// Alias for /api/v1/compare (JSON). Next.js route config must be declared locally.

export { GET } from "../compare/route";

// FIX: revalidate was 60 but the canonical compare/route.ts uses 900.
// Mismatched values cause inconsistent caching between endpoints
// that serve identical data.
export const revalidate = 900;
export const dynamic = "force-dynamic";
