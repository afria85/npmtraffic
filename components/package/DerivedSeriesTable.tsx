"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";
import ScrollHintContainer from "@/components/ScrollHintContainer";
import SignedValue from "@/components/ui/SignedValue";
import StatusPill from "@/components/ui/StatusPill";
import ActionMenu from "@/components/ui/ActionMenu";
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

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

  // Modal a11y: focus management + Escape/Tab handling.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!showEventsList) return;

    const previousActive = document.activeElement as HTMLElement | null;
    // Focus the close button first for predictable keyboard navigation.
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowEventsList(false);
        return;
      }
      if (event.key !== "Tab") return;

      const container = modalRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, details summary, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (!active || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to the element that opened the modal.
      previousActive?.focus?.();
    };
  }, [showEventsList]);

  const events = useMemo(() => {
    void refreshKey;
    return pkgName ? loadEvents(pkgName) : [];
  }, [pkgName, refreshKey]);
  const groupedEvents = useMemo(() => groupEventsByDate(events), [events]);
  const totalEvents = events.length;
  const hasDerived = useMemo(() => derived?.ma3?.length === series.length, [derived, series.length]);
  const deltas = useMemo(() => {
    const values: (number | null)[] = [];
    for (let i = 0; i < series.length; i += 1) {
      if (i === 0) {
        values.push(null);
        continue;
      }
      const previous = series[i - 1];
      values.push(series[i].downloads - previous.downloads);
    }
    return values;
  }, [series]);

  const tableRows = useMemo(() => {
    const rows = series.map((row, index) => ({
      row,
      delta: deltas[index],
      ma3: derived?.ma3?.[index]?.value ?? null,
      ma7: derived?.ma7?.[index]?.value ?? null,
      outlier: derived?.outliers?.[index] ?? null,
    }));
    return rows.slice().reverse();
  }, [series, deltas, derived]);

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
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4 py-3 text-sm text-slate-200">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">Daily downloads ({days}d)</span>
          <div className="flex flex-none items-center justify-end gap-2">
            {totalEvents ? (
              <button
                type="button"
                onClick={() => setShowEventsList(true)}
                className={`${ACTION_BUTTON_CLASSES} bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]`}
              >
                Events ({totalEvents})
              </button>
            ) : null}
            {hasDerived ? (
              <button
                type="button"
                onClick={() => setShowDerived((prev) => !prev)}
                className={`${ACTION_BUTTON_CLASSES} bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]`}
                title={showDerived ? "Hide derived metrics" : "Show derived metrics"}
              >
                {showDerived ? (
                  <>
                    <span className="sm:hidden">Hide metrics</span>
                    <span className="hidden sm:inline">Hide derived metrics</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Show metrics</span>
                    <span className="hidden sm:inline">Show derived metrics</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
        <ScrollHintContainer className="max-h-[60vh] overflow-auto">
          <table
            className={
              showDerived
                ? "min-w-[560px] w-max table-fixed text-sm sm:w-full"
                : "w-full table-fixed text-sm"
            }
          >
            <colgroup>
              <col className="w-[38%] sm:w-[130px]" />
              <col className="w-[22%] sm:w-[98px]" />
              <col className="w-[40%] sm:w-[110px]" />
              {showDerived ? (
                <>
                  <col className="w-[86px]" />
                  <col className="w-[86px]" />
                  <col className="w-[80px]" />
                  <col className="w-[92px]" />
                </>
              ) : null}
            </colgroup>
            <thead className="sticky top-0 z-20 bg-[color:var(--surface)] text-xs uppercase tracking-normal text-slate-200 backdrop-blur">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap sm:px-3" title="Date (UTC)">
                    Date
                  </th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3" title="Downloads for the day">
                    Downloads
                  </th>
                  <th
                    className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3"
                    title={"\u0394 vs previous day"}
                  >
                    &Delta; vs prev day
                  </th>
                  {showDerived ? (
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3" title="3-day moving average">
                      MA 3
                    </th>
                  ) : null}
                  {showDerived ? (
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3" title="7-day moving average">
                      MA 7
                    </th>
                  ) : null}
                  {showDerived ? (
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap sm:px-3" title="Outlier flag">
                      Outlier
                    </th>
                  ) : null}
                  {showDerived ? (
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3" title="Outlier score">
                      Score
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ row, delta, ma3, ma7, outlier }) => {
                  const dayEvents = groupedEvents.get(row.date);
                  const isOutlier = Boolean(outlier?.is_outlier);
                  return (
                    <tr key={row.date} className="text-[color:var(--foreground)] border-b border-[color:var(--border)] last:border-b-0">
                      <td className="px-2 py-2 text-left text-[11px] font-mono tabular-nums tracking-normal text-slate-400 whitespace-nowrap sm:px-3 sm:text-xs">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span>{row.date}</span>
                          {dayEvents?.length ? (
                            <button
                              type="button"
                              onClick={() => setShowEventsList(true)}
                              title={dayEvents.map((event) => `${event.event_type}: ${event.label}`).join(" / ")}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--accent)]"
                            >
                              <span className="text-xs font-bold">&bull;</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums whitespace-nowrap sm:px-3">
                        {row.downloads.toLocaleString("en-US")}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap sm:px-3">
                        <SignedValue value={delta} showArrow emphasis="primary" />
                      </td>
                      {showDerived ? (
                        <td className="px-2 py-2 text-right font-mono tabular-nums whitespace-nowrap sm:px-3">{formatDerived(ma3)}</td>
                      ) : null}
                      {showDerived ? (
                        <td className="px-2 py-2 text-right font-mono tabular-nums whitespace-nowrap sm:px-3">{formatDerived(ma7)}</td>
                      ) : null}
                      {showDerived ? (
                        <td className="px-2 py-2 text-center whitespace-nowrap sm:px-3">
                          <span className="inline-flex justify-center">
                            <StatusPill status={isOutlier ? "YES" : "NO"} />
                          </span>
                        </td>
                      ) : null}
                      {showDerived ? (
                        <td className="px-2 py-2 text-right whitespace-nowrap sm:px-3">
                          <SignedValue value={outlier?.score ?? null} emphasis="secondary" precision={2} />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </ScrollHintContainer>
      </div>

      {showEventsList ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8"
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowEventsList(false);
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Package timeline"
            className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-xl shadow-black/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--muted)]">Events</p>
                <p className="text-lg font-semibold text-[color:var(--foreground)]">Package timeline</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setShowEventsList(false)}
                className={ACTION_BUTTON_CLASSES}
              >
                Close
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  Date
                  <input
                    type="date"
                    value={form.date_utc}
                    onChange={(event) => setForm((prev) => ({ ...prev, date_utc: event.target.value }))}
                    className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    required
                  />
                </label>
                <label className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  Type
                  <select
                    value={form.event_type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, event_type: event.target.value as EventEntry["event_type"] }))
                    }
                    className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                Label
                <input
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                  className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  URL (optional)
                  <input
                    value={form.url ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value || undefined }))}
                    className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  />
                </label>
                <label className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  Strength
                  <select
                    value={form.strength}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, strength: Number(event.target.value) as 1 | 2 | 3 }))
                    }
                    className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  >
                    {[1, 2, 3].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForm(DEFAULT_FORM);
                    setEditingKey(null);
                  }}
                  className={ACTION_BUTTON_CLASSES}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className={`${ACTION_BUTTON_CLASSES} bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90`}
                >
                  {editingKey ? "Update event" : "Add event"}
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <ActionMenu
                    label="Actions"
                    buttonClassName={ACTION_BUTTON_CLASSES}
                    items={[
                      { key: "export", label: "Export JSON", onClick: handleExport },
                      {
                        key: "import",
                        label: "Import JSON\u2026",
                        onClick: () => {
                          importFileRef.current?.click();
                        },
                      },
                    ]}
                  />
                  <input
                    ref={importFileRef}
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
                </div>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  disabled={!shareEnabled}
                  className={`${ACTION_BUTTON_CLASSES} ${
                    shareEnabled ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90" : "opacity-50"
                  }`}
                >
                  Copy share link
                </button>
              </div>

              <p className="text-xs text-[color:var(--muted)]">
                Conflicts keep existing entries unless the import provides missing URL/strength.
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {shareTooLarge
                  ? "Events too large to share."
                  : shareEncoded
                  ? `Share string ${shareEncoded.length} chars long.`
                  : "Add events to enable sharing."}
              </p>

              {sharedParam ? (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-xs text-[color:var(--foreground)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">Shared events</p>
                  {sharedData.error ? (
                    <p className="mt-1 text-[color:var(--warning)]">{sharedData.error}</p>
                  ) : sharedEvents.length ? (
                    <p className="mt-1">{sharedEvents.length} events available to import.</p>
                  ) : (
                    <p className="mt-1">No share data available.</p>
                  )}
                  <button
                    type="button"
                    onClick={handleImportShared}
                    disabled={!sharedEvents.length || Boolean(sharedData.error)}
                    className={`${ACTION_BUTTON_CLASSES} mt-3`}
                  >
                    Import shared events
                  </button>
                </div>
              ) : null}
            </form>

            <div className="mt-4 max-h-[40vh] space-y-3 overflow-auto pr-1">
              {events.length ? (
                events.map((event) => (
                  <div
                    key={eventIdentifier(event)}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[color:var(--foreground)]">{event.label}</p>
                        <p className="text-xs text-[color:var(--muted)]">{event.date_utc}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(event)}
                          className="text-xs font-medium text-[color:var(--accent)] underline underline-offset-4"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event)}
                          className="text-xs font-medium underline underline-offset-4 text-[color:var(--danger)]"
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
                        className="mt-1 inline-block text-xs font-medium text-[color:var(--accent)] underline underline-offset-4"
                      >
                        View link
                      </a>
                    ) : null}
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      {event.event_type}
                      {event.strength ? ` \u00B7 strength ${event.strength}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[color:var(--muted)]">No events recorded for this package.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
