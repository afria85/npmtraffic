import assert from "node:assert/strict";
import { test } from "node:test";
import { groupEventsByDate, isValidEvent, loadEvents, saveEvents } from "../lib/events";

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
