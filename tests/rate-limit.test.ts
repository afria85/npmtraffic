import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientIp, rateLimit } from "../lib/rate-limit";

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

for (const outcome of ['http', 'error', 'malformed', 'network']) {
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
      return Response.json(outcome === 'error' ? {error:'ERR'} : {result: []}, {status: outcome === 'http' ? 500 : 200});
    };
    assert.equal((await rateLimit(buildRequest({}), `redis-${outcome}`)).allowed, false);
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
