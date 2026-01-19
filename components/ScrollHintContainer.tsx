"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  children: ReactNode;
  hint?: string; // kept for backwards compatibility; text hint is no longer rendered
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M12.78 15.53a.75.75 0 0 1-1.06 0L6.47 10.28a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 1 1 1.06 1.06L8.06 9.75l4.72 4.72a.75.75 0 0 1 0 1.06z" />
      ) : (
        <path d="M7.22 4.47a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06l4.72-4.72-4.72-4.72a.75.75 0 0 1 0-1.06z" />
      )}
    </svg>
  );
}

export default function ScrollHintContainer({ className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      const canScrollX = maxScroll > 8;
      setCanScroll(canScrollX);
      if (!canScrollX) {
        setShowLeft(false);
        setShowRight(false);
        return;
      }
      setShowLeft(el.scrollLeft > 16);
      setShowRight(maxScroll - el.scrollLeft > 16);
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
      {canScroll && showLeft ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[color:var(--surface)] to-transparent opacity-90"
          aria-hidden
        >
          <div className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[color:var(--foreground)] shadow-sm">
            <Chevron direction="left" />
          </div>
        </div>
      ) : null}

      {canScroll && showRight ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[color:var(--surface)] to-transparent opacity-90"
          aria-hidden
        >
          <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[color:var(--foreground)] shadow-sm">
            <Chevron direction="right" />
          </div>
        </div>
      ) : null}

      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  );
}
