// app/api/v1/compare.json/route.ts
// Alias for /api/v1/compare (JSON). Next.js route config must be declared locally.

export { GET } from "../compare/route";

// Keep the alias dynamic like the canonical compare route.
export const dynamic = "force-dynamic";
