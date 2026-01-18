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
    if (!open || !detailsRef.current || typeof document === "undefined") return undefined;
    const controller = makeDropdownController({ container: detailsRef.current, onClose: close });
    document.addEventListener("pointerdown", controller.handlePointerDown);
    document.addEventListener("keydown", controller.handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", controller.handlePointerDown);
      document.removeEventListener("keydown", controller.handleKeyDown);
    };
  }, [open, close]);

  const handleItemClick = useCallback(() => setOpen(false), []);

  return (
    <details ref={detailsRef} className="relative" open={open} data-dropdown="export">
      <summary
        className={`${ACTION_BUTTON_CLASSES} flex min-w-[96px] items-center justify-between`}
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        {label}
        <span aria-hidden className="ml-2 text-xs">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 flex w-44 flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-slate-200 shadow-lg shadow-black/50 backdrop-blur">
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
    </details>
  );
}
