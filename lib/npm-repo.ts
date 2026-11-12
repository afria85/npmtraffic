import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { readBoundedBytes } from "@/lib/bounded-bytes";
import { normalizePackageInput, validatePackageName } from "@/lib/package-name";
import { config } from "@/lib/config";
import { USER_AGENT } from "./version";

const CACHE_TTL_SECONDS = config.cache.metadataTTLSeconds;

type RepoCacheValue = { url: string };

export function normalizeRepositoryUrl(value: unknown) {
  const metadata = value && typeof value === "object" ? value as { url?: unknown; directory?: unknown } : null;
  const source = typeof value === "string" ? value : metadata?.url;
  if (typeof source !== "string") return null;
  const raw = source.trim().replace(/^git\+/i, "");
  const scp = /^git@((?:www\.)?github\.com):(.+)$/i.exec(raw);
  let url: URL;
  try {
    url = new URL(scp ? "ssh://git@" + scp[1] + "/" + scp[2] : raw);
  } catch {
    return null;
  }
  if (!["github.com", "www.github.com"].includes(url.hostname) ||
      !["https:", "http:", "git:", "ssh:"].includes(url.protocol) ||
      url.password || (url.username && (url.protocol !== "ssh:" || url.username !== "git")) ||
      (url.port && !(url.protocol === "ssh:" && url.port === "22") &&
       !(url.protocol === "git:" && url.port === "9418"))) return null;
  const [, owner, rawRepo] = url.pathname.split("/");
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !/^[A-Za-z0-9-]+$/.test(owner) || !repo || !/^[A-Za-z0-9_.-]+$/.test(repo) ||
      repo === "." || repo === "..") return null;
  const root = "https://github.com/" + owner + "/" + repo;
  if (typeof metadata?.directory !== "string" || !metadata.directory) return root;
  const directory = metadata.directory.split("/");
  if (directory.some((segment) => !segment || segment === "." || segment === ".." ||
      /[\\\x00-\x1f\x7f]/.test(segment))) return root;
  return root + "/tree/HEAD/" + directory.map(encodeURIComponent).join("/");
}

function buildCacheKey(pkg: string) {
  return `repo:${pkg.toLowerCase()}`;
}

export async function getPackageGithubRepo(pkgInput: string) {
  const pkg = normalizePackageInput(pkgInput);
  if (!validatePackageName(pkg).ok) return null;

  const key = buildCacheKey(pkg);
  const cached = cacheGetWithStale<RepoCacheValue>(key);
  if (cached.hit && cached.value) {
    return cached.value.url;
  }

  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
    });
    if (!res.ok || !res.body) return cached.value?.url ?? null;
    const bytes = await readBoundedBytes(res.body, 128 * 1024);
    const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as { repository?: unknown };
    const repoUrl = normalizeRepositoryUrl(data.repository);
    if (!repoUrl) return cached.value?.url ?? null;
    cacheSetWithStale(key, { url: repoUrl }, CACHE_TTL_SECONDS, CACHE_TTL_SECONDS);
    return repoUrl;
  } catch {
    return cached.value?.url ?? null;
  }
}
