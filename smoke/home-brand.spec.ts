import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`homepage npm headline uses the theme accent without changing accessible text (${theme})`, async ({ page }) => {
    await page.goto("/");
    await page.evaluate((mode) => {
      document.documentElement.dataset.theme = mode;
      document.documentElement.classList.toggle("dark", mode === "dark");
    }, theme);
    const heading = page.getByRole("heading", { level: 1, name: "Explore npm downloads", exact: true });
    await expect(heading).toBeVisible();
    const npm = heading.getByText("npm", { exact: true });
    await expect(npm).toHaveCount(1);
    const result = await npm.evaluate((element) => ({
      actual: getComputedStyle(element).color,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      resolvedAccent: (() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      })(),
    }));
    expect(result.accent).toBeTruthy();
    expect(result.actual).toBe(result.resolvedAccent);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  });
}

test("generic unknown routes show an accurate Page not found message", async ({ page }) => {
  const response = await page.goto("/this-is-not-an-npmtraffic-route");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByText("The requested page or npm package could not be found.")).toBeVisible();
});

test("About feature copy matches the measured Compare insight", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByText(/largest relative increase, and closest race/)).toBeVisible();
});

for (const [route, title] of [["/about", "About"], ["/donate", "Donate"]] as const) {
  test(`supporting pages provide their own canonical and social metadata: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://npmtraffic.com${route}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `https://npmtraffic.com${route}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${title} | npmtraffic`);
  });
}

test("footer exposes the Data and exports documentation from every page", async ({ page }) => {
  await page.goto("/about");
  const resources = page.getByRole("contentinfo").getByRole("navigation", { name: "Resources" });
  await expect(resources.getByRole("link", { name: "Data & exports" })).toHaveAttribute("href", "/data");
});
