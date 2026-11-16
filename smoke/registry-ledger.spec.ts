import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const five = "/compare?packages=angular,axios,react,svelte,vue&days=365";
const packageRoute = "/p/react?days=365";
const plot = (page: Page) => page.getByRole("img", { name: /daily downloads line chart/i });

for (const [width, height] of [[320, 720], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
  test(`registry ledger fits both plots and keeps essential controls at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme: width === 390 || width === 1024 ? "dark" : "light", reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of [packageRoute, five]) {
      await page.goto(route);
      const chart = plot(page);
      await expect(chart).toBeVisible({ timeout: 20_000 });
      const geometry = await chart.evaluate(svg => {
        const main = svg.closest("main")!;
        const nextSection = [...main.querySelectorAll("h2")].find(heading =>
          /^(Insights|Downloads on shared days)$/.test(heading.textContent ?? ""));
        const rect = svg.getBoundingClientRect();
        return {
          chartTop: rect.top + window.scrollY,
          plotBeforeAnalysis: Boolean(nextSection && svg.compareDocumentPosition(nextSection) & Node.DOCUMENT_POSITION_FOLLOWING),
          documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      expect(geometry.plotBeforeAnalysis).toBe(true);
      expect(geometry.chartTop).toBeLessThan(height);
      expect(geometry.documentOverflow).toBe(false);
      await expect(page.getByRole("button", { name: "More", exact: true })).toBeVisible();
      const slider = page.getByRole("slider", { name: /inspect daily downloads/i });
      await slider.press("Home");
      const start = await slider.getAttribute("aria-valuetext");
      await slider.press("End");
      await expect(slider).not.toHaveAttribute("aria-valuetext", start!);
      expect(errors).toEqual([]);
    }
  });
}

test("scoped identifiers and shared totals reflow with 200 percent text size", async ({ page }) => {
  test.setTimeout(60_000);
  const name = "@scope/" + "long-identifier-".repeat(6) + "package";
  const comparison = new URLSearchParams({ packages: `${name},react`, days: "7" });
  await page.setViewportSize({ width: 320, height: 820 });
  for (const route of ["/", `/p/${encodeURIComponent(name)}?days=7`, `/compare?${comparison}`]) {
    await page.goto(route);
    if (route !== "/") await plot(page).waitFor();
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (route.startsWith("/compare")) {
      const totals = page.getByRole("table", { name: "Downloads on shared days" });
      await expect(totals.getByRole("rowheader", { name, exact: true })).toBeVisible();
    } else if (route.startsWith("/p/")) {
      await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole("combobox", { name: "Search npm packages" })).toBeVisible();
    }
  }
});

test("ledger labels and provenance pass automated contrast and name checks", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(five);
    await plot(page).waitFor();
    await expect(page.getByRole("table", { name: "Downloads on shared days" })).toBeVisible();
    await expect(page.getByText("dashed line", { exact: true }).first()).toBeAttached();
    const result = await new AxeBuilder({ page }).include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
});


test("home puts package search inside the first 320px reading viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search npm packages" });
  await expect(search).toBeInViewport();
  await expect(page.getByRole("link", { name: "Compare packages" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Verified count" })).toBeVisible();
});
