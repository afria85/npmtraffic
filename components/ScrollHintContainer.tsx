"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  children: ReactNode;
  hint?: string;
};

export default function ScrollHintContainer({ className, children, hint = "Scroll" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      // Only show hint when horizontal scrolling is possible and the user is near the start.
      const canScrollX = el.scrollWidth - el.clientWidth > 8;
      setShowHint(canScrollX && el.scrollLeft < 20);
    };

    update();

    const onScroll = () => {
      update();
    };
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
      {showHint ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-black/60 to-transparent">
          <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-200">
            {hint}
          </div>
        </div>
      ) : null}
      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  );
}
