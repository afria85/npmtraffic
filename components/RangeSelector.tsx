import Link from "next/link";
import RangeDropdown from "./RangeDropdown";
import { PRIMARY_RANGES, MORE_RANGES, primaryButtonClasses } from "@/components/range-selector-styles";
import type { RangeSelectorProps, RangeDropdownItem } from "@/components/RangeDropdown.types";

const FAST_RANGES = new Set([7, 14]);

export default function RangeSelector({ currentDays, getHref, label = "Range" }: RangeSelectorProps) {
  // Always keep 7d + 14d as the visible "fast" pills on small screens.
  const primaryFastRanges = PRIMARY_RANGES.filter((r) => FAST_RANGES.has(r));
  const hiddenPrimaryRanges = PRIMARY_RANGES.filter((r) => !FAST_RANGES.has(r));

  const dropdownItems: RangeDropdownItem[] = MORE_RANGES.map((range): RangeDropdownItem => ({
    days: range,
    href: getHref(range),
  }));

  // Mobile dropdown contains hidden primary ranges (e.g. 30d) + the extended ranges.
  const mobileDropdownItems = hiddenPrimaryRanges
    .map((range): RangeDropdownItem => ({ days: range, href: getHref(range) }))
    .concat(dropdownItems);

  return (
    <div
      className="flex min-w-0 flex-col items-start gap-2 text-xs"
      role="group"
      aria-label={`${label} selector`}
    >
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto sm:overflow-visible">
        {primaryFastRanges.map((range) => (
          <Link
            key={range}
            href={getHref(range)}
            className={primaryButtonClasses(range === currentDays)}
            aria-current={range === currentDays ? "page" : undefined}
          >
            {range}d
          </Link>
        ))}

        {/* Hidden primary ranges (e.g. 30d) are available as pills from md+ (landscape/iPad/desktop). */}
        {hiddenPrimaryRanges.map((range) => (
          <span key={range} className="hidden md:inline-flex">
            <Link
              href={getHref(range)}
              className={primaryButtonClasses(range === currentDays)}
              aria-current={range === currentDays ? "page" : undefined}
            >
              {range}d
            </Link>
          </span>
        ))}

        {/* On small screens we use a single 'More' dropdown that also contains the hidden primary ranges. */}
        <div className="md:hidden">
          <RangeDropdown currentDays={currentDays} items={mobileDropdownItems} />
        </div>

        {/* From md+ we show the extended ranges only (since 30d is visible as a pill). */}
        <div className="hidden md:block">
          <RangeDropdown currentDays={currentDays} items={dropdownItems} />
        </div>
      </div>
    </div>
  );
}
