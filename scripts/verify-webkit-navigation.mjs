import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

const [chromiumUrl, webkitUrl, out, target = "fixture"] = process.argv.slice(2);
if (!out) throw new Error("Provide Chromium URL, WebKit URL, output path, and target label");
const origins = [chromiumUrl, webkitUrl].map(value => new URL(value).origin);
mkdirSync(out, { recursive: true });
const comparison = "/compare?packages=react,vue&days=30";
const ref = value => value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
const serial = (u, origin) => {
  const url = new URL(u);
  return { origin: url.origin === origin ? "same" : url.origin, path: url.pathname, rsc: ref(url.searchParams.get("_rsc")) };
};

async function exercise(engine, launcher, origin, width) {
  const browser = await launcher.launch();
  const ctx = await browser.newContext({ viewport: { width, height: width === 320 ? 720 : 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("npmtraffic:compare", JSON.stringify(["react", "vue"]));
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const report = { target, origin, engine, version: browser.version(), os: process.platform, width, checks: [], requests: [], errors: [] };
  const ids = new WeakMap();
  let phase = "hard";
  const relevant = request => {
    const url = new URL(request.url());
    return (url.origin === origin || url.hostname === "vercel.com") &&
      (request.isNavigationRequest() || url.searchParams.has("_rsc"));
  };
  page.on("request", r => {
    if (!relevant(r)) return;
    const id = report.requests.length + 1;
    ids.set(r, id);
    const h = r.headers();
    report.requests.push({ id, phase, ...serial(r.url(), origin), method: r.method(),
      document: r.isNavigationRequest(), prefetch: h["next-router-prefetch"] ?? null,
      segment: Boolean(h["next-router-segment-prefetch"]), redirectedFrom: ids.get(r.redirectedFrom()) });
  });
  page.on("response", r => {
    const record = report.requests[ids.get(r.request()) - 1];
    if (!record) return;
    const h = r.headers();
    record.response = { status: r.status(), type: h["content-type"], cache: h["x-vercel-cache"], vary: h.vary,
      allowOrigin: h["access-control-allow-origin"], redirect: h.location ? serial(new URL(h.location, r.url()), origin) : undefined };
  });
  page.on("requestfailed", r => {
    const record = report.requests[ids.get(r) - 1];
    if (record) record.failed = /cancel|abort/i.test(r.failure()?.errorText ?? "") ? "canceled" : "other";
  });
  const classify = (message, event) => {
    const kind = /access.control|cors/i.test(message) ? "access-control" : /parentNode/i.test(message) ? "parentNode"
      : /#418|hydrat/i.test(message) ? "hydration" : "other";
    const host = new URL(origin).host;
    const rawPath = message.includes(host) ? message.split(host)[1].split("?")[0] : null;
    const path = /^\/[A-Za-z0-9_/%.-]*$/.test(rawPath ?? "") ? rawPath : null;
    const token = ref(message.match(/[?&]_rsc=([a-zA-Z0-9_-]+)/)?.[1]);
    report.errors.push({ phase, event, kind, path, rsc: token });
  };
  page.on("pageerror", e => classify(e.message, "pageerror"));
  page.on("console", m => { if (m.type() === "error") classify(m.text(), "console"); });

  async function destination(path) {
    try {
      await page.waitForURL(url => url.origin === origin && url.pathname === path);
    } catch {
      throw new Error("Expected " + path + ", actual " + new URL(page.url()).pathname);
    }
    const main = page.getByRole("main");
    await main.getByRole("heading", { level: 1 }).first().waitFor();
    if (await main.getByText(/we couldn't load|temporarily unavailable/i).count()) throw new Error("Error panel on " + path);
    if (path === "/p/react" || path === "/compare") {
      await main.getByRole("img", { name: /daily downloads line chart/i }).waitFor();
    }
    report.checks.push({ phase, path, chart: path === "/p/react" || path === "/compare" });
  }
  try {
    const initial = await page.goto(origin, { waitUntil: "domcontentloaded" });
    if (new URL(page.url()).origin !== origin || !(await page.getByRole("main").count())) {
      report.blocked = "Preview sign-in required";
      report.initialStatus = initial?.status();
      return report;
    }
    await destination("/");
    // Do not wait for chart hydration between document loads. Verify the final page and follow with a full client flow.
    for (const path of ["/p/react?days=30", comparison, "/about", "/data"]) {
      const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      if (!response?.ok()) throw new Error("Hard navigation failed: " + new URL(origin + path).pathname);
      if (new URL(page.url()).pathname !== new URL(origin + path).pathname) throw new Error("Unexpected hard-navigation URL");
      report.checks.push({ phase, path: new URL(page.url()).pathname, status: response.status() });
    }
    await destination("/data");
    phase = "back-forward";
    await page.goBack({ waitUntil: "domcontentloaded" });
    await destination("/about");
    await page.goForward({ waitUntil: "domcontentloaded" });
    await destination("/data");

    phase = "client";
    await page.getByRole("banner").getByRole("link", { name: "npmtraffic home" }).click();
    await destination("/");
    await page.evaluate(() => { window.navigationProbe = true; });
    await page.getByRole("main").getByRole("link", { name: "react", exact: true }).click();
    await destination("/p/react");
    if (!await page.evaluate(() => window.navigationProbe)) throw new Error("Package link replaced the document");
    const slider = page.getByRole("slider", { name: "Inspect daily downloads" });
    await slider.press("End");
    if (!await slider.evaluate(el => document.activeElement === el && Boolean(el.getAttribute("aria-valuetext")))) {
      throw new Error("Chart inspection focus lost");
    }
    await page.locator('button[id$="-export-toggle"]').press("Enter");
    const item = page.getByRole("menuitem", { name: /^CSV\b/ });
    const [download] = await Promise.all([page.waitForEvent("download"), item.click()]);
    if (!/^npmtraffic__.+\.csv$/.test(download.suggestedFilename()) || await download.failure()) throw new Error("CSV download failed");
    report.checks.push({ phase, focus: true, csv: download.suggestedFilename() });
    await page.locator('[data-compare-tray-action="compare"]').click();
    await destination("/compare");
    if (!await page.evaluate(() => window.navigationProbe)) throw new Error("Compare link replaced the document");
    await page.screenshot({ path: join(out, engine + "-" + width + "-compare.png") });
    await page.getByRole("banner").getByRole("link", { name: "About", exact: true }).click();
    await destination("/about");
    await page.getByRole("banner").getByRole("link", { name: "npmtraffic home" }).click();
    await destination("/");
    const data = page.getByRole("main").getByRole("link", { name: "Data and exports", exact: true });
    if (await data.count()) await data.click();
    else await page.goto(origin + "/data", { waitUntil: "domcontentloaded" });
    await destination("/data");
    report.passed = true;
  } catch (error) {
    // Keep diagnostic paths and test assertion text. Exclude transport payloads, tokens and URLs.
    report.failure = String(error.message).split("\n")[0].replace(/https?:\/\/\S+/g, "[url]").slice(0, 220);
  } finally {
    for (const e of report.errors) {
      e.matchedRequestIds = report.requests.filter(r => e.rsc && r.rsc === e.rsc && (!e.path || e.path === r.path)).map(r => r.id);
    }
    writeFileSync(join(out, engine + "-" + width + ".json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  return report;
}

for (const [index, [engine, launcher]] of Object.entries([["chromium", chromium], ["webkit", webkit]])) {
  for (const width of target === "fixture" ? [320, 1280] : [320]) {
    const r = await exercise(engine, launcher, origins[index], width);
    console.log(JSON.stringify({ target, engine, width, passed: r.passed, blocked: r.blocked, failure: r.failure,
      requests: r.requests.length, pageErrors: r.errors.filter(e => e.event === "pageerror").length }));
    if (!r.passed && !r.blocked) process.exitCode = 1;
  }
}
