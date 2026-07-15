import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import CompareChart from "../components/compare/CompareChart";
import { renderComponent, setupDom } from "./support/dom";

test("compare chart style panel keeps scrollable content inside panel", () => {
  const { dom, cleanup } = setupDom();
  const { unmount } = renderComponent(
    dom,
      <CompareChart
        days={30}
        packageNames={["react", "vue", "svelte", "solid-js", "preact"]}
        series={[
          {
            date: "2024-01-01",
            values: {
              react: { downloads: 10, delta: null },
              vue: { downloads: 8, delta: null },
              svelte: { downloads: 5, delta: null },
              "solid-js": { downloads: 4, delta: null },
              preact: { downloads: 3, delta: null },
            },
          },
        ]}
      />
  );

  try {
    const buttons = Array.from(dom.window.document.querySelectorAll("button"));
    const styleButton = buttons.find((button) => button.textContent?.trim() === "Style");
    assert.ok(styleButton, "Style button should exist");
    act(() => {
      styleButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const dialog = dom.window.document.querySelector("[role='dialog']");
    assert.ok(dialog, "Style panel dialog should render");

    const panel = dialog?.querySelector("div.overflow-hidden");
    assert.ok(panel, "Panel should clip overflow");

    const scrollArea = dialog?.querySelector("div.overflow-y-auto");
    assert.ok(scrollArea, "Panel should include a scrollable area");
  } finally {
    unmount();
    cleanup();
  }
});
