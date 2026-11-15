import { expect, test } from "@playwright/test";

test("inline search resets on Escape and keeps the selected package through refresh", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("npmtraffic:recent", JSON.stringify(["react", "react-custom"])));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/search?*", async route => {
    await gate;
    await route.fulfill({ json: { items: [{ name: "react" }, { name: "react-dom" }, { name: "REACT-CUSTOM" }, { name: "react-test" }, { name: "react-test" }] } });
  });
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Toggle theme" }).press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const field = page.getByRole("combobox", { name: "Search npm packages" });
    await field.fill("react");
    const active = page.getByRole("option", { selected: true });
    await field.press("ArrowDown");
    await expect(active).toHaveText("reactPopular");
    await field.press("Escape");
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("aria-expanded", "false");
    await expect(field).not.toHaveAttribute("aria-activedescendant", /.+/);
    await field.press("ArrowDown");
    await expect(active).toHaveText("reactPopular");
    await field.press("ArrowUp");
    await expect(active).toHaveText("reactPopular");
    await field.press("ArrowDown");
    await field.press("ArrowDown");
    await expect(active).toHaveText("react-customRecent");
    const previous = await field.getAttribute("aria-activedescendant");
    release();
    await expect(page.getByRole("option")).toHaveCount(4);
    await expect(field).toHaveAttribute("aria-activedescendant", previous!);
    await expect(active).toHaveText("react-customRecent");
    await field.press("ArrowDown");
    await expect(active).toHaveText("react-test");
    const apiSelection = await field.getAttribute("aria-activedescendant");
    await page.evaluate(() => {
      localStorage.setItem("npmtraffic:recent", JSON.stringify(["react-new", "react-custom"]));
      window.dispatchEvent(new Event("npmtraffic:recent-updated"));
    });
    await expect(page.getByRole("option")).toHaveCount(5);
    await expect(field).toHaveAttribute("aria-activedescendant", apiSelection!);
    await expect(active).toHaveText("react-test");
    await page.screenshot({ path: testInfo.outputPath("keyboard-selection.png") });
    await field.press("ArrowUp");
    await expect(active).toHaveText("react-customRecent");
    await field.press("ArrowUp");
    await field.press("ArrowUp");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/p\/react-dom\?days=30$/);
  } finally {
    release();
  }
});

test("modal Escape closes suggestions before the dialog and reopening resets selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/react?days=7");
  const trigger = page.getByRole("button", { name: "Search another package" });
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Search packages" });
  const field = dialog.getByRole("combobox", { name: "Search npm packages" });
  await expect(field).toBeFocused();
  await field.press("ArrowDown");
  await expect(dialog.getByRole("option", { selected: true })).toBeVisible();
  await field.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(field).toBeFocused();
  await expect(field).not.toHaveAttribute("aria-activedescendant", /.+/);
  await field.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await expect(field).toBeFocused();
  await field.press("ArrowDown");
  const first = dialog.getByRole("option").first();
  await expect(first).toHaveAttribute("aria-selected", "true");
});
