import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 900 }, hasTouch: true });

for (const [label, path, attachment] of [
  ["package", "/p/react?days=7", /^npmtraffic__react__7d__.*\.csv$/],
  ["compare", "/compare?packages=react,vue&days=7", /^npmtraffic__react__vue__7d__.*\.csv$/],
] as const) {
  test(`${label} export follows native tab order, dismisses, and downloads by touch`, async ({ page }) => {
    await page.goto(path);
    const trigger = page.locator('button[id$="-export-toggle"]');
    const first = page.getByRole("menuitem", { name: /^CSV\b/ });
    const share = page.getByRole("button", { name: "Share", exact: true });
    const more = page.getByRole("group", { name: /range selector/i }).getByRole("button", { name: /^(More|\d+d, current range)$/ });

    for (const [key, neighbor] of [["Tab", share], ["Shift+Tab", more]] as const) {
      await expect(trigger).toBeVisible();
      await expect(neighbor).toBeVisible();
      await trigger.focus();
      await expect(trigger).toBeFocused();
      await page.keyboard.press(key);
      await expect(neighbor).toBeFocused();
      await trigger.press("Enter");
      await expect(first).toBeFocused();
      await page.keyboard.press(key);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(first).toHaveCount(0);
      await expect(neighbor).toBeFocused();
    }

    await trigger.press("Enter");
    await expect(first).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(first).toHaveCount(0);

    await trigger.tap();
    await expect(first).toBeVisible();
    await page.locator("h1").tap();
    await expect(first).toHaveCount(0);

    await trigger.tap();
    await expect(first).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), first.tap()]);
    expect(download.suggestedFilename()).toMatch(attachment);
    expect(await download.failure()).toBeNull();
    await expect(first).toHaveCount(0);
  });
}
