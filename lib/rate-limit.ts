import crypto from "node:crypto";
import { isIP } from "node:net";

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
  // Vercel overwrites this platform header. Outside that deployment boundary,
  // no request-supplied address is trusted; use a shared anonymous bucket.
  if (process.env.VERCEL !== "1") return undefined;
  const value = req.headers.get("x-vercel-forwarded-for")?.trim();
  return value && isIP(value) ? value : undefined;
}

async function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  for (const [storedKey, timestamps] of memoryStore) {
    if ((timestamps.at(-1) ?? 0) <= now - 3600000) memoryStore.delete(storedKey);
  }
  const entries = memoryStore.get(key) ?? [];
  const recent = entries.filter((ts) => ts > windowStart);

  const count = recent.length;
  const allowed = count < limit;

  if (allowed) {
    recent.push(now);
  }

  if (memoryStore.size >= 10000 && !memoryStore.has(key)) {
    return { allowed: false, limit, remaining: 0, retryAfter: 60, key };
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

  // Redis executes the sliding-window decision and insertion atomically.
  // Blocked requests do not grow the sorted set or extend its lifetime.
  const script = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
    local count = redis.call('ZCARD', KEYS[1])
    local allowed = 0
    if count < tonumber(ARGV[3]) then
      redis.call('ZADD', KEYS[1], ARGV[2], ARGV[4])
      redis.call('PEXPIRE', KEYS[1], ARGV[5])
      count = count + 1
      allowed = 1
    end
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    return {allowed, count, oldest[2] or ARGV[2]}
  `;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify(["EVAL", script, 1, key, windowStart, now, limit, member, windowMs]),
    });
    if (!res.ok) throw new Error("Rate limiter HTTP failure");
    const data = await res.json() as { result?: unknown; error?: string };
    const result = data.result;
    if (data.error || !Array.isArray(result) || result.length !== 3) {
      throw new Error("Invalid rate limiter response");
    }
    const [decision, count, oldestScore] = result.map(Number);
    if (![0, 1].includes(decision) || !Number.isSafeInteger(count) || count < 0 ||
        !Number.isFinite(oldestScore) || oldestScore > now) {
      throw new Error("Invalid rate limiter counters");
    }
    const allowed = decision === 1;
    const retryAfter = allowed ? 0 : Math.ceil((windowMs - (now - oldestScore)) / 1000);

    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfter,
      key,
    };
  } catch {
    // A configured shared limiter that fails must not silently grant a fresh
    // per-instance allowance. Fail closed for the current request.
    return { allowed: false, limit, remaining: 0, retryAfter: 3, key };
  }
}

export async function rateLimit(req: Request, route: string, limit = 60, windowMs = 60_000) {
  const ip = getClientIp(req);
  const fingerprint = ip ? `ip:${ip}` : "anonymous";
  const key = `ratelimit:${route}:${hashKey(fingerprint)}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashRateLimit(key, limit, windowMs);
  }
  return memoryRateLimit(key, limit, windowMs);
}
