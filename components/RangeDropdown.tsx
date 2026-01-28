"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  moreItemClasses,
  MORE_SUMMARY_CLASSES,
} from "@/components/range-selector-styles";
import type { RangeDropdownProps } from "@/components/RangeDropdown.types";
import { useDropdownDismiss } from "@/components/ui/useDropdownDismiss";

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export default function RangeDropdown({ currentDays, items }: RangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const buttonId = `${id}-range-more-toggle`;
  const menuId = `${id}-range-more-menu`;

  const updatePosition = useCallback(
    (element: HTMLElement) => {
      if (typeof window === "undefined") return;
      const rect = element.getBoundingClientRect();
      const availableWidth = Math.max(window.innerWidth - 16, 120);
      const minWidth = Math.min(Math.max(rect.width, 120), availableWidth);
      const maxLeft = Math.max(window.innerWidth - minWidth - 8, 8);
      const left = Math.min(Math.max(rect.left, 8), maxLeft);
      const desiredTop = rect.bottom + 8;
      const maxTop = Math.max(window.innerHeight - 80, 8);
      const top = Math.min(desiredTop, maxTop);
      setMenuPosition({ top, left, minWidth });
    },
    [setMenuPosition]
  );

  const close = useCallback(() => {
    setOpen(false);
    setMenuPosition(null);
  }, []);

  const toggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen((value) => !value);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    updatePosition(buttonRef.current);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const reposition = () => {
      if (buttonRef.current) updatePosition(buttonRef.current);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  useDropdownDismiss({
    open,
    onDismiss: close,
    refs: [containerRef, menuRef],
  });

  return (
    <>
      <div ref={containerRef} className="relative" data-dropdown="range-more">
        <button
          type="button"
          ref={buttonRef}
          id={buttonId}
          className={MORE_SUMMARY_CLASSES}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={toggle}
        >
          More
          <span aria-hidden className="ml-1 inline-flex h-4 w-4 items-center justify-center opacity-80">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M5.25 7.75a.75.75 0 0 1 1.06 0L10 11.44l3.69-3.69a.75.75 0 1 1 1.06 1.06l-4.22 4.22a.75.75 0 0 1-1.06 0L5.25 8.81a.75.75 0 0 1 0-1.06z" />
            </svg>
          </span>
        </button>
      </div>

      {open && menuPosition ? (
        <div className="fixed inset-0 z-[2147483647] pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto" aria-hidden onClick={close} />

          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            aria-hidden={!open}
            className="pointer-events-auto z-50 flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)] shadow-lg shadow-black/50"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
            }}
          >
            {items.map((item) => (
              <Link
                key={item.days}
                href={item.href}
                className={moreItemClasses(item.days === currentDays)}
                aria-current={item.days === currentDays ? "page" : undefined}
                onClick={close}
                role="menuitem"
              >
                {item.days}d
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
