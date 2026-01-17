import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExportFilename } from "../lib/export-filename";
import { rangeForDays } from "../lib/query";

test("buildExportFilename sanitizes scoped package names", () => {
  const range = rangeForDays(7, new Date("2026-01-17T12:00:00Z"));
  const filename = buildExportFilename({
    packages: ["@scope/name"],
    days: 7,
    range,
    format: "csv",
  });
  assert.ok(filename.includes("npmtraffic__@scope__name"));
  assert.ok(filename.endsWith(".csv"));
});

test("buildExportFilename truncates overly long names with deterministic hash", () => {
  const range = rangeForDays(30, new Date("2026-01-17T12:00:00Z"));
  const packages = Array.from({ length: 20 }, () => "pkg-with-very-long-name").map(
    (value) => `@scope/${value}`
  );
  const filename = buildExportFilename({
    packages,
    days: 90,
    range,
    format: "csv",
  });
  assert.ok(filename.length <= 180);
  assert.ok(/__[\da-f]{8}\.csv$/.test(filename));
});
