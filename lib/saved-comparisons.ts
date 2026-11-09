import { canonicalizePackages, clampDays } from './query';
import { validatePackageName } from './package-name';
export const SAVED_COMPARISONS_KEY = 'npmtraffic:saved-comparisons';
export type SavedComparison = { packages: string[]; days: number };
export function comparisonKey(value: SavedComparison) {
  return `${value.packages.join(',')}:${value.days}`;
}
export function parseSavedComparisons(raw: string | null): SavedComparison[] {
  try {
    const data = JSON.parse(raw ?? 'null');
    // Version zero stored a bare array; version one adds a schema envelope.
    const rows = Array.isArray(data) ? data : data?.version === 1 ? data.items : [];
    if (!Array.isArray(rows)) return [];
    const result = new Map<string, SavedComparison>();
    for (const row of rows.slice(0,100)) {
      if (!row || !Array.isArray(row.packages) || row.packages.length > 5 ||
          row.packages.some((p: unknown) => typeof p !== 'string' || !validatePackageName(p).ok) ||
          typeof row.days !== 'number' || clampDays(row.days) !== row.days) continue;
      const packages = canonicalizePackages(row.packages);
      if (packages.length < 2) continue;
      const value = {packages, days: row.days};
      result.set(comparisonKey(value),value);
    }
    return [...result.values()].slice(0,20);
  } catch { return []; }
}
export function saveComparisons(storage: Pick<Storage,'setItem'>, items: SavedComparison[]) {
  const normalized = parseSavedComparisons(JSON.stringify(items));
  storage.setItem(SAVED_COMPARISONS_KEY,JSON.stringify({version:1,items:normalized}));
  return normalized;
}
