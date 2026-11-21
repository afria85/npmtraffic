import { expect, test } from "@playwright/test";

const route = "/compare?packages=react,vue&days=365";

for (const width of [320, 390, 768, 1440]) {
  test("Compare has one package picker, not an extra tray, at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.goto(route);

    const chart = page.getByRole("img", { name: /daily downloads line chart/i });
    const input = page.getByRole("combobox", { name: "Add a package to compare" });
    await expect(chart).toBeVisible({ timeout: 20_000 });
    await expect(input).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove react", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Remove vue", exact: true })).toHaveCount(1);
    await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);

    await expect(page.getByRole("table", { name: "Daily observations", exact: true }).locator("tbody tr")).toHaveCount(365);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);
    await expect(input).toBeVisible();
  });
}

test("inline Compare picker retains focus and saved comparisons across reflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    const items = [7, 14, 30, 90, 180, 365].map(days => ({ packages: ["react", "vue"], days }));
    localStorage.setItem("npmtraffic:saved-comparisons", JSON.stringify({ version: 1, items }));
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(route);

  const react = page.getByRole("button", { name: "Remove react", exact: true });
  const vue = page.getByRole("button", { name: "Remove vue", exact: true });
  const input = page.getByRole("combobox", { name: "Add a package to compare" });
  const region = page.getByRole("region", { name: "Saved comparisons" });
  const saved = region.getByRole("listitem");
  await expect(page.getByRole("img", { name: /daily downloads line chart/i })).toBeVisible({ timeout: 20_000 });
  await expect(saved).toHaveCount(6);
  await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);

  await react.focus();
  await page.keyboard.press("Tab");
  await expect(vue).toBeFocused();

  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(vue).toBeFocused();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(vue).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();

  await page.reload();
  await expect(saved).toHaveCount(6);
  await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);
  expect(errors.filter(error => /hydration|#418|parentNode/i.test(error))).toEqual([]);
});

test("global tray remains available outside Compare and disappears on entering Compare", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("npmtraffic:compare", JSON.stringify(["react", "vue"]));
  });
  await page.goto("/p/react?days=7");
  const tray = page.getByTestId("compare-tray-container");
  await expect(tray).toBeVisible({ timeout: 15_000 });
  await expect(tray.getByRole("button", { name: "Remove react from compare" })).toBeVisible();

  await tray.getByRole("link", { name: "Compare (2)" }).click();
  await expect(page).toHaveURL(/\/compare\?packages=react,vue&days=30$/);
  await expect(page.getByRole("combobox", { name: "Add a package to compare" })).toBeVisible();
  await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);
  await expect(page.getByRole("img", { name: /daily downloads line chart/i })).toBeVisible();
});

test("empty Compare also uses the inline picker without an unrelated saved tray", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("npmtraffic:compare", JSON.stringify(["react", "vue"]));
  });
  await page.goto("/compare");
  await expect(page.getByRole("combobox", { name: "Add a package to compare" })).toBeVisible();
  await expect(page.getByTestId("compare-tray-container")).toHaveCount(0);
});
