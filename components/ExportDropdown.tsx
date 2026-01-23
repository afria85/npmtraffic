"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export type ExportItem = {
  key: string;
  label: string;
  href: string;
  downloadName?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export default function ExportDropdown({
  label = "Export",
  items,
  className,
}: {
  label?: string;
  items: ExportItem[];
  className?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const id = useId();
  const buttonId = `${id}-export-toggle`;
  const menuId = `${id}-export-menu`;

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
      // Idempotent cleanup (avoid parentNode null errors when extensions move nodes)
      portalRoot.remove();
    };
  }, [portalRoot]);

  // Compute menu position when opening (rAF to avoid "setState in effect" lint)
  useLayoutEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const raf = window.requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.max(240, rect.width);
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8)
      );
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
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8)
      );
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

      // If click is inside trigger or menu => ignore
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
        id={menuId}
        role="menu"
        aria-labelledby={buttonId}
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
          {items.map((item) => {
            const downloadProps = item.downloadName ? { download: item.downloadName } : undefined;

            return (
              <a
                key={item.key}
                href={item.href}
                role="menuitem"
                className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                {...(downloadProps ?? {})}
                onClick={() => close()}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>,
      portalRoot
    );
  }, [open, portalRoot, menuPosition, items, menuId, buttonId]);

  return (
    <>
      <div className={className}>
        <button
          ref={triggerRef}
          id={buttonId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={toggle}
          className={`${ACTION_BUTTON_CLASSES} inline-flex items-center gap-2`}
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
