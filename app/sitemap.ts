import type { MetadataRoute } from "next";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { resolveBaseUrl } from "@/lib/base-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = resolveBaseUrl({ env: { ...process.env, NODE_ENV: "production" } });

  return [
    {
      url: `${baseUrl}/`,
    },
    {
      url: `${baseUrl}/about`,
    },
    {
      url: `${baseUrl}/donate`,
    },
    {
      url: `${baseUrl}/compare`,
    },
    {
      url: `${baseUrl}/status`,
    },
    {
      url: `${baseUrl}/roadmap`,
    },
    {
      url: `${baseUrl}/transparency`,
    },
    {
      url: `${baseUrl}/data`,
    },
    ...POPULAR_PACKAGES.map((pkg) => ({
      url: `${baseUrl}/p/${encodeURIComponent(pkg)}?days=30`,
    })),
  ];
}
