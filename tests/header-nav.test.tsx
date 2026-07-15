import assert from "node:assert/strict";
import { test } from "node:test";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Header from "../components/Header";
import PackageHeader from "../components/package/PackageHeader";
import { STORAGE_KEY } from "../lib/compare-store";
import { renderComponent, setupDom } from "./support/dom";

const router = {
  back() {},
  forward() {},
  refresh() {},
  hmrRefresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

for (const name of ["logshield-cli", "next"]) {
  test(`navbar GitHub link and package header controls render for ${name}`, () => {
    const { dom, cleanup } = setupDom();
    try {
      dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      const { container, unmount } = renderComponent(
        dom,
        <AppRouterContext.Provider value={router}>
          <div>
            <Header />
            <PackageHeader
              name={name}
              updatedLabel="Updated recently"
              updatedLabelCompact="Updated now"
            />
          </div>
        </AppRouterContext.Provider>
      );
      const githubLink = container.querySelector("a[aria-label='GitHub repository']");
      assert.ok(githubLink, "GitHub link should be present in the navbar");
      assert.ok(githubLink?.getAttribute("href")?.includes("github.com"));
      assert.equal(githubLink?.getAttribute("title"), "GitHub repository");
      assert.equal(githubLink?.querySelector("button"), null);
      const compareLink = Array.from(container.querySelectorAll("a")).find((link) =>
        link.textContent?.includes("Compare")
      );
      assert.equal(compareLink?.getAttribute("href"), "/compare");
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
