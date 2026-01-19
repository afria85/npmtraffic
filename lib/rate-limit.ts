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
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
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
  recent.push(now);
  memoryStore.set(key, recent);

  const count = recent.length;
  const allowed = count <= limit;
  const oldest = recent[0] ?? now;
  const retryAfter = allowed ? 0 : Math.ceil((windowMs - (now - oldest)) / 1000);

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
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
  const ip = getClientIp(req) ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const fingerprint = `${ip}:${ua}:${lang}`;
  const key = `ratelimit:${route}:${hashKey(fingerprint)}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashRateLimit(key, limit, windowMs);
  }
  return memoryRateLimit(key, limit, windowMs);
}
