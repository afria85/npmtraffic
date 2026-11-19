import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheClear } from "../lib/cache";
import { fetchTraffic, TrafficError } from "../lib/traffic";
import { rangeForDays } from "../lib/query";
import { registryFixture } from "./support/npm-observations";

// M2: a rejected upstream request must still be shared by simultaneous callers.
// This proves only same-process deduplication, NOT cross-instance admission control.
test("deduplicates concurrent failed npm range requests and permits a later retry", async (t) => {
  const originalFetch = globalThis.fetch;
  const range = rangeForDays(7);
  const prefix = `https://api.npmjs.org/downloads/range/${range.startDate}:${range.endDate}/react`;
  const pending: Array<(response: Response) => void> = [];
  let rangeCalls = 0;

  cacheClear();
  globalThis.fetch = async (input) => {
    const registry = registryFixture(input);
    if (registry) return registry;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(prefix)) {
      rangeCalls += 1;
      return new Promise<Response>((resolve) => pending.push(resolve));
    }
    return new Response("not found", { status: 404 });
  };
  t.after(() => {
    for (const resolve of pending.splice(0)) resolve(new Response("unavailable", { status: 503 }));
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const first = fetchTraffic("react", 7);
  const second = fetchTraffic("react", 7);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const callsWhilePending = rangeCalls;
  for (const resolve of pending.splice(0)) resolve(new Response("unavailable", { status: 503 }));
  const results = await Promise.allSettled([first, second]);

  assert.equal(callsWhilePending, 1, "concurrent callers should share one range request");
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.equal(result.status, "rejected");
    if (result.status === "rejected") {
      assert.ok(result.reason instanceof TrafficError);
      assert.equal(result.reason.code, "UPSTREAM_UNAVAILABLE");
    }
  }

  const retry = fetchTraffic("react", 7);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const callsAfterRetry = rangeCalls;
  for (const resolve of pending.splice(0)) resolve(new Response("unavailable", { status: 503 }));
  await assert.rejects(retry, (error: unknown) => error instanceof TrafficError && error.code === "UPSTREAM_UNAVAILABLE");
  assert.equal(callsAfterRetry, 2, "failed in-flight entry must be removed for retry");
});
