import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";

// Two fresh Node processes, identical cold keys, no real upstream access.
// Characterizes current fan-out; does not assert distributed admission exists.
const worker = `
import { buildCompareData } from "./lib/compare.ts";
import { listDatesBetween } from "./lib/dates.ts";
const packages = ["react", "vue", "angular", "svelte", "preact"];
let registry = 0;
const reads = [];
const pending = [];
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const match = /^\\/downloads\\/range\\/([0-9-]+):([0-9-]+)(?:\\/([^/]+))?$/.exec(url.pathname);
  if (url.origin !== "https://api.npmjs.org" || !match) throw new Error("Unexpected mocked upstream: " + url);
  const [, start, end, encoded] = match;
  const pkg = encoded ? decodeURIComponent(encoded) : undefined;
  if (pkg) reads.push(pkg); else registry++;
  return new Promise(resolve => {
    pending.push(() => resolve(Response.json({
      start, end, ...(pkg ? { package: pkg } : {}),
      downloads: listDatesBetween(start, end).map(day => ({ day, downloads: pkg ? 10 : 100000 })),
    })));
    if (pending.length === 6) process.send({ kind: "ready", pid: process.pid, reads, registry });
  });
};
process.once("message", message => {
  if (message !== "release") throw new Error("Unexpected parent message");
  for (const release of pending.splice(0)) release();
});
const result = await buildCompareData(packages, 7);
process.send({ kind: "done", count: result.packages.length, reads, registry }, () => process.disconnect());
`;

type Receipt = { kind: string; pid?: number; reads: string[]; registry: number; count?: number };

test("two isolated cold Compare processes each admit five package and one registry read", { timeout: 20000 }, async (t) => {
  const children = Array.from({ length: 2 }, () => spawn(process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", worker],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] }));
  t.after(() => { for (const child of children) if (child.exitCode === null) child.kill(); });
  const sessions = children.map(child => {
    let stderr = "";
    child.stderr?.on("data", chunk => { stderr += String(chunk); });
    let readyResolve!: (value: Receipt) => void;
    let doneResolve!: (value: Receipt) => void;
    let fail!: (reason: Error) => void;
    const failure = new Promise<never>((_, reject) => { fail = reject; });
    const ready = Promise.race([new Promise<Receipt>(resolve => { readyResolve = resolve; }), failure]);
    const done = Promise.race([new Promise<Receipt>(resolve => { doneResolve = resolve; }), failure]);
    const exited = Promise.race([new Promise<void>(resolve => {
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
        else fail(new Error("Worker exit " + code + "/" + signal + ": " + stderr));
      });
    }), failure]);
    // Observe all rejection paths even if the readiness barrier fails first.
    for (const promise of [ready, done, exited]) void promise.catch(() => {});
    child.once("error", fail);
    child.on("message", raw => {
      const message = raw as Receipt;
      if (message.kind === "ready") readyResolve(message);
      if (message.kind === "done") doneResolve(message);
    });
    return { ready, done, exited };
  });
  const receipts = await Promise.all(sessions.map(session => session.ready));
  assert.equal(new Set(receipts.map(r => r.pid)).size, 2);
  for (const receipt of receipts) {
    assert.deepEqual([...receipt.reads].sort(), ["angular", "preact", "react", "svelte", "vue"]);
    assert.equal(receipt.registry, 1);
  }
  assert.equal(receipts.reduce((sum, r) => sum + r.reads.length, 0), 10);
  assert.equal(receipts.reduce((sum, r) => sum + r.registry, 0), 2);
  for (const child of children) child.send("release");
  const results = await Promise.all(sessions.map(session => session.done));
  for (const result of results) {
    assert.equal(result.count, 5);
    assert.equal(result.reads.length, 5);
    assert.equal(result.registry, 1);
  }
  await Promise.all(sessions.map(session => session.exited));
});
