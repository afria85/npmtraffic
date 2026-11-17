import { expect, test } from "@playwright/test";

for (const [width, height] of [[320, 720], [390, 844]]) {
  test(`reverse tabbing keeps Compare scale focus clear of the sticky header at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/compare?packages=react,vue,axios,svelte,%40angular%2Fcore&days=30");
    const absolute = page.getByRole("button", { name: "Absolute", exact: true });
    const indexed = page.getByRole("button", { name: "Indexed (base 100)", exact: true });
    await expect(indexed).toBeVisible();

    // Recreate reverse navigation with the scale controls scrolled under the header.
    await indexed.evaluate(element => {
      element.focus();
      window.scrollBy(0, element.getBoundingClientRect().top);
    });
    await expect(indexed).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(absolute).toBeFocused();
    await expect.poll(() => absolute.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return element.contains(hit);
    })).toBe(true);
    if (process.env.PLAYWRIGHT_CAPTURE_FOCUS === "1") {
      await page.screenshot({ path: testInfo.outputPath("compare-focus.png") });
    }
  });
}
