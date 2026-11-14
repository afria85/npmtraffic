import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { getRateLimitStatus, rateLimit } from "../lib/rate-limit";

const ORIGIN = "https://rare-dolphin-170027.upstash.io";
const IDENTITY = "npmtraffic-staging-rate-limit@aws/eu-central-1";
const MAX_REQUESTS = 64;
const LIMIT = 5;
const WINDOW = 10_000;
const PRIMARY_IP = "203.0.113.10";
const OTHER_IP = "203.0.113.11";
const TIME_PROBE = "local t = redis.call('TIME'); redis.call('SET', KEYS[1], 'probe', 'PX', ARGV[1]); return t";

type Command = (string | number)[];
type Fault = "timeout" | "network" | "malformed";
type Batch = { route: string; ip: string; count: number; skew?: number; fault?: Fault };
type Result = Awaited<ReturnType<typeof rateLimit>>;
type WorkerMessage =
  | { type: "fetch"; id: number; command: Command }
  | { type: "result"; pid: number; results: Result[]; observation?: string; elapsedMs: number }
  | { type: "failed" };
type ParentMessage =
  | { type: "run"; batch: Batch }
  | { type: "response"; id: number; body?: string; status?: number };

export function stagingToken(env: Record<string, string | undefined>) {
  if (env.UPSTASH_VERIFY_STAGING !== "1" || env.UPSTASH_STAGING_ATTESTATION !== IDENTITY ||
      (env.UPSTASH_REDIS_REST_URL !== ORIGIN && env.UPSTASH_REDIS_REST_URL !== ORIGIN + "/")) {
    return undefined;
  }
  return env.UPSTASH_REDIS_REST_TOKEN?.trim()
    ? env.UPSTASH_REDIS_REST_TOKEN
    : undefined;
}

// Only the coordinator has the credential and a network transport. Workers run the
// real limiter, but their fetch goes over IPC so the shared budget cannot race.
function runWorker() {
  process.env.UPSTASH_REDIS_REST_URL = ORIGIN;
  process.env.UPSTASH_REDIS_REST_TOKEN = "ipc-placeholder";
  process.env.VERCEL = "1";
  const originalNow = Date.now;
  let sequence = 0;

  process.on("message", async (message: ParentMessage) => {
    if (message.type !== "run") return;
    const { route, ip, count, skew = 0, fault } = message.batch;
    const start = performance.now();
    Date.now = () => originalNow() + skew;
    globalThis.fetch = async (_input, init) => {
      if (fault === "network") throw new Error("Synthetic connection failure");
      if (fault === "malformed") return Response.json({ result: [1, null, null, null] });
      if (fault === "timeout") {
        // The production AbortSignal is what ends this request.
        await delay(WINDOW, undefined, { signal: init?.signal ?? undefined });
        throw new Error("Synthetic timeout did not abort");
      }

      const id = ++sequence;
      return new Promise<Response>((resolve, reject) => {
        const signal = init?.signal;
        function clean() {
          process.off("message", onResponse);
          signal?.removeEventListener("abort", onAbort);
        }
        function onAbort() {
          clean();
          reject(new Error("Limiter request aborted"));
        }
        function onResponse(reply: ParentMessage) {
          if (reply.type !== "response" || reply.id !== id) return;
          clean();
          if (reply.body === undefined) reject(new Error("Coordinator transport failed"));
          else resolve(new Response(reply.body, { status: reply.status }));
        }
        process.on("message", onResponse);
        signal?.addEventListener("abort", onAbort, { once: true });
        process.send?.({ type: "fetch", id, command: JSON.parse(String(init?.body)) } satisfies WorkerMessage);
      });
    };

    try {
      const req = new Request("https://staging.invalid/", { headers: { "x-vercel-forwarded-for": ip } });
      const results = await Promise.all(Array.from({ length: count }, () => rateLimit(req, route, LIMIT, WINDOW)));
      process.send?.({
        type: "result", pid: process.pid, results, elapsedMs: Math.round(performance.now() - start),
        observation: getRateLimitStatus().lastSharedObservation?.result,
      } satisfies WorkerMessage);
    } catch {
      process.send?.({ type: "failed" } satisfies WorkerMessage);
    } finally {
      Date.now = originalNow;
    }
  });
  process.setMaxListeners(20);
}

function limiterKey(route: string, ip: string) {
  const fingerprint = createHash("sha256").update("ip:" + ip).digest("hex").slice(0, 16);
  return "ratelimit:" + route + ":" + fingerprint;
}

export async function verifyStaging(env: Record<string, string | undefined>, transport: typeof fetch = fetch) {
  const token = stagingToken(env);
  assert(token, "Staging identity was not verified");
  const namespace = "staging-verification:" + randomUUID();
  const main = namespace + ":quota";
  const isolated = namespace + ":route";
  const skew = namespace + ":skew";
  const quotaKey = limiterKey(main, PRIMARY_IP);
  const timeKey = namespace + ":redis-time";
  const keys = [quotaKey, limiterKey(main, OTHER_IP), limiterKey(isolated, PRIMARY_IP), limiterKey(skew, PRIMARY_IP), timeKey];
  const cleanupReserve = keys.length * 4; // Two DEL/EXISTS attempts per exact key.
  let requests = 0;
  let phase = "worker-startup";
  let failure: string | undefined;
  let cleanupFailures = 0;
  const interruption = new AbortController();
  const interrupt = () => interruption.abort();
  const checks: Record<string, unknown> = {};
  const workers: ChildProcess[] = [];
  const inFlight = new Set<Promise<void>>();

  async function post(command: Command, cleanup = false) {
    if (!cleanup) interruption.signal.throwIfAborted();
    assert(requests < (cleanup ? MAX_REQUESTS : MAX_REQUESTS - cleanupReserve));
    requests++;
    const response = await transport(ORIGIN, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify(command),
    });
    return { body: await response.text(), status: response.status };
  }

  async function command(args: Command, cleanup = false) {
    const response = await post(args, cleanup);
    assert(response.status >= 200 && response.status < 300);
    const payload = JSON.parse(response.body) as { result?: unknown; error?: unknown };
    assert(!payload.error && Object.hasOwn(payload, "result"));
    return payload.result;
  }

  function run(worker: ChildProcess, batch: Batch) {
    const key = limiterKey(batch.route, batch.ip);
    interruption.signal.throwIfAborted();
    assert(keys.includes(key));
    return new Promise<Extract<WorkerMessage, { type: "result" }>>((resolve, reject) => {
      let sent = 0;
      const timer = setTimeout(() => finish(), 12_000);
      function finish(result?: Extract<WorkerMessage, { type: "result" }>) {
        clearTimeout(timer);
        worker.off("message", receive);
        worker.off("exit", stopped);
        worker.off("error", stopped);
        if (result) resolve(result);
        else reject(new Error("Worker batch failed"));
      }
      function stopped() { finish(); }
      function receive(value: WorkerMessage) {
        if (value.type === "result") {
          if (value.results.length !== batch.count || value.results.some(result => result.key !== key) ||
              sent !== (batch.fault ? 0 : batch.count)) finish();
          else finish(value);
          return;
        }
        if (value.type !== "fetch" || batch.fault || ++sent > batch.count ||
            value.command[0] !== "EVAL" || value.command[2] !== 1 || value.command[3] !== key) {
          finish();
          return;
        }
        const relay = async () => {
          let reply: ParentMessage = { type: "response", id: value.id };
          try {
            reply = { ...reply, ...await post(value.command) };
          } catch {
            // Workers fail closed. Catch transport failures without echoing credentials.
          }
          if (worker.connected) worker.send(reply, () => {});
        };
        const operation = relay();
        inFlight.add(operation);
        void operation.finally(() => inFlight.delete(operation));
      }
      worker.on("message", receive);
      worker.once("exit", stopped);
      worker.once("error", stopped);
      worker.send({ type: "run", batch } satisfies ParentMessage, error => { if (error) finish(); });
    });
  }

  const countAllowed = (results: Result[]) => results.filter(result => result.allowed).length;
  const validDenial = (result: Result) => result.retryAfter >= 1 && result.retryAfter <= WINDOW / 1000;
  const batch = (route: string, count: number, extra: Partial<Batch> = {}): Batch =>
    ({ route, count, ip: PRIMARY_IP, ...extra });

  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    for (let i = 0; i < 2; i++) {
      const worker = fork(__filename, ["--worker"], {
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: "test" },
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
      // A spawn/IPC error outside a batch must still reach cleanup via the batch watchdog.
      worker.on("error", () => {});
      workers.push(worker);
    }
    const [a, b] = workers;
    phase = "shared-quota";
    const burst = await Promise.all([
      run(a, batch(main, 10, { skew: -120_000 })),
      run(b, batch(main, 10, { skew: 120_000 })),
    ]);
    assert.notEqual(burst[0].pid, burst[1].pid);
    const results = burst.flatMap(result => result.results);
    assert.equal(countAllowed(results), LIMIT);
    assert(burst.every(result => result.observation === "responded"));
    assert(results.filter(result => !result.allowed).every(validDenial));
    assert.equal(await command(["ZCARD", quotaKey]), LIMIT);
    const ttlBefore = await command(["PTTL", quotaKey]);
    assert(typeof ttlBefore === "number" && ttlBefore > 0 && ttlBefore <= WINDOW);
    await delay(250);
    const denied = await run(b, batch(main, 1));
    assert(!denied.results[0].allowed && validDenial(denied.results[0]) && denied.observation === "responded");
    assert.equal(await command(["ZCARD", quotaKey]), LIMIT);
    const ttl = await command(["PTTL", quotaKey]);
    assert(typeof ttl === "number" && ttl > 0 && ttl < ttlBefore);
    checks.quota = { allowed: LIMIT, denied: 15, distinctProcesses: true, cardinality: LIMIT, ttlMs: ttl };

    phase = "isolation-and-expiry";
    assert.equal(countAllowed((await run(a, batch(isolated, 1))).results), 1);
    assert.equal(countAllowed((await run(b, batch(main, 1, { ip: OTHER_IP }))).results), 1);
    await delay(ttl + 100, undefined, { signal: interruption.signal });
    assert.equal(await command(["EXISTS", quotaKey]), 0);
    const boundary = await Promise.all([run(a, batch(main, 3)), run(b, batch(main, 3))]);
    assert.equal(countAllowed(boundary.flatMap(result => result.results)), LIMIT);
    assert(boundary.every(result => result.observation === "responded"));
    checks.expiryAndIsolation = true;

    phase = "timeout-and-recovery";
    for (const fault of ["network", "malformed", "timeout"] as const) {
      const attempt = await run(a, batch(isolated, 1, { fault }));
      assert(!attempt.results[0].allowed && attempt.results[0].retryAfter === 3 && attempt.observation === "degraded");
      if (fault === "timeout") {
        assert(attempt.elapsedMs >= 2900 && attempt.elapsedMs < 5000);
        checks.syntheticTimeoutMs = attempt.elapsedMs;
      }
    }
    const recovered = await run(a, batch(isolated, 1));
    assert(recovered.results[0].allowed && recovered.observation === "responded");
    checks.syntheticFaultRecovery = true;

    phase = "redis-time-in-writing-eval";
    // Separate probe. It does not change the production limiter's clock source.
    try {
      const clock = await command(["EVAL", TIME_PROBE, 1, timeKey, WINDOW]);
      assert(Array.isArray(clock) && clock.length === 2 && clock.every(part => /^\d+$/.test(String(part))));
      checks.redisTimeInWritingEval = true;
    } catch {
      checks.redisTimeInWritingEval = false;
      failure = phase;
    }

    phase = "clock-skew";
    const seed = await run(a, batch(skew, LIMIT));
    assert.equal(countAllowed(seed.results), LIMIT);
    const offsetsMs = [WINDOW + 100, -WINDOW - 100];
    const skewed = await Promise.all([
      run(a, batch(skew, 1, { skew: offsetsMs[0] })),
      run(b, batch(skew, 1, { skew: offsetsMs[1] })),
    ]);
    const skewResults = skewed.flatMap(result => result.results);
    const skewAllowed = countAllowed(skewResults);
    checks.clockSkew = { offsetsMs, extraAllowed: skewAllowed };
    assert(skewed.every(result => result.observation === "responded"));
    assert(skewResults.filter(result => !result.allowed).every(validDenial));
    assert.equal(skewAllowed, 0);
  } catch {
    failure ??= phase;
  } finally {
    for (const worker of workers) worker.kill();
    // No worker can enqueue more writes once its batch listener has been detached.
    await Promise.allSettled([...inFlight]);
    if (requests > 0) {
      for (const key of keys) {
        let absent = false;
        for (let attempt = 0; attempt < 2 && !absent; attempt++) {
          try {
            await command(["DEL", key], true);
          } catch {
            // DEL may have reached Redis even if its HTTP response was lost.
          }
          try {
            absent = await command(["EXISTS", key], true) === 0;
          } catch {
            // Keep the second bounded attempt available for an intermittent failure.
          }
        }
        if (!absent) cleanupFailures++;
      }
    }
  }

  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  failure ??= interruption.signal.aborted ? "interrupted" : undefined;
  return {
    status: failure || cleanupFailures ? "HOLD" : "PASS", failure, checks,
    requests, maxRequests: MAX_REQUESTS,
    cleanup: requests === 0 ? "not-needed" : cleanupFailures ? "unverified" : "verified",
    cleanupFailures,
  };
}

async function main() {
  const token = stagingToken(process.env);
  if (!token) {
    console.log(JSON.stringify({ status: "BLOCKED", reason: "Explicit staging flag, exact origin, owner attestation and credential required. No Redis request made." }));
    process.exitCode = 2;
    return;
  }
  const result = await verifyStaging(process.env);
  console.log(JSON.stringify(result));
  process.exitCode = result.status === "PASS" ? 0 : 1;
}

if (require.main === module) {
  if (process.argv[2] === "--worker") runWorker();
  else void main().catch(() => {
    console.error("Staging verifier failed. No credential or response details logged.");
    process.exitCode = 1;
  });
}
