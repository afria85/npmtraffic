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

// Keep below typical 2k URL limits (and room for other query params).
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
  if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(bytes);
  const B = getNodeBufferCtor();
  if (!B) throw new Error("utf8 decoding unavailable");
  return B.from(bytes).toString("utf-8");
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

  const stream = new CS("gzip");
  const writer = stream.writable.getWriter();

  // Force ArrayBuffer-backed view to satisfy TS DOM typings.
  const safeBytes = new Uint8Array(bytes);
  await writer.write(safeBytes);

  await writer.close();
  const ab = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(ab);
}

async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
  const DS = getDecompressionStreamCtor();
  if (!DS) throw new Error("decompression unavailable");

  const stream = new DS("gzip");
  const writer = stream.writable.getWriter();

  const safeBytes = new Uint8Array(bytes);
  await writer.write(safeBytes);

  await writer.close();
  const ab = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(ab);
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

// V2 (async) encoding with gzip when available.
export async function encodeSharePayloadV2(events: EventEntry[]) {
  const payload = JSON.stringify(events);
  const bytes = utf8Encode(payload);
  try {
    const compressed = await gzipCompress(bytes);
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

  try {
    if (encoded.startsWith("gz:")) {
      const raw = encoded.slice(3);
      const compressed = base64urlDecodeToBytes(raw);
      const decompressed = await gzipDecompress(compressed);
      const decoded = utf8Decode(decompressed);
      const parsed = JSON.parse(decoded);
      if (!Array.isArray(parsed)) return { events: [], error: "invalid share format" };
      const events = parsed.filter((entry) => isValidEvent(entry));
      if (!events.length) return { events: [], error: "no valid events in share" };
      return { events, error: null };
    }

    // Legacy base64url-encoded JSON.
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
