import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, viewport: { width: 390, height: 900 } });

for (const days of [7, 30, 365]) {
  for (const route of ["package", "comparison"] as const) {
    test(route + " chart can inspect " + days + " daily observations", async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(route === "package"
        ? "/p/integrity-fixture?days=" + days
        : "/compare?packages=integrity-fixture,react&days=" + days);
      const chart = page.getByRole("img", { name: /daily downloads line chart/i });
      await expect(chart).toBeVisible({ timeout: 20_000 });
      const section = chart.locator("xpath=ancestor::section[1]");
      const tooltip = section.locator("[data-chart-tooltip]");
      await chart.scrollIntoViewIfNeeded();
      const box = await chart.boundingBox();
      if (!box) throw new Error("Chart has no bounds");
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await expect(tooltip).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(tooltip).toHaveCount(0);

      const control = section.getByRole("slider", { name: "Inspect daily downloads" });
      await expect(control).toHaveCount(1);
      await expect(control).toHaveAttribute("max", String(days - 1));
      await control.focus();
      await expect(control).toBeFocused();
      await expect(control).toHaveAttribute("aria-valuetext", /\d{4}-\d{2}-\d{2} UTC, integrity-fixture: 0 downloads/);
      await expect(tooltip.getByText("0", { exact: true })).toBeVisible();
      const first = await control.getAttribute("aria-valuetext");
      const announcement = section.getByRole("status");
      await expect(announcement).toHaveText(first!);
      await expect(control).toHaveAccessibleDescription(first!);
      if (route === "comparison") expect(first).toMatch(/react: [\d,]+ downloads/);
      await page.keyboard.press("ArrowRight");
      await expect(control).toHaveValue("1");
      await page.keyboard.press("ArrowUp");
      await expect(control).toHaveValue("2");
      await expect(control).toHaveAttribute("aria-valuetext", /integrity-fixture: missing/);
      if (route === "comparison") {
        await expect(control).toHaveAttribute("aria-valuetext", /react: excluded from the shared comparison/);
      }
      await page.keyboard.press("ArrowRight");
      await expect(control).toHaveAttribute("aria-valuetext", /integrity-fixture: unverified/);
      await expect(announcement).toContainText("integrity-fixture: unverified");
      await page.keyboard.press("ArrowLeft");
      await expect(control).toHaveValue("2");
      await page.keyboard.press("ArrowDown");
      await expect(control).toHaveValue("1");
      await page.keyboard.press("End");
      await expect(control).toHaveValue(String(days - 1));
      await expect(control).not.toHaveAttribute("aria-valuetext", first!);
      await page.keyboard.press("Escape");
      await expect(tooltip).toHaveCount(0);
      await expect(control).toBeFocused();
      await page.keyboard.press("End");
      await expect(tooltip).toBeVisible();
      await page.keyboard.press("Home");
      await expect(control).toHaveAttribute("aria-valuetext", first!);
      if (days === 365) await section.screenshot({ path: info.outputPath("keyboard-observation.png") });
      await page.keyboard.press("Tab");
      await expect(control).not.toBeFocused();
      await expect(tooltip).toHaveCount(0);
      await expect(page.locator("tbody tr")).toHaveCount(days);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      expect(errors).toEqual([]);
    });
  }
}
