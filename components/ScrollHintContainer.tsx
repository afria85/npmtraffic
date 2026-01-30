"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  children: ReactNode;
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M12.75 15.25 8.5 11l4.25-4.25" : "M7.25 4.75 11.5 9l-4.25 4.25";
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ScrollHintContainer({ className, children }: Props) {
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
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-black/55 to-transparent">
          <div className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByStep("left")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)]"
            >
              <Chevron dir="left" />
            </button>
          </div>
        </div>
      ) : null}
      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-black/55 to-transparent">
          <div className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2">
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByStep("right")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-hover)]"
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
