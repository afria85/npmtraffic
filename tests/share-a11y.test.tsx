import assert from "node:assert/strict";
import { test } from "node:test";
import ShareMenu from "../components/ShareMenu";
import { renderComponent, setupDom } from "./support/dom";

test("share button has accessible label and title", () => {
  const { dom, cleanup } = setupDom();

  try {
    const { container, unmount } = renderComponent(
      dom,
      <ShareMenu url="https://npmtraffic.com" title="npmtraffic" iconOnlyOnMobile />
    );
    const button = container.querySelector("button");
    assert.ok(button);
    assert.equal(button?.getAttribute("aria-label"), "Share");
    assert.equal(button?.getAttribute("title"), "Share this page");
    assert.ok(button?.querySelector("[aria-live='polite']"));
    unmount();
  } finally {
    cleanup();
  }
});
