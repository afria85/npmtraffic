"use client";

import { useMemo, useState } from "react";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";

type Props = {
  derived: DerivedMetrics;
  series: TrafficSeriesRow[];
  days: number;
};

const formatDerived = (value: number | null) => (value == null ? "-" : value.toFixed(1));

export default function DerivedSeriesTable({ series, derived, days }: Props) {
  const [showDerived, setShowDerived] = useState(false);
  const hasDerived = useMemo(() => derived?.ma3?.length === series.length, [derived, series.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-white/10 px-4 pb-2 pt-3 text-sm text-slate-300">
        <span className="truncate text-sm font-medium text-slate-200">Daily downloads ({days} days)</span>
        <div className="ml-auto flex flex-nowrap items-center gap-2">
          {hasDerived ? (
            <button
              type="button"
              onClick={() => setShowDerived((prev) => !prev)}
              className={`${ACTION_BUTTON_CLASSES} bg-white/0 text-slate-200 hover:bg-white/10`}
            >
              {showDerived ? "Hide derived metrics" : "Show derived metrics"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="sticky top-0 bg-black/80 text-left text-xs uppercase tracking-wider text-slate-300 backdrop-blur">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Downloads</th>
              {showDerived ? <th className="px-3 py-2">MA 3</th> : null}
              {showDerived ? <th className="px-3 py-2">MA 7</th> : null}
              {showDerived ? <th className="px-3 py-2">Outlier</th> : null}
              {showDerived ? <th className="px-3 py-2">Score</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {series.map((row, index) => {
              const ma3 = derived?.ma3?.[index]?.value ?? null;
              const ma7 = derived?.ma7?.[index]?.value ?? null;
              const outlier = derived?.outliers?.[index];
              return (
                <tr key={row.date} className="text-slate-200">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-300">{row.date}</td>
                  <td className="px-3 py-2 font-mono">{row.downloads.toLocaleString("en-US")}</td>
                  {showDerived ? <td className="px-3 py-2 font-mono">{formatDerived(ma3)}</td> : null}
                  {showDerived ? <td className="px-3 py-2 font-mono">{formatDerived(ma7)}</td> : null}
                  {showDerived ? (
                    <td className="px-3 py-2 font-mono text-xs">
                      {outlier?.is_outlier ? "Yes" : "-"}
                    </td>
                  ) : null}
                  {showDerived ? (
                    <td className="px-3 py-2 font-mono text-xs">
                      {outlier?.score == null ? "-" : outlier.score.toFixed(2)}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
