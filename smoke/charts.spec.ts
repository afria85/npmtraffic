import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const widths = [320, 375, 390, 768, 1440];
const periods = [7, 30, 90, 365];
const routes = [
  { name: "package", href: (days: number) => `/p/react?days=${days}` },
  { name: "comparison", href: (days: number) => `/compare?packages=react,vue&days=${days}` },
];
const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "short", year: "numeric", timeZone: "UTC",
});

test.use({ hasTouch: true });

async function assertAxis(chart: Locator, start: Date, end: Date, days: number) {
  await expect.poll(() => chart.evaluate((svg: SVGSVGElement) => (
    svg.viewBox.baseVal.width === svg.clientWidth && svg.viewBox.baseVal.height === svg.clientHeight
  ))).toBe(true);
  const axis = await chart.evaluate((svg: SVGSVGElement) => {
    const viewport = svg.getBoundingClientRect();
    const scale = svg.getScreenCTM()!.a;
    const labels = [...svg.querySelectorAll('[data-chart-axis="timeline"] text')]
      .filter((text) => getComputedStyle(text).visibility === "visible")
      .map((text) => {
        const box = text.getBoundingClientRect();
        return {
          label: text.textContent,
          left: box.left,
          right: box.right,
          fontSize: parseFloat(getComputedStyle(text).fontSize) * scale,
        };
      });
    const yLabels = [...svg.querySelectorAll('text[text-anchor="end"]')].map((text) => {
      const box = text.getBoundingClientRect();
      return { left: box.left, top: box.top, bottom: box.bottom };
    });
    return { labels, yLabels, left: viewport.left, right: viewport.right, top: viewport.top, bottom: viewport.bottom };
  });

  expect(axis.labels.length).toBeGreaterThanOrEqual(days === 365 ? 3 : 1);
  expect(axis.labels.at(-1)?.label).toBe(monthFormat.format(end));
  if (days === 365) expect(axis.labels[0]?.label).toBe(monthFormat.format(start));
  for (const [index, label] of axis.labels.entries()) {
    expect(label.fontSize).toBeGreaterThanOrEqual(12);
    expect(label.left).toBeGreaterThanOrEqual(axis.left);
    expect(label.right).toBeLessThanOrEqual(axis.right);
    if (index > 0) expect(label.left - axis.labels[index - 1].right).toBeGreaterThanOrEqual(7.5);
  }
  expect(axis.yLabels).toHaveLength(5);
  for (const label of axis.yLabels) {
    expect(label.left).toBeGreaterThanOrEqual(axis.left);
    expect(label.top).toBeGreaterThanOrEqual(axis.top);
    expect(label.bottom).toBeLessThanOrEqual(axis.bottom);
  }
  return axis.labels.map(({ label }) => label);
}

async function assertTooltips(page: Page, chart: Locator, section: Locator, dates: string[], touch = false) {
  await chart.scrollIntoViewIfNeeded();
  const plot = await chart.locator(":scope > g > line").first().boundingBox();
  const svg = await chart.boundingBox();
  if (!plot || !svg) throw new Error("Chart plot has no bounds");
  const tooltip = section.locator("[data-chart-tooltip]");
  for (const [index, date] of dates.entries()) {
    const x = index === 0 ? plot.x : plot.x + plot.width;
    if (touch) await page.touchscreen.tap(x, svg.y + svg.height / 2);
    else await page.mouse.move(x, svg.y + svg.height / 2);
    await expect(tooltip.getByText(date, { exact: true })).toBeVisible();
    const box = await tooltip.boundingBox();
    if (!box) throw new Error("Tooltip has no bounds");
    expect(box.x).toBeGreaterThanOrEqual(svg.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(svg.x + svg.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(svg.y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(svg.y + svg.height + 1);
  }
  if (touch) await page.touchscreen.tap(1, 1);
  else await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
}

async function assertExports(page: Page, chart: Locator, section: Locator, labels: (string | null)[]) {
  const viewBox = (await chart.getAttribute("viewBox"))!;
  const [, , width, height] = viewBox.split(" ").map(Number);
  for (const format of ["SVG", "PNG"]) {
    await section.getByRole("button", { name: "Export", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: `Export ${format}`, exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
    const data = await readFile(await download.path());
    if (format === "PNG") {
      expect(data.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(data.readUInt32BE(16)).toBe(width * 2);
      expect(data.readUInt32BE(20)).toBe(height * 2);
    } else {
      const markup = data.toString("utf8");
      const svg = await page.evaluate((text) => {
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        return {
          error: doc.querySelector("parsererror")?.textContent ?? null,
          viewBox: doc.documentElement.getAttribute("viewBox"),
          labels: [...doc.querySelectorAll('[data-chart-axis="timeline"] text[visibility="visible"]')]
            .map((label) => label.textContent),
        };
      }, markup);
      expect(svg).toEqual({ error: null, viewBox, labels });
      expect(markup).not.toContain("var(--");
    }
  }
}

for (const width of widths) {
  test(`package and comparison charts at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });

    for (const route of routes) {
      for (const days of periods) {
        await test.step(`${route.name} ${days} days`, async () => {
          const response = await page.goto(route.href(days));
          expect(response?.status()).toBe(200);
          const chart = page.getByRole("img", { name: new RegExp(`daily downloads line chart \\(${days} days\\)`, "i") });
          const section = chart.locator("xpath=ancestor::section[1]");
          await expect(chart).toBeVisible();

          const quality = await page.getByText(/observations through \d{4}-\d{2}-\d{2} UTC/).textContent();
          const endDate = quality!.match(/\d{4}-\d{2}-\d{2}/)![0];
          const end = new Date(endDate);
          const start = new Date(end.getTime() - (days - 1) * 86_400_000);
          const labels = await assertAxis(chart, start, end, days);
          const dates = [start.toISOString().slice(0, 10), endDate];
          await assertTooltips(page, chart, section, dates);
          if (width === 320 && days === 7) await assertTooltips(page, chart, section, dates, true);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
          if (days === 365) {
            await section.screenshot({ path: testInfo.outputPath(`${route.name}-365d-${width}px.png`) });
            if (width === 320 || width === 1440) await assertExports(page, chart, section, labels);
            if (width === 320) {
              await page.setViewportSize({ width: 1440, height: 900 });
              const wideLabels = await assertAxis(chart, start, end, days);
              expect(wideLabels).toHaveLength(6);
              await page.setViewportSize({ width, height: 900 });
              expect(await assertAxis(chart, start, end, days)).toEqual(labels);
            }
          }
        });
      }
    }
    expect(errors).toEqual([]);
  });
}
