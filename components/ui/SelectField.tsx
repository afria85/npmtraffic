"use client";

import React from "react";
import { cx } from "@/lib/cx";
import { IconChevronDown } from "@/components/ui/icons";

type Props = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  className?: string;
  selectClassName?: string;
  id?: string;
  name?: string;
  iconClassName?: string;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  selectClassName,
  id,
  name,
  iconClassName,
}: Props) {
  return (
    <label className={cx("block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]", className)}>
      {label}
      <div className="relative mt-2">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cx(
            "nt-select w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
            selectClassName
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown
          className={cx(
            "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 mt-[1px] text-[var(--foreground-tertiary)]",
            iconClassName
          )}
        />
      </div>
    </label>
  );
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return <IconChevronDown className={className} />;
}

export const SelectInput = SelectField;

export default SelectField;
