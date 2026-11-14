import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientIp, getRateLimitStatus, rateLimit } from "../lib/rate-limit";

function buildRequest(headers: Record<string, string>) {
  return new Request("https://example.com", { headers: new Headers(headers) });
}

test("rate limit uses IP even when UA changes", async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  t.after(() => {
    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  t.after(() => { if(previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel; });
  const route = "rate-limit-ip-ua";
  const reqA = buildRequest({
    "x-vercel-forwarded-for": "203.0.113.10",
    "user-agent": "agent-a",
    "accept-language": "en-US",
  });
  const reqB = buildRequest({
    "x-vercel-forwarded-for": "203.0.113.10",
    "user-agent": "agent-b",
    "accept-language": "en-US",
  });

  const first = await rateLimit(reqA, route, 1, 60_000);
  const second = await rateLimit(reqB, route, 1, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test("rate limit shares anonymous bucket when trusted IP is missing", async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  t.after(() => {
    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  const route = "rate-limit-fallback";
  const reqA = buildRequest({
    "user-agent": "agent-a",
    "accept-language": "en-US",
  });
  const reqB = buildRequest({
    "user-agent": "agent-a",
    "accept-language": "en-US",
  });

  const first = await rateLimit(reqA, route, 1, 60_000);
  const second = await rateLimit(reqB, route, 1, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test("limiter status distinguishes local fallback, incomplete configuration and shared decisions", async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });
  const url = "https://redis.invalid";
  const token = "fixture";
  let decision = 1;
  const redis = t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    assert.equal(init.redirect, "error");
    return Response.json({ result: [decision, 1, String(1_794_648_000_000), 1_794_648_000_000] });
  });
  const request = () => rateLimit(buildRequest({}), "configuration-fixture", 1);
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  process.env.UPSTASH_REDIS_REST_URL = url;
  assert.equal(getRateLimitStatus().configuration, "incomplete");
  const urlOnly = await request();
  assert.deepEqual(urlOnly, { allowed: false, limit: 1, remaining: 0, retryAfter: 3, key: urlOnly.key });

  delete process.env.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_TOKEN = token;
  assert.equal(getRateLimitStatus().configuration, "incomplete");
  assert.deepEqual(await request(), urlOnly);

  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal(getRateLimitStatus().configuration, "disabled");
  assert.equal((await request()).allowed, true);
  assert.equal((await request()).allowed, false);
  assert.equal(redis.mock.callCount(), 0);

  process.env.UPSTASH_REDIS_REST_URL = url;
  process.env.UPSTASH_REDIS_REST_TOKEN = token;
  assert.equal(getRateLimitStatus().configuration, "configured");
  assert.equal(getRateLimitStatus().lastSharedObservation, undefined);
  assert.equal((await request()).allowed, true);
  decision = 0;
  assert.equal((await request()).retryAfter, 60);
  assert.equal(redis.mock.callCount(), 2);
  assert.equal(getRateLimitStatus().lastSharedObservation?.result, "responded");

  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.deepEqual(getRateLimitStatus(), { configuration: "incomplete", lastSharedObservation: undefined });
  assert.deepEqual(await request(), urlOnly);
  assert.equal(redis.mock.callCount(), 2);
});

for (const outcome of ['http', 'error', 'malformed', 'coerced-null', 'network']) {
  test(`configured Redis fails closed on ${outcome}`, async (t) => {
    const original = globalThis.fetch;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    t.after(() => {
      globalThis.fetch = original;
      if (url === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = url;
      if (token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = token;
    });
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.invalid';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
    globalThis.fetch = async (_input, init) => {
      assert.ok(init?.signal);
      assert.equal(JSON.parse(String(init?.body))[0], 'EVAL');
      if (outcome === 'network') throw new Error('offline');
      if (outcome === 'coerced-null') return Response.json({result: [1, null, null, 1_794_648_000_000]});
      return Response.json(outcome === 'error' ? {error:'ERR'} : {result: []}, {status: outcome === 'http' ? 500 : 200});
    };
    assert.equal((await rateLimit(buildRequest({}), `redis-${outcome}`)).allowed, false);
    assert.equal(getRateLimitStatus().lastSharedObservation?.result, "degraded");
  });
}

test('untrusted forwarding headers cannot choose rate-limit identity', (t) => {
 const previous = process.env.VERCEL;
 t.after(() => { if(previous===undefined) delete process.env.VERCEL; else process.env.VERCEL=previous; });
 delete process.env.VERCEL;
 assert.equal(getClientIp(buildRequest({'x-forwarded-for':'203.0.113.1','cf-connecting-ip':'203.0.113.2','x-real-ip':'203.0.113.3'})),undefined);
 process.env.VERCEL='1';
 assert.equal(getClientIp(buildRequest({'x-vercel-forwarded-for':'not-an-ip'})),undefined);
 assert.equal(getClientIp(buildRequest({'x-vercel-forwarded-for':'203.0.113.4','cf-connecting-ip':'203.0.113.5'})),'203.0.113.4');
});

test("Redis time determines retries and expiry across application clock changes", async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fixture";
  const localClock = t.mock.method(Date, "now", () => 1);
  const start = 1_794_648_000_000;
  let redisNow = start;
  const members = new Set<string>();
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    const [command, script, keyCount, , limit, member, window, ...rest] = JSON.parse(String(init.body));
    assert.equal(command, "EVAL");
    assert.match(script, /redis\.call\('TIME'\)/);
    assert.equal(keyCount, 1);
    assert.equal(limit, 2);
    assert.equal(window, 10_000);
    assert.equal(rest.length, 0);
    assert(!members.has(member));
    members.add(member);
    const count = members.size;
    if (redisNow === start && count <= 2) return Response.json({ result: [1, count, String(start), redisNow] });
    if (redisNow < start + window) return Response.json({ result: [0, 2, String(start), redisNow] });
    return Response.json({ result: [1, 1, String(redisNow), redisNow] });
  });
  const request = () => rateLimit(buildRequest({}), "redis-clock", 2, 10_000);
  const burst = await Promise.all([request(), request(), request()]);
  assert.deepEqual(burst.map(result => result.allowed), [true, true, false]);
  assert.equal(burst[2].retryAfter, 10);

  redisNow = start + 9_999;
  localClock.mock.mockImplementation(() => redisNow + 120_000);
  const before = await request();
  assert.equal(before.allowed, false);
  assert.equal(before.retryAfter, 1);

  redisNow = start + 10_000;
  localClock.mock.mockImplementation(() => redisNow - 120_000);
  const atExpiry = await request();
  assert.equal(atExpiry.allowed, true);
  assert.equal(atExpiry.remaining, 1);
  assert.equal(atExpiry.retryAfter, 0);
});

test("invalid Redis time, scores and counters fail closed and recover", async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  t.after(() => {
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fixture";
  const now = 1_794_648_000_000;
  let reply: unknown[];
  t.mock.method(globalThis, "fetch", async () => Response.json({ result: reply }));
  const request = () => rateLimit(buildRequest({}), "redis-clock-errors", 5, 10_000);
  for (const invalid of [
    [1, 1, now],
    ...[null, String(now), 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(time => [1, 1, now, time]),
    [1, 1, now + 1, now], [1, 1, now - 10_000, now], [1, 1, "1e3", now],
    ["1", 1, now, now], [1, 0, now, now], [1, 6, now, now], [0, 4, now, now],
  ]) {
    reply = invalid;
    const result = await request();
    assert.equal(result.allowed, false);
    assert.equal(result.retryAfter, 3);
    assert.equal(getRateLimitStatus().lastSharedObservation?.result, "degraded");
  }
  reply = [1, 1, String(now), now];
  assert.equal((await request()).allowed, true);
  assert.equal(getRateLimitStatus().lastSharedObservation?.result, "responded");
});
