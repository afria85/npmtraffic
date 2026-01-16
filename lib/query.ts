import { normalizePackageInput, validatePackageName } from "@/lib/package-name";
import type { NpmRange } from "@/lib/npm-client";

const ALLOWED_DAYS = new Set([7, 14, 30]);

export function clampDays(raw?: string | number) {
  if (!raw) return 30;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return ALLOWED_DAYS.has(value) ? value : 30;
}

export function rangeForDays(days: number): NpmRange {
  if (days === 7) return "last-7-days";
  if (days === 14) return "last-14-days";
  return "last-30-days";
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
