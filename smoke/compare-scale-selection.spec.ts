import { expect, test, type Page } from "@playwright/test";

const route = "/compare?packages=angular,axios,react,svelte,vue&days=30";
type Mode = "Absolute" | "Indexed (base 100)";

function contrastRatio(foreground: string, background: string) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (rgb: string) => {
    const channels = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error("Cannot parse CSS rgb: " + rgb);
    return channel(channels[0]) * 0.2126 + channel(channels[1]) * 0.7152 + channel(channels[2]) * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function expectVisibleScaleSelection(page: Page, selected: Mode, inactive: Mode) {
  const active = page.getByRole("button", { name: selected, exact: true });
  const other = page.getByRole("button", { name: inactive, exact: true });
  await expect(active).toHaveAttribute("aria-pressed", "true");
  await expect(other).toHaveAttribute("aria-pressed", "false");
  await expect(active.locator('span[aria-hidden="true"]')).toHaveText("✓");
  await expect(other.locator('span[aria-hidden="true"]')).toHaveCount(0);

  const styles = await page.evaluate(([selectedName, inactiveName]) => {
    const group = document.querySelector('[role="group"][aria-label="Compare chart scale"]');
    if (!group) throw new Error("Scale buttons missing");
    const buttons = [...group.querySelectorAll("button")];
    const selected = buttons.find((element) => element.textContent?.includes(selectedName));
    const inactive = buttons.find((element) => element.textContent?.includes(inactiveName));
    if (!selected || !inactive) throw new Error("Scale control missing");
    const visual = (element: Element) => ({
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
      border: getComputedStyle(element).borderColor,
      bottom: element.getBoundingClientRect().bottom,
    });
    return { selected: visual(selected), inactive: visual(inactive),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  }, [selected, inactive]);

  expect(styles.selected.background).not.toBe(styles.inactive.background);
  expect(styles.selected.color).not.toBe(styles.inactive.color);
  expect(contrastRatio(styles.selected.color, styles.selected.background)).toBeGreaterThanOrEqual(4.5);
  expect(Math.abs(styles.selected.bottom - styles.inactive.bottom)).toBeLessThanOrEqual(2);
  expect(styles.overflow).toBe(false);
}

for (const [width, height] of [[320, 720], [390, 844]] as const) {
  test(`Compare chart's active scale is unmistakable and reversible at ${width}px in both themes`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height });
    await page.goto(route);
    const chart = page.getByRole("img", { name: /Compare daily downloads line chart/ });
    await expect(chart).toBeVisible({ timeout: 20_000 });

    for (const theme of ["dark", "light"] as const) {
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      await expectVisibleScaleSelection(page, "Absolute", "Indexed (base 100)");

      const indexed = page.getByRole("button", { name: "Indexed (base 100)", exact: true });
      await indexed.click();
      await expectVisibleScaleSelection(page, "Indexed (base 100)", "Absolute");
      await expect(chart).toHaveAttribute("aria-label", /indexed to 100/);

      await indexed.hover();
      await expectVisibleScaleSelection(page, "Indexed (base 100)", "Absolute");

      const absolute = page.getByRole("button", { name: "Absolute", exact: true });
      await absolute.focus();
      await page.keyboard.press("Enter");
      await expectVisibleScaleSelection(page, "Absolute", "Indexed (base 100)");
      await expect(chart).toHaveAttribute("aria-label", /absolute counts/);
    }
  });
}
