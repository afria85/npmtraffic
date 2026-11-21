"use client";

import { useEffect } from "react";

export default function CompareFocusVisibility() {
  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;

    let frame = 0;
    const keepFocusVisible = (event: FocusEvent) => {
      cancelAnimationFrame(frame);
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest("main")) return;

      // Let native keyboard focus and its scrolling settle before checking the sticky header.
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== target || !target.matches(":focus-visible")) return;
        const rect = target.getBoundingClientRect();
        const headerBottom = header.getBoundingClientRect().bottom;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (centerY < 0 || centerY >= headerBottom) return;
        if (!header.contains(document.elementFromPoint(centerX, centerY))) return;

        window.scrollBy({ top: rect.top - headerBottom - 4, behavior: "instant" });
      });
    };

    document.addEventListener("focusin", keepFocusVisible);
    return () => {
      document.removeEventListener("focusin", keepFocusVisible);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
