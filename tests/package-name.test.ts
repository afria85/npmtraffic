import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedPackageInput, validatePackageName } from "../lib/package-name";

test("validates full package names", () => {
  assert.equal(validatePackageName("react").ok, true);
  assert.equal(validatePackageName("@scope/pkg").ok, true);
});

test("rejects empty or invalid names", () => {
  assert.equal(validatePackageName("").ok, false);
  assert.equal(validatePackageName("bad name").ok, false);
});

test("allows only legal characters for input", () => {
  assert.equal(isAllowedPackageInput("@scope/"), true);
  assert.equal(isAllowedPackageInput("bad$name"), false);
});

test("rejects overly long names", () => {
  const longName = "a".repeat(215);
  assert.equal(validatePackageName(longName).ok, false);
  assert.equal(isAllowedPackageInput(longName), false);
});
