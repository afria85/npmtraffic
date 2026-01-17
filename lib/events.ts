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

export const EVENT_TYPES: EventType[] = [
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

export const SHARE_MAX_LENGTH = 1500;

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

function persistEvents(pkg: string, events: EventEntry[]) {
  if (typeof window === "undefined") return;
  ensureSchemaVersion();
  const filtered = events.filter(isValidEvent);
  window.localStorage.setItem(storageKey(pkg), JSON.stringify(filtered.sort(sortEvents)));
}

export function saveEvents(pkg: string, events: EventEntry[]) {
  persistEvents(pkg, events);
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

function eventKey(event: EventEntry) {
  return `${event.date_utc}|${event.event_type}|${event.label}`;
}

export function eventIdentifier(event: EventEntry) {
  return eventKey(event);
}

function base64urlEncode(value: string) {
  const encoded = Buffer.from(value, "utf-8").toString("base64");
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string) {
  let padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const mod = padded.length % 4;
  if (mod === 2) padded += "==";
  else if (mod === 3) padded += "=";
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function encodeSharePayload(events: EventEntry[]) {
  const payload = JSON.stringify(events);
  return base64urlEncode(payload);
}

export function decodeSharePayload(encoded: string) {
  if (!encoded) return { events: [], error: null };
  if (encoded.length > SHARE_MAX_LENGTH) {
    return { events: [], error: "share payload too large" };
  }
  try {
    const decoded = base64urlDecode(encoded);
    const parsed = JSON.parse(decoded);
    if (!Array.isArray(parsed)) return { events: [], error: "invalid share format" };
    const events = parsed.filter((entry) => isValidEvent(entry));
    if (!events.length) return { events: [], error: "no valid events in share" };
    return { events, error: null };
  } catch {
    return { events: [], error: "invalid share payload" };
  }
}

export function addEvent(pkg: string, event: EventEntry) {
  if (!isValidEvent(event)) return loadEvents(pkg);
  const current = loadEvents(pkg);
  if (current.find((item) => eventKey(item) === eventKey(event))) {
    return current;
  }
  const next = [...current, event];
  saveEvents(pkg, next);
  return next;
}

export function updateEvent(pkg: string, event: EventEntry) {
  if (!isValidEvent(event)) return loadEvents(pkg);
  const current = loadEvents(pkg);
  let changed = false;
  const next = current.map((item) => {
    if (eventKey(item) !== eventKey(event)) return item;
    changed = true;
    return event;
  });
  if (!changed) return current;
  saveEvents(pkg, next);
  return next;
}

export function deleteEvent(pkg: string, key: string) {
  const current = loadEvents(pkg);
  const next = current.filter((item) => eventKey(item) !== key);
  if (next.length === current.length) return current;
  saveEvents(pkg, next);
  return next;
}

export function exportEvents(pkg: string) {
  return JSON.stringify(loadEvents(pkg), null, 2);
}

export function parseImportPayload(payload: string) {
  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) return { events: [], errors: ["payload is not an array"] };
    const events = parsed.filter((entry) => isValidEvent(entry));
    const errors = parsed.length === events.length ? [] : ["some entries were invalid and skipped"];
    return { events, errors };
  } catch {
    return { events: [], errors: ["invalid JSON"] };
  }
}

export function mergeEvents(pkg: string, imported: EventEntry[]) {
  const current = loadEvents(pkg);
  const map = new Map<string, EventEntry>();
  current.forEach((event) => map.set(eventKey(event), event));

  let added = 0;
  let updated = 0;

  for (const incoming of imported) {
    if (!isValidEvent(incoming)) continue;
    const key = eventKey(incoming);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, incoming);
      added += 1;
      continue;
    }

    const needsUpdate =
      (!existing.url && incoming.url) ||
      (!existing.strength && incoming.strength) ||
      incoming.url !== existing.url ||
      incoming.strength !== existing.strength;
    if (needsUpdate) {
      const merged: EventEntry = {
        ...existing,
        url: existing.url || incoming.url,
        strength: existing.strength || incoming.strength,
      };
      map.set(key, merged);
      updated += 1;
    }
  }

  if (!added && !updated) return { events: current, added, updated };

  const next = Array.from(map.values()).sort(sortEvents);
  persistEvents(pkg, next);
  return { events: next, added, updated };
}

export function importEventsFromPayload(pkg: string, payload: string) {
  const parsed = parseImportPayload(payload);
  if (!parsed.events.length) {
    return { events: loadEvents(pkg), added: 0, updated: 0, errors: parsed.errors };
  }
  const merged = mergeEvents(pkg, parsed.events);
  return { ...merged, errors: parsed.errors };
}
