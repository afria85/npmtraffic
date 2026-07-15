import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import RangeDropdown from "../components/RangeDropdown";
import { renderComponent, setupDom } from "./support/dom";

test("range 'More' dropdown renders a fixed overlay menu", () => {
  const { dom, cleanup } = setupDom();
  const { unmount } = renderComponent(
    dom,
    <RangeDropdown
      currentDays={30}
      items={[
        { days: 90, href: "/p/react?days=90" },
        { days: 180, href: "/p/react?days=180" },
        { days: 365, href: "/p/react?days=365" },
      ]}
    />
  );

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
    assert.ok(menu?.parentElement?.className.includes("fixed"));
  } finally {
    unmount();
    cleanup();
  }
});
