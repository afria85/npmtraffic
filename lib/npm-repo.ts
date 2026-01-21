import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { normalizePackageInput } from "@/lib/package-name";

const CACHE_TTL_SECONDS = 60 * 60 * 24;

type RepoCacheValue = { url: string };

export function normalizeRepositoryUrl(value: string | { url?: string } | null | undefined) {
  if (!value) return null;
  const extracted =
    typeof value === "string" ? value : typeof value.url === "string" ? value.url : null;
  if (!extracted) return null;
  let cleaned = extracted
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "");
  if (!cleaned.startsWith("http")) {
    cleaned = `https://${cleaned}`;
  }
  const match = cleaned.match(/^(https?:\/\/(?:www\.)?github\.com\/[^/]+\/[^/]+)(?:\/.*)?$/i);
  return match ? match[1] : null;
}

function buildCacheKey(pkg: string) {
  return `repo:${pkg.toLowerCase()}`;
}

export async function getPackageGithubRepo(pkgInput: string) {
  const pkg = normalizePackageInput(pkgInput);
  if (!pkg) return null;

  const key = buildCacheKey(pkg);
  const cached = cacheGetWithStale<RepoCacheValue>(key);
  if (cached.hit && cached.value) {
    return cached.value.url;
  }

  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, {
      headers: {
        accept: "application/json",
        "user-agent": "npmtraffic/0.2.1 (https://npmtraffic.com)",
      },
    });
    if (!res.ok) return cached.value?.url ?? null;
    const data = (await res.json()) as { repository?: unknown };
    const repoUrl = normalizeRepositoryUrl(data.repository as string | { url?: string });
    if (!repoUrl) return cached.value?.url ?? null;
    cacheSetWithStale(key, { url: repoUrl }, CACHE_TTL_SECONDS, CACHE_TTL_SECONDS);
    return repoUrl;
  } catch {
    return cached.value?.url ?? null;
  }
}
