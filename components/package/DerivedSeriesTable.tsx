"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  subscribeEvents,
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

const todayUtcDate = () => new Date().toISOString().slice(0, 10);

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

  const [events, setEvents] = useState<EventEntry[]>([]);

  const refreshEvents = useCallback(() => {
    setEvents(pkgName ? loadEvents(pkgName) : []);
  }, [pkgName]);

  // Avoid hydration mismatches: event data comes from localStorage (client-only), so load it after mount.
  // eslint rule: avoid calling setState synchronously in the effect body; schedule the initial load.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const t = window.setTimeout(() => {
      refreshEvents();
    }, 0);

    const unsubscribe = pkgName ? subscribeEvents(pkgName, refreshEvents) : () => {};

    return () => {
      window.clearTimeout(t);
      unsubscribe();
    };
  }, [pkgName, refreshKey, refreshEvents]);

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

  const openEventsModal = () => {
    setForm((prev) => (prev.date_utc ? prev : { ...prev, date_utc: todayUtcDate() }));
    setShowEventsList(true);
  };

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
    setForm({ ...DEFAULT_FORM, date_utc: todayUtcDate() });
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
                onClick={openEventsModal}
                className={`${ACTION_BUTTON_CLASSES} px-2 sm:px-3 bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]`}
              >
                Events ({totalEvents})
              </button>
            ) : null}
            {hasDerived ? (
              <button
                type="button"
                onClick={() => setShowDerived((prev) => !prev)}
                className={`${ACTION_BUTTON_CLASSES} px-2 sm:px-3 bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]`}
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
            className={`w-full text-sm ${showDerived ? "min-w-[800px]" : ""}`}
            style={{ tableLayout: showDerived ? "auto" : "fixed" }}
          >
            <colgroup>
              {/* Kolom Date */}
              <col className={showDerived ? "w-auto" : "w-[30%] min-w-[100px] sm:w-[140px]"} />
              {/* Kolom Downloads */}
              <col className={showDerived ? "w-auto" : "w-[35%] min-w-[110px] sm:w-[160px]"} />
              {/* Kolom Delta */}
              <col className={showDerived ? "w-auto" : "w-[35%] min-w-[120px] sm:w-[180px]"} />
              {showDerived ? (
                <>
                  {/* MA 3 */}
                  <col className="w-auto min-w-[70px]" />
                  {/* MA 7 */}
                  <col className="w-auto min-w-[70px]" />
                  {/* Outlier */}
                  <col className="w-auto min-w-[70px]" />
                  {/* Score */}
                  <col className="w-auto min-w-[70px]" />
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
                      MA3
                    </th>
                  ) : null}
                  {showDerived ? (
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-3" title="7-day moving average">
                      MA7
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
                        <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                          <span className="min-w-0 truncate">{row.date}</span>
                          {dayEvents?.length ? (
                            <button
                              type="button"
                              onClick={openEventsModal}
                              title={dayEvents.map((event) => `${event.event_type}: ${event.label}`).join(" / ")}
                              className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--accent)]"
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-8"
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
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl shadow-black/40 max-h-[calc(100dvh-2rem)]"
          >
            <div className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-[color:var(--surface)]/95 px-6 py-5 backdrop-blur">
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
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="min-w-0 text-xs uppercase tracking-widest text-[color:var(--muted)]">
                    Date
                    <input
                      type="date"
                      value={form.date_utc}
                      onChange={(event) => setForm((prev) => ({ ...prev, date_utc: event.target.value }))}
                      className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                      required
                    />
                  </label>

                  <label className="min-w-0 text-xs uppercase tracking-widest text-[color:var(--muted)]">
                    Type
                    <div className="relative mt-1">
                      <select
                        value={form.event_type}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            event_type: event.target.value as EventEntry["event_type"],
                          }))
                        }
                        className="nt-select w-full appearance-none rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 pr-10 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                      >
                        {EVENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]" />
                    </div>
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="min-w-0 text-xs uppercase tracking-widest text-[color:var(--muted)]">
                    URL (optional)
                    <input
                      value={form.url ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value || undefined }))}
                      className="mt-1 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    />
                  </label>

                  <label className="min-w-0 text-xs uppercase tracking-widest text-[color:var(--muted)]">
                    Strength
                    <div className="relative mt-1">
                      <select
                        value={form.strength}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, strength: Number(event.target.value) as 1 | 2 | 3 }))
                        }
                        className="nt-select w-full appearance-none rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 pr-10 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                      >
                        {[1, 2, 3].map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]" />
                    </div>
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...DEFAULT_FORM, date_utc: todayUtcDate() });
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
                    className={`${ACTION_BUTTON_CLASSES}${shareEnabled ? "" : " opacity-50"}`}
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

              <div className="mt-4 space-y-3">
                {events.length ? (
                  events.map((event) => (
                    <EventRow
                      key={eventIdentifier(event)}
                      event={event}
                      onEdit={() => handleEdit(event)}
                      onDelete={() => handleDelete(event)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">No events recorded for this package.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.22 7.72a.75.75 0 0 1 1.06 0L10 11.44l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.78a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EventRow({
  event,
  onEdit,
  onDelete,
}: {
  event: EventEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Keep modal item actions visually consistent with the rest of the UI.
  const ACTION_SM =
    `${ACTION_BUTTON_CLASSES} h-8 px-3 text-xs bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-3)]`;
  const ACTION_DANGER_SM =
    `${ACTION_BUTTON_CLASSES} h-8 px-3 text-xs bg-[color:var(--surface)] border-[color:var(--border)] text-rose-700 dark:text-rose-300 hover:bg-[color:var(--surface-3)]`;

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-[color:var(--foreground)]">{event.label}</p>
          <p className="text-xs text-[color:var(--muted)]">{event.date_utc}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onEdit} className={ACTION_SM}>
            Edit
          </button>
          <button type="button" onClick={onDelete} className={ACTION_DANGER_SM}>
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
  );
}