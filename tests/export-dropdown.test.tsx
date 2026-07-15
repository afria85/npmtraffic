import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import ExportDropdown from "../components/ExportDropdown";
import { nextFrame, renderComponent, setupDom } from "./support/dom";

test("export dropdown renders package links after opening", async () => {
  const itemList = [
    {
      key: "csv",
      label: "CSV",
      description: "Comment header, UTC dates, derived columns",
      href: "/api/v1/package/react/daily.csv?days=30",
      downloadName: "react.csv",
    },
    {
      key: "excel",
      label: "Excel CSV",
      href: "/api/v1/package/react/daily.excel.csv?days=30",
      downloadName: "react-excel.csv",
    },
    { key: "json", label: "JSON", href: "/api/v1/package/react/daily.json?days=30", downloadName: "react.json" },
  ];
  const { dom, cleanup } = setupDom();
  const { container, unmount } = renderComponent(dom, <ExportDropdown items={itemList} />);

  try {
    const button = container.querySelector("button");
    assert.ok(button);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await nextFrame(dom);
    });

    const menu = dom.window.document.body.querySelector("[role='menu']");
    assert.ok(menu);
    assert.ok(menu?.innerHTML.includes('href="/api/v1/package/react/daily.csv?days=30"'));
    assert.ok(menu?.innerHTML.includes('href="/api/v1/package/react/daily.excel.csv?days=30"'));
    assert.ok(menu?.innerHTML.includes('href="/api/v1/package/react/daily.json?days=30"'));
    assert.ok(menu?.textContent?.includes("Comment header, UTC dates, derived columns"));
  } finally {
    unmount();
    cleanup();
  }
});

test("export dropdown supports compare list links after opening", async () => {
  const compareList = [
    {
      key: "csv",
      label: "CSV",
      href: "/api/v1/compare.csv?packages=react,vue&days=14",
      downloadName: "compare.csv",
    },
    {
      key: "excel",
      label: "Excel CSV",
      href: "/api/v1/compare.excel.csv?packages=react,vue&days=14",
      downloadName: "compare-excel.csv",
    },
    {
      key: "json",
      label: "JSON",
      href: "/api/v1/compare.json?packages=react,vue&days=14",
      downloadName: "compare.json",
    },
  ];
  const { dom, cleanup } = setupDom();
  const { container, unmount } = renderComponent(dom, <ExportDropdown items={compareList} />);

  try {
    const button = container.querySelector("button");
    assert.ok(button);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await nextFrame(dom);
    });

    const menu = dom.window.document.body.querySelector("[role='menu']");
    assert.ok(menu);
    assert.ok(menu?.innerHTML.includes('href="/api/v1/compare.csv?packages=react,vue&amp;days=14"'));
    assert.ok(menu?.innerHTML.includes('href="/api/v1/compare.excel.csv?packages=react,vue&amp;days=14"'));
    assert.ok(menu?.innerHTML.includes('href="/api/v1/compare.json?packages=react,vue&amp;days=14"'));
  } finally {
    unmount();
    cleanup();
  }
});

test("export dropdown button references menu for accessibility", async () => {
  const { dom, cleanup } = setupDom();
  const { container, unmount } = renderComponent(
    dom,
    <ExportDropdown
      items={[
        { key: "csv", label: "CSV", href: "/api/export.csv", downloadName: "export.csv" },
      ]}
    />
  );

  try {
    const button = container.querySelector("button");
    assert.ok(button);
    const menuId = button.getAttribute("aria-controls");
    assert.ok(menuId);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await nextFrame(dom);
    });

    const menu = dom.window.document.getElementById(menuId);
    assert.equal(menu?.getAttribute("role"), "menu");
    assert.equal(menu?.getAttribute("aria-labelledby"), button.getAttribute("id"));
  } finally {
    unmount();
    cleanup();
  }
});
