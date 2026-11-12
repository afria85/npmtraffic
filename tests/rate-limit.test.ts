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
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal(getRateLimitStatus().configuration, "disabled");
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  assert.equal(getRateLimitStatus().configuration, "incomplete");
  assert.equal((await rateLimit(buildRequest({}), "incomplete-fixture", 1)).allowed, true);
  assert.equal((await rateLimit(buildRequest({}), "incomplete-fixture", 1)).allowed, false);

  process.env.UPSTASH_REDIS_REST_TOKEN = "fixture";
  assert.equal(getRateLimitStatus().configuration, "configured");
  assert.equal(getRateLimitStatus().lastSharedObservation, undefined);
  let decision = 1;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    const command = JSON.parse(String(init.body));
    assert.equal(init.redirect, "error");
    return Response.json({ result: [decision, 1, String(command[5])] });
  });
  assert.equal((await rateLimit(buildRequest({}), "shared-fixture", 1)).allowed, true);
  decision = 0;
  assert.equal((await rateLimit(buildRequest({}), "shared-fixture", 1)).retryAfter, 60);
  assert.equal(getRateLimitStatus().lastSharedObservation?.result, "responded");
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
      if (outcome === 'coerced-null') return Response.json({result: [1, null, null]});
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
