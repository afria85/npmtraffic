import Link from "next/link";
import RangeDropdown from "./RangeDropdown";
import { PRIMARY_RANGES, MORE_RANGES, primaryButtonClasses } from "@/components/range-selector-styles";
import type { RangeSelectorProps, RangeDropdownItem } from "@/components/RangeDropdown.types";

export default function RangeSelector({ currentDays, getHref, label = "Range" }: RangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label={`${label} selector`}>
      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{label}</span>
      {PRIMARY_RANGES.map((range) => (
        <Link
          key={range}
          href={getHref(range)}
          className={primaryButtonClasses(range === currentDays)}
          aria-current={range === currentDays ? "page" : undefined}
        >
          {range}d
        </Link>
      ))}
      <RangeDropdown
        currentDays={currentDays}
        items={MORE_RANGES.map((range): RangeDropdownItem => ({ days: range, href: getHref(range) }))}
      />
    </div>
  );
}
