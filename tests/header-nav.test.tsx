import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import Header from "../components/Header";
import PackageHeader from "../components/package/PackageHeader";
import { STORAGE_KEY } from "../lib/compare-store";

type DomContext = {
  dom: JSDOM;
  cleanup: () => void;
};

function setupDom(): DomContext {
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

  return {
    dom,
    cleanup: () => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.navigator = originalNavigator;
      globalThis.HTMLElement = originalHTMLElement;
      globalThis.Node = originalNode;
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCAF;
      dom.window.close();
    },
  };
}

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

for (const name of ["logshield-cli", "next"]) {
  test(`navbar GitHub link and package header controls render for ${name}`, () => {
    const { dom, cleanup } = setupDom();
    try {
      dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      const { container, unmount } = renderComponent(
        dom,
        <div>
          <Header />
          <PackageHeader
            name={name}
            updatedLabel="Updated recently"
            updatedLabelCompact="Updated now"
          />
        </div>
      );
      const githubLink = container.querySelector("a[aria-label='GitHub repository']");
      assert.ok(githubLink, "GitHub link should be present in the navbar");
      assert.ok(githubLink?.getAttribute("href")?.includes("github.com"));
      assert.equal(githubLink?.getAttribute("title"), "GitHub repository");
      const searchInput = container.querySelector("input[placeholder='Search npm packages']");
      assert.ok(searchInput, "Search input should render in the header");
      const compareButton = Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Add to compare")
      );
      assert.ok(compareButton, "Compare toggle should render");
      unmount();
    } finally {
      cleanup();
    }
  });
}
