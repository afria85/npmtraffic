import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheClear } from "../lib/cache";
import { fetchTraffic, TrafficError } from "../lib/traffic";
import { rangeForDays } from "../lib/query";
import { registryFixture } from "./support/npm-observations";

// M2: a rejected upstream request must still be shared by simultaneous callers.
// This proves only same-process deduplication, NOT cross-instance admission control.
for (const upstreamStatus of [429, 503]) {
  test(`deduplicates concurrent ${upstreamStatus} npm range failures and permits a later retry`, async (t) => {
  const originalFetch = globalThis.fetch;
  const range = rangeForDays(7);
  const prefix = `https://api.npmjs.org/downloads/range/${range.startDate}:${range.endDate}/react`;
  const pending: Array<(response: Response) => void> = [];
  let rangeCalls = 0;
  let notifyStarted: (() => void) | undefined;
  const waitForUpstream = () => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      notifyStarted = undefined;
      reject(new Error("Timed out waiting for mocked npm range request"));
    }, 5000);
    notifyStarted = () => {
      clearTimeout(timeout);
      notifyStarted = undefined;
      resolve();
    };
  });

  cacheClear();
  globalThis.fetch = async (input) => {
    const registry = registryFixture(input);
    if (registry) return registry;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(prefix)) {
      rangeCalls += 1;
      const response = new Promise<Response>((resolve) => pending.push(resolve));
      notifyStarted?.();
      return response;
    }
    return new Response("not found", { status: 404 });
  };
  t.after(() => {
    for (const resolve of pending.splice(0)) resolve(new Response("unavailable", { status: upstreamStatus }));
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const firstUpstream = waitForUpstream();
  const first = fetchTraffic("react", 7);
  const second = fetchTraffic("react", 7);
  await firstUpstream;
  const callsWhilePending = rangeCalls;
  for (const resolve of pending.splice(0)) resolve(new Response("unavailable", { status: upstreamStatus }));
  const results = await Promise.allSettled([first, second]);

  assert.equal(callsWhilePending, 1, "concurrent callers should share one range request");
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.equal(result.status, "rejected");
    if (result.status === "rejected") {
      assert.ok(result.reason instanceof TrafficError);
      assert.equal(result.reason.code, "UPSTREAM_UNAVAILABLE");
      assert.equal(result.reason.status, 502, "client-facing status stays a gateway error");
      assert.equal(result.reason.upstreamStatus, upstreamStatus, "retain exact upstream failure status for diagnostics");
    }
  }

  const retryUpstream = waitForUpstream();
  const retry = fetchTraffic("react", 7);
  await retryUpstream;
  const callsAfterRetry = rangeCalls;
  for (const resolve of pending.splice(0)) resolve(new Response("unavailable", { status: upstreamStatus }));
  await assert.rejects(retry, (error: unknown) => error instanceof TrafficError
    && error.code === "UPSTREAM_UNAVAILABLE"
    && error.status === 502
    && error.upstreamStatus === upstreamStatus);
  assert.equal(callsAfterRetry, 2, "failed in-flight entry must be removed for retry");
  });
}


for (const transientStatus of [429, 503]) {
  test(`recovers with fresh observations after a transient ${transientStatus} without caching the failure`, async (t) => {
  const originalFetch = globalThis.fetch;
  const range = rangeForDays(7);
  const endpoint = `https://api.npmjs.org/downloads/range/${range.startDate}:${range.endDate}/react`;
  let calls = 0;
  cacheClear();
  globalThis.fetch = async (input) => {
    const registry = registryFixture(input);
    if (registry) return registry;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(endpoint)) {
      calls += 1;
      if (calls === 1) return new Response("temporarily unavailable", { status: transientStatus });
      return Response.json({
        start: range.startDate,
        end: range.endDate,
        package: "react",
        downloads: Array.from({ length: range.days }, (_, index) => ({
          day: new Date(Date.parse(`${range.startDate}T00:00:00Z`) + index * 86_400_000)
            .toISOString().slice(0, 10),
          downloads: index + 1,
        })),
      });
    }
    return new Response("not found", { status: 404 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  await assert.rejects(
    fetchTraffic("react", 7),
    (error: unknown) => error instanceof TrafficError
      && error.status === 502 && error.upstreamStatus === transientStatus
  );
  const recovered = await fetchTraffic("react", 7);
  assert.equal(recovered.meta.cacheStatus, "MISS");
  assert.equal(recovered.meta.isStale, false);
  assert.equal(recovered.totals.sum, range.days * (range.days + 1) / 2);
  assert.equal(calls, 2, "the recovery must make a fresh upstream request");

  const cached = await fetchTraffic("react", 7);
  assert.equal(cached.meta.cacheStatus, "HIT");
  assert.equal(calls, 2, "successful recovery should be cached");
  });
}
