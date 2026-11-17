import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

// Read-only, fixture-local navigation diagnostic. Do not use this runner for load testing.
// Pass the same local Chromium/WebKit origins as verify-webkit-navigation.mjs.
const [chromiumUrl, webkitUrl, output] = process.argv.slice(2);
if (!output || !chromiumUrl || !webkitUrl) {
  throw new Error("Usage: diagnose-webkit-react-click.mjs <chromium-local-url> <webkit-proxy-url> <output-dir>");
}
mkdirSync(output, { recursive: true });
const origins = [chromiumUrl, webkitUrl].map(url => new URL(url).origin);
const hash = value => value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
const classify = message => {
  if (/access.control|cors/i.test(message)) return "access-control";
  if (/parentNode/i.test(message)) return "parentNode";
  if (/hydrat|#418/i.test(message)) return "hydration";
  if (/frame load interrupted/i.test(message)) return "frame-load-interrupted";
  if (/abort|cancel/i.test(message)) return "canceled";
  if (/_vercel\/insights\/script\.js|analytics.*failed to load/i.test(message)) return "analytics-fixture";
  return "other";
};
const safeRequest = (request, origin) => {
  const url = new URL(request.url());
  if (url.origin !== origin) return null;
  const headers = request.headers();
  if (!request.isNavigationRequest() && !url.searchParams.has("_rsc")) return null;
  return {
    id: null,
    phase: "setup",
    path: url.pathname,
    rsc: hash(url.searchParams.get("_rsc")),
    navigation: request.isNavigationRequest(),
    prefetch: headers["next-router-prefetch"] === "1",
    segment: Boolean(headers["next-router-segment-prefetch"]),
  };
};

async function runOne(browser, engine, origin, width, height, attempt) {
  const context = await browser.newContext({
    viewport: { width, height }, colorScheme: "light", reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const report = {
    engine, version: browser.version(), os: process.platform, width, height, attempt,
    runType: "local-fixture", stages: [], clicks: [], requests: [], errors: [], passed: false,
  };
  const ids = new WeakMap();
  let phase = "setup";
  page.on("request", request => {
    const record = safeRequest(request, origin);
    if (!record || report.requests.length >= 250) return;
    record.id = report.requests.length + 1;
    record.phase = phase;
    ids.set(request, record.id);
    report.requests.push(record);
  });
  page.on("response", response => {
    const id = ids.get(response.request());
    if (!id) return;
    const record = report.requests[id - 1];
    if (record) {
      record.status = response.status();
      record.type = (response.headers()["content-type"] || "").split(";")[0];
      record.redirect = response.status() >= 300 && response.status() < 400;
    }
  });
  page.on("requestfailed", request => {
    const id = ids.get(request);
    if (id && report.requests[id - 1]) {
      report.requests[id - 1].failed = classify(request.failure()?.errorText || "other");
    }
  });
  page.on("pageerror", error => {
    report.errors.push({ phase, event: "pageerror", kind: classify(error.message) });
  });
  page.on("console", message => {
    if (message.type() === "error") {
      report.errors.push({ phase, event: "console", kind: classify(message.text()) });
    }
  });

  const move = async path => {
    const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    if (!response?.ok()) throw new Error("Initial fixture navigation failed at " + new URL(origin + path).pathname);
    report.stages.push({ phase, path: new URL(page.url()).pathname, status: response.status() });
  };
  try {
    // Match the 1280px miss sequence observed in RC #34 before attempting
    // the in-app Home -> React click. No artificial click retry or waiting
    // for RSC prefetches is inserted before the attempt.
    await move("/");
    await move("/p/react?days=30");
    await move("/compare?packages=react,vue&days=30");
    await move("/about");
    await move("/data");
    phase = "back-forward";
    await page.goBack({ waitUntil: "domcontentloaded" });
    report.stages.push({ phase, path: new URL(page.url()).pathname });
    await page.goForward({ waitUntil: "domcontentloaded" });
    report.stages.push({ phase, path: new URL(page.url()).pathname });

    phase = "client-home";
    await page.getByRole("banner").getByRole("link", { name: "npmtraffic home" }).click();
    await page.waitForURL(url => url.origin === origin && url.pathname === "/");
    await page.getByRole("main").getByRole("heading", { level: 1 }).waitFor();

    // Observe real pointer/anchor events without preventDefault, interception,
    // dispatching synthetic events, or monkey-patching app navigation.
    await page.evaluate(() => {
      const probe = { events: [] };
      window.__npmtrafficClickProbe = probe;
      for (const type of ["pointerdown", "pointerup", "click"]) {
        document.addEventListener(type, event => {
          const element = event.target instanceof Element ? event.target : null;
          const anchor = element?.closest("a");
          if (!anchor || new URL(anchor.href).pathname !== "/p/react") return;
          const record = {
            type,
            isTrusted: event.isTrusted,
            defaultPreventedAtCapture: event.defaultPrevented,
            path: new URL(anchor.href).pathname,
            timeMs: Math.round(performance.now()),
          };
          probe.events.push(record);
          queueMicrotask(() => { record.defaultPreventedAfterDispatch = event.defaultPrevented; });
        }, { capture: true });
      }
      window.addEventListener("popstate", () => {
        probe.events.push({ type: "popstate", path: location.pathname });
      });
    });
    const link = page.getByRole("main").getByRole("link", { name: "react", exact: true });
    const before = await link.evaluate(anchor => {
      const rect = anchor.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        path: new URL(anchor.href).pathname,
        readyState: document.readyState,
        currentPath: location.pathname,
        centerCovered: !(top === anchor || anchor.contains(top)),
        topTag: top?.tagName || null,
        topRole: top?.getAttribute("role") || null,
        pointerEvents: getComputedStyle(anchor).pointerEvents,
        boxWithinViewport: rect.width > 0 && rect.height > 0 &&
          x >= 0 && y >= 0 && x < innerWidth && y < innerHeight,
      };
    });
    report.before = before;
    phase = "react-click";
    try {
      await link.click({ timeout: 10000 });
    } catch (error) {
      // Do not treat a click timeout as success if the URL stayed Home.
      report.clickFailureKind = classify(error instanceof Error ? error.message : String(error));
    }
    try {
      await page.waitForURL(url => url.origin === origin && url.pathname === "/p/react", { timeout: 10000 });
    } catch {
      // Capture the state; no retry of this attempt.
    }
    const route = new URL(page.url()).pathname;
    report.after = {
      path: route,
      reactChartPresent: route === "/p/react" &&
        (await page.getByRole("img", { name: /daily downloads line chart/i }).count()) > 0,
    };
    report.clicks = await page.evaluate(() => window.__npmtrafficClickProbe?.events || []).catch(() => []);
    if (route !== "/p/react") throw new Error("React link navigation missed: still " + route);
    await page.getByRole("img", { name: /daily downloads line chart/i }).waitFor({ timeout: 10000 });
    report.passed = true;
  } catch (error) {
    report.failure = String(error instanceof Error ? error.message : error)
      .split("\n")[0].replace(/https?:\/\/\S+/g, "[url]").slice(0, 200);
    report.after ??= { path: new URL(page.url()).pathname };
    if (!report.clicks.length) {
      report.clicks = await page.evaluate(() => window.__npmtrafficClickProbe?.events || []).catch(() => []);
    }
    await page.screenshot({ path: join(output, engine + "-" + width + "-attempt" + attempt + "-FAILED.png") })
      .catch(() => {});
  } finally {
    // Only relevant paths, hashed RSC keys and event categories are exported;
    // never persist cookies, query values, raw errors, full bodies or secrets.
    writeFileSync(
      join(output, engine + "-" + width + "-attempt" + attempt + ".json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    await context.close();
  }
  return report;
}

for (const [index, [engine, launcher]] of [["chromium", chromium], ["webkit", webkit]].entries()) {
  const browser = await launcher.launch();
  try {
    for (const [width, height] of [[320, 720], [1280, 900]]) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await runOne(browser, engine, origins[index], width, height, attempt);
        console.log(JSON.stringify({
          engine, width, attempt, passed: result.passed, failure: result.failure,
          clicks: result.clicks.length, rscRequests: result.requests.filter(x => x.rsc).length,
          pageErrors: result.errors.filter(x => x.event === "pageerror").length,
        }));
        if (!result.passed) process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
  }
}
