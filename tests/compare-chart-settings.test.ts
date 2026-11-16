import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultCompareColors,
  hydrateCompareChartSettings,
} from "../components/compare/compare-chart-settings";

const five = ["angular", "axios", "react", "typescript", "vue"];

test("every default Compare series has a different visible palette entry (up to five)", () => {
  const colors = defaultCompareColors(five);
  assert.equal(new Set(Object.values(colors)).size, five.length);
  assert.equal(Object.values(colors).includes("cyan"), false); // accent and cyan overlap in dark theme
  assert.equal(Object.values(colors).includes("slate"), false); // old fallback should not dominate
});

test("legacy partial maps never cause multiple new packages to fall back to slate", () => {
  const settings = hydrateCompareChartSettings(five, {
    colors: { angular: "accent", axios: "slate", react: "slate", typescript: "slate" },
    lineStyles: { angular: "solid", axios: "dashed" },
  });
  assert.equal(new Set(five.map((name) => settings.colors[name])).size, 5);
  assert.equal(settings.colors.axios, "slate");
  assert.equal(settings.lineStyles.angular, "solid");
  assert.equal(settings.lineStyles.axios, "dashed");
  assert.equal(settings.lineStyles.react, "dotted");
});

test("explicit per-package color settings survive navigation and reload", () => {
  const saved = hydrateCompareChartSettings(five, {
    colors: { angular: "slate", axios: "slate", react: "amber" },
    customColors: ["angular", "axios", "react"],
  });
  assert.deepEqual(saved.customColors, ["angular", "axios", "react"]);
  assert.equal(saved.colors.angular, "slate");
  assert.equal(saved.colors.axios, "slate");
  assert.equal(saved.colors.react, "amber");
  assert.equal(saved.colors.typescript !== "slate", true);
  const restored = hydrateCompareChartSettings(five, JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
});

test("default settings are deterministic for each selected package set", () => {
  const two = hydrateCompareChartSettings(["react", "vue"]);
  const expanded = hydrateCompareChartSettings(five, { colors: two.colors });
  assert.equal(new Set(Object.values(expanded.colors)).size, five.length);
  assert.deepEqual(defaultCompareColors(["react", "vue"]), { react: "accent", vue: "amber" });
});

test("invalid legacy colors and line styles revert to known values", () => {
  const settings = hydrateCompareChartSettings(["react", "vue"], {
    colors: { react: "unknown" as never, vue: "slate" },
    lineStyles: { react: "zigzag" as never },
    customColors: ["ghost", "react"],
  });
  assert.equal(settings.colors.react, "accent");
  assert.equal(settings.colors.vue, "slate");
  assert.equal(settings.lineStyles.react, "solid");
  assert.deepEqual(settings.customColors, ["react"]);
});
