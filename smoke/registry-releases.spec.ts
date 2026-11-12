import { expect, test } from "@playwright/test";

test("release imports default to stable and preserve registry timestamps with prerelease opt-in", async ({ page }) => {
  await page.goto("/p/react?days=7");
  const panel = page.locator("#events-panel");
  const include = panel.getByRole("checkbox", { name: "Include prereleases" });
  await expect(include).not.toBeChecked();
  await expect(panel.getByText("1 matching release in this range.")).toBeVisible();
  await panel.getByRole("button", { name: "Import releases" }).click();
  await expect(panel.getByText("v1.1.0+responsive-chart-tooltip-regression")).toBeVisible();
  await expect(panel.getByText("v1.2.0-canary.1")).toHaveCount(0);
  await include.check();
  await panel.getByRole("button", { name: "Import releases" }).click();
  await expect(panel.getByText("v1.2.0-canary.1")).toBeVisible();
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export", exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const events = Array.isArray(exported) ? exported : exported.events;
  expect(events).toHaveLength(2);
  for (const event of events) {
    expect(event.published_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.date_utc).toBe(event.published_at.slice(0, 10));
  }
});
