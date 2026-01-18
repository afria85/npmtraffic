"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
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
    document.addEventListener("keydown", controller.handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", controller.handlePointerDown);
      document.removeEventListener("keydown", controller.handleKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        className={`${ACTION_BUTTON_CLASSES} flex items-center justify-between`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        {label}
        <span aria-hidden className="ml-2 text-xs">
          ▾
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 flex w-44 flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-slate-200 shadow-lg shadow-black/50 backdrop-blur">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-200 transition hover:bg-white/10"
              download={item.download}
              onClick={handleItemClick}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
