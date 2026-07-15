import type { ReactElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM, type ConstructorOptions } from "jsdom";

type DomContext = {
  dom: JSDOM;
  cleanup: () => void;
};

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class NoopIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function createMatchMedia() {
  return (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}

function installGlobal(
  originals: Map<string, PropertyDescriptor | undefined>,
  key: string,
  value: unknown
) {
  if (!originals.has(key)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreGlobals(originals: Map<string, PropertyDescriptor | undefined>) {
  for (const [key, descriptor] of Array.from(originals).reverse()) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      delete (globalThis as Record<string, unknown>)[key];
    }
  }
}

export function setupDom(
  markup = "<!doctype html><html><body></body></html>",
  options: ConstructorOptions = {}
): DomContext {
  const dom = new JSDOM(markup, {
    url: "http://localhost",
    pretendToBeVisual: true,
    ...options,
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();

  installGlobal(originals, "window", dom.window);
  installGlobal(originals, "self", dom.window);
  installGlobal(originals, "document", dom.window.document);
  installGlobal(originals, "navigator", dom.window.navigator);
  installGlobal(originals, "HTMLElement", dom.window.HTMLElement);
  installGlobal(originals, "Element", dom.window.Element);
  installGlobal(originals, "Node", dom.window.Node);
  installGlobal(originals, "Event", dom.window.Event);
  installGlobal(originals, "CustomEvent", dom.window.CustomEvent);
  installGlobal(originals, "MouseEvent", dom.window.MouseEvent);
  installGlobal(originals, "KeyboardEvent", dom.window.KeyboardEvent);
  installGlobal(originals, "requestAnimationFrame", dom.window.requestAnimationFrame.bind(dom.window));
  installGlobal(originals, "cancelAnimationFrame", dom.window.cancelAnimationFrame.bind(dom.window));
  installGlobal(originals, "getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  installGlobal(originals, "ResizeObserver", dom.window.ResizeObserver ?? NoopResizeObserver);
  installGlobal(
    originals,
    "IntersectionObserver",
    dom.window.IntersectionObserver ?? NoopIntersectionObserver
  );
  installGlobal(originals, "matchMedia", dom.window.matchMedia ?? createMatchMedia());
  installGlobal(originals, "requestIdleCallback", (callback: IdleRequestCallback) => {
    return dom.window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      });
    }, 1);
  });
  installGlobal(originals, "cancelIdleCallback", (handle: number) => dom.window.clearTimeout(handle));
  installGlobal(originals, "IS_REACT_ACT_ENVIRONMENT", true);

  if (!dom.window.matchMedia) {
    Object.defineProperty(dom.window, "matchMedia", {
      configurable: true,
      writable: true,
      value: globalThis.matchMedia,
    });
  }
  if (!dom.window.IntersectionObserver) {
    Object.defineProperty(dom.window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: globalThis.IntersectionObserver,
    });
  }
  if (!dom.window.requestIdleCallback) {
    Object.defineProperty(dom.window, "requestIdleCallback", {
      configurable: true,
      writable: true,
      value: globalThis.requestIdleCallback,
    });
  }
  if (!dom.window.cancelIdleCallback) {
    Object.defineProperty(dom.window, "cancelIdleCallback", {
      configurable: true,
      writable: true,
      value: globalThis.cancelIdleCallback,
    });
  }

  return {
    dom,
    cleanup: () => {
      restoreGlobals(originals);
      dom.window.close();
    },
  };
}

export function renderComponent(dom: JSDOM, node: ReactElement) {
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

export function nextFrame(dom: JSDOM) {
  return new Promise<void>((resolve) => {
    dom.window.requestAnimationFrame(() => resolve());
  });
}
