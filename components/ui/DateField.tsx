"use client";

import React, { useId, useRef } from "react";
import { cx } from "@/lib/cx";
import { IconCalendar } from "@/components/ui/icons";

type PickerCapableInput = HTMLInputElement & { showPicker?: () => void };

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  // Prefer the native picker when available (Chromium).
  // Fallbacks keep behavior reasonable on Safari/iOS.
  try {
    const pickerInput = input as PickerCapableInput;
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
  } catch {
    // ignore
  }
  // Fallback: focus + click can open the picker in some browsers.
  input.focus();
  input.click();
}

export function DateField({
  className,
  inputClassName,
  iconClassName,
  iconButtonClassName,
  id: providedId,
  name: providedName,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
  iconClassName?: string;
  iconButtonClassName?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const reactId = useId();
  const autoId = `date-${reactId.replace(/[:]/g, "")}`;
  const id = providedId ?? autoId;
  const name = providedName ?? id;

  return (
    <div className={cx("relative", className)}>
      <input
        {...rest}
        id={id}
        name={name}
        ref={ref}
        type="date"
        className={cx("nt-date w-full min-w-0 pr-12 appearance-none", inputClassName)}
      />

      <button
        type="button"
        aria-label="Open calendar"
        onClick={() => openNativeDatePicker(ref.current)}
        className={cx(
          "absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--foreground-tertiary)]",
          "hover:bg-[var(--surface-hover)] hover:text-[var(--foreground-secondary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          iconButtonClassName
        )}
      >
        <IconCalendar className={cx("h-4 w-4", iconClassName)} />
      </button>
    </div>
  );
}
