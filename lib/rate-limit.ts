import crypto from "node:crypto";
import { isIP } from "node:net";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  key: string;
  redisFailure?: true;
};

const memoryStore = new Map<string, number[]>();
type SharedObservation = { result: "responded" | "degraded"; observedAt: string };
let lastSharedObservation: SharedObservation | undefined;

function redisConfiguration() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url?.trim() && token?.trim()) return { configuration: "configured" as const, url, token };
  return { configuration: url === undefined && token === undefined ? "disabled" as const : "incomplete" as const };
}

export function getRateLimitStatus() {
  const { configuration } = redisConfiguration();
  return { configuration, lastSharedObservation: configuration === "configured" ? lastSharedObservation : undefined };
}

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
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const member = crypto.randomUUID();

  // Redis executes the sliding-window decision and insertion atomically.
  // Blocked requests do not grow the sorted set or extend its lifetime.
  const script = `
    local time = redis.call('TIME')
    local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
    local window = tonumber(ARGV[3])
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
    local count = redis.call('ZCARD', KEYS[1])
    local allowed = 0
    if count < tonumber(ARGV[1]) then
      redis.call('ZADD', KEYS[1], now, ARGV[2])
      redis.call('PEXPIRE', KEYS[1], window)
      count = count + 1
      allowed = 1
    end
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    return {allowed, count, oldest[2], now}
  `;

  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new Error("Unsafe rate limiter endpoint");
    }
    const res = await fetch(endpoint.href, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify(["EVAL", script, 1, key, limit, member, windowMs]),
    });
    if (!res.ok) throw new Error("Rate limiter HTTP failure");
    const data = await res.json() as { result?: unknown; error?: string };
    const result = data.result;
    if (data.error || !Array.isArray(result) || result.length !== 4) {
      throw new Error("Invalid rate limiter response");
    }
    const [decision, count, oldest, now] = result;
    // Redis returns the score from ZRANGE as a decimal string.
    const oldestScore = typeof oldest === "string" && /^\d+$/.test(oldest) ? Number(oldest) : oldest;
    if ((decision !== 0 && decision !== 1) || typeof count !== "number" ||
        !Number.isSafeInteger(count) || (decision === 1 ? count < 1 || count > limit : count < limit) ||
        typeof oldestScore !== "number" || !Number.isSafeInteger(oldestScore) ||
        typeof now !== "number" || !Number.isSafeInteger(now) || now <= 0 ||
        oldestScore <= 0 || oldestScore <= now - windowMs || oldestScore > now) {
      throw new Error("Invalid rate limiter counters");
    }
    const allowed = decision === 1;
    const retryAfter = allowed ? 0 : Math.ceil((windowMs - (now - oldestScore)) / 1000);
    lastSharedObservation = { result: "responded", observedAt: new Date().toISOString() };

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
    lastSharedObservation = { result: "degraded", observedAt: new Date().toISOString() };
    return { allowed: false, limit, remaining: 0, retryAfter: 3, key, redisFailure: true };
  }
}

export async function rateLimit(req: Request, route: string, limit = 60, windowMs = 60_000) {
  const ip = getClientIp(req);
  const fingerprint = ip ? `ip:${ip}` : "anonymous";
  const key = `ratelimit:${route}:${hashKey(fingerprint)}`;
  const redis = redisConfiguration();
  if (redis.configuration === "configured") {
    return upstashRateLimit(redis.url, redis.token, key, limit, windowMs);
  }
  if (redis.configuration === "incomplete") {
    return { allowed: false, limit, remaining: 0, retryAfter: 3, key };
  }
  return memoryRateLimit(key, limit, windowMs);
}
