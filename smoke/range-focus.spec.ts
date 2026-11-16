import { expect, test } from "@playwright/test";

test("mobile More restores focus across selection, chart updates and history", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/react?days=7");
  await expect(page.getByRole("img", { name: /line chart \(7 days\)/i })).toBeVisible({ timeout: 15_000 });
  const group = page.getByRole("group", { name: /range selector/i });
  const more = group.getByRole("button", { name: "More" });
  await more.press("Enter");
  const menu = group.getByRole("menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "30d" }).press("Escape");
  await expect(more).toBeFocused();
  await expect(menu).toHaveCount(0);
  await more.press("Enter");
  await menu.getByRole("menuitem", { name: "30d" }).press("Enter");
  await expect(page).toHaveURL(/days=30$/);
  await expect(page.getByRole("img", { name: /line chart \(30 days\)/i })).toBeVisible();
  await expect(more).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("restored-range-focus.png") });
  await page.goBack();
  await expect(page).toHaveURL(/days=7$/);
  await expect(page.getByRole("img", { name: /line chart \(7 days\)/i })).toBeVisible();
  await expect(more).toBeFocused();
  await more.press("ArrowDown");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
  await expect(group.getByRole("link", { name: "30d" })).toBeVisible();
});

test("desktop range menu supports arrows and dismisses without trapping Tab", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 844 });
  await page.goto("/compare?packages=react,vue&days=365");
  await expect(page.getByRole("img", { name: /line chart \(365 days\)/i })).toBeVisible({ timeout: 15_000 });
  const more = page.getByRole("group", { name: /range selector/i }).getByRole("button", { name: "More" });
  await more.press("ArrowUp");
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem").last()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem", { name: "180d" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu).toHaveCount(0);
  await expect(more).not.toBeFocused();
});

test.describe("touch range selection", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("preserves the comparison query and loads the selected range", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/compare?packages=react,vue&days=7");
    // Compare owns the inline picker; the global tray is intentionally hidden here.
    await expect(page.getByRole("combobox", { name: "Add a package to compare" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);
    await page.getByRole("group", { name: /range selector/i }).getByRole("button", { name: "More" }).tap();
    await page.getByRole("menuitem", { name: "90d" }).tap();
    await expect(page).toHaveURL(/packages=react,vue&days=90$/, { timeout: 20_000 });
    await expect(page.getByRole("img", { name: /line chart \(90 days\)/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});

for (const width of [320, 390]) {
  test("More renders its keyboard focus ring inside the scroller at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/p/react?days=7");
    const group = page.getByRole("group", { name: /range selector/i });
    await group.getByRole("link", { name: "14d", exact: true }).focus();
    await page.keyboard.press("Tab");
    const more = group.getByRole("button", { name: "More", exact: true });
    await expect(more).toBeFocused();
    await expect(more).toHaveCSS("outline-offset", "-2px");
    await expect(more).toHaveCSS("outline-width", "2px");
    await expect(more).toHaveCSS("outline-style", "solid");
    expect(await more.evaluate(button => {
      const scroller = button.closest<HTMLElement>(".overflow-x-auto")!;
      scroller.style.width = "130px";
      scroller.scrollLeft = scroller.scrollWidth;
      return { overflow: getComputedStyle(scroller).overflowX, scrolled: scroller.scrollLeft > 0 };
    })).toEqual({ overflow: "auto", scrolled: true });
  });
}
