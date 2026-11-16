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
