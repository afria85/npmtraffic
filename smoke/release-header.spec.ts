import { expect, test } from "@playwright/test";

const compare = "/compare?packages=%40angular%2Fcore,axios,react,svelte,vue&days=30";

for (const [width, height] of [[312, 720], [320, 720], [390, 844]]) {
  // 312 is the effective width of WebKit's 320px viewport with its 8px scrollbar.
  test("Compare keeps a single reachable header row at " + width + "px", async ({ page, browserName }) => {
    test.skip(width === 312 && browserName === "webkit", "WebKit exercises the classic scrollbar at 320px");
    await page.setViewportSize({ width, height });
    await page.goto(compare);
    const banner = page.getByRole("banner");
    const chart = page.getByRole("img", { name: /Compare daily downloads line chart/ });
    await expect(chart).toBeVisible();
    const layout = await banner.evaluate(header => {
      const items = [...header.querySelectorAll("a, button")].map(el => el.getBoundingClientRect());
      const available = document.documentElement.clientWidth;
      return {
        height: header.getBoundingClientRect().height,
        noOverlap: items.every((item, index) => index === 0 || item.left >= items[index - 1].right - 1),
        targetsFit: items.every(item =>
          item.left >= 0 && item.right <= available + 1 && item.height >= 32 && item.width >= 24),
        noRootOverflow: document.documentElement.scrollWidth <= available,
      };
    });
    expect(layout.height).toBeLessThanOrEqual(64);
    expect(layout.noOverlap).toBe(true);
    expect(layout.targetsFit).toBe(true);
    expect(layout.noRootOverflow).toBe(true);
    if (height === 720) {
      const visible = await chart.evaluate(svg => {
        const box = svg.getBoundingClientRect();
        return (Math.min(innerHeight, box.bottom) - Math.max(0, box.top)) / box.height;
      });
      expect(visible).toBeGreaterThanOrEqual(0.42);
    }
    for (const name of ["npmtraffic home", "Compare", "About", "GitHub repository"]) {
      await page.keyboard.press("Tab");
      await expect(banner.getByRole("link", { name, exact: true })).toBeFocused();
    }
    const toggle = banner.getByRole("button", { name: "Toggle theme" });
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await expect(toggle).not.toHaveCSS("box-shadow", "none");
    await page.evaluate(() => scrollTo(0, 500));
    await expect.poll(() => banner.evaluate(el => el.getBoundingClientRect().top)).toBe(0);
  });
}

test.describe("mobile header touch", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 720 }, colorScheme: "light" });

  test("theme and About are both reachable and footer navigation stays named", async ({ page }) => {
    await page.goto(compare);
    const banner = page.getByRole("banner");
    await banner.getByRole("button", { name: "Toggle theme" }).tap();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await banner.getByRole("link", { name: "About", exact: true }).tap();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const footer = page.getByRole("contentinfo");
    for (const group of ["Product", "Resources", "Support"]) {
      await expect(footer.getByRole("navigation", { name: group })).toBeAttached();
    }
  });
});
