import { expect, test } from "@playwright/test";

const routes = ["/", "/p/react?days=365", "/compare?packages=react,vue&days=365"];
const fixtureGithub = "https://github.com/afria85/npmtraffic.git";

test.use({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
test.setTimeout(60_000);

test("the runtime footer link survives hydration, hard reload and client navigation", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", error => {
    if (/#418|hydration|parentNode/i.test(error.message)) errors.push(error.message);
  });
  const github = page.locator("footer").getByRole("link", { name: "GitHub", exact: true });

  for (const path of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.reload({ waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    await toggle.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await toggle.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(errors, path).toEqual([]);
    if (!process.env.PLAYWRIGHT_BASE_URL) {
      await expect(github).toHaveAttribute("href", fixtureGithub);
    }
  }

  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const documentRoot = await page.locator("html").elementHandle();
  await page.locator("header").getByRole("link", { name: "Compare", exact: true }).press("Enter");
  await expect(page).toHaveURL(new URL("/compare", baseURL).href);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await documentRoot?.evaluate(root => root === document.documentElement)).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("the saved theme applies while scripts are delayed and search keeps its server DOM", async ({ page, context, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", error => {
    if (/#418|hydration|parentNode/i.test(error.message)) errors.push(error.message);
  });
  await context.addCookies([{ name: "npmtraffic_theme", value: "light", url: baseURL! }]);

  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route("**/_next/static/**", async route => {
    if (route.request().resourceType() === "script") await scriptsReady;
    await route.continue();
  });

  const field = page.getByRole("combobox", { name: "Search npm packages" });
  let serverField;
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    serverField = await field.elementHandle();
    await field.pressSequentially("rea");
    await expect(field).toHaveValue("rea");
  } finally {
    releaseScripts();
  }

  await page.waitForLoadState("load");
  await page.getByRole("button", { name: "Toggle theme" }).press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await serverField?.evaluate(input => input === document.getElementById(input.id))).toBe(true);
  await field.fill("react");
  await field.press("Enter");
  await expect(page).toHaveURL(/\/p\/react\?days=30$/);
  await expect(page.getByRole("heading", { level: 1, name: "react" })).toBeVisible();
  expect(errors).toEqual([]);
});
