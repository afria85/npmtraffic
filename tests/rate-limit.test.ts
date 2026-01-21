import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit } from "../lib/rate-limit";

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

  const route = "rate-limit-ip-ua";
  const reqA = buildRequest({
    "x-forwarded-for": "203.0.113.10",
    "user-agent": "agent-a",
    "accept-language": "en-US",
  });
  const reqB = buildRequest({
    "x-forwarded-for": "203.0.113.10",
    "user-agent": "agent-b",
    "accept-language": "en-US",
  });

  const first = await rateLimit(reqA, route, 1, 60_000);
  const second = await rateLimit(reqB, route, 1, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test("rate limit falls back to UA/lang when IP is missing", async (t) => {
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
