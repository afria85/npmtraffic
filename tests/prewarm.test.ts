import assert from "node:assert/strict";
import { test } from "node:test";
import { TrafficError } from "../lib/traffic";
import { prewarmTraffic } from "../lib/prewarm";

test("prewarmTraffic warms packages and reports success", async () => {
  const result = await prewarmTraffic({
    packages: ["react"],
    days: [7],
    fetchFn: async () => undefined,
  });
  assert.equal(result.warmedCount, 1);
  assert.equal(result.failedCount, 0);
  assert.equal(Array.isArray(result.failures), true);
});

test("prewarmTraffic captures failures with error code", async () => {
  const error = new TrafficError("UPSTREAM_UNAVAILABLE", 502, "test");
  const result = await prewarmTraffic({
    packages: ["react"],
    days: [7],
    fetchFn: () => Promise.reject(error),
  });
  assert.equal(result.warmedCount, 0);
  assert.equal(result.failedCount, 1);
  assert.equal(result.failures[0].errorCode, error.code);
});
