import assert from "node:assert/strict";
import { test } from "node:test";
import { stagingToken, verifyStaging } from "../scripts/verify-upstash";

const origin = "https://rare-dolphin-170027.upstash.io";
const approved = {
  UPSTASH_VERIFY_STAGING: "1",
  UPSTASH_STAGING_ATTESTATION: "npmtraffic-staging-rate-limit@aws/eu-central-1",
  UPSTASH_REDIS_REST_URL: origin,
  UPSTASH_REDIS_REST_TOKEN: "mock-placeholder",
};

test("verifier accepts only the attested staging origin and explicit opt-in", async () => {
  assert(stagingToken(approved));
  assert(stagingToken({ ...approved, UPSTASH_REDIS_REST_URL: origin + "/" }));
  for (const bad of [
    { UPSTASH_VERIFY_STAGING: "0" },
    { UPSTASH_STAGING_ATTESTATION: "other" },
    { UPSTASH_REDIS_REST_TOKEN: "" },
    ...["http://rare-dolphin-170027.upstash.io", origin + ".invalid", origin + "/pipeline",
      origin + "?x=1", origin + "#tag", origin + ":443",
      "https://user:pass@rare-dolphin-170027.upstash.io"].map(UPSTASH_REDIS_REST_URL => ({ UPSTASH_REDIS_REST_URL })),
  ]) {
    const env = { ...approved, ...bad };
    assert.equal(stagingToken(env), undefined);
    await assert.rejects(verifyStaging(env, async () => assert.fail("Guard allowed network access")));
  }
});

function mockRedis({ failCleanup = false, failFirstEval = false } = {}) {
  const sets = new Map<string, number[]>();
  const touched = new Set<string>();
  let calls = 0;
  let delAttempts = 0;
  let ttlReads = 0;
  const transport: typeof fetch = async (url, init) => {
    assert.equal(url, origin);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.method, "POST");
    assert(++calls <= 64);
    const args = JSON.parse(String(init?.body));
    const [cmd, second, third, fourth, limit, member, window] = args;
    const json = (result: unknown) => Response.json({ result });
    if (cmd === "DEL") {
      delAttempts++;
      if (failCleanup) throw new Error("Synthetic cleanup outage");
      return json(sets.delete(second) ? 1 : 0);
    }
    if (cmd === "EXISTS") {
      if (failCleanup) throw new Error("Synthetic cleanup outage");
      if (delAttempts === 0) sets.delete(second); // Model expiration without real waiting.
      return json(sets.has(second) ? 1 : 0);
    }
    if (cmd === "ZCARD") return json(sets.get(second)?.length ?? 0);
    if (cmd === "PTTL") return json(++ttlReads === 1 ? 250 : 100);
    assert.equal(cmd, "EVAL");
    assert.equal(third, 1);
    const key: string = fourth;
    assert.match(key, /^(ratelimit:)?staging-verification:[0-9a-f-]{36}:/);
    touched.add(key);
    if (failFirstEval) {
      sets.set(key, [Date.now()]);
      throw new Error("Synthetic failed response after write");
    }
    if (second.includes("redis.call('SET'")) {
      sets.set(key, [Date.now()]);
      return json(["1794648000", "42"]);
    }
    assert.match(second, /ZREMRANGEBYSCORE[\s\S]*ZCARD[\s\S]*ZADD[\s\S]*PEXPIRE[\s\S]*ZRANGE/);
    assert.match(second, /redis\.call\('TIME'\)/);
    assert.equal(args.length, 7);
    assert.match(member, /^[\da-f-]{36}$/);
    const now = 1_794_648_000_000; // One Redis clock, independent of the workers.
    const active = (sets.get(key) ?? []).filter(value => value > now - window);
    const allowed = active.length < limit;
    if (allowed) active.push(now);
    sets.set(key, active);
    return json([allowed ? 1 : 0, active.length, String(Math.min(...active)), now]);
  };
  return { transport, sets, touched, calls: () => calls, delAttempts: () => delAttempts };
}

test("two-process mock keeps the shared quota with skewed workers and verifies cleanup", async () => {
  const redis = mockRedis();
  const result = await verifyStaging(approved, redis.transport);
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.checks.clockSkew, { offsetsMs: [10_100, -10_100], extraAllowed: 0 });
  assert.equal(result.cleanup, "verified");
  assert.equal(result.requests, redis.calls());
  assert.equal(redis.touched.size, 5);
  assert.equal(result.requests, 53);
  assert.equal(redis.sets.size, 0);
});

test("failed write responses still trigger cleanup, and unverifiable cleanup forces HOLD", async () => {
  const redis = mockRedis({ failFirstEval: true });
  const failed = await verifyStaging(approved, redis.transport);
  assert.equal(failed.failure, "shared-quota");
  assert.equal(failed.cleanup, "verified");
  assert.equal(redis.sets.size, 0);

  const unavailable = mockRedis({ failCleanup: true });
  const result = await verifyStaging(approved, unavailable.transport);
  assert.equal(result.status, "HOLD");
  assert.equal(result.cleanup, "unverified");
  assert.equal(result.cleanupFailures, 5);
  assert.equal(unavailable.delAttempts(), 10);
  assert(result.requests <= result.maxRequests);
});
