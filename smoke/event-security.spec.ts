import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

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
