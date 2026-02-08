"use client";

import { Fragment, useMemo, useState } from "react";
import SignedValue from "@/components/ui/SignedValue";

type DateSortDir = "asc" | "desc";

function DateSortIcon({ dir }: { dir: DateSortDir }) {
  const d = dir === "asc" ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4";
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3 opacity-80">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type CompareSeriesRow = {
  date: string;
  values: Record<string, { downloads: number; delta: number | null }>;
};

type Props = {
  series: CompareSeriesRow[];
  packageNames: string[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number | null) {
  if (value == null) return "-";
  return numberFormatter.format(value);
}

export default function CompareSeriesTable({ series, packageNames }: Props) {
  const [dateSortDir, setDateSortDir] = useState<DateSortDir>("desc");

  const sortedSeries = useMemo(() => {
    const rows = series.slice();
    rows.sort((a, b) => {
      if (a.date === b.date) return 0;
      return dateSortDir === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
    return rows;
  }, [series, dateSortDir]);

  return (
    <table className="min-w-[760px] w-max table-fixed text-sm sm:w-full">
      <colgroup>
        <col className="w-[var(--nt-date-col-w)]" />
        {packageNames.map((pkg) => (
          <Fragment key={`cols-${pkg}`}>
            <col className="w-[120px]" />
            <col className="w-[140px]" />
          </Fragment>
        ))}
      </colgroup>

      <thead className="sticky top-0 z-20 bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--foreground-secondary)] backdrop-blur">
        <tr>
          <th
            rowSpan={2}
            className="sticky left-0 z-30 bg-[var(--surface)] px-2 py-2 text-left font-semibold whitespace-nowrap sm:px-3"
            title="Date (UTC)"
          >
            <button
              type="button"
              onClick={() => setDateSortDir((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="inline-flex items-center gap-1"
              aria-label={`Sort by date (${dateSortDir === "desc" ? "newest first" : "oldest first"})`}
            >
              <span>Date</span>
              <DateSortIcon dir={dateSortDir} />
            </button>
          </th>
          {packageNames.map((pkg) => (
            <th
              key={`${pkg}-group`}
              colSpan={2}
              className="px-2 py-2 text-center font-semibold whitespace-nowrap sm:px-3"
            >
              <div className="mx-auto max-w-[180px] truncate" title={pkg}>
                {pkg}
              </div>
            </th>
          ))}
        </tr>
        <tr>
          {packageNames.map((pkg) => (
            <Fragment key={`${pkg}-metrics`}>
              <th
                scope="col"
                className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3"
                title="Downloads for the day"
              >
                Downloads
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3"
                title="&Delta; vs previous day"
              >
                <span className="hidden sm:inline">&Delta; vs prev day</span>
                <span className="sm:hidden">&Delta; vs prev day</span>
              </th>
            </Fragment>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y divide-white/10">
        {sortedSeries.map((row) => (
          <tr key={row.date} className="text-[var(--foreground)]">
            <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-2 text-left text-[11px] font-mono tabular-nums tracking-normal text-[var(--foreground-tertiary)] whitespace-nowrap sm:px-3 sm:text-xs">
              {row.date}
            </td>
            {packageNames.map((pkg) => (
              <Fragment key={`${row.date}-${pkg}-pair`}>
                <td className="px-2 py-2 text-right font-mono tabular-nums sm:px-3">
                  {formatNumber(row.values[pkg]?.downloads ?? null)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                  <SignedValue value={row.values[pkg]?.delta ?? null} showArrow emphasis="primary" />
                </td>
              </Fragment>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
