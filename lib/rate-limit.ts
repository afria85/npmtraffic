import crypto from "node:crypto";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  key: string;
};

const memoryStore = new Map<string, number[]>();

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function getClientIp(req: Request) {
  const normalize = (value: string | null) => {
    if (!value) return undefined;
    const first = value.split(",")[0]?.trim();
    if (!first) return undefined;
    const cleaned = first.replace(/^for=/i, "").replace(/^"|"$/g, "");
    if (!cleaned || cleaned.toLowerCase() === "unknown") return undefined;
    return cleaned;
  };

  // FIX: Prefer platform-verified headers over x-forwarded-for.
  // x-forwarded-for can be spoofed by clients when not behind a trusted
  // proxy. Vercel's x-vercel-forwarded-for and Cloudflare's
  // cf-connecting-ip are set by the platform and are not spoofable.
  const platformCandidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-vercel-forwarded-for"),
    req.headers.get("x-real-ip"),
  ];
  for (const candidate of platformCandidates) {
    const ip = normalize(candidate);
    if (ip) return ip;
  }

  // Fallback: x-forwarded-for is last resort since it can be spoofed
  // when no trusted reverse proxy strips/overwrites it.
  const forwarded = normalize(req.headers.get("x-forwarded-for"));
  if (forwarded) return forwarded;

  return undefined;
}

async function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const entries = memoryStore.get(key) ?? [];
  const recent = entries.filter((ts) => ts > windowStart);

  // FIX: Check count BEFORE pushing the current request.
  // Previously, denied requests were still added to the array, causing
  // unbounded memory growth under sustained attack.
  const count = recent.length;
  const allowed = count < limit;

  if (allowed) {
    recent.push(now);
  }

  memoryStore.set(key, recent);

  const oldest = recent[0] ?? now;
  const retryAfter = allowed ? 0 : Math.ceil((windowMs - (now - oldest)) / 1000);

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - (allowed ? count + 1 : count)),
    retryAfter,
    key,
  };
}

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return memoryRateLimit(key, limit, windowMs);
  }

  const now = Date.now();
  const member = crypto.randomUUID();
  const windowStart = now - windowMs;

  const pipeline = [
    ["ZREMRANGEBYSCORE", key, 0, windowStart],
    ["ZADD", key, now, member],
    ["ZCARD", key],
    ["ZRANGE", key, 0, 0, "WITHSCORES"],
    ["PEXPIRE", key, windowMs],
  ];

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });
    type PipelineResult = {
      result?: number | string | (number | string)[];
      error?: string;
    };
    const data = (await res.json()) as PipelineResult[];
    const count = Number(data?.[2]?.result ?? 0);
    const oldestResult = data?.[3]?.result;
    const oldestScore =
      Array.isArray(oldestResult) && oldestResult.length > 1
        ? Number(oldestResult[1])
        : Number(oldestResult ?? now);
    const allowed = count <= limit;
    const retryAfter = allowed ? 0 : Math.ceil((windowMs - (now - oldestScore)) / 1000);

    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfter,
      key,
    };
  } catch {
    return memoryRateLimit(key, limit, windowMs);
  }
}

export async function rateLimit(req: Request, route: string, limit = 60, windowMs = 60_000) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const fingerprint = ip ? `ip:${ip}` : `fallback:${ua}:${lang}`;
  const key = `ratelimit:${route}:${hashKey(fingerprint)}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashRateLimit(key, limit, windowMs);
  }
  return memoryRateLimit(key, limit, windowMs);
}
