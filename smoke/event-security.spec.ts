import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const timelineKey = "npmtraffic:events:react";
const timelineEvent = { date_utc: "2026-01-01", event_type: "note", label: "Event" };
const timelineEvents = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ ...timelineEvent, label: prefix + index }));

test("shared events reject a compressed oversized payload and imports render labels as text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const event = { date_utc: "2026-11-10", event_type: "note", label: "<svg onload='bad()'><script>bad()</script> & \" var(--chart-axis)" };
  const bomb = "gz:" + gzipSync(JSON.stringify([{ ...event, label: "x".repeat(300_000) }])).toString("base64url");
  expect(bomb.length).toBeLessThan(1500);
  await page.goto("/p/react?days=7&events=" + encodeURIComponent(bomb));
  await expect(page.getByText(/decompressed share payload too large/i)).toBeVisible();
  const panel = page.locator("#events-panel");
  await panel.getByLabel("Import events JSON file").setInputFiles({
    name: "events.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify([event])),
  });
  await expect(panel.getByText(event.label, { exact: true })).toBeVisible();
  await expect(panel.locator("[onload], script")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("timeline file import reports limit, malformed file and storage errors without changing saved events", async ({ page }) => {
  const saved = JSON.stringify(timelineEvents("Saved ", 600));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key: timelineKey, saved });
  await page.goto("/p/react?days=7");
  await page.getByRole("button", { name: "Events (600)", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Package timeline" });
  const input = dialog.getByLabel("Import timeline events JSON file");
  const status = dialog.getByRole("status");
  const importFile = (buffer: Buffer) => input.setInputFiles({ name: "events.json", mimeType: "application/json", buffer });
  const snapshot = () => page.evaluate((key) => localStorage.getItem(key), timelineKey);

  await importFile(Buffer.from(JSON.stringify(timelineEvents("Incoming ", 600))));
  await expect(status).toHaveText("Import failed. Too many events for this package.");
  expect(await snapshot()).toBe(saved);

  await importFile(Buffer.from("[{"));
  await expect(status).toHaveText("No events saved: invalid JSON");
  expect(await snapshot()).toBe(saved);

  await importFile(Buffer.of(0xff));
  await expect(status).toHaveText(/^Import failed\./);
  expect(await snapshot()).toBe(saved);

  await page.evaluate((key) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Full", "QuotaExceededError");
      return setItem.call(this, name, value);
    };
  }, timelineKey);
  await importFile(Buffer.from(JSON.stringify([timelineEvent])));
  await expect(status).toHaveText("Import failed. Could not save events. Browser storage is unavailable or full.");
  expect(await snapshot()).toBe(saved);
  expect(errors).toEqual([]);
});

test("timeline shared import reports a merged event limit and preserves saved events", async ({ page }) => {
  const saved = JSON.stringify(timelineEvents("Saved ", 1_000));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key: timelineKey, saved });
  const share = Buffer.from(JSON.stringify([timelineEvent])).toString("base64url");
  await page.goto("/p/react?days=7&events=" + share);
  await page.getByRole("button", { name: "Events (1000)", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Package timeline" });
  await dialog.getByRole("button", { name: "Import shared events", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Import failed. Too many events for this package.");
  expect(await page.evaluate((key) => localStorage.getItem(key), timelineKey)).toBe(saved);
  expect(errors).toEqual([]);
});
