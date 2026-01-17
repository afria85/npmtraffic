import Link from "next/link";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

const PRIMARY_RANGES = [7, 14, 30];
const MORE_RANGES = [90, 180, 365];

type RangeSelectorProps = {
  currentDays: number;
  getHref: (days: number) => string;
  label?: string;
};

function buttonClasses(isActive: boolean) {
  return `${ACTION_BUTTON_CLASSES} ${
    isActive ? "bg-white text-black border-white" : "text-slate-200 hover:bg-white/10"
  }`;
}

export default function RangeSelector({
  currentDays,
  getHref,
  label = "Range",
}: RangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label={`${label} selector`}>
      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{label}</span>
      {PRIMARY_RANGES.map((range) => (
        <Link
          key={range}
          href={getHref(range)}
          className={buttonClasses(range === currentDays)}
          aria-current={range === currentDays ? "page" : undefined}
        >
          {range}d
        </Link>
      ))}

      <details className="relative">
        <summary className={`${ACTION_BUTTON_CLASSES} list-none text-[0.65rem] font-semibold uppercase tracking-[0.35em]`}>
          More
          <span aria-hidden className="ml-1 text-xs">
            ▾
          </span>
        </summary>
        <div className="absolute right-0 z-10 mt-2 flex w-40 flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-slate-200 shadow-lg shadow-black/50 backdrop-blur">
          {MORE_RANGES.map((range) => (
            <Link
              key={range}
              href={getHref(range)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                range === currentDays ? "bg-white text-black" : "text-slate-200 hover:bg-white/10"
              }`}
              aria-current={range === currentDays ? "page" : undefined}
            >
              {range}d
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
