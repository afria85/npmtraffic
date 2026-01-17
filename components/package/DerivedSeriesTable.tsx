"use client";

import { useMemo, useState } from "react";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";
import { groupEventsByDate, loadEvents } from "@/lib/events";

type Props = {
  derived: DerivedMetrics;
  series: TrafficSeriesRow[];
  pkgName: string;
};

const formatDerived = (value: number | null) => (value == null ? "-" : value.toFixed(1));

export default function DerivedSeriesTable({ series, derived, pkgName }: Props) {
  const [showDerived, setShowDerived] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const hasDerived = useMemo(() => derived?.ma3?.length === series.length, [derived, series.length]);
  const events = useMemo(() => (pkgName ? loadEvents(pkgName) : []), [pkgName]);

  const groupedEvents = useMemo(() => groupEventsByDate(events), [events]);
  const totalEvents = events.length;
  const hasEvents = totalEvents > 0;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-sm text-slate-300">
          <span>Daily downloads table</span>
          <div className="flex flex-wrap gap-2">
            {hasEvents ? (
              <button
                type="button"
                onClick={() => setShowEventsList(true)}
                className={`${ACTION_BUTTON_CLASSES} bg-white/0 text-slate-200 hover:bg-white/10`}
              >
                Events ({totalEvents})
              </button>
            ) : null}
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
        <div className="overflow-x-auto">
          <table className="min-w-[420px] w-full text-sm">
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
                const dayEvents = groupedEvents.get(row.date);

                return (
                  <tr key={row.date} className="text-slate-100">
                    <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>{row.date}</span>
                        {dayEvents?.length ? (
                          <button
                            type="button"
                            onClick={() => setShowEventsList(true)}
                            title={dayEvents.map((event) => `${event.event_type}: ${event.label}`).join(" / ")}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300"
                          >
                            <span className="text-xs font-bold">•</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.downloads.toLocaleString("en-US")}
                    </td>
                    {showDerived ? <td className="px-3 py-2 font-mono">{formatDerived(ma3)}</td> : null}
                    {showDerived ? <td className="px-3 py-2 font-mono">{formatDerived(ma7)}</td> : null}
                    {showDerived ? (
                      <td className="px-3 py-2 font-mono text-emerald-300">
                        {outlier?.is_outlier ? "Yes" : "No"}
                      </td>
                    ) : null}
                    {showDerived ? (
                      <td className="px-3 py-2 font-mono">{outlier ? outlier.score.toFixed(2) : "-"}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showEventsList ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1119] p-6 shadow-xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Events</p>
                <p className="text-lg font-semibold text-white">Package timeline</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEventsList(false)}
                className="h-9 rounded-full border border-white/10 px-3 text-xs text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-auto">
              {events.length ? (
                events.map((event) => (
                  <div
                    key={`${event.date_utc}-${event.label}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{event.label}</p>
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {event.event_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Date: {event.date_utc}</p>
                    {event.url ? (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-200 underline"
                      >
                        View link
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No events recorded for this package.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
