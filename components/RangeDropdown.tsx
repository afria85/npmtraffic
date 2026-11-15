"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
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
  const keyboardStart = useRef<"first" | "last" | null>(null);
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
    keyboardStart.current = null;
    setOpen(false);
    setMenuPosition(null);
  }, []);

  function menuItems() {
    return [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
      .filter(item => item.getClientRects().length > 0);
  }

  function restoreFocus() {
    buttonRef.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const onTrigger = event.target === buttonRef.current;
    const { key } = event;
    if (onTrigger && (key === "ArrowDown" || key === "ArrowUp" || (!open && (key === "Enter" || key === " ")))) {
      event.preventDefault();
      const edge = key === "ArrowUp" ? "last" : "first";
      if (open) {
        menuItems().at(edge === "last" ? -1 : 0)?.focus();
      } else {
        keyboardStart.current = edge;
        setOpen(true);
      }
      return;
    }
    if (!open) return;
    if (key === "Escape" || (key === "Tab" && event.shiftKey && !onTrigger)) {
      event.preventDefault();
      if (key === "Escape") event.stopPropagation();
      restoreFocus();
      close();
      return;
    }
    if (key === "Tab") {
      requestAnimationFrame(close);
      return;
    }
    if (onTrigger || !["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
    event.preventDefault();
    const items = menuItems();
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = key === "Home" ? 0 : key === "End" ? items.length - 1
      : (index + (key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    updatePosition(buttonRef.current);
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!menuPosition || !keyboardStart.current) return;
    menuItems().at(keyboardStart.current === "last" ? -1 : 0)?.focus({ preventScroll: true });
    keyboardStart.current = null;
  }, [menuPosition]);

  useEffect(() => {
    if (!open) return;
    const breakpoint = window.matchMedia("(min-width: 48rem)");
    const reposition = () => {
      if (buttonRef.current) updatePosition(buttonRef.current);
    };
    const closeAtBreakpoint = () => {
      const active = document.activeElement;
      if (active === document.body || menuRef.current?.contains(active)) restoreFocus();
      close();
    };
    breakpoint.addEventListener("change", closeAtBreakpoint);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      breakpoint.removeEventListener("change", closeAtBreakpoint);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition, close]);

  useDropdownDismiss({
    open,
    onDismiss: close,
    closeOnEscape: false,
    refs: [containerRef],
  });

  return (
    <div
      ref={containerRef}
      className="relative"
      data-dropdown="range-more"
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <button
        type="button"
        ref={buttonRef}
        id={buttonId}
        className={MORE_SUMMARY_CLASSES}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open && menuPosition ? menuId : undefined}
        onClick={() => open ? close() : setOpen(true)}
      >
        More
        <span aria-hidden className="ml-1 inline-flex h-4 w-4 items-center justify-center opacity-80">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M5.25 7.75a.75.75 0 0 1 1.06 0L10 11.44l3.69-3.69a.75.75 0 1 1 1.06 1.06l-4.22 4.22a.75.75 0 0 1-1.06 0L5.25 8.81a.75.75 0 0 1 0-1.06z" />
          </svg>
        </span>
      </button>

      {open && menuPosition ? (
        <div className="fixed inset-0 z-[2147483647] pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto" aria-hidden onClick={close} />

          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
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
                className={moreItemClasses(item.days === currentDays) + (item.mobileOnly ? " md:hidden" : "")}
                aria-current={item.days === currentDays ? "page" : undefined}
                scroll={false}
                tabIndex={-1}
                onNavigate={() => {
                  if (menuRef.current?.contains(document.activeElement)) restoreFocus();
                  close();
                }}
                role="menuitem"
              >
                {item.days}d
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
