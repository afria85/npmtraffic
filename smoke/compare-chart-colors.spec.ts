import { expect, test, type Page } from "@playwright/test";

const path = "/compare?packages=angular,axios,react,typescript,vue&days=30";
const chart = (page: Page) => page.getByRole("img", { name: /Compare daily downloads line chart/i });
const paths = (page: Page) => chart(page).locator('path[stroke^="var(--chart-palette-"]');

async function colors(page: Page) {
  return paths(page).evaluateAll((lines) => lines.map((line) => line.getAttribute("stroke") ?? ""));
}

test("client-side Compare additions do not turn new series into repeated slate lines", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compare?packages=react,vue&days=30");
  await expect(paths(page)).toHaveCount(2, { timeout: 20_000 });

  for (const [index, name] of ["angular", "typescript", "axios"].entries()) {
    const input = page.getByRole("combobox", { name: "Add a package to compare" });
    await input.fill(name);
    await page.getByRole("option", { name: new RegExp("^" + name + "\\b", "i") }).first().click();
    await expect(page.getByRole("button", { name: "Remove " + name, exact: true })).toHaveCount(1, { timeout: 20_000 });
    await expect(paths(page)).toHaveCount(index + 3, { timeout: 20_000 });
    const assigned = await colors(page);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.filter((value) => value.includes("slate"))).toHaveLength(0);
  }
});

test("legacy five-package chart colors with repeated slate migrate once and remain unique after reload", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const selected = ["angular", "axios", "react", "typescript", "vue"];
    localStorage.setItem("npmtraffic_chart_settings:compare:" + selected.join("|"), JSON.stringify({
      colors: Object.fromEntries(selected.map((name) => [name, "slate"])),
      lineStyles: { angular: "dashed" },
    }));
  });
  await page.goto(path);
  await expect(paths(page)).toHaveCount(5, { timeout: 20_000 });
  const assigned = await colors(page);
  expect(new Set(assigned).size).toBe(5);
  expect(assigned.filter((value) => value.includes("slate"))).toHaveLength(1);
  await page.reload();
  await expect(paths(page)).toHaveCount(5);
  expect(new Set(await colors(page)).size).toBe(5);
});

test("manual color choices survive reload, including intentionally matching colors", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(path);
  await expect(paths(page)).toHaveCount(5, { timeout: 20_000 });
  await page.getByRole("button", { name: "Style", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Chart style" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "Color" }).nth(0).selectOption("slate");
  await dialog.getByRole("combobox", { name: "Color" }).nth(1).selectOption("slate");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(() => colors(page)).toEqual([
    "var(--chart-palette-slate)", "var(--chart-palette-slate)",
    "var(--chart-palette-pink)", "var(--chart-palette-blue)", "var(--chart-palette-emerald)",
  ]);
  await page.reload();
  await expect(paths(page)).toHaveCount(5, { timeout: 20_000 });
  const assigned = await colors(page);
  expect(assigned.slice(0, 2)).toEqual([
    "var(--chart-palette-slate)", "var(--chart-palette-slate)",
  ]);
});
