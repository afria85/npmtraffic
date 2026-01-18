"use client";

import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { makeDropdownController } from "@/lib/dropdown-controller";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

export type ExportDropdownItem = {
  label: string;
  href: string;
  download?: string;
};

type Props = {
  items: ExportDropdownItem[];
  label?: string;
};

export default function ExportDropdown({ items, label = "Export" }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const buttonId = `${id}-export-dropdown-button`;
  const menuId = `${id}-export-dropdown-menu`;

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setOpen((value) => !value);
    },
    []
  );
  const handleItemClick = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || !containerRef.current || typeof document === "undefined") return undefined;
    const controller = makeDropdownController({ container: containerRef.current, onClose: close });
    document.addEventListener("pointerdown", controller.handlePointerDown);
    document.addEventListener("touchstart", controller.handlePointerDown);
    document.addEventListener("keydown", controller.handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", controller.handlePointerDown);
      document.removeEventListener("touchstart", controller.handlePointerDown);
      document.removeEventListener("keydown", controller.handleKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        id={buttonId}
        className={`${ACTION_BUTTON_CLASSES} flex items-center justify-between`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      >
        {label}
        <span aria-hidden className="ml-2 text-xs">
          ?
        </span>
      </button>
      <div
        id={menuId}
        role="menu"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        className={`absolute right-0 z-50 mt-2 w-44 ${open ? "flex" : "hidden"} flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-slate-200 shadow-lg shadow-black/50 backdrop-blur`}
      >
        {items.map((item) => (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            role="menuitem"
            className="rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            download={item.download}
            onClick={handleItemClick}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
