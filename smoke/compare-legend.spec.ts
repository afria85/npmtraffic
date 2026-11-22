import { expect, test } from "@playwright/test";

const familiar = ["angular", "axios", "react", "svelte", "vue"];
const scoped = ["@angular/core", "@scope/long-scoped-fixture-with-a-readable-name", "axios", "react", "vue"];
const compare = (packages: string[]) => "/compare?" + new URLSearchParams({ packages: packages.join(","), days: "30" });

// WebKit's classic scrollbar leaves less room for the existing header and toolbar
// at narrow widths. Keep an absolute first-viewport guard for both layouts.
for (const { width, height, minimum, webKitMinimum } of [
  { width: 320, height: 720, minimum: [0.42, 0.21], webKitMinimum: [0.30, 0.075] },
  { width: 390, height: 844, minimum: [0.95, 0.85], webKitMinimum: [0.94, 0.70] },
  { width: 768, height: 1024, minimum: [0.98, 0.98], webKitMinimum: [0.98, 0.98] },
  { width: 1440, height: 900, minimum: [0.98, 0.98], webKitMinimum: [0.98, 0.98] },
]) {
  test("Compare retains usable plot height and five identified series at " + width + "px", async ({ page, browserName }) => {
    await page.setViewportSize({ width, height });
    const limits = browserName === "webkit" ? webKitMinimum : minimum;
    for (const [index, packages] of [familiar, scoped].entries()) {
      await page.emulateMedia({ colorScheme: packages === scoped ? "dark" : "light", reducedMotion: "reduce" });
      await page.goto(compare(packages));
      const chart = page.getByRole("img", { name: /Compare daily downloads line chart/ });
      const list = page.getByRole("list", { name: "Chart series" });
      await expect(list.getByRole("listitem")).toHaveCount(5);
      for (const name of packages) {
        const item = list.getByRole("listitem").filter({ has: page.getByText(name, { exact: true }) });
        await expect(item.getByText(/^(solid|dashed|dotted) line$/)).toBeAttached();
      }
      await expect.poll(() => chart.evaluate(svg => {
        const bounds = svg.getBoundingClientRect();
        return Math.max(0, Math.min(innerHeight, bounds.bottom) - Math.max(0, bounds.top)) / bounds.height;
      })).toBeGreaterThanOrEqual(limits[index]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}

test("the narrow legend scrolls by keyboard and keeps its focus while paging", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(compare(scoped));
  const legend = page.getByRole("region", { name: "Chart legend" });
  const button = page.getByRole("button", { name: /Scroll legend (right|left)/ });
  await expect(button).toBeVisible();
  await page.getByRole("button", { name: "Indexed (base 100)" }).focus();
  await page.keyboard.press("Tab");
  await expect(legend).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => legend.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await button.press("Enter");
  await expect(button).toBeFocused();

  const inspector = page.getByRole("slider", { name: "Inspect daily downloads" });
  await inspector.press("Home");
  const tooltip = page.locator("[data-chart-tooltip]");
  await expect(tooltip).toBeVisible();
  const [legendBox, tooltipBox] = await Promise.all([legend.boundingBox(), tooltip.boundingBox()]);
  expect(tooltipBox!.y).toBeGreaterThanOrEqual(legendBox!.y + legendBox!.height);
});

test.describe("touch legend paging", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 720 } });

  test("touch reaches the last package and can return to earlier series", async ({ page }) => {
    await page.goto(compare(scoped));
    const legend = page.getByRole("region", { name: "Chart legend" });
    const pager = page.getByRole("button", { name: /Scroll legend (right|left)/ });
    await expect(pager).toHaveAccessibleName("Scroll legend right");
    for (let step = 0; step < 4; step++) {
      const { offset, remaining } = await legend.evaluate(el => ({
        offset: el.scrollLeft,
        remaining: el.scrollWidth - el.clientWidth - el.scrollLeft,
      }));
      if (remaining <= 1) break;
      await pager.tap();
      await expect.poll(() => legend.evaluate(el => el.scrollLeft)).toBeGreaterThan(offset);
    }
    await expect(pager).toHaveAccessibleName("Scroll legend left");
    await expect.poll(() => legend.getByText("vue", { exact: true }).evaluate(last => {
      const a = last.getBoundingClientRect();
      const b = last.closest("[aria-label='Chart legend']")!.getBoundingClientRect();
      return a.left >= b.left - 1 && a.right <= b.right + 1;
    })).toBe(true);
    const end = await legend.evaluate(el => el.scrollLeft);
    await pager.tap();
    await expect.poll(() => legend.evaluate(el => el.scrollLeft)).toBeLessThan(end);
  });
});
