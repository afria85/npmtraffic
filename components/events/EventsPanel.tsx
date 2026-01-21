"use client";

import {useEffect, useMemo, useRef, useState, type ChangeEvent} from "react";
import {
  EVENT_TYPES,
  addEvent,
  decodeSharePayloadV2,
  deleteEvent,
  eventIdentifier,
  exportEvents,
  importEventsFromPayload,
  isValidDate,
  type EventEntry,
  type EventType,
} from "@/lib/events";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

type Props = {
  pkgName: string;
  encoded?: string; // from URL search param ?events=...
};

type ImportBanner =
  | { kind: "none" }
  | { kind: "ready"; encoded: string; count: number; events: EventEntry[] }
  | { kind: "error"; message: string };

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 4v12" />
      <path d="M8 12l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function todayUtc() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadEvents(pkgName: string): EventEntry[] {
  try {
    const raw = exportEvents(pkgName);
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as EventEntry[]) : [];
  } catch {
    return [];
  }
}

export default function EventsPanel({ pkgName, encoded }: Props) {
  // IMPORTANT: initialized lazily (no useEffect => passes eslint rule)
  const [events, setEvents] = useState<EventEntry[]>(() => loadEvents(pkgName));

  const [status, setStatus] = useState<string | null>(null);

  const [draftDate, setDraftDate] = useState<string>(todayUtc());
  const [draftType, setDraftType] = useState<EventType>("release");
  const [draftLabel, setDraftLabel] = useState<string>("");
  const [draftUrl, setDraftUrl] = useState<string>("");
  const [draftStrength, setDraftStrength] = useState<"" | "1" | "2" | "3">("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [dismissed, setDismissed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importBanner, setImportBanner] = useState<ImportBanner>({ kind: "none" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!encoded) {
        setImportBanner({ kind: "none" });
        return;
      }
      const decoded = await decodeSharePayloadV2(encoded);
      if (cancelled) return;
      if (decoded.error) {
        setImportBanner({ kind: "error", message: decoded.error });
        return;
      }
      setImportBanner({ kind: "ready", encoded, count: decoded.events.length, events: decoded.events });
    })();
    return () => {
      cancelled = true;
    };
  }, [encoded]);

  const grouped = useMemo(() => {
    const map = new Map<string, EventEntry[]>();
    for (const entry of events) {
      const list = map.get(entry.date_utc) ?? [];
      list.push(entry);
      map.set(entry.date_utc, list);
    }
    const dates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return dates.map((date) => ({ date, items: (map.get(date) ?? []).slice() }));
  }, [events]);

  function setStatusFor(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 3500);
  }

  function clearDraft() {
    setDraftDate(todayUtc());
    setDraftType("release");
    setDraftLabel("");
    setDraftUrl("");
    setDraftStrength("");
    setEditingKey(null);
  }

  function onSubmit() {
    const date = draftDate.trim();
    const label = draftLabel.trim();
    const url = draftUrl.trim() || undefined;
    const strength = draftStrength ? (Number(draftStrength) as 1 | 2 | 3) : undefined;

    if (!isValidDate(date)) {
      setStatusFor("Invalid date. Use YYYY-MM-DD (UTC).");
      return;
    }
    if (!label) {
      setStatusFor("Label is required.");
      return;
    }

    const entry: EventEntry = {
      date_utc: date,
      event_type: draftType,
      label,
      ...(url ? { url } : {}),
      ...(strength ? { strength } : {}),
    };

    if (editingKey) {
      // delete+add to allow edits that change identifier fields
      deleteEvent(pkgName, editingKey);
      const added = addEvent(pkgName, entry);
      setEvents(added);
      clearDraft();
      setStatusFor("Event updated.");
      return;
    }

    const next = addEvent(pkgName, entry);
    setEvents(next);
    setDraftLabel("");
    setDraftUrl("");
    setDraftStrength("");
    setStatusFor("Event added.");
  }

  function onEdit(entry: EventEntry) {
    setEditingKey(eventIdentifier(entry));
    setDraftDate(entry.date_utc);
    setDraftType(entry.event_type);
    setDraftLabel(entry.label);
    setDraftUrl(entry.url ?? "");
    setDraftStrength(entry.strength ? (String(entry.strength) as "1" | "2" | "3") : "");
  }

  function onDelete(entry: EventEntry) {
    const next = deleteEvent(pkgName, eventIdentifier(entry));
    setEvents(next);
    if (editingKey && editingKey === eventIdentifier(entry)) clearDraft();
    setStatusFor("Event deleted.");
  }

  function onExportJson() {
    const json = exportEvents(pkgName);
    const safeName = pkgName.toLowerCase().replace(/[^a-z0-9@._-]+/g, "-");
    downloadText(`events-${safeName}.json`, json);
    setStatusFor("Events exported.");
  }

  function onPickImportFile() {
    fileInputRef.current?.click();
  }

  async function onImportFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const result = importEventsFromPayload(pkgName, text);
      setEvents(result.events);
      if (result.errors?.length) {
        setStatusFor(`Imported with warnings: ${result.errors.join("; ")}`);
      } else {
        setStatusFor(`Imported: +${result.added} / updated ${result.updated}.`);
      }
    } catch {
      setStatusFor("Import failed (invalid file).");
    }
  }

  function onImportShared() {
    if (importBanner.kind !== "ready") return;
    const result = importEventsFromPayload(pkgName, JSON.stringify(importBanner.events));
    setEvents(result.events);
    setDismissed(true);
    setStatusFor(`Imported shared events: +${result.added} / updated ${result.updated}.`);
  }

  const showBanner = !dismissed && importBanner.kind !== "none";

  return (
    <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Event markers (local-first)</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Add contextual markers (releases, posts, docs changes) to explain spikes. Stored locally in your browser.
          </p>
        </div>
        <div className="ml-auto flex flex-nowrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onPickImportFile}
            className={`${ACTION_BUTTON_CLASSES} gap-2 w-10 px-0 bg-white/0 text-slate-200 hover:bg-white/10 sm:w-auto sm:px-4`}
            aria-label="Import"
          >
            <UploadIcon />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className={`${ACTION_BUTTON_CLASSES} gap-2 w-10 px-0 bg-white/0 text-slate-200 hover:bg-white/10 sm:w-auto sm:px-4`}
            aria-label="Export"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Export</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            id="events-import-file"
            aria-label="Import events JSON file"
            title="Import events JSON file"
            hidden
          />
        </div>
      </div>

      {showBanner && importBanner.kind === "ready" ? (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Shared events detected in the URL ({importBanner.count}). Import into your local markers?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onImportShared}
              className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-50 transition hover:bg-amber-300/20"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {showBanner && importBanner.kind === "error" ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          Invalid shared events payload: {importBanner.message}
        </div>
      ) : null}

      {status ? (
        <div className="mt-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--foreground)]">
          {status}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label
            htmlFor="event-date"
            className="block text-xs font-semibold text-[color:var(--foreground)]"
          >
            Date (UTC)
          </label>
          <input
            id="event-date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--ring)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="event-type"
            className="block text-xs font-semibold text-[color:var(--foreground)]"
          >
            Type
          </label>
          <select
            id="event-type"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as EventType)}
            className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--ring)]"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="event-strength"
            className="block text-xs font-semibold text-[color:var(--foreground)]"
          >
            Strength
          </label>
          <select
            id="event-strength"
            value={draftStrength}
            onChange={(e) => setDraftStrength(e.target.value as "" | "1" | "2" | "3")}
            className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--ring)]"
          >
            <option value="">None</option>
            <option value="1">1 (low)</option>
            <option value="2">2 (medium)</option>
            <option value="3">3 (high)</option>
          </select>
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor="event-label"
            className="block text-xs font-semibold text-[color:var(--foreground)]"
          >
            Label
          </label>
          <input
            id="event-label"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="e.g. v0.4.4 released"
            className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--ring)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="event-url"
            className="block text-xs font-semibold text-[color:var(--foreground)]"
          >
            URL (optional)
          </label>
          <input
            id="event-url"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--ring)]"
          />
        </div>

        <div className="sm:col-span-6 flex w-full flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onSubmit}
            className={`${ACTION_BUTTON_CLASSES} bg-[color:var(--surface-3)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]`}
          >
            {editingKey ? "Save" : "Add"}
          </button>
          {editingKey ? (
            <button
              type="button"
              onClick={clearDraft}
              className={`${ACTION_BUTTON_CLASSES} bg-[color:var(--surface-2)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-3)]`}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {events.length ? (
          <div className="space-y-3">
            {grouped.map(({ date, items }) => (
              <div key={date} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold tracking-[0.3em] text-[color:var(--foreground)]">
                    {date}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">{items.length}</span>
                </div>
                <div className="divide-y divide-[color:var(--border)]">
                  {items.map((entry) => (
                    <div
                      key={eventIdentifier(entry)}
                      className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--foreground)]">
                            {entry.event_type}
                          </span>
                          {entry.strength ? (
                            <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--foreground)]">
                              s{entry.strength}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 break-words text-sm text-[color:var(--foreground)]">{entry.label}</p>

                        {entry.url ? (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block break-all text-xs text-[color:var(--accent)] hover:underline"
                          >
                            {entry.url}
                          </a>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry)}
                          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--muted)]">No events yet. Add the first marker above.</p>
        )}
      </div>
    </section>
  );
}
