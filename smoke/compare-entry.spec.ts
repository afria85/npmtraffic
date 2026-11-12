import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

test("compare can start empty, add and remove with the keyboard, and keep saved comparisons", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/v1/validate/audit-fixture-absent/exists", (route) => route.fulfill({
    status: 404, json: { exists: false },
  }));
  await page.goto("/compare?days=7");
  const field = page.getByRole("combobox", { name: "Add a package to compare" });
  await field.fill("invalid package");
  await field.press("Enter");
  await expect(page.getByText("Enter a valid npm package name.")).toBeVisible();
  await field.fill("audit-fixture-absent");
  await field.press("Enter");
  await expect(page.getByText("Package not found in the npm registry.")).toBeVisible();
  await field.fill("react");
  await field.press("ArrowDown");
  const active = await field.getAttribute("aria-activedescendant");
  expect(active).toBeTruthy();
  await expect(page.getByRole("option", { selected: true })).toContainText("react");
  const axe = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  await field.press("Enter");
  await expect(page.getByRole("button", { name: "Remove react", exact: true })).toBeVisible();
  await field.fill("react");
  await field.press("Enter");
  await expect(page.getByText("That package is already in the comparison.")).toBeVisible();
  await field.fill("@types/node");
  await field.press("Enter");
  await expect(page.getByRole("button", { name: "Remove @types/node", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/days=7$/);
  await page.getByRole("button", { name: "Save this comparison", exact: true }).click();
  await page.getByRole("button", { name: "Remove react", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Remove react", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "@types/node vs react (7d)", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("canonical identity drops the range while Open Graph keeps the selected share range", async ({ page }, testInfo) => {
  const image = page.locator('meta[property="og:image"]').first();
  await page.goto("/p/react?days=7");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://npmtraffic.com/p/react");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/p\/react\?days=7$/);
  await expect(image).toHaveAttribute("content", /\/og\/p\/.+\/7\.png$/);
  const packageImage = await page.request.get(new URL((await image.getAttribute("content"))!).pathname);
  expect(packageImage.ok()).toBe(true);
  expect(packageImage.headers()["content-type"]).toContain("image/png");
  const packagePng = await packageImage.body();
  expect(packagePng.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await writeFile(testInfo.outputPath("package-og.png"), packagePng);
  await page.goto("/compare?packages=vue,react&days=14");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://npmtraffic.com/compare?packages=react,vue");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /packages=react,vue&days=14$/);
  await expect(image).toHaveAttribute("content", /\/og\/compare\/.+\/14\.png$/);
  const comparisonImage = await page.request.get(new URL((await image.getAttribute("content"))!).pathname);
  expect(comparisonImage.ok()).toBe(true);
  expect(comparisonImage.headers()["content-type"]).toContain("image/png");
  const comparisonPng = await comparisonImage.body();
  expect(comparisonPng.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await writeFile(testInfo.outputPath("comparison-og.png"), comparisonPng);
  const legacyImage = await page.request.head("/og.png?type=package&pkg=react&days=7");
  expect(legacyImage.ok()).toBe(true);
  expect(legacyImage.headers()["content-type"]).toContain("image/png");
});
