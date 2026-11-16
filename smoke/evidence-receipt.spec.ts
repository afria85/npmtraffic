import { expect, test } from "@playwright/test";

test("home links to the scoped Angular package", async ({ page }) => {
  await page.goto("/");
  const angular = page.getByRole("link", { name: "@angular/core", exact: true });
  await expect(angular).toHaveAttribute("href", /\/p\/%40angular%2Fcore(?:\?|$)/);
  await angular.click();
  await expect(page.getByRole("heading", { level: 1, name: "@angular/core", exact: true })).toBeVisible();
});

test("receipt distinguishes requested range, confirmed coverage and source", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/p/integrity-fixture?days=7");
  const receipt = page.locator("details.observatory-coverage");
  const summary = receipt.locator("summary");
  await expect(summary).toContainText("5 of 7 days included.");
  await expect(summary).toContainText("1 missing. 1 unverified.");
  await summary.press("Enter");
  await expect(receipt).toHaveAttribute("open", "");
  const requested = receipt.getByText("Requested (UTC)", { exact: true }).locator("..");
  await expect(requested.locator("time")).toHaveCount(2);
  await expect(receipt.getByText("Latest included date (UTC)", { exact: true }).locator("..").locator("time"))
    .toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  await expect(receipt.getByRole("link", { name: "api.npmjs.org" })).toBeVisible();
  const events = page.getByRole("link", { name: "Events and releases" });
  await events.click();
  await expect(page).toHaveURL(/#package-events$/);
  await expect(page.locator("#package-events")).toBeInViewport();
});

test("Compare focuses a single package without changing shared eligibility or the URL", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/compare?packages=axios,integrity-fixture,react,svelte,vue&days=7");
  const table = page.getByRole("table", { name: "Daily observations" });
  const legend = page.getByRole("list", { name: "Chart series" });
  await expect(legend.getByRole("listitem")).toHaveCount(5);
  const compareUrl = page.url();
  const select = page.getByRole("combobox", { name: "Table packages" });
  await expect(select.getByRole("option")).toHaveCount(6);
  await select.selectOption("integrity-fixture");
  await expect(table.getByRole("columnheader", { name: "axios" })).toHaveCount(0);
  await expect(table.getByRole("cell", { name: "Missing", exact: true })).toBeVisible();
  await expect(table.getByRole("cell", { name: "Unverified", exact: true })).toBeVisible();
  await expect(table.getByRole("cell", { name: "0", exact: true })).toBeVisible();
  expect(await table.evaluate(el => el.getBoundingClientRect().width <= (el.parentElement?.clientWidth ?? 0))).toBe(true);
  await expect(page).toHaveURL(compareUrl);
  await expect(legend.getByRole("listitem")).toHaveCount(5);
  await select.selectOption("");
  await expect(table.getByRole("columnheader", { name: "axios" })).toBeVisible();
});
