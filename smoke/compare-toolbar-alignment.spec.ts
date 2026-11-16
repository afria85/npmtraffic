import { expect, test } from "@playwright/test";

const comparison = "/compare?packages=angular,react,typescript,vue&days=30";

for (const width of [320, 390, 768, 1440]) {
  test("Compare export and share align with range actions at " + width + "px", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.goto(comparison);
    const range = page.getByRole("group", { name: /range selector/i })
      .getByRole("link", { name: "7d" });
    const exportButton = page.getByRole("button", { name: "Export comparison data" });
    const shareButton = page.getByRole("button", { name: "Share", exact: true });
    await expect(range).toBeVisible();
    await expect(exportButton).toBeVisible();
    await expect(shareButton).toBeVisible();

    const geometry = await page.evaluate(() => {
      const range = document.querySelector('[role="group"][aria-label="RANGE selector"] a')!;
      const exportButton = document.querySelector('button[aria-label="Export comparison data"]')!;
      const shareButton = document.querySelector('button[aria-label="Share"]')!;
      const toolbar = range.closest(".observatory-toolbar")!;
      const bounds = (node: Element) => {
        const { top, bottom, left, right } = node.getBoundingClientRect();
        return { top, bottom, left, right };
      };
      return {
        range: bounds(range),
        exported: bounds(exportButton),
        shared: bounds(shareButton),
        toolbar: bounds(toolbar),
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(geometry.documentOverflow).toBe(false);
    expect(Math.abs(geometry.exported.bottom - geometry.shared.bottom)).toBeLessThanOrEqual(2);

    if (geometry.exported.top < geometry.range.bottom - 2) {
      // When the toolbar fits on one line, all actions share a visual baseline.
      expect(Math.abs(geometry.exported.bottom - geometry.range.bottom)).toBeLessThanOrEqual(2);
      expect(geometry.exported.left).toBeGreaterThanOrEqual(geometry.range.right + 4);
    } else {
      // When the toolbar wraps, actions must follow the range row.
      expect(geometry.exported.top).toBeGreaterThanOrEqual(geometry.range.bottom - 2);
    }
    expect(geometry.shared.right).toBeLessThanOrEqual(geometry.toolbar.right + 1);
  });
}
