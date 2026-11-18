import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release } from "node:os";
import { test as base, expect, type Page } from "@playwright/test";

type BrowserEvent = { phase: string; kind: string; event: string };
type RequestRecord = {
  id: number; phase: string; path: string; rsc: string | null;
  prefetch: boolean; segment: boolean; status?: number; contentType?: string;
  attachment?: boolean; failed?: string;
};
type Report = {
  phase: string;
  checks: object[];
  requests: RequestRecord[];
  errors: BrowserEvent[];
};
const classify = (message: string) => {
  if (/parentNode/i.test(message)) return "parentNode";
  if (/#418|hydrat/i.test(message)) return "hydration";
  if (/access.control|cors/i.test(message)) return "access-control";
  if (/frame load interrupted/i.test(message)) return "frame-load-interrupted";
  if (/abort/i.test(message)) return "aborted";
  if (/cancel/i.test(message)) return "canceled";
  if (/analytics.*failed to load|_vercel\/insights\/script\.js/i.test(message)) return "analytics-fixture";
  if (/failed to load resource/i.test(message)) return "http-resource";
  return "unclassified";
};

export const test = base.extend<{ evidence: Report }>({
  evidence: [async ({ page, browser, browserName }, use, testInfo) => {
    const report: Report = { phase: "setup", checks: [], requests: [], errors: [] };
    const ids = new WeakMap();
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.origin !== "https://localhost:3641" || report.requests.length >= 250) return;
      if (!request.isNavigationRequest() && !url.searchParams.has("_rsc") && !url.pathname.endsWith(".csv")) return;
      const key = url.searchParams.get("_rsc");
      const headers = request.headers();
      const record = {
        id: report.requests.length + 1, phase: report.phase, path: url.pathname,
        rsc: key ? createHash("sha256").update(key).digest("hex").slice(0, 12) : null,
        prefetch: headers["next-router-prefetch"] === "1",
        segment: Boolean(headers["next-router-segment-prefetch"]),
      };
      report.requests.push(record);
      ids.set(request, record);
    });
    page.on("response", response => {
      const record = ids.get(response.request()) as RequestRecord | undefined;
      if (!record) return;
      record.status = response.status();
      record.contentType = (response.headers()["content-type"] ?? "").split(";")[0];
      record.attachment = /^attachment\b/i.test(response.headers()["content-disposition"] ?? "");
    });
    page.on("requestfailed", request => {
      const record = ids.get(request) as RequestRecord | undefined;
      if (record) record.failed = classify(request.failure()?.errorText ?? "");
    });
    page.on("pageerror", error => {
      if (report.errors.length < 100) report.errors.push({
        phase: report.phase, event: "pageerror", kind: classify(error.message),
      });
    });
    page.on("console", message => {
      if (message.type() === "error" && report.errors.length < 100) report.errors.push({
        phase: report.phase, event: "console", kind: classify(message.text()),
      });
    });
    await use(report);
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    await testInfo.attach("sanitized-browser-evidence", {
      contentType: "application/json",
      body: JSON.stringify({
        commit, requestedCommit: process.env.NPMTRAFFIC_QA_COMMIT ?? null,
        engine: browserName, browserVersion: browser.version(),
        os: platform(), osRelease: release(), project: testInfo.project.name,
        viewport: page.viewportSize(), functionalStatus: testInfo.status, ...report,
      }, null, 2),
    });
  }, { auto: true }],
});
export { expect };

export const packages = ["@angular/core", "axios", "react", "svelte", "vue"];
export const comparePath = "/compare?" + new URLSearchParams({ packages: packages.join(","), days: "30" });

export async function assertRoute(page: Page, path: string) {
  await expect(page).toHaveURL(url => url.pathname === path);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 }).first()).toBeVisible();
  if (path === "/p/react" || path === "/compare") {
    await expect(page.getByRole("img", { name: /daily downloads line chart/i })).toBeVisible();
  }
}

export async function historyToHome(page: Page, waitUntil: "domcontentloaded" | "load" = "domcontentloaded") {
  for (const path of ["/", "/p/react?days=30", comparePath, "/about", "/data"]) {
    const response = await page.goto(path, { waitUntil });
    expect(response?.status()).toBe(200);
  }
  await page.goBack({ waitUntil });
  await assertRoute(page, "/about");
  await page.goForward({ waitUntil });
  await assertRoute(page, "/data");
  await page.getByRole("banner").getByRole("link", { name: "npmtraffic home" }).click();
  await assertRoute(page, "/");
}

export function assertNoCriticalRuntimeErrors(report: Report) {
  expect(report.errors.filter(event => ["hydration", "parentNode"].includes(event.kind))).toEqual([]);
}
