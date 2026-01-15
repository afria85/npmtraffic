import "server-only";
import { headers } from "next/headers";
import { config } from "@/lib/config";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL;

  if (envUrl) {
    const withProtocol = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
    return normalizeBaseUrl(withProtocol);
  }

  if (process.env.VERCEL_URL) {
    return normalizeBaseUrl(`https://${process.env.VERCEL_URL}`);
  }

  if (
    process.env.CODESPACES &&
    process.env.CODESPACE_NAME &&
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  ) {
    return normalizeBaseUrl(
      `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    );
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    return normalizeBaseUrl(`${proto}://${host}`);
  }

  return normalizeBaseUrl(config.site.url);
}
