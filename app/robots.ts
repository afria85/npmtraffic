import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

function normalizeBaseUrl(url: string) {
  if (!url.startsWith("http")) return `https://${url}`;
  return url.replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = normalizeBaseUrl(
    process.env.BASE_URL ?? process.env.VERCEL_URL ?? config.site.url
  );

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
