import type { MetadataRoute } from "next";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { config } from "@/lib/config";

function normalizeBaseUrl(url: string) {
  if (!url.startsWith("http")) return `https://${url}`;
  return url.replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = normalizeBaseUrl(
    process.env.BASE_URL ?? process.env.VERCEL_URL ?? config.site.url
  );
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
    },
    ...POPULAR_PACKAGES.map((pkg) => ({
      url: `${baseUrl}/p/${encodeURIComponent(pkg)}?days=30`,
      lastModified: now,
    })),
  ];
}
