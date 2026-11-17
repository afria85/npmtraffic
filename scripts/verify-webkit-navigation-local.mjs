import { once } from "node:events";
import { createServer, request } from "node:http";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const output = process.argv[2];
if (!output) throw new Error("Provide an output directory");
const local = "http://127.0.0.1:3530";
const proxyOrigin = "http://127.0.0.1:3531";
const env = { ...process.env, NEXT_PUBLIC_PROJECT_GITHUB: "https://github.com/afria85/npmtraffic.git" };
delete env.UPSTASH_REDIS_REST_URL;
delete env.UPSTASH_REDIS_REST_TOKEN;
const proxy = createServer((req, res) => {
  const upstream = request(
    { hostname: "127.0.0.1", port: 3530, path: req.url, method: req.method, headers: req.headers },
    reply => {
      const headers = { ...reply.headers };
      // Local fixture only: WebKit upgrades loopback subresources when no trusted HTTPS server is present.
      const csp = headers["content-security-policy"];
      if (typeof csp === "string") headers["content-security-policy"] = csp.replace(/; upgrade-insecure-requests(?=;|$)/, "");
      res.writeHead(reply.statusCode ?? 502, headers);
      reply.pipe(res);
    },
  );
  upstream.on("error", () => res.writeHead(502).end());
  req.pipe(upstream);
});
proxy.listen(3531, "127.0.0.1");
await once(proxy, "listening");
const server = spawn(process.execPath, ["--import", "./smoke/upstream-fixture.mjs", "node_modules/next/dist/bin/next",
  "start", "--hostname", "127.0.0.1", "--port", "3530"], { env, stdio: "inherit" });
try {
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) {
    if (server.exitCode !== null) break;
    ready = await fetch(local + "/status").then(r => r.ok, () => false);
    if (!ready) await delay(250);
  }
  if (!ready) throw new Error("Build and stop any conflicting fixture server before running this probe");
  const child = spawn(process.execPath, ["scripts/verify-webkit-navigation.mjs", local, proxyOrigin, output], { stdio: "inherit" });
  const [code] = await once(child, "exit");
  process.exitCode = code ?? 1;
} finally {
  server.kill();
  proxy.close();
}
