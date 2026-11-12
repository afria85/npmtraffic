import { ByteLimitError, readBoundedBytes } from "@/lib/bounded-bytes";

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

const EVENTS_CHANGED_EVENT = "npmtraffic:events-changed";

type EventsChangedDetail = { pkg?: string };

// Keep below typical 2k URL limits (and room for other query params).
export const SHARE_MAX_LENGTH = 1500;
export const EVENT_SHARE_MAX_BYTES = 64 * 1024;
export const EVENT_IMPORT_MAX_BYTES = 512 * 1024;
export const EVENT_MAX_COUNT = 1000;
export const EVENT_LABEL_MAX_LENGTH = 240;
export const EVENT_URL_MAX_LENGTH = 2048;

export function isValidEventType(value: string): value is EventType {
  return EVENT_TYPES.includes(value as EventType);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > EVENT_URL_MAX_LENGTH) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function normalizeEvent(event: unknown): EventEntry | null {
  if (event === null || typeof event !== "object" || Array.isArray(event)) return null;
  const prototype = Object.getPrototypeOf(event);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (["__proto__", "constructor", "prototype"].some((key) => Object.hasOwn(event, key))) return null;
  const { date_utc, event_type, label, url, strength } = event as Record<string, unknown>;
  if (!isValidDate(date_utc) || typeof event_type !== "string" || !isValidEventType(event_type)) return null;
  if (typeof label !== "string" || !label.trim() || label.length > EVENT_LABEL_MAX_LENGTH) return null;
  // Empty optional URLs were written by earlier event forms.
  if (url !== undefined && url !== "" && !isSafeHttpUrl(url)) return null;
  if (strength !== undefined && strength !== 1 && strength !== 2 && strength !== 3) return null;
  return {
    date_utc, event_type, label,
    ...(typeof url === "string" && url ? { url } : {}),
    ...(strength !== undefined ? { strength } : {}),
  };
}

export function isValidEvent(event: unknown): event is EventEntry {
  return normalizeEvent(event) !== null;
}

function storageKey(pkg: string) {
  return STORAGE_NAMESPACE + ":" + pkg.toLowerCase();
}

function sortEvents(a: EventEntry, b: EventEntry) {
  if (a.date_utc !== b.date_utc) return a.date_utc.localeCompare(b.date_utc);
  if (a.event_type !== b.event_type) return a.event_type.localeCompare(b.event_type);
  return a.label.localeCompare(b.label);
}

type EventSnapshot = { events: EventEntry[]; issue: string | null; original: string | null };

export function readEventSnapshot(pkg: string): EventSnapshot {
  if (typeof window === "undefined") return { events: [], issue: null, original: null };
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey(pkg));
  } catch {
    return { events: [], issue: "Browser storage is unavailable.", original: null };
  }
  if (raw === null) return { events: [], issue: null, original: null };

  const parsed = parseImportPayload(raw);
  return {
    events: parsed.events.sort(sortEvents),
    issue: parsed.errors.length ? "Stored events need recovery. Export the original JSON before editing." : null,
    original: raw,
  };
}

export function loadEvents(pkg: string) {
  return readEventSnapshot(pkg).events;
}

function editableEvents(pkg: string) {
  const snapshot = readEventSnapshot(pkg);
  if (snapshot.issue) throw new Error(snapshot.issue);
  return snapshot.events;
}

export function saveEvents(pkg: string, events: EventEntry[]) {
  if (typeof window === "undefined") return;
  if (events.length > EVENT_MAX_COUNT) throw new Error("Too many events for this package.");
  const valid = events.map(normalizeEvent);
  if (valid.some((event) => event === null)) throw new Error("Invalid event. Check the date, label, and optional fields.");
  const serialized = JSON.stringify((valid as EventEntry[]).sort(sortEvents), null, 2);
  if (isTooLarge(serialized, EVENT_IMPORT_MAX_BYTES)) throw new Error("Saved events exceed the byte limit.");
  try {
    window.localStorage.setItem(storageKey(pkg), serialized);
  } catch {
    throw new Error("Could not save events. Browser storage is unavailable or full.");
  }
  window.dispatchEvent?.(new CustomEvent<EventsChangedDetail>(EVENTS_CHANGED_EVENT, {
    detail: { pkg: pkg.toLowerCase() },
  }));
}

export function subscribeEvents(pkg: string, listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const key = storageKey(pkg);
  const pkgLower = pkg.toLowerCase();

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return;
    listener();
  };

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<EventsChangedDetail>).detail;
    if (detail?.pkg && detail.pkg !== pkgLower) return;
    listener();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENTS_CHANGED_EVENT, onCustom as EventListener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENTS_CHANGED_EVENT, onCustom as EventListener);
  };
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

// ---------- Encoding helpers (no any) ----------

function getNodeBufferCtor(): typeof Buffer | null {
  // Buffer exists in Node runtimes (and many Next builds), but we must not use `any`.
  const maybe = (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer;
  return typeof maybe === "function" ? maybe : null;
}

function utf8Encode(value: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value);
  const B = getNodeBufferCtor();
  if (!B) throw new Error("utf8 encoding unavailable");
  return new Uint8Array(B.from(value, "utf-8"));
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function isTooLarge(value: string, limit: number) {
  return value.length > limit || utf8Encode(value).byteLength > limit;
}

function base64EncodeBytes(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  const B = getNodeBufferCtor();
  if (!B) throw new Error("base64 encoding unavailable");
  return B.from(bytes).toString("base64");
}

function base64DecodeToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  const B = getNodeBufferCtor();
  if (!B) throw new Error("base64 decoding unavailable");
  return new Uint8Array(B.from(base64, "base64"));
}

function base64urlEncodeBytes(bytes: Uint8Array) {
  const encoded = base64EncodeBytes(bytes);
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecodeToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error("Invalid base64url");
  let padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const mod = padded.length % 4;
  if (mod === 2) padded += "==";
  else if (mod === 3) padded += "=";
  return base64DecodeToBytes(padded);
}

function base64urlEncode(value: string) {
  return base64urlEncodeBytes(utf8Encode(value));
}

function base64urlDecode(value: string) {
  return utf8Decode(base64urlDecodeToBytes(value));
}

// ---------- Compression helpers (no any) ----------

type CompressionStreamCtor = new (format: "gzip") => CompressionStream;
type DecompressionStreamCtor = new (format: "gzip") => DecompressionStream;

function getCompressionStreamCtor(): CompressionStreamCtor | null {
  const maybe = (globalThis as unknown as { CompressionStream?: CompressionStreamCtor }).CompressionStream;
  return typeof maybe === "function" ? maybe : null;
}

function getDecompressionStreamCtor(): DecompressionStreamCtor | null {
  const maybe = (globalThis as unknown as { DecompressionStream?: DecompressionStreamCtor }).DecompressionStream;
  return typeof maybe === "function" ? maybe : null;
}

async function gzipCompress(bytes: Uint8Array): Promise<Uint8Array> {
  const CS = getCompressionStreamCtor();
  if (!CS) throw new Error("compression unavailable");

  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CS("gzip"));
  return readBoundedBytes(stream, EVENT_SHARE_MAX_BYTES);
}

async function gzipCompressWithTimeout(bytes: Uint8Array, timeoutMs: number): Promise<Uint8Array> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return gzipCompress(bytes);
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<Uint8Array>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("compression timeout")), timeoutMs);
  });

  try {
    const result = (await Promise.race([gzipCompress(bytes), timeoutPromise])) as Uint8Array;
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
  const DS = getDecompressionStreamCtor();
  if (!DS) throw new Error("decompression unavailable");

  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DS("gzip"));
  return readBoundedBytes(stream, EVENT_SHARE_MAX_BYTES);
}

// ---------- Share encoding / decoding ----------

// Legacy (sync) encoding.
export function encodeSharePayload(events: EventEntry[]) {
  const payload = JSON.stringify(events);
  return base64urlEncode(payload);
}

// Legacy (sync) decoding. Supports only uncompressed payloads.
export function decodeSharePayload(encoded: string) {
  if (!encoded) return { events: [], error: null as string | null };
  if (encoded.length > SHARE_MAX_LENGTH) {
    return { events: [], error: "share payload too large" };
  }
  if (encoded.startsWith("gz:")) {
    return { events: [], error: "compressed share payload requires a modern browser" };
  }
  try {
    return parseSharedEvents(base64urlDecode(encoded));
  } catch {
    return { events: [], error: "invalid share payload" };
  }
}

function parseSharedEvents(json: string): { events: EventEntry[]; error: string | null } {
  const result = parseImportPayload(json, EVENT_SHARE_MAX_BYTES);
  if (result.errors.length) return { events: [], error: result.errors[0] };
  return result.events.length ? { events: result.events, error: null } : { events: [], error: "no valid events in share" };
}

// V2 (async) encoding with gzip when available.
export async function encodeSharePayloadV2(events: EventEntry[]) {
  const payload = JSON.stringify(events);
  if (events.length > EVENT_MAX_COUNT || isTooLarge(payload, EVENT_SHARE_MAX_BYTES)) throw new ByteLimitError();
  const bytes = utf8Encode(payload);
  try {
    // Compression should be near-instant for small payloads. If it hangs (broken implementation),
    // fall back to plain base64 so the UI doesn't get stuck in "Preparing".
    const compressed = await gzipCompressWithTimeout(bytes, 1500);
    return `gz:${base64urlEncodeBytes(compressed)}`;
  } catch {
    return base64urlEncodeBytes(bytes);
  }
}

// V2 (async) decoding supporting gzip payloads and legacy format.
export async function decodeSharePayloadV2(encoded: string): Promise<{ events: EventEntry[]; error: string | null }> {
  if (!encoded) return { events: [], error: null };
  if (encoded.length > SHARE_MAX_LENGTH) {
    return { events: [], error: "share payload too large" };
  }

  if (!encoded.startsWith("gz:")) return decodeSharePayload(encoded);
  try {
    const decompressed = await gzipDecompress(base64urlDecodeToBytes(encoded.slice(3)));
    return parseSharedEvents(utf8Decode(decompressed));
  } catch (error) {
    return { events: [], error: error instanceof ByteLimitError ? "decompressed share payload too large" : "invalid share payload" };
  }
}

export function addEvent(pkg: string, event: EventEntry) {
  const incoming = normalizeEvent(event);
  if (!incoming) throw new Error("Invalid event. Check the date, label, and optional fields.");
  const current = editableEvents(pkg);
  if (current.some((item) => eventKey(item) === eventKey(incoming))) return current;
  const next = [...current, incoming].sort(sortEvents);
  saveEvents(pkg, next);
  return next;
}

export function replaceEvent(pkg: string, previousKey: string, event: EventEntry) {
  const incoming = normalizeEvent(event);
  if (!incoming) throw new Error("Invalid event. Check the date, label, and optional fields.");
  const current = editableEvents(pkg);
  if (!current.some((item) => eventKey(item) === previousKey)) throw new Error("This event was removed in another tab.");
  if (current.some((item) => eventKey(item) !== previousKey && eventKey(item) === eventKey(incoming))) {
    throw new Error("An event with this date, type, and label already exists.");
  }
  const next = current.map((item) => eventKey(item) === previousKey ? incoming : item).sort(sortEvents);
  saveEvents(pkg, next);
  return next;
}

export function deleteEvent(pkg: string, key: string) {
  const current = editableEvents(pkg);
  const next = current.filter((item) => eventKey(item) !== key);
  if (next.length === current.length) return current;
  saveEvents(pkg, next);
  return next;
}

export function exportEvents(pkg: string) {
  const snapshot = readEventSnapshot(pkg);
  if (snapshot.issue && snapshot.original === null) throw new Error(snapshot.issue);
  return snapshot.issue ? snapshot.original! : JSON.stringify(snapshot.events, null, 2);
}

export function parseImportPayload(payload: string, limit = EVENT_IMPORT_MAX_BYTES) {
  if (isTooLarge(payload, limit)) return { events: [], errors: ["event payload too large"] };
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed)) return { events: [], errors: ["payload is not an array"] };
    if (parsed.length > EVENT_MAX_COUNT) return { events: [], errors: ["too many events in payload"] };
    const events = parsed.flatMap((entry) => {
      const event = normalizeEvent(entry);
      return event ? [event] : [];
    });
    const errors = parsed.length === events.length ? [] : ["some entries were invalid and skipped"];
    return { events, errors };
  } catch {
    return { events: [], errors: ["invalid JSON"] };
  }
}

export async function readEventImportFile(file: Blob) {
  if (file.size > EVENT_IMPORT_MAX_BYTES) throw new ByteLimitError();
  return utf8Decode(await readBoundedBytes(file.stream(), EVENT_IMPORT_MAX_BYTES));
}

export function mergeEvents(pkg: string, imported: EventEntry[]) {
  if (imported.length > EVENT_MAX_COUNT) throw new Error("Too many events in payload.");
  const current = editableEvents(pkg);
  const map = new Map<string, EventEntry>();
  current.forEach((event) => map.set(eventKey(event), event));

  let added = 0;
  let updated = 0;

  for (const event of imported) {
    const incoming = normalizeEvent(event);
    if (!incoming) continue;
    const key = eventKey(incoming);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, incoming);
      added += 1;
      continue;
    }

    const url = existing.url ?? incoming.url;
    const strength = existing.strength ?? incoming.strength;
    if (url !== existing.url || strength !== existing.strength) {
      map.set(key, { ...existing, ...(url ? { url } : {}), ...(strength ? { strength } : {}) });
      updated += 1;
    }
  }

  if (!added && !updated) return { events: current, added, updated };

  const next = Array.from(map.values()).sort(sortEvents);
  saveEvents(pkg, next);
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

/**
 * Backwards-compatible alias for {@link importEventsFromPayload}.
 *
 * Some older UI/components referred to this helper as `importEvents(...)`.
 * Prefer using `importEventsFromPayload(...)` going forward.
 */
export function importEvents(pkg: string, payload: string) {
  return importEventsFromPayload(pkg, payload);
}
