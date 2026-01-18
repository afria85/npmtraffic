import { fetchTraffic, TrafficError, type TrafficResponse } from "@/lib/traffic";
import { canonicalizePackages, clampDays, rangeForDays } from "@/lib/query";
import { validatePackageName } from "@/lib/package-name";

export type CompareSeriesRow = {
  date: string;
  values: Record<string, { downloads: number; delta: number | null }>;
};

export type CompareTotals = {
  name: string;
  total: number;
  share: number;
};

export function calculatePackageShares(packages: { name: string; total: number }[]): CompareTotals[] {
  const totalAll = packages.reduce((sum, pkg) => sum + pkg.total, 0) || 1;
  return packages.map((pkg) => ({
    ...pkg,
    share: Math.round((pkg.total / totalAll) * 10000) / 100,
  }));
}

export type CompareData = {
  days: number;
  range: ReturnType<typeof rangeForDays>;
  packages: CompareTotals[];
  series: CompareSeriesRow[];
  warnings?: string[];
  meta: {
    cacheStatus: TrafficResponse["meta"]["cacheStatus"];
    isStale: boolean;
    staleReason: TrafficResponse["meta"]["staleReason"] | null;
    fetchedAt: string;
  };
};

export async function buildCompareData(rawPackages: string[], rawDays?: string | number) {
  const days = clampDays(rawDays);
  let pkgs = canonicalizePackages(rawPackages);
  const warnings: string[] = [];
  const maxPackages = 5;

  if (pkgs.length > maxPackages) {
    warnings.push(`Only the first ${maxPackages} packages are compared.`);
    pkgs = pkgs.slice(0, maxPackages);
  }

  const validPkgs = pkgs.filter((pkg) => {
    const result = validatePackageName(pkg);
    if (!result.ok) {
      warnings.push(`Ignored invalid package "${pkg}".`);
      return false;
    }
    return true;
  });

  if (validPkgs.length < 2) {
    throw new Error("BAD_REQUEST: compare requires 2-5 packages");
  }

  const results = await Promise.all(
    validPkgs.map(async (name) => {
      try {
        const data = await fetchTraffic(name, days);
        return { name, data };
      } catch (error) {
        if (error instanceof TrafficError && error.code === "PACKAGE_NOT_FOUND") {
          warnings.push(`Package not found: ${name}.`);
          return null;
        }
        throw error;
      }
    })
  );

  const datasets = results.filter(Boolean) as Array<{
    name: string;
    data: Awaited<ReturnType<typeof fetchTraffic>>;
  }>;

  if (datasets.length < 2) {
    throw new Error("BAD_REQUEST: compare requires 2-5 packages");
  }

  const totals = calculatePackageShares(
    datasets.map(({ name, data }) => ({
      name,
      total: data.totals.sum,
    }))
  );

  const series: CompareSeriesRow[] = [];
  const dates = datasets[0]?.data.series.map((row) => row.date) ?? [];

  for (const date of dates) {
    const values: CompareSeriesRow["values"] = {};
    for (const { name, data } of datasets) {
      const rowIndex = data.series.findIndex((entry) => entry.date === date);
      const row = rowIndex >= 0 ? data.series[rowIndex] : null;
      const prev = rowIndex > 0 ? data.series[rowIndex - 1] : null;
      const downloads = row?.downloads ?? 0;
      const delta = prev ? downloads - prev.downloads : null;
      values[name] = { downloads, delta };
    }
    series.push({ date, values });
  }

  const metas = datasets.map(({ data }) => data.meta);
  const isStale = metas.some((meta) => meta.isStale);
  const staleReason = metas.find((meta) => meta.isStale)?.staleReason ?? null;
  const cacheStatus: TrafficResponse["meta"]["cacheStatus"] = isStale
    ? "STALE"
    : metas.some((meta) => meta.cacheStatus === "MISS")
    ? "MISS"
    : "HIT";
  const fetchedAt = new Date().toISOString();

  return {
    days,
    range: rangeForDays(days),
    packages: totals,
    series,
    warnings: warnings.length ? warnings : undefined,
    meta: { cacheStatus, isStale, staleReason, fetchedAt },
  };
}
