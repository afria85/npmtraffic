import { headers } from "next/headers";
import { config } from "@/lib/config";

export type ResolveBaseUrlOptions = {
  env?: NodeJS.ProcessEnv;
  headers?: { host?: string | null; forwardedHost?: string | null; proto?: string | null };
};

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function getEnvUrl(env: NodeJS.ProcessEnv) {
  const envUrl =
    env.NEXT_PUBLIC_BASE_URL ??
    env.BASE_URL ??
    env.NEXT_PUBLIC_SITE_URL ??
    env.SITE_URL;

  if (!envUrl) return null;
  const withProtocol = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  return normalizeBaseUrl(withProtocol);
}

export function resolveBaseUrl(options: ResolveBaseUrlOptions = {}) {
  const env = options.env ?? process.env;
  const envUrl = getEnvUrl(env);
  if (envUrl) return envUrl;

  const host = options.headers?.forwardedHost ?? options.headers?.host;
  const proto = options.headers?.proto ?? "https";

  if (host) {
    const trimmedHost = host.split(",")[0].trim();
    if (trimmedHost.endsWith(".vercel.app") && config.site.url) {
      return normalizeBaseUrl(config.site.url);
    }
    return normalizeBaseUrl(`${proto}://${trimmedHost}`);
  }

  if (env.VERCEL_URL) {
    if (env.NODE_ENV === "production" && config.site.url) {
      return normalizeBaseUrl(config.site.url);
    }
    return normalizeBaseUrl(`https://${env.VERCEL_URL}`);
  }

  if (
    env.CODESPACES &&
    env.CODESPACE_NAME &&
    env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  ) {
    return normalizeBaseUrl(
      `https://${env.CODESPACE_NAME}-3000.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    );
  }

  if (env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return normalizeBaseUrl(config.site.url);
}

export async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return resolveBaseUrl({ headers: { host, forwardedHost: h.get("x-forwarded-host"), proto } });
}
