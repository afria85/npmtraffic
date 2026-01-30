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
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
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
  SHARE_MAX_LENGTH,
  decodeSharePayloadV2,
} from "@/lib/events";

type Props = {
  derived: DerivedMetrics;
  series: TrafficSeriesRow[];
  pkgName: string;
  days: number;
};

type DateSortDir = "asc" | "desc";

function DateSortIcon({ dir }: { dir: DateSortDir }) {
  const d = dir === "asc" ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4";
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3 opacity-80">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [dateSortDir, setDateSortDir] = useState<DateSortDir>("desc");
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<EventEntry>(DEFAULT_FORM);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: "info" | "warning" } | null>(null);
  const [shareLinkFallback, setShareLinkFallback] = useState<string | null>(null);
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

  useEffect(() => {
    if (!statusMessage || typeof window === "undefined") return;
    const ms = shareLinkFallback ? 12000 : 3500;
    const t = window.setTimeout(() => setStatusMessage(null), ms);
    return () => window.clearTimeout(t);
  }, [statusMessage, shareLinkFallback]);

  const showStatus = (text: string, tone: "info" | "warning" = "info") =>
    setStatusMessage({ text, tone });

  const statusContent = (() => {
    if (!statusMessage && !shareLinkFallback) return null;
    const isWarning = statusMessage?.tone === "warning" || Boolean(shareLinkFallback);

    return (
      <div
        role="status"
        className={
          isWarning
            ? "nt-note-warning"
            : "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]"
        }
      >
        {statusMessage ? <p>{statusMessage.text}</p> : null}
        {shareLinkFallback ? (
          <div className="mt-2 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">Timeline link</span>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)]"
              value={shareLinkFallback}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        ) : null}
      </div>
    );
  })();

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
    rows.sort((a, b) => {
      if (a.row.date === b.row.date) return 0;
      return dateSortDir === "asc" ? a.row.date.localeCompare(b.row.date) : b.row.date.localeCompare(a.row.date);
    });
    return rows;
  }, [series, deltas, derived, dateSortDir]);

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
      showStatus("Date and label are required.", "warning");
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
      deleteEvent(pkgName, editingKey);
      addEvent(pkgName, entry);
      showStatus("Event updated.");
    } else {
      addEvent(pkgName, entry);
      showStatus("Event added.");
    }
    refreshEvents();
    setForm({ ...DEFAULT_FORM, date_utc: todayUtcDate() });
    setEditingKey(null);
    refresh();
  };

  const handleEdit = (entry: EventEntry) => {
    setForm(entry);
    setEditingKey(eventIdentifier(entry));
    setShowEventsList(true);
    showStatus("Editing event. Save to apply.");
  };

  const handleDelete = (entry: EventEntry) => {
    if (!pkgName) return;
    deleteEvent(pkgName, eventIdentifier(entry));
    showStatus("Event removed.");
    refreshEvents();
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
    showStatus(
      `Imported ${result.added} new, ${result.updated} updated.` +
        (result.errors.length ? ` ${result.errors.join(" ")}` : "")
    );
    refreshEvents();
    refresh();
  };

  const handleCopyShareLink = async () => {
    if (!shareEnabled) {
      setShareLinkFallback(null);
      if (shareTooLarge) {
        showStatus("Timeline link is too large to copy.", "warning");
      } else if (!shareEncoded) {
        showStatus("Add events to enable sharing.", "warning");
      } else {
        showStatus("No timeline link available to copy.", "warning");
      }
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("events", shareEncoded);
    const text = url.toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareLinkFallback(null);
        showStatus("Timeline link copied.");
        return;
      }
    } catch {
      // fall through
    }

    setShareLinkFallback(text);
    try {
      window.prompt("Copy timeline link:", text);
    } catch {
      // ignore
    }
    showStatus("Copy the timeline link below.", "warning");
  };

  const handleImportShared = () => {
    if (!pkgName || !sharedParam || !sharedData.events.length) return;
    const result = importEventsFromPayload(pkgName, JSON.stringify(sharedData.events));
    showStatus(
      `Imported ${result.added} new, ${result.updated} updated.` +
        (result.errors.length ? ` ${result.errors.join(" ")}` : "")
    );
    refreshEvents();
    refresh();
  };

  const sharedEvents = sharedData.events;
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground-secondary)]">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            <span className="sm:hidden">Downloads ({days}d)</span>
            <span className="hidden sm:inline">Daily downloads ({days}d)</span>
          </span>
          <div className="flex flex-none items-center justify-end gap-2">
            {totalEvents ? (
              <button
                type="button"
                onClick={openEventsModal}
                className={`${ACTION_BUTTON_CLASSES} px-2 sm:px-3 bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)]`}
              >
                Events ({totalEvents})
              </button>
            ) : null}
            {hasDerived ? (
              <button
                type="button"
                onClick={() => setShowDerived((prev) => !prev)}
                className={`${ACTION_BUTTON_CLASSES} px-2 sm:px-3 bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)]`}
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
        {statusContent ? <div className="px-4 py-3">{statusContent}</div> : null}
        <ScrollHintContainer className="max-h-[60vh] overflow-auto pt-px">
          <table
            className={`w-full text-sm ${showDerived ? "min-w-[700px] md:min-w-0 table-auto md:table-fixed" : "table-fixed"}`}
          >
            <colgroup>
              {/* Date */}
              <col className={showDerived ? "w-[74px] sm:w-[120px] md:w-[96px]" : "w-[34%] sm:w-[140px]"} />
              {/* Downloads */}
              <col className={showDerived ? "w-[88px] sm:w-[150px] md:w-[110px]" : "w-[33%] sm:w-[160px]"} />
              {/* Delta */}
              <col className={showDerived ? "w-[88px] sm:w-[170px] md:w-[120px]" : "w-[33%] sm:w-[180px]"} />
              {showDerived ? (
                <>
                  {/* MA 3 */}
                  <col className="w-[90px] md:w-[86px]" />
                  {/* MA 7 */}
                  <col className="w-[90px] md:w-[86px]" />
                  {/* Outlier */}
                  <col className="w-[70px] md:w-[70px]" />
                  {/* Score */}
                  <col className="w-[60px]" />
                </>
              ) : null}
            </colgroup>
            <thead className="sticky top-0 z-20 bg-[var(--surface)] text-xs uppercase tracking-normal text-[var(--foreground-secondary)] backdrop-blur">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap sm:px-3" title="Date (UTC)">
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
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-4" title="3-day moving average">
                      MA 3
                    </th>
                  ) : null}
                  {showDerived ? (
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap sm:px-4" title="7-day moving average">
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
              <tbody className="text-sm">
                {tableRows.map(({ row, delta, ma3, ma7, outlier }) => {
                  const dayEvents = groupedEvents.get(row.date);
                  const isOutlier = Boolean(outlier?.is_outlier);
                  return (
                    <tr key={row.date} className="text-[var(--foreground)] border-b border-[var(--border)] last:border-b-0">
                      <td className="px-2 py-2 text-left text-[11px] font-mono tabular-nums tracking-normal text-[var(--foreground-tertiary)] whitespace-nowrap sm:px-3 sm:text-xs">
                        <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                          <span className="min-w-0 truncate">{row.date}</span>
                          {dayEvents?.length ? (
                            <button
                              type="button"
                              onClick={openEventsModal}
                              title={dayEvents.map((event) => `${event.event_type}: ${event.label}`).join(" / ")}
                              className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
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
                        <td className="px-2 py-2 text-right font-mono tabular-nums whitespace-nowrap sm:px-4">{formatDerived(ma3)}</td>
                      ) : null}
                      {showDerived ? (
                        <td className="px-2 py-2 text-right font-mono tabular-nums whitespace-nowrap sm:px-4">{formatDerived(ma7)}</td>
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
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/40 max-h-[calc(100dvh-2rem)]"
          >
            <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 px-6 py-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[var(--foreground-tertiary)]">Events</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">Package timeline</p>
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
              <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="min-w-0 flex flex-col gap-2 text-xs uppercase tracking-widest text-[var(--foreground-tertiary)]">
  Date
  <DateField
    value={form.date_utc}
    onChange={(event) => setForm((prev) => ({ ...prev, date_utc: (event.target as HTMLInputElement).value }))}
    required
    inputClassName="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 pr-11 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
    iconClassName="text-[var(--foreground-tertiary)]"
  />
</label>

                  <div className="min-w-0">
  <SelectField
    label="Type"
    value={form.event_type}
    onChange={(value) =>
      setForm((prev) => ({
        ...prev,
        event_type: value as EventEntry["event_type"],
      }))
    }
    options={EVENT_TYPES.map((type) => ({ label: type, value: type }))}
    className="text-xs uppercase tracking-widest text-[var(--foreground-tertiary)]"
  />
</div>
                </div>

                <label className="flex flex-col gap-2 text-xs uppercase tracking-widest text-[var(--foreground-tertiary)]">
                  Label
                  <input
                    value={form.label}
                    onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    required
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="min-w-0 flex flex-col gap-2 text-xs uppercase tracking-widest text-[var(--foreground-tertiary)]">
                    URL (optional)
                    <input
                      value={form.url ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value || undefined }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    />
                  </label>

                  <div className="min-w-0">
  <SelectField
    label="Strength"
    value={String(form.strength)}
    onChange={(value) => setForm((prev) => ({ ...prev, strength: Number(value) as 1 | 2 | 3 }))}
    options={[1, 2, 3].map((level) => ({ label: String(level), value: String(level) }))}
    className="text-xs uppercase tracking-widest text-[var(--foreground-tertiary)]"
  />
</div>
                </div>

                <div className="flex flex-nowrap items-center justify-end gap-2 sm:hidden">
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
                    className={`${ACTION_BUTTON_CLASSES} bg-[var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90`}
                  >
                    {editingKey ? "Update event" : "Add event"}
                  </button>
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
                      { key: "share", label: "Copy timeline link", onClick: handleCopyShareLink },
                    ]}
                  />
                </div>

                <div className="hidden items-center justify-end gap-3 sm:flex">
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
                    className={`${ACTION_BUTTON_CLASSES} bg-[var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90`}
                  >
                    {editingKey ? "Update event" : "Add event"}
                  </button>
                </div>

                <div className="hidden items-center justify-between gap-3 sm:flex">
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
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    disabled={!shareEnabled}
                    className={`${ACTION_BUTTON_CLASSES}${shareEnabled ? "" : " opacity-50"}`}
                  >
                    Copy timeline link
                  </button>
                </div>

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

                {statusContent ? <div className="mt-3">{statusContent}</div> : null}

                <p className="text-xs text-[var(--foreground-tertiary)]">
                  Conflicts keep existing entries unless the import provides missing URL/strength.
                </p>
                <p className="text-xs text-[var(--foreground-tertiary)]">
                  Timeline sharing encodes events into the URL (?events=...). The URL (optional) field is only for linking a source.
                </p>
                <p className="text-xs text-[var(--foreground-tertiary)]">
                  {shareTooLarge
                    ? "Events too large to share."
                    : shareEncoded
                    ? `Share string ${shareEncoded.length} chars long.`
                    : "Add events to enable sharing."}
                </p>

                {sharedParam ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)]">
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">Shared events</p>
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
                  <p className="text-sm text-[var(--foreground-tertiary)]">No events recorded for this package.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
    `${ACTION_BUTTON_CLASSES} h-8 px-3 text-xs bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]`;
  const ACTION_DANGER_SM =
    `${ACTION_BUTTON_CLASSES} h-8 px-3 text-xs bg-[var(--surface)] border-[var(--border)] text-rose-700 dark:text-rose-300 hover:bg-[var(--surface-hover)]`;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-[var(--foreground)]">{event.label}</p>
          <p className="text-xs text-[var(--foreground-tertiary)]">{event.date_utc}</p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
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
          className="mt-1 inline-block text-xs font-medium text-[var(--accent)] underline underline-offset-4"
        >
          View link
        </a>
      ) : null}

      <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">
        {event.event_type}
        {event.strength ? ` \u00B7 strength ${event.strength}` : ""}
      </p>
    </div>
  );
}
