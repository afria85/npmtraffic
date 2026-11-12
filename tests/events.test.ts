import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import {
  addEvent,
  deleteEvent,
  eventIdentifier,
  groupEventsByDate,
  importEventsFromPayload,
  isValidEvent,
  loadEvents,
  parseImportPayload,
  saveEvents,
  readEventSnapshot,
  readEventImportFile,
  exportEvents,
  replaceEvent,
  decodeSharePayloadV2,
  encodeSharePayloadV2,
  EVENT_IMPORT_MAX_BYTES,
  EVENT_MAX_COUNT,
} from "../lib/events";
import { decodeSharePayload, encodeSharePayload, SHARE_MAX_LENGTH } from "../lib/events";

class MockStorage implements Storage {
  private readonly values = new Map<string, string>();
  length = 0;
  clear() {
    this.values.clear();
    this.length = 0;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
    this.length = this.values.size;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
    this.length = this.values.size;
  }
}

if (!("window" in globalThis)) {
  (globalThis as unknown as { window?: typeof globalThis }).window = globalThis;
}
globalThis.window.localStorage = new MockStorage();

test.beforeEach(() => {
  globalThis.window.localStorage.clear();
});

test("event validation accepts allowed types and date", () => {
  assert.ok(
    isValidEvent({
      date_utc: "2025-12-01",
      event_type: "release" as const,
      label: "Release v1.0",
    })
  );
  assert.ok(!isValidEvent({ date_utc: "2025-12-01", event_type: "unknown", label: "bad" }));
  assert.ok(!isValidEvent({ date_utc: "not-a-date", event_type: "release" as const, label: "bad" }));

  assert.ok(!isValidEvent({ date_utc: "2025-12-01", event_type: "release" as const, label: "bad", url: "javascript:alert(1)" }));
  assert.ok(isValidEvent({ date_utc: "2025-12-01", event_type: "release" as const, label: "ok", url: "https://example.com" }));
});

test("load/save events sorts entries", () => {
  const events = [
    { date_utc: "2025-01-02", event_type: "docs" as const, label: "Docs" },
    { date_utc: "2025-01-01", event_type: "release" as const, label: "Release" },
  ];
  saveEvents("Pkg", events);
  const loaded = loadEvents("Pkg");
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].date_utc, "2025-01-01");
});

const note = { date_utc: "2026-01-01", event_type: "note" as const, label: "Note" };
const gzipShare = (value: string | Buffer) => "gz:" + gzipSync(value).toString("base64url");

test("bounded import rejects malformed fields and unsafe object keys while projecting valid fields", async () => {
  const badFields = [
    { date_utc: ["2026-01-01"] }, { date_utc: "2026-02-30" }, { strength: 0 }, { strength: null },
    { label: " " }, { label: "a".repeat(241) }, { url: false },
    { url: "https://a.test/" + "b".repeat(2048) }, { url: "data:text/html,x" },
    { url: "https://trusted.test@evil.test/" }, { event_type: "other" },
  ];
  assert.ok(badFields.every(fields => !isValidEvent({ ...note, ...fields })));
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const parsed = parseImportPayload(JSON.stringify([{ ...note, [key]: { polluted: true } }]));
    assert.equal(parsed.events.length, 0);
  }
  const deep = "[".repeat(10_000) + "0" + "]".repeat(10_000);
  const valid = parseImportPayload(JSON.stringify([note]).replace("}]", ',"extra":' + deep + "}]"));
  assert.deepEqual(valid.events, [note]);
  assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
  assert.match(parseImportPayload("[" + " ".repeat(EVENT_IMPORT_MAX_BYTES) + "]").errors[0], /too large/);
  assert.match(parseImportPayload(JSON.stringify(Array(EVENT_MAX_COUNT + 1).fill(note))).errors[0], /too many/);
  await assert.rejects(readEventImportFile(new Blob([new Uint8Array(EVENT_IMPORT_MAX_BYTES + 1)])), /byte limit/);
  await assert.rejects(readEventImportFile(new Blob([Uint8Array.of(0xff)])));
});

test("gzip and legacy shares round-trip, and oversized or invalid decompression fails promptly", { timeout: 4000 }, async () => {
  for (const share of [encodeSharePayload([note]), await encodeSharePayloadV2([note])]) {
    assert.deepEqual(await decodeSharePayloadV2(share), { events: [note], error: null });
  }
  const bomb = gzipShare(JSON.stringify([{ ...note, label: "x".repeat(300_000) }]));
  assert.ok(bomb.length < SHARE_MAX_LENGTH);
  assert.match((await decodeSharePayloadV2(bomb)).error ?? "", /decompressed.*too large/);
  for (const share of ["gz:AAAA", "gz:", gzipShare(Buffer.of(0xff)), gzipShare("[]"),
    gzipShare("[null]"), gzipShare(JSON.stringify(Array(EVENT_MAX_COUNT + 1).fill(0)))]) {
    const result = await decodeSharePayloadV2(share);
    assert.ok(result.error, share.slice(0, 20));
    assert.deepEqual(result.events, []);
  }
  assert.deepEqual(await decodeSharePayloadV2(""), { events: [], error: null });
});

test("storage failures do not delete original data or partially apply edits", () => {
  const storage = globalThis.window.localStorage;
  saveEvents("pkg", [note]);
  const original = storage.getItem("npmtraffic:events:pkg");
  const setter = storage.setItem;
  storage.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  try {
    assert.throws(() => replaceEvent("pkg", eventIdentifier(note), { ...note, label: "Edited" }), /Could not save/);
    assert.equal(storage.getItem("npmtraffic:events:pkg"), original);
  } finally {
    storage.setItem = setter;
  }
  const corrupt = JSON.stringify([note, { ...note, date_utc: "2026-02-30" }]);
  storage.setItem("npmtraffic:events:pkg", corrupt);
  assert.deepEqual(loadEvents("pkg"), [note]);
  assert.match(readEventSnapshot("pkg").issue ?? "", /recovery/);
  assert.equal(exportEvents("pkg"), corrupt);
  assert.throws(() => deleteEvent("pkg", eventIdentifier(note)), /recovery/);
  assert.equal(storage.getItem("npmtraffic:events:pkg"), corrupt);
  const getter = storage.getItem;
  storage.getItem = () => { throw new Error("Blocked"); };
  try {
    assert.deepEqual(loadEvents("pkg"), []);
    assert.match(readEventSnapshot("pkg").issue ?? "", /unavailable/);
  } finally {
    storage.getItem = getter;
  }
});

test("group events by date works", () => {
  const events = [
    { date_utc: "2025-01-01", event_type: "release" as const, label: "a" },
    { date_utc: "2025-01-01", event_type: "docs" as const, label: "b" },
  ];
  const grouped = groupEventsByDate(events);
  const dayEvents = grouped.get("2025-01-01");
  assert.equal(dayEvents?.length, 2);
});

test("add and delete events update storage", () => {
  const event = { date_utc: "2025-02-01", event_type: "blog" as const, label: "Post" };
  addEvent("Pkg", event);
  let stored = loadEvents("Pkg");
  assert.equal(stored.length, 1);
  deleteEvent("Pkg", eventIdentifier(event));
  stored = loadEvents("Pkg");
  assert.equal(stored.length, 0);
});

test("merge events updates missing metadata", () => {
  const existing = { date_utc: "2025-03-01", event_type: "release" as const, label: "Release" };
  saveEvents("Pkg", [existing]);
  const payload = JSON.stringify([
    { date_utc: "2025-03-01", event_type: "release" as const, label: "Release", url: "https://example.com" },
    { date_utc: "2025-04-01", event_type: "docs" as const, label: "Docs" },
  ]);
  const result = importEventsFromPayload("Pkg", payload);
  assert.equal(result.added, 1);
  assert.equal(result.updated, 1);
  const events = loadEvents("Pkg");
  const release = events.find((e) => e.label === "Release");
  assert.equal(release?.url, "https://example.com");
});

test("parseImportPayload rejects invalid entries", () => {
  const payload = JSON.stringify([
    { date_utc: "not-date", event_type: "release" as const, label: "Bad" },
    { date_utc: "2025-05-01", event_type: "release" as const, label: "Good" },
  ]);
  const result = parseImportPayload(payload);
  assert.equal(result.events.length, 1);
  assert.equal(result.errors.length, 1);
});

test("share encode/decode roundtrip and cap enforcement", () => {
  const events = [
    { date_utc: "2025-06-01", event_type: "release" as const, label: "Release", url: "https://example.com" },
  ];
  const encoded = encodeSharePayload(events);
  const roundtrip = decodeSharePayload(encoded);
  assert.equal(roundtrip.events.length, 1);
  assert.equal(roundtrip.error, null);
  const longLabel = "x".repeat(SHARE_MAX_LENGTH);
  const bigPayload = encodeSharePayload([{ date_utc: "2025-06-02", event_type: "docs" as const, label: longLabel }]);
  assert.ok(bigPayload.length > SHARE_MAX_LENGTH);
  assert.equal(decodeSharePayload(bigPayload).error, "share payload too large");
});
