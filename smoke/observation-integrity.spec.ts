import { expect, test } from "@playwright/test";

test("partial fixture windows agree across package, comparison, JSON, and CSV", async ({ page, request }) => {
  const pkg = "/api/v1/package/integrity-fixture";
  const response = await request.get(`${pkg}/daily?days=7`);
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.coverage).toMatchObject({ requestedDays: 7, includedDays: 5, missingDays: 1, unverifiedDays: 1 });
  expect(data.series[0]).toMatchObject({ downloads: 0, status: "available", upstreamDownloads: 0 });
  expect(data.series[2]).toMatchObject({ downloads: null, status: "missing", upstreamDownloads: null });
  expect(data.series[3]).toMatchObject({ downloads: null, status: "unverified", upstreamDownloads: 100_000_000_000 });
  expect(data.derived.ma3[3].value).toBeNull();
  const json = await (await request.get(`${pkg}/daily.json?days=7`)).json();
  expect(json.series).toEqual(data.series);
  expect(json.coverage).toEqual(data.coverage);
  const csv = await (await request.get(`${pkg}/daily.csv?days=7`)).text();
  expect(csv).toContain(`${data.series[3].date},,,,,,unverified,100000000000,`);

  const comparison = "/api/v1/compare";
  const query = "?packages=integrity-fixture,react&days=7";
  const shared = await (await request.get(`${comparison}.json${query}`)).json();
  expect(shared.coverage.includedDays).toBe(5);
  expect(shared.series[2].values.react).toMatchObject({ downloads: null, status: "available" });
  expect(shared.series[2].values["integrity-fixture"].status).toBe("missing");
  expect(shared.series[4].values.react.delta).toBeNull();
  const compareCsv = await (await request.get(`${comparison}.csv${query}`)).text();
  expect(compareCsv).toContain(`${shared.series[2].date},,,,,false,missing,`);

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/p/integrity-fixture?days=7");
  await expect(page.getByText("5 of 7 days included.", { exact: false })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Unverified", exact: true })).toBeVisible();
  await page.goto(`/compare${query}`);
  await expect(page.getByText("5 of 7 days included across all packages.", { exact: false })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Excluded", exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
