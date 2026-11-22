import AxeBuilder from "@axe-core/playwright";
import { test, expect, packages, comparePath, assertRoute, historyToHome, assertNoCriticalRuntimeErrors } from "./browser-fixture";

for (const [width, height] of [[320, 720], [390, 844]]) {
  test("simulated mobile navigation, charts and CSV at " + width + "px", async ({ page, evidence }, testInfo) => {
    await page.setViewportSize({ width, height });
    evidence.phase = "history";
    await historyToHome(page);
    evidence.phase = "home-react";
    await page.getByRole("main").getByRole("link", { name: "react", exact: true }).tap();
    await assertRoute(page, "/p/react");
    await page.reload();
    await assertRoute(page, "/p/react");

    evidence.phase = "ranges";
    for (const days of [7, 30, 365]) {
      await page.goto("/p/react?days=" + days);
      await expect(page.getByRole("img", { name: new RegExp("line chart \\(" + days + " days\\)") })).toBeVisible();
      evidence.checks.push({ packageRange: days, chart: true });
    }

    evidence.phase = "compare";
    await page.goto(comparePath);
    await assertRoute(page, "/compare");
    const legend = page.getByRole("list", { name: "Chart series" });
    await expect(legend.getByRole("listitem")).toHaveCount(packages.length);
    for (const name of packages) await expect(legend.getByText(name, { exact: true })).toBeAttached();
    const indexed = page.getByRole("button", { name: "Indexed (base 100)", exact: true });
    await indexed.tap();
    await expect(indexed).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Each package equals 100 on .* UTC/)).toBeVisible();
    await page.getByRole("button", { name: "Absolute", exact: true }).tap();
    const region = page.getByRole("region", { name: "Chart legend" });
    const pager = page.getByRole("button", { name: "Scroll legend right" });
    await pager.tap();
    await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    const inspection = page.getByRole("slider", { name: "Inspect daily downloads" });
    await inspection.press("End");
    await expect(inspection).toBeFocused();
    await expect(inspection).toHaveAttribute("aria-valuetext", /UTC|2026|react/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    evidence.phase = "csv";
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/compare.csv");
    await page.locator('button[id$="-export-toggle"]').tap();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: /^CSV\b/ }).tap();
    const [download, response] = await Promise.all([downloadPromise, responsePromise]);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toMatch(/^attachment/);
    expect(download.suggestedFilename()).toMatch(/^npmtraffic__.+__30d__\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}__utc\.csv$/);
    expect(await download.failure()).toBeNull();
    const stream = await download.createReadStream();
    const chunks = [];
    let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      expect(size).toBeLessThan(65_536);
      chunks.push(chunk);
    }
    const csv = Buffer.concat(chunks).toString("utf8");
    expect(csv).toContain("# timezone=UTC");
    expect(csv).toMatch(/date,/);
    for (const name of packages) expect(csv).toContain(name);
    evidence.checks.push({ csvBytes: size, csvFilename: download.suggestedFilename(), responseStatus: response.status() });

    evidence.phase = "themes";
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme as "light" | "dark" });
      await page.reload();
      await assertRoute(page, "/compare");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("contentinfo").getByRole("link", { name: "GitHub", exact: true }))
        .toHaveAttribute("href", "https://github.com/afria85/npmtraffic.git");
      await page.screenshot({ path: testInfo.outputPath("compare-" + theme + ".png") });
    }
    assertNoCriticalRuntimeErrors(evidence);
  });
}

test("simulated mobile Home, Package and Compare automated accessibility", async ({ page, evidence }) => {
  for (const path of ["/", "/p/react?days=30", comparePath]) {
    evidence.phase = "axe-" + new URL(path, "https://localhost:3641").pathname;
    await page.goto(path);
    await assertRoute(page, new URL(path, "https://localhost:3641").pathname);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const findings = result.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length }));
    evidence.checks.push({ route: new URL(path, "https://localhost:3641").pathname, axe: findings });
    expect(findings.filter(({ impact }) => impact === "critical" || impact === "serious")).toEqual([]);
  }
  assertNoCriticalRuntimeErrors(evidence);
});
