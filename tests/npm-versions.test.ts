import assert from "node:assert/strict";
import { test } from "node:test";

import { downsampleVersionMarkers, extractVersionMarkersFromTime, type VersionTimelineMarker } from "../lib/npm-versions";

function isoForDay(day: string, hour = 0) {
  return `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

test("extractVersionMarkersFromTime groups versions per UTC day and filters by range", () => {
  const time = {
    created: "2025-01-01T00:00:00.000Z",
    modified: "2025-01-10T00:00:00.000Z",
    "1.0.0": isoForDay("2025-01-01", 0),
    "1.0.1": isoForDay("2025-01-01", 12),
    "2.0.0": isoForDay("2025-01-05", 0),
    foo: isoForDay("2025-01-02", 0),
  };

  const markers = extractVersionMarkersFromTime(time, {
    startDate: "2025-01-01",
    endDate: "2025-01-04",
  });

  assert.equal(markers.length, 1);
  assert.equal(markers[0]?.date_utc, "2025-01-01");
  assert.deepEqual(markers[0]?.versions, ["1.0.0", "1.0.1"]);
});

test("downsampleVersionMarkers keeps first/last and zero-patch releases", () => {
  const markers: VersionTimelineMarker[] = [];
  // Create 50 daily markers.
  for (let i = 0; i < 50; i += 1) {
    const day = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
    markers.push({ date_utc: day, versions: [`1.0.${i}`] });
  }
  // Inject a couple of zero-patch releases and a multi-version day.
  markers[5] = { date_utc: markers[5]!.date_utc, versions: ["1.1.0"] };
  markers[20] = { date_utc: markers[20]!.date_utc, versions: ["2.0.0"] };
  markers[35] = { date_utc: markers[35]!.date_utc, versions: ["2.1.0", "2.1.1"] };

  const sampled = downsampleVersionMarkers(markers, 10);
  assert.ok(sampled.length <= 10);

  // Always keep boundary markers.
  assert.equal(sampled[0]?.date_utc, markers[0]!.date_utc);
  assert.equal(sampled[sampled.length - 1]?.date_utc, markers[markers.length - 1]!.date_utc);

  const keptDays = new Set(sampled.map((m) => m.date_utc));
  assert.ok(keptDays.has(markers[5]!.date_utc));
  assert.ok(keptDays.has(markers[20]!.date_utc));
  assert.ok(keptDays.has(markers[35]!.date_utc));
});
