import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReleaseImports, downsampleVersionMarkers, extractVersionMarkersFromTime, type VersionTimelineMarker } from "../lib/npm-versions";
import { classifyVersion } from "../lib/npm-semver";

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

test("SemVer build metadata stays stable and all valid prerelease identifiers are separated", () => {
  for (const suffix of ["alpha", "beta.2", "rc.0", "canary.2025", "experimental", "preview-123", "0"]) {
    assert.equal(classifyVersion("1.2.3-" + suffix + "+build"), "prerelease");
  }
  assert.equal(classifyVersion("1.2.3+build.01"), "stable");
  for (const version of ["1.02.3", "1.2", "v1.2.3", "1.2.3-alpha.01", "1.2.3+", "1.2.3\n"]) {
    assert.equal(classifyVersion(version), null);
  }
});

test("release import keeps original publication timestamps and bounds each selection independently", () => {
  const range = { startDate: "2025-12-31", endDate: "2026-01-01" };
  const time = Object.fromEntries(Array.from({ length: 505 }, (_, index) => [
    "1.0." + index, "2025-12-31T23:00:00.000Z",
  ]));
  const publishedAt = "2026-01-02T00:15:00+01:00";
  Object.assign(time, {
    "2.0.0-rc.1": publishedAt,
    "3.0.0": "2026-01-02T00:00:00Z",
    "4.0.0": "2025-12-31",
  });
  const result = buildReleaseImports(time, range, true);
  assert.equal(result.stable.total, 505);
  assert.equal(result.all.total, 506);
  assert.equal(result.stable.entries.length, 500);
  assert.equal(result.all.entries.length, 500);
  assert.equal(result.isStale, true);
  assert.deepEqual(result.all.entries[0], { version: "2.0.0-rc.1", publishedAt, date: "2026-01-01", kind: "prerelease" });
  assert.deepEqual(extractVersionMarkersFromTime(time, range).map((marker) => marker.date_utc), ["2025-12-31"]);
});
