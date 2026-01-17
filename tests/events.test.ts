import assert from "node:assert/strict";
import { test } from "node:test";
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
      event_type: "release",
      label: "Release v1.0",
    })
  );
  assert.ok(!isValidEvent({ date_utc: "2025-12-01", event_type: "unknown", label: "bad" }));
  assert.ok(!isValidEvent({ date_utc: "not-a-date", event_type: "release", label: "bad" }));
});

test("load/save events sorts entries and respects schema version", () => {
  const events = [
    { date_utc: "2025-01-02", event_type: "docs", label: "Docs" },
    { date_utc: "2025-01-01", event_type: "release", label: "Release" },
  ];
  saveEvents("Pkg", events);
  const loaded = loadEvents("Pkg");
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].date_utc, "2025-01-01");
});

test("group events by date works", () => {
  const events = [
    { date_utc: "2025-01-01", event_type: "release", label: "a" },
    { date_utc: "2025-01-01", event_type: "docs", label: "b" },
  ];
  const grouped = groupEventsByDate(events);
  const dayEvents = grouped.get("2025-01-01");
  assert.equal(dayEvents?.length, 2);
});

test("add and delete events update storage", () => {
  const event = { date_utc: "2025-02-01", event_type: "blog", label: "Post" };
  addEvent("Pkg", event);
  let stored = loadEvents("Pkg");
  assert.equal(stored.length, 1);
  deleteEvent("Pkg", eventIdentifier(event));
  stored = loadEvents("Pkg");
  assert.equal(stored.length, 0);
});

test("merge events updates missing metadata", () => {
  const existing = { date_utc: "2025-03-01", event_type: "release", label: "Release" };
  saveEvents("Pkg", [existing]);
  const payload = JSON.stringify([
    { date_utc: "2025-03-01", event_type: "release", label: "Release", url: "https://example.com" },
    { date_utc: "2025-04-01", event_type: "docs", label: "Docs" },
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
    { date_utc: "not-date", event_type: "release", label: "Bad" },
    { date_utc: "2025-05-01", event_type: "release", label: "Good" },
  ]);
  const result = parseImportPayload(payload);
  assert.equal(result.events.length, 1);
  assert.equal(result.errors.length, 1);
});

test("share encode/decode roundtrip and cap enforcement", () => {
  const events = [
    { date_utc: "2025-06-01", event_type: "release", label: "Release", url: "https://example.com" },
  ];
  const encoded = encodeSharePayload(events);
  const roundtrip = decodeSharePayload(encoded);
  assert.equal(roundtrip.events.length, 1);
  assert.equal(roundtrip.error, null);
  const longLabel = "x".repeat(SHARE_MAX_LENGTH);
  const bigPayload = encodeSharePayload([{ date_utc: "2025-06-02", event_type: "docs", label: longLabel }]);
  assert.ok(bigPayload.length > SHARE_MAX_LENGTH);
  assert.equal(decodeSharePayload(bigPayload).error, "share payload too large");
});
