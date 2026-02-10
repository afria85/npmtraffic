"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { RangeForDaysResult } from "@/lib/query";
import {
  EVENT_TYPES,
  addEvent,
  decodeSharePayloadV2,
  deleteEvent,
  eventIdentifier,
  exportEvents,
  importEventsFromPayload,
  loadEvents,
  subscribeEvents,
  isSafeHttpUrl,
  isValidDate,
  type EventEntry,
  type EventType,
} from "@/lib/events";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";

type Props = {
  pkgName: string;
  encoded?: string; // from URL search param ?events=...
  range?: Pick<RangeForDaysResult, "startDate" | "endDate">;
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
      className="h-5 w-5"
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
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M12 4v12" />
      <path d="M8 12l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M20.6 13.2 12.8 21a2 2 0 0 1-2.8 0L3 14.9V3h11.9l5.7 5.7a2 2 0 0 1 0 2.8Z" />
      <path d="M7 7h.01" />
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

const SEMVER_LIKE_RE = /^\d+\.\d+\.\d+(?:[-+].+)?$/;

function isSemverLike(value: string) {
  return SEMVER_LIKE_RE.test(value);
}

function toUtcDay(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default function EventsPanel({ pkgName, encoded, range }: Props) {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isImportingReleases, setIsImportingReleases] = useState(false);

  const [draftDate, setDraftDate] = useState<string>("");
  const [draftType, setDraftType] = useState<EventType>("release");
  const [draftLabel, setDraftLabel] = useState<string>("");
  const [draftUrl, setDraftUrl] = useState<string>("");
  const [draftStrength, setDraftStrength] = useState<"" | "1" | "2" | "3">("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [dismissed, setDismissed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importBanner, setImportBanner] = useState<ImportBanner>({ kind: "none" });

  // Hydration-safe stable id for the form grid container.
  const reactId = useId();
  const formGridId = useMemo(() => `events-form-${reactId.replace(/:/g, "")}`, [reactId]);

  const refreshEvents = useCallback(() => {
    setEvents(pkgName ? loadEvents(pkgName) : []);
  }, [pkgName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      refreshEvents();
      setDraftDate((current) => current || todayUtc());
    }, 0);
    const unsubscribe = pkgName ? subscribeEvents(pkgName, refreshEvents) : () => {};
    return () => {
      window.clearTimeout(t);
      unsubscribe();
    };
  }, [pkgName, refreshEvents]);

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

    if (url && !isSafeHttpUrl(url)) {
      setStatusFor("Invalid URL. Use http(s)://...");
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

  async function onImportReleases() {
    if (!range) {
      setStatusFor("No range available for release import.");
      return;
    }
    if (!pkgName) return;

    setIsImportingReleases(true);
    try {
      const url = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}?fields=time`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
      const data = (await res.json()) as { time?: Record<string, string> };
      const time = data.time ?? {};

      const releases: EventEntry[] = [];
      for (const [key, iso] of Object.entries(time)) {
        if (key === "created" || key === "modified") continue;
        if (!isSemverLike(key)) continue;
        if (typeof iso !== "string") continue;
        const day = toUtcDay(iso);
        if (!day) continue;
        if (day < range.startDate || day > range.endDate) continue;

        releases.push({
          date_utc: day,
          event_type: "release",
          label: `v${key}`,
          url: `https://www.npmjs.com/package/${encodeURIComponent(pkgName)}/v/${encodeURIComponent(key)}`,
        });
      }

      if (!releases.length) {
        setStatusFor("No releases found in the current range.");
        return;
      }

      // Cap to avoid overwhelming local storage for packages with huge version histories.
      const capped = releases
        .sort((a, b) => (a.date_utc !== b.date_utc ? b.date_utc.localeCompare(a.date_utc) : a.label.localeCompare(b.label)))
        .slice(0, 500);

      const result = importEventsFromPayload(pkgName, JSON.stringify(capped));
      setEvents(result.events);

      const trimmed = releases.length > capped.length ? ` (trimmed to ${capped.length})` : "";
      if (result.errors?.length) {
        setStatusFor(`Imported releases with warnings${trimmed}: ${result.errors.join("; ")}`);
      } else {
        setStatusFor(`Imported releases${trimmed}: +${result.added} / updated ${result.updated}.`);
      }
    } catch {
      setStatusFor("Failed to import releases from registry.");
    } finally {
      setIsImportingReleases(false);
    }
  }

  const showBanner = !dismissed && importBanner.kind !== "none";

  const EVENT_ACTION_SM =
    `${ACTION_BUTTON_CLASSES} h-8 sm:h-9 px-3 sm:px-3 text-xs sm:text-xs bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]`;
  const EVENT_ACTION_DANGER_SM =
    `${ACTION_BUTTON_CLASSES} h-8 sm:h-9 px-3 sm:px-3 text-xs sm:text-xs bg-[var(--surface)] border-[var(--border)] text-rose-700 dark:text-rose-300 hover:bg-[var(--surface-hover)]`;

  // Lint-safe strength coercion (no `any`)
  const STRENGTH_VALUES = ["", "1", "2", "3"] as const;
  type StrengthValue = (typeof STRENGTH_VALUES)[number];

  function coerceStrength(value: unknown): StrengthValue {
    const v = typeof value === "string" ? value : "";
    return (STRENGTH_VALUES as readonly string[]).includes(v) ? (v as StrengthValue) : "";
  }

  return (
    <section id="events-panel" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Event markers (local-first)</h2>
          <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">
            Add contextual markers (releases, posts, docs changes) to explain spikes. Stored locally in your browser.
          </p>
        </div>
        <div className="ml-auto flex flex-nowrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onImportReleases}
            disabled={isImportingReleases || !range}
            className={`${ACTION_BUTTON_CLASSES} gap-2 h-11 w-11 px-0 sm:h-10 sm:w-auto sm:px-4 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Import releases"
            title={range ? "Import releases from npm registry into local markers" : "Release import unavailable"}
          >
            <TagIcon />
            <span className="hidden sm:inline">Releases</span>
          </button>

          <button
            type="button"
            onClick={onPickImportFile}
            className={`${ACTION_BUTTON_CLASSES} gap-2 h-11 w-11 px-0 sm:h-10 sm:w-auto sm:px-4 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]`}
            aria-label="Import"
          >
            <UploadIcon />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className={`${ACTION_BUTTON_CLASSES} gap-2 h-11 w-11 px-0 sm:h-10 sm:w-auto sm:px-4 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]`}
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
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Shared events detected in the URL ({importBanner.count}). Import into your local markers?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onImportShared}
              className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-50 transition hover:bg-amber-300/20"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {showBanner && importBanner.kind === "error" ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-900 dark:text-red-100">
          Invalid shared events payload: {importBanner.message}
        </div>
      ) : null}

      {status ? (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
          {status}
        </div>
      ) : null}

      <div
        id={formGridId}
        className="mt-4 grid grid-cols-1 gap-x-4 gap-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-6 md:gap-y-6"
      >
        <div className="min-w-0 space-y-2 md:col-span-3">
          <label
            htmlFor="event-date"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]"
          >
            Date
          </label>
          <DateField
            id="event-date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            inputClassName="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div className="min-w-0 md:col-span-3">
          <SelectField
            label="Type"
            id="event-type"
            value={draftType}
            onChange={(value) => setDraftType(value as EventType)}
            options={EVENT_TYPES.map((type) => ({ label: type, value: type }))}
            selectClassName="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 pr-12 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            iconClassName="text-[var(--foreground-secondary)]"
          />
        </div>

        <div className="min-w-0 space-y-2 md:col-span-6">
          <label
            htmlFor="event-label"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]"
          >
            Label
          </label>
          <input
            id="event-label"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="e.g. v0.4.4 released"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div className="min-w-0 space-y-2 md:col-span-3">
          <label
            htmlFor="event-url"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]"
          >
            URL (optional)
          </label>
          <input
            id="event-url"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div className="min-w-0 md:col-span-3">
          <SelectField
            label="Strength"
            id="event-strength"
            value={draftStrength}
            onChange={(value) => setDraftStrength(coerceStrength(value))}
            options={[
              { label: "None", value: "" },
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
            ]}
            selectClassName="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 pr-12 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            iconClassName="text-[var(--foreground-secondary)]"
          />
        </div>

        <div className="min-w-0 md:col-span-6 flex w-full flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onSubmit}
            className={`${ACTION_BUTTON_CLASSES} bg-[var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90`}
          >
            {editingKey ? "Save" : "Add"}
          </button>
          {editingKey ? (
            <button
              type="button"
              onClick={clearDraft}
              className={`${ACTION_BUTTON_CLASSES} bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]`}
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
              <div key={date} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold tracking-[0.3em] text-[var(--foreground)]">{date}</span>
                  <span className="text-xs text-[var(--foreground-tertiary)]">{items.length}</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {items.map((entry) => (
                    <div
                      key={eventIdentifier(entry)}
                      className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--foreground)]">
                            {entry.event_type}
                          </span>
                          {entry.strength ? (
                            <span className="rounded border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--foreground)]">
                              s{entry.strength}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 break-words text-sm text-[var(--foreground)]">{entry.label}</p>

                        {entry.url && isSafeHttpUrl(entry.url) ? (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block break-all text-xs text-[var(--accent)] hover:underline"
                          >
                            {entry.url}
                          </a>
                        ) : null}
                      </div>

                      <div className="flex w-full justify-end gap-2 sm:w-auto">
                        <button type="button" onClick={() => onEdit(entry)} className={EVENT_ACTION_SM}>
                          Edit
                        </button>
                        <button type="button" onClick={() => onDelete(entry)} className={EVENT_ACTION_DANGER_SM}>
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
          <p className="text-sm text-[var(--foreground-tertiary)]">No events yet. Add the first marker above.</p>
        )}
      </div>
    </section>
  );
}
