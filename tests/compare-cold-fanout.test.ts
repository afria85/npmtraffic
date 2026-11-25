import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompareData } from "../lib/compare";
import { cacheClear } from "../lib/cache";
import { rangeForDays } from "../lib/query";
import { registryFixture } from "./support/npm-observations";

// Issue #29: an SSR Compare request with five distinct cold keys fans out
// even though identical keys are coalesced within one server process.
// This is a measurement regression, NOT a cross-instance admission fix.
test("cold five-package Compare starts five distinct upstream range reads", async (t) => {
  const originalFetch = globalThis.fetch;
  const packages = ["react", "vue", "angular", "svelte", "preact"];
  const range = rangeForDays(7);
  const prefix = `https://api.npmjs.org/downloads/range/${range.startDate}:${range.endDate}/`;
  const pending: Array<{ pkg: string; resolve: (response: Response) => void }> = [];
  let signalStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  cacheClear();
  globalThis.fetch = async (input) => {
    const registry = registryFixture(input);
    if (registry) return registry;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(prefix)) return new Response("not found", { status: 404 });
    const pkg = decodeURIComponent(url.slice(prefix.length));
    assert.ok(packages.includes(pkg), "unexpected package requested");
    return new Promise<Response>((resolve) => {
      pending.push({ pkg, resolve });
      if (pending.length === packages.length) signalStarted?.();
    });
  };
  t.after(() => {
    for (const item of pending.splice(0)) item.resolve(new Response("unavailable", { status: 503 }));
    globalThis.fetch = originalFetch;
    cacheClear();
  });

  const comparison = buildCompareData(packages, 7);
  await Promise.race([
    started,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("five upstream requests did not start")), 3000)),
  ]);
  assert.equal(pending.length, 5);
  assert.deepEqual(new Set(pending.map(({ pkg }) => pkg)), new Set(packages));
  for (const { pkg, resolve } of pending.splice(0)) {
    resolve(Response.json({
      start: range.startDate,
      end: range.endDate,
      package: pkg,
      downloads: Array.from({ length: range.days }, (_, index) => ({
        day: new Date(Date.parse(`${range.startDate}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10),
        downloads: index + 1,
      })),
    }));
  }
  const result = await comparison;
  assert.equal(result.packages.length, 5);
});
