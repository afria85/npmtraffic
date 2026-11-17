import { expect, test } from "@playwright/test";

// This guard runs in mandatory Chromium CI. WebKit execution and trust-level
// diagnostic traces are separate because the protected Preview requires login.
for (const width of [320, 1280]) {
  test(`Home to React still navigates after history traversal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 720 : 900 });
    await page.goto("/");
    await page.goto("/p/react?days=30");
    await page.goto("/compare?packages=react,vue&days=30");
    await page.goto("/about");
    await page.goto("/data");

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/about$/);
    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/data$/);

    await page.getByRole("banner").getByRole("link", { name: "npmtraffic home" }).click();
    await expect(page).toHaveURL(/\/$/);
    const link = page.getByRole("main").getByRole("link", { name: "react", exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/p\/react(?:\?|$)/);
    await expect(page.getByRole("img", { name: /daily downloads line chart/i })).toBeVisible();
  });
}
