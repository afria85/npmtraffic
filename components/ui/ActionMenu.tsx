"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type MenuPosition = { top: number; left: number; width: number };

export default function ActionMenu({
  label,
  items,
  className,
  buttonClassName,
}: {
  label: string;
  items: ActionMenuItem[];
  className?: string;
  buttonClassName?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  // Full-viewport portal root to avoid overflow clipping
  const [portalRoot] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "2147483647";
    root.style.pointerEvents = "none";
    return root;
  });

  const close = () => {
    setOpen(false);
    setMenuPosition(null);
  };

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) setMenuPosition(null);
      return next;
    });
  };

  // Mount/unmount portal root
  useEffect(() => {
    if (!portalRoot || typeof document === "undefined") return;
    if (!portalRoot.isConnected) document.body.appendChild(portalRoot);
    return () => {
      portalRoot.remove();
    };
  }, [portalRoot]);

  // Compute menu position when opening
  useLayoutEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const raf = window.requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.max(240, rect.width);
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      const top = Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 80));
      setMenuPosition({ top, left, width });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const reposition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.max(240, rect.width);
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      const top = Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 80));
      setMenuPosition({ top, left, width });
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  // Close on outside click/tap and Escape
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (trigger?.contains(target) || menu?.contains(target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menuPortal = useMemo(() => {
    if (!open || !portalRoot || !menuPosition) return null;
    return createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label={`${label} menu`}
        className="pointer-events-auto z-50 overflow-hidden rounded-xl border border-white/10 bg-[color:var(--surface)] shadow-xl"
        style={{
          position: "fixed",
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        <div className="p-2">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                item.disabled ? "cursor-not-allowed opacity-50" : "text-slate-100"
              }`}
              onClick={() => {
                if (item.disabled) return;
                item.onClick();
                close();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>,
      portalRoot
    );
  }, [open, portalRoot, menuPosition, items, label]);

  return (
    <>
      <div className={className}>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={`${buttonClassName ?? ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`}
        >
          <span>{label}</span>
          <span aria-hidden className="text-slate-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M5.25 7.75a.75.75 0 0 1 1.06 0L10 11.44l3.69-3.69a.75.75 0 1 1 1.06 1.06l-4.22 4.22a.75.75 0 0 1-1.06 0L5.25 8.81a.75.75 0 0 1 0-1.06z" />
            </svg>
          </span>
        </button>
      </div>
      {menuPortal}
    </>
  );
}
