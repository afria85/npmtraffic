import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test("Compare keeps the chart above the hydrated tray at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.goto("/compare?packages=react,vue&days=365");
    const chart = page.getByRole("img", { name: /daily downloads line chart/i });
    const tray = page.getByTestId("compare-tray-container");
    await expect(chart).toBeVisible({ timeout: 20_000 });
    await expect(tray.getByRole("button", { name: "Remove react from compare" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Daily observations", exact: true }).locator("tbody tr")).toHaveCount(365);
    const geometry = await tray.evaluate(element => {
      const main = document.querySelector("main")!;
      return {
        afterContent: Boolean(main.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        belowContent: element.getBoundingClientRect().top >= main.getBoundingClientRect().bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry).toEqual({ afterContent: true, belowContent: true, overflow: false });
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect.poll(() => tray.evaluate(element => Boolean(
      document.querySelector("main")!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ))).toBe(true);
    await expect(tray).toHaveCount(1);
  });
}

test("tray focus survives both viewport transitions with six saved comparisons", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    const items = [7, 14, 30, 90, 180, 365].map(days => ({ packages: ["react", "vue"], days }));
    localStorage.setItem("npmtraffic:saved-comparisons", JSON.stringify({ version: 1, items }));
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const route = "/compare?packages=react,vue&days=365";
  await page.goto(route);
  const tray = page.getByTestId("compare-tray-container");
  const react = tray.getByRole("button", { name: "Remove react from compare" });
  const vue = tray.getByRole("button", { name: "Remove vue from compare" });
  const region = page.getByRole("region", { name: "Saved comparisons" });
  const saved = region.getByRole("listitem");
  const chart = page.getByRole("img", { name: /daily downloads line chart/i });
  await expect(chart).toBeVisible({ timeout: 20_000 });
  await expect(saved).toHaveCount(6);
  expect(await region.evaluate(saved => {
    const chart = document.querySelector('svg[aria-label*="daily downloads line chart"]')!;
    return Boolean(chart.compareDocumentPosition(saved) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await react.focus();
  await page.keyboard.press("Tab");
  await expect(vue).toBeFocused();

  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(page.locator("#compare-tray-after-content").getByTestId("compare-tray-container")).toHaveCount(1);
  await expect(vue).toBeFocused();

  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator("#compare-tray-after-content").getByTestId("compare-tray-container")).toHaveCount(1);
  await expect(vue).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(tray.getByRole("button", { name: "Clear compare selection" })).toBeFocused();
  await expect(tray).toHaveCount(1);
  await expect(saved).toHaveCount(6);
  await page.reload();
  await expect(saved).toHaveCount(6);
  await expect(tray).toHaveCount(1);
  expect(errors.filter(error => /hydration|#418|parentNode/i.test(error))).toEqual([]);
});
