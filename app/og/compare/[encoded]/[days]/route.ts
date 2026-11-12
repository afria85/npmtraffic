import { decodePkg } from "@/lib/og-encode";
import { renderOg } from "@/lib/og-route";

export async function GET(request: Request, ctx: { params: Promise<{ encoded: string; days: string }> }) {
  const { encoded, days } = await ctx.params;
  const packages = decodePkg(encoded);
  if (!packages) return new Response("Not found", { status: 404 });
  return renderOg(request, "compare", packages, days);
}
