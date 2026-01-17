import { normalizePackageInput, validatePackageName } from "@/lib/package-name";
import { toYYYYMMDD } from "@/lib/dates";
import type { NpmRange } from "@/lib/npm-client";

const ALLOWED_DAYS = new Set([7, 14, 30, 90, 180, 365]);

export type RangeForDaysResult = {
  days: number;
  label: NpmRange;
  startDate: string;
  endDate: string;
};

const RANGE_LABELS: Record<number, NpmRange> = {
  7: "last-7-days",
  14: "last-14-days",
  30: "last-30-days",
  90: "last-90-days",
  180: "last-180-days",
  365: "last-365-days",
};

export function clampDays(raw?: string | number) {
  if (!raw) return 30;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return ALLOWED_DAYS.has(value) ? value : 30;
}

export function rangeForDays(days: number, now = new Date()): RangeForDaysResult {
  const label = RANGE_LABELS[days] ?? "last-30-days";
  const current = new Date(now.getTime());
  current.setUTCHours(0, 0, 0, 0);
  current.setUTCDate(current.getUTCDate() - 1);
  const endDate = current;
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - (days - 1));
  return {
    days,
    label,
    startDate: toYYYYMMDD(startDate),
    endDate: toYYYYMMDD(endDate),
  };
}

export function parsePackageList(raw?: string | null) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => normalizePackageInput(item))
    .filter(Boolean);
}

export function canonicalizePackages(pkgs: string[]) {
  const seen = new Set<string>();
  const cleaned = pkgs
    .map((pkg) => normalizePackageInput(pkg))
    .filter(Boolean)
    .filter((pkg) => {
      const lower = pkg.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return cleaned;
}

export function validatePackageList(pkgs: string[]) {
  for (const pkg of pkgs) {
    const result = validatePackageName(pkg);
    if (!result.ok) {
      throw new Error(`BAD_REQUEST: ${result.error}`);
    }
  }
}
