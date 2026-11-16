import type { CompareSeriesRow } from "@/lib/compare";

export type ChartScaleKind = "downloads" | "index";

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const precise = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatAxisTick(value: number, kind: ChartScaleKind) {
  if (value === 0) return "0";
  return kind === "index" ? precise.format(value) : compact.format(value);
}

/** Round up to a human-readable scale without changing underlying observations. */
export function buildNiceYAxis(peak: number, kind: ChartScaleKind = "downloads") {
  const safePeak = Number.isFinite(peak) && peak > 0 ? peak : 1;
  const minimumStep = kind === "downloads" ? 1 : 0.01;
  const rawStep = Math.max(minimumStep, safePeak / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const multiplier = [1, 2, 2.5, 5, 10].find((value) => value >= normalized - 1e-12) ?? 10;
  const step = Math.max(minimumStep, multiplier * magnitude);
  const maxValue = step * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = Number((step * (4 - index)).toPrecision(12));
    return { value, ratio: index / 4, label: formatAxisTick(value, kind) };
  });
  return { maxValue, ticks };
}

export type IndexedBaseline = { date: string; values: Record<string, number> };

/** Every package must have a strictly positive value on the same included day. */
export function findIndexedBaseline(rows: CompareSeriesRow[], packageNames: string[]): IndexedBaseline | null {
  if (!packageNames.length) return null;
  const row = rows.find((candidate) => packageNames.every((pkg) => {
    const value = candidate.values[pkg]?.downloads;
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }));
  if (!row) return null;
  return {
    date: row.date,
    values: Object.fromEntries(packageNames.map((pkg) => [pkg, row.values[pkg].downloads!])) as Record<string, number>,
  };
}

/** Display-only transformation; null gaps remain null, verified zero stays zero. */
export function indexedPoint(row: CompareSeriesRow, pkg: string, baseline: IndexedBaseline | null) {
  const count = row.values[pkg]?.downloads;
  const initial = baseline?.values[pkg];
  if (count == null || initial == null || initial <= 0 || !Number.isFinite(count)) return null;
  const index = (count / initial) * 100;
  return Number.isFinite(index) ? index : null;
}
