"use client";

import type { ReactNode } from "react";
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
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--foreground)]">
              <Chevron dir="left" />
            </div>
          </div>
        </div>
      ) : null}
      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-black/55 to-transparent">
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--foreground)]">
              <Chevron dir="right" />
            </div>
          </div>
        </div>
      ) : null}
      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  );
}
