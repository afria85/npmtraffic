import { expect, test } from "@playwright/test";
import { join } from "node:path";

const six = "react,vue,svelte,angular,axios,next";
const formats = [
  ["CSV", ".csv"],
  ["Excel CSV", ".excel.csv"],
  ["JSON", ".json"],
] as const;

for (const width of [320, 390, 768]) {
  test(`compare export notice and saved filenames at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    // Vercel injects this script in Preview. The local Next.js server has no analytics endpoint.
    await page.route("**/_vercel/insights/script.js", route => route.fulfill({ contentType: "text/javascript", body: "" }));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`/compare?packages=${six}&days=7`);
    const trigger = page.getByRole("button", { name: "Export comparison data", exact: true });
    expect(await trigger.count()).toBe(1);
    const notice = page.getByText("This export includes 5 of 6 distinct requested packages. Five-package limit: 1 omitted.");
    await expect(notice).toBeVisible();
    await expect(trigger).toHaveAccessibleDescription(await notice.textContent() ?? "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const firstItem = page.getByRole("menuitem", { name: /^CSV\b/ });
    await trigger.press("Enter");
    await expect(firstItem).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    for (const [label, extension] of formats) {
      await trigger.press("Enter");
      await expect(firstItem).toBeFocused();
      const link = page.getByRole("menuitem", { name: new RegExp(`^${label}\\b`) });
      if (label === "Excel CSV") await page.keyboard.press("ArrowDown");
      if (label === "JSON") await page.keyboard.press("End");
      await expect(link).toBeFocused();
      if (label === "CSV") await page.screenshot({ path: testInfo.outputPath("compare-export-menu.png") });
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      const response = await request.get(href!);
      expect(response.ok()).toBe(true);
      const filename = await link.getAttribute("download");
      expect(filename).toMatch(/__truncated-5-of-6__/);
      expect(filename?.endsWith(extension)).toBe(true);
      expect(response.headers()["content-disposition"]).toBe(`attachment; filename="${filename}"`);
      const [download] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
      expect(download.suggestedFilename()).toBe(filename);
      await download.saveAs(join(testInfo.outputDir, download.suggestedFilename()));
      expect(await download.failure()).toBeNull();
    }
    expect(errors).toEqual([]);
  });
}

test("compare omission reasons survive range navigation and unavailable names stay out of filenames", async ({ page }) => {
  const params = new URLSearchParams({ packages: "react,vue,missing-export-fixture,invalid name,REACT", days: "7" });
  await page.goto(`/compare?${params}`);
  const trigger = page.getByRole("button", { name: "Export comparison data", exact: true });
  const summary = "This export includes 2 of 4 distinct requested packages. Invalid package names: 1. Packages not found: 1. Duplicate entries ignored: 1.";
  await expect(trigger).toHaveAccessibleDescription(summary);
  await page.getByRole("link", { name: "14d", exact: true }).click();
  await expect(page).toHaveURL(/days=14/);
  await expect(trigger).toHaveAccessibleDescription(summary);
  await trigger.click();
  await expect(page.getByRole("menuitem", { name: /^CSV\b/ })).toHaveAttribute("download", /^npmtraffic__react__vue__partial-2-of-4__14d__/);
});

test("shortened downloads retain the truncation marker after saving", async ({ page }) => {
  const query = new URLSearchParams({ packages: "a".repeat(214) + "," + six, days: "7" });
  await page.goto(`/compare?${query}`);
  await page.getByRole("button", { name: "Export comparison data", exact: true }).click();
  const link = page.getByRole("menuitem", { name: /^Excel CSV\b/ });
  const filename = await link.getAttribute("download");
  expect(filename).toHaveLength(180);
  expect(filename).toMatch(/__[0-9a-f]{16}__truncated-5-of-7__7d__.+__utc\.excel\.csv$/);
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  expect(download.suggestedFilename()).toBe(filename);
  expect(await download.failure()).toBeNull();
});
