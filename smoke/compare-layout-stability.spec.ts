import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768]) {
  test("Compare keeps the chart above the hydrated tray at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.goto("/compare?packages=react,vue&days=365");
    const chart = page.getByRole("img", { name: /daily downloads line chart/i });
    const tray = page.getByTestId("compare-tray-container");
    await expect(chart).toBeVisible({ timeout: 20_000 });
    await expect(tray.getByRole("button", { name: "Remove react from compare" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(365);
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
      element.compareDocumentPosition(document.querySelector("main")!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ))).toBe(true);
    await expect(tray).toHaveCount(1);
  });
}
