"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { makeDropdownController } from "@/lib/dropdown-controller";
import {
  MORE_RANGES,
  moreItemClasses,
  MORE_SUMMARY_CLASSES,
} from "@/components/range-selector-styles";
import type { RangeSelectorProps } from "@/components/RangeDropdown.types";

export default function RangeDropdown({ currentDays, getHref }: RangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setOpen((value) => !value);
    },
    []
  );

  useEffect(() => {
    if (!open || !detailsRef.current) return undefined;
    const controller = makeDropdownController({
      container: detailsRef.current,
      onClose: close,
    });
    document.addEventListener("pointerdown", controller.handlePointerDown);
    document.addEventListener("keydown", controller.handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", controller.handlePointerDown);
      document.removeEventListener("keydown", controller.handleKeyDown);
    };
  }, [open, close]);

  const handleItemClick = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <details
      ref={detailsRef}
      className="relative"
      open={open}
      data-dropdown="range-more"
    >
      <summary
        className={MORE_SUMMARY_CLASSES}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        More
        <span aria-hidden className="ml-1 text-xs">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 flex w-40 flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-slate-200 shadow-lg shadow-black/50 backdrop-blur">
        {MORE_RANGES.map((range) => (
          <Link
            key={range}
            href={getHref(range)}
            className={moreItemClasses(range === currentDays)}
            aria-current={range === currentDays ? "page" : undefined}
            onClick={handleItemClick}
          >
            {range}d
          </Link>
        ))}
      </div>
    </details>
  );
}
