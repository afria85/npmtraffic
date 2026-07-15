import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import CompareTray from "../components/compare/CompareTray";
import CompareButton from "../components/compare/CompareButton";
import { STORAGE_KEY } from "../lib/compare-store";
import { renderComponent, setupDom } from "./support/dom";

test("compare tray status text and disabled CTA when empty", () => {
  const { dom, cleanup } = setupDom();
  try {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const { container, unmount } = renderComponent(dom, <CompareTray />);
    assert.ok(
      dom.window.document.body.textContent?.includes("Select 2–5 packages to compare"),
      "status text should explain selection requirements"
    );
    const disabledButton = container.querySelector("button[disabled]");
    assert.ok(disabledButton, "Compare CTA should be disabled");
    const trayContainer = container.querySelector("[data-testid='compare-tray-container']");
    assert.ok(trayContainer?.className.includes("sm:max-w-3xl"));
    unmount();
  } finally {
    cleanup();
  }
});

test("compare tray guides when one package is selected", () => {
  const { dom, cleanup } = setupDom();
  try {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["react"]));
    const { container, unmount } = renderComponent(dom, <CompareTray />);
    assert.ok(
      dom.window.document.body.textContent?.includes("1 selected • add 1 more to compare")
    );
    const disabledButton = container.querySelector("button[disabled]");
    assert.ok(disabledButton, "Compare CTA should stay disabled");
    unmount();
  } finally {
    cleanup();
  }
});

test("compare tray enables CTA when two packages are selected", () => {
  const { dom, cleanup } = setupDom();
  try {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["react", "vue"]));
    const { container, unmount } = renderComponent(dom, <CompareTray />);
    assert.ok(dom.window.document.body.textContent?.includes("2 selected"));
    const disabledButton = container.querySelector("button[disabled]");
    assert.equal(disabledButton, null);
    const compareLink = container.querySelector("a");
    assert.ok(compareLink?.textContent?.includes("Compare (2)"));
    const actionBar = compareLink?.parentElement;
    assert.ok(actionBar?.className.includes("w-full"));
    assert.ok(actionBar?.className.includes("sm:ml-auto"));
    unmount();
  } finally {
    cleanup();
  }
});

test("compare tray clear button clears selection", () => {
  const { dom, cleanup } = setupDom();
  try {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["react", "vue"]));
    const { container, unmount } = renderComponent(dom, <CompareTray />);
    const clearButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Clear"
    );
    assert.ok(clearButton, "Clear button should render when selection is non-empty");

    act(() => {
      clearButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    assert.equal(dom.window.localStorage.getItem(STORAGE_KEY), JSON.stringify([]));
    assert.ok(
      dom.window.document.body.textContent?.includes("Select 2–5 packages to compare"),
      "status text should reset after clearing"
    );

    unmount();
  } finally {
    cleanup();
  }
});

test("compare toggle reflects selection state", () => {
  const { dom, cleanup } = setupDom();
  try {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["react"]));
    const { container, unmount } = renderComponent(dom, <CompareButton name="react" />);
    const button = container.querySelector("button");
    assert.ok(button?.textContent?.includes("In compare"));
    assert.equal(button?.className.includes("w-full"), false);
    unmount();
  } finally {
    cleanup();
  }
});

test("compare toggle shows add state when not selected", () => {
  const { dom, cleanup } = setupDom();
  try {
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const { container, unmount } = renderComponent(dom, <CompareButton name="react" />);
    const button = container.querySelector("button");
    assert.ok(button?.textContent?.includes("Add to compare"));
    unmount();
  } finally {
    cleanup();
  }
});
