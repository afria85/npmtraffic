"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDropdownDismiss } from "@/components/ui/useDropdownDismiss";

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

  const [portalRoot] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "2147483647";
    root.style.pointerEvents = "none";
    return root;
  });

  const close = useCallback(() => {
    setOpen(false);
    setMenuPosition(null);
  }, []);

  const updatePosition = useCallback((trigger: HTMLElement) => {
    if (typeof window === "undefined") return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const desiredWidth = Math.max(160, rect.width);
    const maxWidth = Math.max(window.innerWidth - margin * 2, 160);
    const width = Math.min(desiredWidth, maxWidth);
    const left = Math.min(Math.max(rect.left, margin), Math.max(margin, window.innerWidth - width - margin));
    const desiredTop = rect.bottom + 8;
    const maxTop = Math.max(window.innerHeight - 80, margin);
    const top = Math.min(desiredTop, maxTop);
    setMenuPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (!portalRoot || typeof document === "undefined") return;
    if (!portalRoot.isConnected) document.body.appendChild(portalRoot);
    return () => {
      portalRoot.remove();
    };
  }, [portalRoot]);

  // Position computation when opened
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    if (typeof window === "undefined") return;
    const raf = window.requestAnimationFrame(() => {
      if (triggerRef.current) updatePosition(triggerRef.current);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const reposition = () => {
      if (triggerRef.current) updatePosition(triggerRef.current);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  const handleMenuKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      // Basic roving focus for menuitems.
      const container = menuRef.current;
      if (!container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      if (!items.length) return;
      event.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      const current = active ? items.indexOf(active) : -1;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next =
        current === -1
          ? delta > 0
            ? 0
            : items.length - 1
          : (current + delta + items.length) % items.length;
      items[next]?.focus();
    }
  }, []);

  // Dismiss on outside click / Esc (shared controller)
  useDropdownDismiss({
    open,
    onDismiss: close,
    refs: [triggerRef, menuRef],
    onKeyDown: handleMenuKeyDown,
  });

  // When opened, focus the first menu item for predictable keyboard navigation.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const container = menuRef.current;
      const first = container?.querySelector<HTMLElement>('[role="menuitem"]');
      first?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const menuPortal =
    !open || !portalRoot || !menuPosition
      ? null
      : createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className="pointer-events-auto fixed z-[9999] min-w-[12rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
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
                  "w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

                if (isLink) {
                  return (
                    <a
                      key={item.key}
                      role="menuitem"
                      href={item.href}
                      download={item.downloadName}
                      className={common + " block"}
                      onClick={close}
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
                      close();
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
        onClick={() =>
          setOpen((v) => {
            const next = !v;
            if (!next) setMenuPosition(null);
            return next;
          })
        }
      >
        {label}
      </button>
      {menuPortal}
    </>
  );
}
