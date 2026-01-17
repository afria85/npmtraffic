export type EventType =
  | "release"
  | "reddit"
  | "hn"
  | "docs"
  | "blog"
  | "mention"
  | "fix"
  | "ci-change"
  | "note";

export type EventEntry = {
  date_utc: string;
  event_type: EventType;
  label: string;
  url?: string;
  strength?: 1 | 2 | 3;
};

const EVENT_TYPES: EventType[] = [
  "release",
  "reddit",
  "hn",
  "docs",
  "blog",
  "mention",
  "fix",
  "ci-change",
  "note",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STORAGE_NAMESPACE = "npmtraffic:events";
const SCHEMA_VERSION_KEY = "npmtraffic:events_schema_version";
const SCHEMA_VERSION = "1";

export function isValidEventType(value: string): value is EventType {
  return EVENT_TYPES.includes(value as EventType);
}

export function isValidDate(value: string) {
  return DATE_RE.test(value);
}

export function isValidEvent(event: unknown): event is EventEntry {
  if (!event || typeof event !== "object") return false;
  const candidate = event as Partial<EventEntry>;
  if (!candidate.date_utc || !isValidDate(candidate.date_utc)) return false;
  if (!candidate.label || typeof candidate.label !== "string") return false;
  if (!candidate.event_type || !isValidEventType(candidate.event_type)) return false;
  if (candidate.url && typeof candidate.url !== "string") return false;
  if (candidate.strength && ![1, 2, 3].includes(candidate.strength)) return false;
  return true;
}

function storageKey(pkg: string) {
  return `${STORAGE_NAMESPACE}:${pkg.toLowerCase()}`;
}

function ensureSchemaVersion() {
  if (typeof window === "undefined") return;
  const current = window.localStorage.getItem(SCHEMA_VERSION_KEY);
  if (current !== SCHEMA_VERSION) {
    window.localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
  }
}

function sortEvents(a: EventEntry, b: EventEntry) {
  if (a.date_utc !== b.date_utc) return a.date_utc.localeCompare(b.date_utc);
  if (a.event_type !== b.event_type) return a.event_type.localeCompare(b.event_type);
  return a.label.localeCompare(b.label);
}

export function loadEvents(pkg: string) {
  if (typeof window === "undefined") return [];
  ensureSchemaVersion();
  const raw = window.localStorage.getItem(storageKey(pkg));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((entry) => isValidEvent(entry));
    return valid.sort(sortEvents);
  } catch {
    return [];
  }
}

export function saveEvents(pkg: string, events: EventEntry[]) {
  if (typeof window === "undefined") return;
  ensureSchemaVersion();
  const filtered = events.filter(isValidEvent);
  window.localStorage.setItem(storageKey(pkg), JSON.stringify(filtered.sort(sortEvents)));
}

export function groupEventsByDate(events: EventEntry[]) {
  const map = new Map<string, EventEntry[]>();
  for (const event of events) {
    const list = map.get(event.date_utc) ?? [];
    list.push(event);
    map.set(event.date_utc, list);
  }
  return map;
}
