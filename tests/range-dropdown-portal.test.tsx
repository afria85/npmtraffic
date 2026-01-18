import assert from "node:assert/strict";
import { test } from "node:test";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import RangeSelector from "../components/RangeSelector";

test("range 'More' dropdown portals menu into document.body", () => {
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
    root.render(<RangeSelector currentDays={30} getHref={(days) => `/p/react?days=${days}`} />);
  });

  try {
    const button = dom.window.document.querySelector("button");
    assert.ok(button, "More button should exist");
    act(() => {
      button!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    const menu = dom.window.document.body.querySelector("[role='menu']");
    assert.ok(menu, "Menu should render into portal root");
    assert.ok(menu?.textContent?.includes("90d"));
    assert.ok(menu?.textContent?.includes("180d"));
    assert.ok(menu?.textContent?.includes("365d"));
    assert.equal(menu?.parentElement, dom.window.document.body);
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
