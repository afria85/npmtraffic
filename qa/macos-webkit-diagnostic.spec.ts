import { test, expect, historyToHome, assertRoute, assertNoCriticalRuntimeErrors } from "./browser-fixture";

// Paired comparison: same macOS fixture and click checks; only navigation waitUntil differs.
for (const [width, height] of [[320, 720], [390, 844], [1280, 900]]) {
  for (const waitUntil of ["domcontentloaded", "load"] as const) {
  test("WebKit history and trusted React click at " + width + "px (" + waitUntil + ")", async ({ page, evidence }, testInfo) => {
    test.skip(process.platform !== "darwin", "This project is evidence for actual macOS runners only");
    await page.setViewportSize({ width, height });
    evidence.phase = "history";
    evidence.checks.push({ historyWaitUntil: waitUntil });
    await historyToHome(page, waitUntil);
    evidence.phase = "react-click";
    await page.evaluate(() => {
      type ClickEvidence = { trusted: boolean; prevented: boolean; path: string };
      const state = window as unknown as { cloudQAClicks: ClickEvidence[] };
      state.cloudQAClicks = [];
      document.addEventListener("click", event => {
        const anchor = event.target instanceof Element ? event.target.closest("a") : null;
        if (!anchor || anchor.pathname !== "/p/react") return;
        const record = { trusted: event.isTrusted, prevented: event.defaultPrevented, path: anchor.pathname };
        state.cloudQAClicks.push(record);
        queueMicrotask(() => { record.prevented = event.defaultPrevented; });
      }, true);
    });
    const react = page.getByRole("main").getByRole("link", { name: "react", exact: true });
    const hit = await react.evaluate(anchor => {
      const rect = anchor.getBoundingClientRect();
      return anchor.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    });
    evidence.checks.push({ reactCenterHit: hit });
    await react.click();
    const clicks = await page.evaluate(() =>
      (window as unknown as { cloudQAClicks?: object[] }).cloudQAClicks ?? []);
    evidence.checks.push({ clicks });
    expect(clicks).toEqual(expect.arrayContaining([
      expect.objectContaining({ trusted: true, path: "/p/react" }),
    ]));
    await assertRoute(page, "/p/react");
    await page.screenshot({ path: testInfo.outputPath("react-after-history.png") });
    assertNoCriticalRuntimeErrors(evidence);
  });
  }
}
