"use client";

import type { CompareSeriesRow } from "@/lib/compare";

import { Fragment, useMemo, useState } from "react";
import ScrollHintContainer from "@/components/ScrollHintContainer";
import { COMPARE_TABLE_WRAPPER_CLASSES } from "@/components/compare/compare-classes";
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

type Props = {
  series: CompareSeriesRow[];
  packageNames: string[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

export default function CompareSeriesTable({ series, packageNames }: Props) {
  const [dateSortDir, setDateSortDir] = useState<DateSortDir>("desc");

  const [selectedPackage, setSelectedPackage] = useState("");
  const focusedPackage = packageNames.includes(selectedPackage) ? selectedPackage : "";
  const visiblePackages = focusedPackage ? [focusedPackage] : packageNames;

  const sortedSeries = useMemo(() => {
    const rows = series.slice();
    rows.sort((a, b) => {
      if (a.date === b.date) return 0;
      return dateSortDir === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
    return rows;
  }, [series, dateSortDir]);

  return (
    <>
      <label className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
        Table packages
        <select
          className="min-h-9 min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2"
          aria-label="Table packages"
          value={focusedPackage}
          onChange={(event) => setSelectedPackage(event.currentTarget.value)}
        >
          <option value="">All packages</option>
          {packageNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        {focusedPackage ? <span className="text-xs text-[var(--foreground-secondary)]">Viewing one of {packageNames.length} packages</span> : null}
      </label>
      <ScrollHintContainer
        className={COMPARE_TABLE_WRAPPER_CLASSES}
        leftHintOffset="var(--nt-date-col-w)"
        horizontalScrollHints={!focusedPackage}
      >
        <table className={focusedPackage ? "w-full table-fixed text-sm" : "min-w-[760px] w-max table-fixed text-sm sm:w-full"}>
          <caption className="sr-only">Daily observations</caption>
          <colgroup>
            <col className="w-[var(--nt-date-col-w)]" />
          </colgroup>
          {visiblePackages.map((pkg) => (
            <colgroup key={pkg}>
              <col className={focusedPackage ? undefined : "w-[120px]"} />
              <col className={focusedPackage ? undefined : "w-[140px]"} />
            </colgroup>
          ))}

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
                  className="-mx-1 inline-flex min-h-7 items-center gap-1 rounded px-1 transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                  aria-label={`Sort by date (${dateSortDir === "desc" ? "newest first" : "oldest first"})`}
                >
                  <span>Date</span>
                  <DateSortIcon dir={dateSortDir} />
                </button>
              </th>
              {visiblePackages.map((pkg) => (
                <th
                  key={`${pkg}-group`}
                  colSpan={2}
                  scope="colgroup"
                  className="px-2 py-2 text-center font-semibold whitespace-nowrap sm:px-3"
                >
                  <div className={focusedPackage ? "whitespace-normal [overflow-wrap:anywhere]" : "mx-auto max-w-[180px] truncate"} title={pkg}>
                    {pkg}
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              {visiblePackages.map((pkg) => (
                <Fragment key={`${pkg}-metrics`}>
                  <th
                    scope="col"
                    className="px-1 py-2 text-right font-semibold sm:px-3"
                    title="Downloads for the day"
                  >
                    Downloads
                  </th>
                  <th
                    scope="col"
                    className="px-1 py-2 text-right font-semibold sm:px-3"
                    title="&Delta; vs previous day"
                  >
                    &Delta; vs prev day
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
                {visiblePackages.map((pkg) => (
                  <Fragment key={`${row.date}-${pkg}-pair`}>
                    <td className="px-1 py-2 text-right font-mono tabular-nums [overflow-wrap:anywhere] sm:px-3">
                      {row.values[pkg]?.downloads != null ? numberFormatter.format(row.values[pkg].downloads) : row.values[pkg]?.status === "available" ? "Excluded" : row.values[pkg]?.status === "unverified" ? "Unverified" : "Missing"}
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
      </ScrollHintContainer>
    </>
  );
}
