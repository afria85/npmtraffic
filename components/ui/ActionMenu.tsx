"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  downloadName?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export default function ActionMenu({
  label = "Menu",
  items,
  className,
  buttonClassName,
}: {
  label?: string;
  items: ActionMenuItem[];
  className?: string;
  buttonClassName?: string;
}) {
  const menuId = useId();
  const buttonId = useId();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  // Position computation when opened
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const desiredWidth = Math.max(160, rect.width);
    const margin = 8;
    const viewportWidth = typeof window === "undefined" ? rect.left + desiredWidth : window.innerWidth;
    const left = Math.min(Math.max(rect.left, margin), Math.max(margin, viewportWidth - desiredWidth - margin));
    setMenuPosition({
      top: rect.bottom + 8,
      left,
      width: desiredWidth,
    });
  }, [open]);

  // Dismiss on outside click / Esc
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const portalRoot = typeof document === "undefined" ? null : document.body;

  const menuPortal =
    !open || !portalRoot || !menuPosition
      ? null
      : createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className="fixed z-[9999] min-w-[12rem] overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface)] shadow-xl"
            style={{
              top: Math.round(menuPosition.top),
              left: Math.round(menuPosition.left),
              width: Math.max(160, Math.round(menuPosition.width)),
            }}
          >
            <div className="p-1">
              {items.map((item) => {
                const isLink = Boolean(item.href);
                const common =
                  "w-full rounded-xl px-3 py-2 text-left text-sm text-[color:var(--foreground)] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80";

                if (isLink) {
                  return (
                    <a
                      key={item.key}
                      role="menuitem"
                      href={item.href}
                      download={item.downloadName}
                      className={common + " block"}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  );
                }

                return (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className={common}
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>,
          portalRoot
        );

  return (
    <>
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        className={buttonClassName ?? className}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {menuPortal}
    </>
  );
}
