import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import ShareMenu from "../components/ShareMenu";

function renderComponent(dom: JSDOM, node: ReactElement) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

test("share button has accessible label and title", () => {
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

  try {
    const { container, unmount } = renderComponent(
      dom,
      <ShareMenu url="https://npmtraffic.com" title="npmtraffic" iconOnlyOnMobile />
    );
    const button = container.querySelector("button");
    assert.ok(button);
    assert.equal(button?.getAttribute("aria-label"), "Share");
    assert.equal(button?.getAttribute("title"), "Share");
    unmount();
  } finally {
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
