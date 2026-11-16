import { expect, test } from "@playwright/test";

test("Package labels global MAD honestly and identifies UTC weekends in the unchanged daily table", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/p/integrity-fixture?days=7");

  await expect(page.getByText("Global MAD flags", { exact: true })).toBeVisible();
  await expect(page.getByText(/Weekly patterns may also be flagged/)).toBeVisible();

  const table = page.getByRole("table", { name: "Daily observations" });
  const weekendTags = table.locator("abbr[title$='weekend']");
  await expect(weekendTags).toHaveCount(2);
  await expect(weekendTags.filter({ hasText: "Sat" })).toHaveCount(1);
  await expect(weekendTags.filter({ hasText: "Sun" })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("Package metadata describes npmtraffic data and preserves intentional share/canonical URL distinction", async ({ page }) => {
  await page.goto("/p/react?days=30");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content", /UTC-anchored npm download observations for react/
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/p\/react$/);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/p\/react\?days=30$/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
    "content", /\/og\/p\/react\/30\.png$/
  );
});

test("Data documentation distinguishes global MAD flags from seasonal incidents", async ({ page }) => {
  await page.goto("/data");
  await expect(page.getByText(/MAD flags compare each available day with the overall median/)).toBeVisible();
});
