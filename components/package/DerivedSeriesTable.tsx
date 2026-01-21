"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";
import ScrollHintContainer from "@/components/ScrollHintContainer";
import type { DerivedMetrics } from "@/lib/derived";
import type { EventEntry } from "@/lib/events";
import type { TrafficSeriesRow } from "@/lib/traffic";
import {
  addEvent,
  deleteEvent,
  EVENT_TYPES,
  eventIdentifier,
  encodeSharePayloadV2,
  exportEvents,
  groupEventsByDate,
  importEventsFromPayload,
  loadEvents,
  updateEvent,
  SHARE_MAX_LENGTH,
  decodeSharePayloadV2,
} from "@/lib/events";

type Props = {
  derived: DerivedMetrics;
  series: TrafficSeriesRow[];
  pkgName: string;
  days: number;
};

const DEFAULT_FORM: EventEntry = {
  date_utc: "",
  event_type: EVENT_TYPES[0],
  label: "",
  url: undefined,
  strength: 1,
};

const formatDerived = (value: number | null) => (value == null ? "-" : value.toFixed(1));

export default function DerivedSeriesTable({ series, derived, pkgName, days }: Props) {
  const [showDerived, setShowDerived] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const [form, setForm] = useState<EventEntry>(DEFAULT_FORM);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [, setStatusMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const searchParams = useSearchParams();
  const sharedParam = searchParams?.get("events") ?? "";
  const [sharedData, setSharedData] = useState<{ events: EventEntry[]; error: string | null }>({ events: [], error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const decoded = await decodeSharePayloadV2(sharedParam);
      if (cancelled) return;
      setSharedData(decoded);
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedParam]);

  const events = useMemo(() => {
    void refreshKey;
    return pkgName ? loadEvents(pkgName) : [];
  }, [pkgName, refreshKey]);
  const groupedEvents = useMemo(() => groupEventsByDate(events), [events]);
  const totalEvents = events.length;
  const hasDerived = useMemo(() => derived?.ma3?.length === series.length, [derived, series.length]);

  const [shareEncoded, setShareEncoded] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!events.length) {
        setShareEncoded("");
        return;
      }
      const encoded = await encodeSharePayloadV2(events);
      if (cancelled) return;
      setShareEncoded(encoded);
    })();
    return () => {
      cancelled = true;
    };
  }, [events]);

  const shareTooLarge = shareEncoded.length > SHARE_MAX_LENGTH;
  const shareEnabled = Boolean(shareEncoded) && !shareTooLarge;

  const refresh = () => setRefreshKey((prev) => prev + 1);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pkgName) return;
    if (!form.date_utc || !form.label) {
      setStatusMessage("Date and label are required.");
      return;
    }
    const entry: EventEntry = {
      date_utc: form.date_utc,
      event_type: form.event_type,
      label: form.label,
      url: form.url,
      strength: form.strength,
    };
    if (editingKey) {
      updateEvent(pkgName, entry);
      setStatusMessage("Event updated.");
    } else {
      addEvent(pkgName, entry);
      setStatusMessage("Event added.");
    }
    setForm(DEFAULT_FORM);
    setEditingKey(null);
    refresh();
  };

  const handleEdit = (entry: EventEntry) => {
    setForm(entry);
    setEditingKey(eventIdentifier(entry));
    setShowEventsList(true);
    setStatusMessage("Editing event. Save to apply.");
  };

  const handleDelete = (entry: EventEntry) => {
    if (!pkgName) return;
    deleteEvent(pkgName, eventIdentifier(entry));
    setStatusMessage("Event removed.");
    refresh();
  };

  const handleExport = () => {
    if (!pkgName) return;
    const content = exportEvents(pkgName);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pkgName}-npmtraffic-events.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    if (!pkgName) return;
    const text = await file.text();
    const result = importEventsFromPayload(pkgName, text);
    setStatusMessage(
      `Imported ${result.added} new, ${result.updated} updated.` +
        (result.errors.length ? ` ${result.errors.join(" ")}` : "")
    );
    refresh();
  };

  const handleCopyShareLink = async () => {
    if (!shareEnabled) return;
    const url = new URL(window.location.href);
    url.searchParams.set("events", shareEncoded);
    navigator.clipboard?.writeText(url.toString());
    setStatusMessage("Share link copied.");
  };

  const handleImportShared = () => {
    if (!pkgName || !sharedParam || !sharedData.events.length) return;
    const result = importEventsFromPayload(pkgName, JSON.stringify(sharedData.events));
    setStatusMessage(
      `Imported ${result.added} new, ${result.updated} updated.` +
        (result.errors.length ? ` ${result.errors.join(" ")}` : "")
    );
    refresh();
  };

  const sharedEvents = sharedData.events;
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-sm text-slate-200">
          <span className="text-sm font-semibold">Daily downloads ({days}d)</span>
          <div className="flex flex-wrap gap-2">
            {totalEvents ? (
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
        <ScrollHintContainer className="max-h-[65vh] overflow-auto">
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
                    <td className="px-3 py-2 font-mono">{row.downloads.toLocaleString("en-US")}</td>
                    {showDerived ? <td className="px-3 py-2 font-mono">{formatDerived(ma3)}</td> : null}
                    {showDerived ? <td className="px-3 py-2 font-mono">{formatDerived(ma7)}</td> : null}
                    {showDerived ? (
                      <td className="px-3 py-2 font-mono text-emerald-300">{outlier?.is_outlier ? "Yes" : "No"}</td>
                    ) : null}
                    {showDerived ? (
                      <td className="px-3 py-2 font-mono">{outlier ? outlier.score.toFixed(2) : "-"}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollHintContainer>
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

            <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-widest text-slate-400">
                  Date
                  <input
                    type="date"
                    value={form.date_utc}
                    onChange={(event) => setForm((prev) => ({ ...prev, date_utc: event.target.value }))}
                    className="mt-1 w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                    required
                  />
                </label>
                <label className="text-xs uppercase tracking-widest text-slate-400">
                  Type
                  <select
                    value={form.event_type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, event_type: event.target.value as EventEntry["event_type"] }))
                    }
                    className="mt-1 w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-xs uppercase tracking-widest text-slate-400">
                Label
                <input
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                  className="mt-1 w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-widest text-slate-400">
                  URL (optional)
                  <input
                    value={form.url ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value || undefined }))}
                    className="mt-1 w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                  />
                </label>
                <label className="text-xs uppercase tracking-widest text-slate-400">
                  Strength
                  <select
                    value={form.strength}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, strength: Number(event.target.value) as 1 | 2 | 3 }))
                    }
                    className="mt-1 w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                  >
                    {[1, 2, 3].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className={`${ACTION_BUTTON_CLASSES} bg-emerald-500/20 text-emerald-200`}>
                  {editingKey ? "Update event" : "Add event"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(DEFAULT_FORM);
                    setEditingKey(null);
                  }}
                  className={`${ACTION_BUTTON_CLASSES} bg-white/0 text-slate-200 hover:bg-white/10`}
                >
                  Reset
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className={`${ACTION_BUTTON_CLASSES} bg-white/0 text-slate-200 hover:bg-white/10`}
                >
                  Export JSON
                </button>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 hover:border-white/30 hover:bg-white/10">
                  <span>Import JSON</span>
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleImportFile(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  disabled={!shareEnabled}
                  className={`${ACTION_BUTTON_CLASSES} ${shareEnabled ? "bg-emerald-500/20 text-emerald-200" : "opacity-50"}`}
                >
                  Copy share link
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Conflicts keep existing entries unless the import provides missing URL/strength.
              </p>
              <p className="text-xs text-slate-400">
                {shareTooLarge
                  ? "Events too large to share."
                  : shareEncoded
                  ? `Share string ${shareEncoded.length} chars long.`
                  : "Add events to enable sharing."}
              </p>

              {sharedParam ? (
                <div className="rounded-xl border border-slate-600/40 bg-slate-900/40 p-3 text-xs text-slate-300">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Shared events</p>
                  {sharedData.error ? (
                    <p className="text-emerald-200">{sharedData.error}</p>
                  ) : sharedEvents.length ? (
                    <p>{sharedEvents.length} events available to import.</p>
                  ) : (
                    <p>No share data available.</p>
                  )}
                  <button
                    type="button"
                    onClick={handleImportShared}
                    disabled={!sharedEvents.length || Boolean(sharedData.error)}
                    className={`${ACTION_BUTTON_CLASSES} bg-white/0 text-slate-200 hover:bg-white/10 mt-3`}
                  >
                    Import shared events
                  </button>
                </div>
              ) : null}
            </form>

            <div className="mt-4 space-y-3 max-h-[40vh] overflow-auto">
              {events.length ? (
                events.map((event) => (
                  <div
                    key={eventIdentifier(event)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{event.label}</p>
                        <p className="text-xs text-slate-400">{event.date_utc}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(event)}
                          className="text-xs text-emerald-200 underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event)}
                          className="text-xs text-rose-200 underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {event.event_type}
                      {event.strength ? ` · strength ${event.strength}` : ""}
                    </p>
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
