import { fetchTraffic, TrafficError, type TrafficResponse } from "@/lib/traffic";
import { canonicalizePackages, clampDays, rangeForDays } from "@/lib/query";
import { validatePackageName } from "@/lib/package-name";
import { summarizeCoverage, type Observation } from "@/lib/observations";
import { listDatesBetween } from "@/lib/dates";

export type CompareSeriesRow = {
  date: string;
  included?: boolean;
  values: Record<string, Omit<Partial<Observation>, "date" | "downloads"> & {
    downloads: number | null;
    delta: number | null;
  }>;
};

export type CompareTotals = {
  name: string;
  total: number | null;
  share: number | null;
};

export function calculatePackageShares(packages: { name: string; total: number | null }[]): CompareTotals[] {
  const totalAll = packages.reduce((sum, pkg) => sum + (pkg.total ?? 0), 0);
  return packages.map((pkg) => ({
    ...pkg,
    share: pkg.total !== null && totalAll > 0 ? Math.round((pkg.total / totalAll) * 10000) / 100 : null,
  }));
}

export type CompareData = {
  days: number;
  range: ReturnType<typeof rangeForDays>;
  packages: CompareTotals[];
  series: CompareSeriesRow[];
  coverage: ReturnType<typeof summarizeCoverage>;
  observations: Record<string, Pick<TrafficResponse, "coverage" | "meta">>;
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
  const now = new Date();
  const range = rangeForDays(days, now);
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
        const data = await fetchTraffic(name, days, now);
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

  const series: CompareSeriesRow[] = [];
  const dates = listDatesBetween(range.startDate, range.endDate);
  const sources = datasets.map(({ name, data }) => ({
    name, rows: new Map(data.series.map(({ date, ...row }) => [date, row])),
  }));
  for (const date of dates) {
    const included = sources.every(({ rows }) => rows.get(date)?.downloads != null);
    const previous = series.at(-1);
    const values = Object.fromEntries(sources.map(({ name, rows }) => {
      const row = rows.get(date);
      const downloads = included ? row?.downloads ?? null : null;
      const prev = previous?.values[name]?.downloads ?? null;
      return [name, {
        upstreamDownloads: row?.upstreamDownloads ?? null,
        registryDownloads: row?.registryDownloads ?? null,
        status: row?.status ?? "missing",
        downloads,
        delta: prev !== null && downloads !== null ? downloads - prev : null,
      }];
    }));
    series.push({ date, included, values });
  }
  const coverage = summarizeCoverage(series, (row) => row.included === true);
  const totals = calculatePackageShares(sources.map(({ name }) => ({
    name,
    total: coverage.includedDays ? series.reduce((total, row) => total + (row.values[name].downloads ?? 0), 0) : null,
  })));

  const metas = datasets.map(({ data }) => data.meta);
  const isStale = metas.some((meta) => meta.isStale);
  const staleReason = metas.find((meta) => meta.isStale)?.staleReason ?? null;
  const cacheStatus: TrafficResponse["meta"]["cacheStatus"] = isStale
    ? "STALE"
    : metas.some((meta) => meta.cacheStatus === "MISS")
    ? "MISS"
    : "HIT";
  const fetchedAt = metas.map((meta) => meta.fetchedAt).sort()[0];

  return {
    days,
    range,
    packages: totals,
    series,
    coverage,
    observations: Object.fromEntries(datasets.map(({ name, data }) =>
      [name, { coverage: data.coverage, meta: data.meta }],
    )),
    warnings: warnings.length ? warnings : undefined,
    meta: { cacheStatus, isStale, staleReason, fetchedAt },
  };
}
