import assert from "node:assert/strict";
import { test } from "node:test";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import CompareChart from "../components/compare/CompareChart";

test("compare chart style panel keeps scrollable content inside panel", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalNode = globalThis.Node;
  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;

  globalThis.window = dom.window as unknown as Window;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame;

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(
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
  });

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
    act(() => {
      root.unmount();
    });
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.navigator = originalNavigator;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.Node = originalNode;
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    dom.window.close();
  }
});
