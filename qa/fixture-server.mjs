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
// Diagnostic opt-in only: compare streamed vs finite-buffered RSC replies behind
// the SAME HTTPS fixture origin. This is not a proposed production buffering mode.
const diagnosticHeader = "x-npmtraffic-qa-rsc-buffer";
const maxBufferedRscBytes = 2 * 1024 * 1024;

const proxy = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  const requestUrl = new URL(req.url ?? "/", "https://localhost:3641");
  const rscRequest = requestUrl.searchParams.has("_rsc") || req.headers.rsc === "1";
  const bufferRsc = req.headers[diagnosticHeader] === "1" && rscRequest;

  // Strip the diagnostic marker before forwarding so Next.js sees unchanged
  // request metadata. It never reaches production or any external origin.
  const headers = { ...req.headers };
  delete headers[diagnosticHeader];

  const upstream = request({
    hostname: "127.0.0.1", port: 3640, path: req.url,
    method: req.method, headers,
  }, reply => {
    if (!bufferRsc) {
      res.writeHead(reply.statusCode ?? 502, reply.headers);
      reply.pipe(res);
      return;
    }

    // Isolated treatment: only RSC replies are buffered, with a hard byte cap.
    // HTML and static assets retain the original streaming proxy behavior.
    const chunks = [];
    let bytes = 0;
    reply.on("data", chunk => {
      bytes += chunk.length;
      if (bytes > maxBufferedRscBytes) {
        reply.destroy(new Error("Fixture RSC response exceeded 2 MiB diagnostic cap"));
        if (!res.headersSent && !res.destroyed) res.writeHead(502).end();
        return;
      }
      chunks.push(chunk);
    });
    reply.on("end", () => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(reply.statusCode ?? 502, reply.headers);
      res.end(Buffer.concat(chunks, bytes));
    });
    reply.on("error", error => {
      if (res.headersSent) res.destroy(error);
      else if (!res.destroyed && !res.writableEnded) res.writeHead(502).end();
    });
  });
  upstream.on("error", error => {
    if (res.headersSent) res.destroy(error);
    else if (!res.destroyed && !res.writableEnded) res.writeHead(502).end();
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
