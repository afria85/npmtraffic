"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  /**
   * Optional left offset for the left-side scroll hint overlay.
   * Useful when the first table column is sticky-left and would otherwise cover the hint.
   */
  leftHintOffset?: string;
  children: ReactNode;
};

export const SCROLL_HINT_OVERLAY_CLASSES =
  "pointer-events-none absolute top-0 bottom-3 z-30 w-12 sm:w-14";
export const SCROLL_HINT_LEFT_FADE_CLASSES =
  "absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-[var(--surface)] to-transparent sm:w-4";
export const SCROLL_HINT_RIGHT_FADE_CLASSES =
  "absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-[var(--surface)] to-transparent sm:w-4";

function Chevron({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M12.75 15.25 8.5 11l4.25-4.25" : "M7.25 4.75 11.5 9l-4.25 4.25";
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ScrollHintContainer({ className, leftHintOffset, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollByStep = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(160, Math.min(320, Math.floor(el.clientWidth * 0.6)));
    const delta = dir === "left" ? -step : step;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByStep("left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByStep("right");
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const canX = max > 8;
      const left = canX && el.scrollLeft > 16;
      const right = canX && el.scrollLeft < max - 16;
      setCanScrollLeft(left);
      setCanScrollRight(right);
    };

    update();

    const onScroll = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      {canScrollLeft ? (
        <div
          className={SCROLL_HINT_OVERLAY_CLASSES}
          style={{ left: leftHintOffset ?? "0px" }}
        >
          <div
            aria-hidden="true"
            className={SCROLL_HINT_LEFT_FADE_CLASSES}
          />
          <div className="pointer-events-auto absolute left-1 top-1/2 -translate-y-1/2 sm:left-2">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByStep("left")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)] sm:h-10 sm:w-10"
            >
              <Chevron dir="left" />
            </button>
          </div>
        </div>
      ) : null}
      {canScrollRight ? (
        <div className={`${SCROLL_HINT_OVERLAY_CLASSES} right-0`}>
          <div
            aria-hidden="true"
            className={SCROLL_HINT_RIGHT_FADE_CLASSES}
          />
          <div className="pointer-events-auto absolute right-1 top-1/2 -translate-y-1/2 sm:right-2">
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByStep("right")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)] sm:h-10 sm:w-10"
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>
      ) : null}
      <div
        ref={ref}
        className={className}
        tabIndex={0}
        role="region"
        aria-label="Scrollable content"
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
