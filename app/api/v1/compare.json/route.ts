// app/api/v1/compare.json/route.ts
// Alias for /api/v1/compare (JSON). Next.js route config must be declared locally.

export { GET } from "../compare/route";

// Match the canonical compare route cache policy for identical JSON data.
export const revalidate = 900;
export const dynamic = "force-dynamic";
