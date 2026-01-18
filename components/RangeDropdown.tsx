"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
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

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export default function RangeDropdown({ currentDays, items }: RangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [portalRoot] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    return document.createElement("div");
  });
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

  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setOpen((value) => !value);
    },
    []
  );

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    updatePosition(buttonRef.current);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!portalRoot || typeof document === "undefined") return undefined;
    document.body.appendChild(portalRoot);
    return () => {
      document.body.removeChild(portalRoot);
    };
  }, [portalRoot]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const reposition = () => {
      if (buttonRef.current) {
        updatePosition(buttonRef.current);
      }
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const handlePointerDown = (event: PointerEvent | MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const menuPortal =
    open && portalRoot && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            aria-hidden={!open}
            className="z-50 flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-slate-200 shadow-lg shadow-black/50 backdrop-blur pointer-events-auto"
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
          </div>,
          portalRoot
        )
      : null;

  return (
    <>
      <div ref={containerRef} className="relative" data-dropdown="range-more">
        <button
          type="button"
          ref={buttonRef}
          id={buttonId}
          className={MORE_SUMMARY_CLASSES}
          role="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={toggle}
        >
          More
          <span aria-hidden className="ml-1 text-xs">
            ▾
          </span>
        </button>
      </div>
      {menuPortal}
    </>
  );
}
