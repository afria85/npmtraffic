import type { NpmRangeRow } from "@/lib/npm-client";

export type DailySeriesRow = {
  date: string;
  downloads: number;
  delta: number | null;
  avg7: number | null;
};

export function aggregateSeries(rows: NpmRangeRow[]): DailySeriesRow[] {
  // Assume rows already sorted by day from npm
  const out: DailySeriesRow[] = [];
  const window: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cur = rows[i];
    const prev = i > 0 ? rows[i - 1] : null;

    const downloads = cur.downloads ?? 0;

    // delta vs previous day
    const delta = prev ? downloads - (prev.downloads ?? 0) : null;

    // rolling 7d average including today (when enough samples)
    window.push(downloads);
    if (window.length > 7) window.shift();
    const avg7 = window.length === 7 ? Math.round(window.reduce((a, b) => a + b, 0) / 7) : null;

    out.push({
      date: cur.day,
      downloads,
      delta,
      avg7,
    });
  }

  return out;
}
