import type { MetadataRoute } from "next";
import { resolveBaseUrl } from "@/lib/base-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveBaseUrl({ env: { ...process.env, NODE_ENV: "production" } });

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
