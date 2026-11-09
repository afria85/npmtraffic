import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBaseUrl } from "../lib/base-url";

test("prefers request host over Vercel URL when host header is canonical", () => {
  const result = resolveBaseUrl({
    env: {
      ...process.env,
      VERCEL_URL: "random-project.vercel.app",
      NODE_ENV: "production",
    },
    headers: { host: "npmtraffic.com", proto: "https" },
  });
  assert.equal(result, "https://npmtraffic.com");
});

test("falls back to config.site.url when host is Vercel and site URL configured", () => {
  const result = resolveBaseUrl({
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
    headers: { host: "npmtraffic.vercel.app", proto: "https" },
  });
  assert.equal(result, "https://npmtraffic.com");
});

test("prefers config.site.url when only Vercel URL is available", () => {
  const result = resolveBaseUrl({
    env: {
      ...process.env,
      VERCEL_URL: "staging.npmtraffic.vercel.app",
      NODE_ENV: "production",
    },
  });
  assert.equal(result, "https://npmtraffic.com");
});

test("ignores arbitrary request host in production", () => {
  const result = resolveBaseUrl({
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
    headers: { host: "example-attacker.test", proto: "https" },
  });
  assert.equal(result, "https://npmtraffic.com");
});

for (const url of ['http://localhost:3000','https://preview.vercel.app','http://127.0.0.1:3000','javascript:alert(1)']) {
 test(`production canonical ignores unsafe configured origin ${url}`, () => {
  assert.equal(resolveBaseUrl({env:{NODE_ENV:'production',BASE_URL:url}}),'https://npmtraffic.com');
 });
}
