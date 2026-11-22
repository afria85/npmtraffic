import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

const [chromiumUrl, webkitUrl, out, target = "fixture"] = process.argv.slice(2);
if (!out) throw new Error("Provide Chromium URL, WebKit URL, output path, and target label");
const origins = [chromiumUrl, webkitUrl].map(value => new URL(value).origin);
mkdirSync(out, { recursive: true });
const fixturePackages = ["react", "vue", "axios", "svelte", "@angular/core"];
const packages = target === "fixture" ? fixturePackages : ["react", "vue"];
const comparison = "/compare?" + new URLSearchParams({ packages: packages.join(","), days: "30" });
const fixtureDimensions = [[320, 720], [390, 844], [1280, 900]]
  .flatMap(([width, height]) => ["light", "dark"].map(theme => [width, height, theme]));
const categories = [
  ["frame-load-interrupted", /frame load interrupted/i],
  ["download-starting", /download is starting/i],
  ["aborted", /abort/i],
  ["canceled", /cancel/i],
  ["access-control", /access.control|cors/i],
  ["parentNode", /parentNode/i],
  ["hydration", /#418|hydrat/i],
  ["analytics-fixture", /analytics.*failed to load|_vercel\/insights\/script\.js/i],
  ["http-resource", /failed to load resource/i],
];
const categorize = message => categories.find(([, pattern]) => pattern.test(message))?.[0] ?? "other";
const ref = value => value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
const serial = (u, origin) => {
  const url = new URL(u);
  return { origin: url.origin === origin ? "same" : url.origin, path: url.pathname, rsc: ref(url.searchParams.get("_rsc")) };
};

async function exercise(engine, launcher, origin, [width, height, theme]) {
  const browser = await launcher.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion: "reduce" });
  await ctx.addInitScript(items => {
    localStorage.setItem("npmtraffic:compare", JSON.stringify(items));
  }, packages);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const report = { target, origin, engine, version: browser.version(), os: process.platform, width, height, theme, checks: [], requests: [], errors: [] };
  const ids = new WeakMap();
  const requestUrls = new Map();
  let phase = "hard";
  const relevant = request => {
    const url = new URL(request.url());
    return (url.origin === origin || url.hostname === "vercel.com") &&
      (request.isNavigationRequest() || url.searchParams.has("_rsc") || url.pathname.endsWith(".csv") ||
       url.pathname === "/_vercel/insights/script.js");
  };
  page.on("request", r => {
    if (!relevant(r)) return;
    const id = report.requests.length + 1;
    ids.set(r, id);
    requestUrls.set(id, r.url());
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
      allowOrigin: h["access-control-allow-origin"], attachment: /^attachment\b/i.test(h["content-disposition"] ?? ""),
      redirect: h.location ? serial(new URL(h.location, r.url()), origin) : undefined };
  });
  page.on("requestfailed", r => {
    const record = report.requests[ids.get(r) - 1];
    if (record) record.failed = categorize(r.failure()?.errorText ?? "");
  });
  const classify = (message, event, sourceUrl) => {
    const kind = categorize(message);
    const host = new URL(origin).host;
    const rawPath = message.includes(host) ? message.split(host)[1].split("?")[0] : null;
    const path = /^\/[A-Za-z0-9_/%.-]*$/.test(rawPath ?? "") ? rawPath : null;
    const token = ref(message.match(/[?&]_rsc=([a-zA-Z0-9_-]+)/)?.[1]);
    const source = sourceUrl?.startsWith(origin + "/") ? serial(sourceUrl, origin).path : undefined;
    const status = message.match(/status of (\d{3})\b/)?.[1];
    report.errors.push({ phase, event, kind, path, source, status, rsc: token });
  };
  page.on("pageerror", e => classify(e.message, "pageerror"));
  page.on("console", m => { if (m.type() === "error") classify(m.text(), "console", m.location().url); });

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
    const body = await download.createReadStream();
    let bytes = 0;
    let prefix = "";
    for await (const chunk of body) {
      bytes += chunk.length;
      if (prefix.length < 4096) prefix += chunk.toString("utf8", 0, 4096 - prefix.length);
    }
    if (!prefix.includes("# timezone=UTC") || !/\bdate,downloads\b/.test(prefix)) throw new Error("CSV content check failed");
    report.checks.push({ phase, focus: true, csv: download.suggestedFilename(), bytes,
      requestIds: [...requestUrls].filter(([, url]) => url === download.url()).map(([id]) => id) });
    await page.locator('[data-compare-tray-action="compare"]').click();
    await destination("/compare");
    if (!await page.evaluate(() => window.navigationProbe)) throw new Error("Compare link replaced the document");
    if (target === "fixture") {
      const legend = page.getByRole("list", { name: "Chart series" });
      if (await legend.getByRole("listitem").count() !== packages.length) throw new Error("Compare legend count differs");
      const indexed = page.getByRole("button", { name: "Indexed (base 100)", exact: true });
      await indexed.click();
      await page.getByText(/Each package equals 100 on .* UTC/).waitFor();
      if (await indexed.getAttribute("aria-pressed") !== "true") throw new Error("Indexed selection is not pressed");
      const absolute = page.getByRole("button", { name: "Absolute", exact: true });
      await absolute.press("Enter");
      if (await absolute.getAttribute("aria-pressed") !== "true") throw new Error("Absolute selection is not pressed");
      const pager = page.getByRole("button", { name: "Scroll legend right" });
      if (await pager.isVisible()) {
        await pager.click();
        const offset = await page.getByRole("region", { name: "Chart legend" }).evaluate(el => el.scrollLeft);
        if (offset <= 0) throw new Error("Legend did not scroll");
      }
      await page.getByRole("combobox", { name: "Table packages" }).selectOption("react");
      const table = page.getByRole("table", { name: "Daily observations" });
      await table.getByRole("columnheader", { name: "react" }).waitFor();
      if (await table.getByRole("columnheader", { name: "axios" }).count()) throw new Error("Focused table retained another package");
      await page.evaluate(() => scrollTo(0, 0));
      report.checks.push({ phase, series: packages.length, indexed: true, focusedTable: true });
    }
    await page.screenshot({ path: join(out, engine + "-" + width + "-" + theme + "-compare.png") });
    await page.getByRole("banner").getByRole("link", { name: "About", exact: true }).click();
    await destination("/about");
    await page.getByRole("banner").getByRole("link", { name: "npmtraffic home" }).click();
    await destination("/");
    const data = page.getByRole("main").getByRole("link", { name: "Data and exports", exact: true });
    if (await data.count()) await data.click();
    else await page.goto(origin + "/data", { waitUntil: "domcontentloaded" });
    await destination("/data");
    if (target === "fixture") {
      phase = "ranges";
      for (const days of [7, 365]) {
        await page.goto(origin + "/p/react?days=" + days);
        await destination("/p/react");
        await page.getByRole("img", { name: new RegExp("line chart \\(" + days + " days\\)") }).waitFor();
        report.checks.push({ phase, days });
      }
      phase = "not-found";
      await page.goto(origin + "/p/missing-export-fixture?days=7");
      await page.getByRole("heading", { name: "Page not found" }).waitFor();
      report.checks.push({ phase, notFound: true });
    }
    report.passed = true;
  } catch (error) {
    // Keep diagnostic paths and test assertion text. Exclude transport payloads, tokens and URLs.
    report.failure = String(error.message).split("\n")[0].replace(/https?:\/\/\S+/g, "[url]").slice(0, 220);
  } finally {
    for (const e of report.errors) {
      e.matchedRequestIds = report.requests.filter(r => e.rsc && r.rsc === e.rsc && (!e.path || e.path === r.path)).map(r => r.id);
    }
    writeFileSync(join(out, engine + "-" + width + "-" + theme + ".json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  return report;
}

for (const [index, [engine, launcher]] of Object.entries([["chromium", chromium], ["webkit", webkit]])) {
  for (const dimensions of target === "fixture" ? fixtureDimensions : [[320, 720, "light"]]) {
    const r = await exercise(engine, launcher, origins[index], dimensions);
    const [width, , theme] = dimensions;
    console.log(JSON.stringify({ target, engine, width, theme, passed: r.passed, blocked: r.blocked, failure: r.failure,
      requests: r.requests.length, pageErrors: r.errors.filter(e => e.event === "pageerror").length }));
    if (!r.passed && !r.blocked) process.exitCode = 1;
  }
}
