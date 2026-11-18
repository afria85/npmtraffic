import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:https";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

// HTTPS keeps the shipped CSP intact, including upgrade-insecure-requests.
// No credential or configuration files are read from Vercel or the owner's checkout.
if ([".env", ".env.local", ".env.production", ".env.production.local"].some(file => existsSync(file))) {
  throw new Error("Run cloud QA in a fixture checkout without production-mode environment files");
}
const directory = mkdtempSync(join(tmpdir(), "npmtraffic-cloud-qa-"));
const key = join(directory, "loopback.key");
const cert = join(directory, "loopback.crt");
const generated = spawnSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
  "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
  "-keyout", key, "-out", cert,
], { stdio: "ignore" });
if (generated.status !== 0) {
  rmSync(directory, { recursive: true, force: true });
  throw new Error("Local HTTPS fixture requires OpenSSL on PATH");
}

// Allow only process bootstrapping values. Redis/Vercel bindings are never inherited.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  /^(path|systemroot|windir|comspec|pathext|temp|tmp|home|userprofile|localappdata)$/i.test(name)));
env.NODE_ENV = "production";
env.NEXT_PUBLIC_PROJECT_GITHUB = "https://github.com/afria85/npmtraffic.git";
const server = spawn(process.execPath, [
  "--import", "./smoke/upstream-fixture.mjs", "node_modules/next/dist/bin/next",
  "start", "--hostname", "127.0.0.1", "--port", "3640",
], { env, stdio: "inherit" });
const proxy = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  const upstream = request({
    hostname: "127.0.0.1", port: 3640, path: req.url,
    method: req.method, headers: req.headers,
  }, reply => {
    res.writeHead(reply.statusCode ?? 502, reply.headers);
    reply.pipe(res);
  });
  upstream.on("error", error => {
    if (res.headersSent) res.destroy(error);
    else res.writeHead(502).end();
  });
  res.on("close", () => upstream.destroy());
  req.pipe(upstream);
});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  proxy.close();
  proxy.closeAllConnections();
  server.kill();
  rmSync(directory, { recursive: true, force: true });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
server.on("error", () => { process.exitCode = 1; stop(); });
server.on("exit", code => {
  if (!stopping) process.exitCode = code || 1;
  stop();
});
try {
  proxy.listen(3641, "localhost");
  await once(proxy, "listening");
} catch (error) {
  stop();
  throw error;
}
