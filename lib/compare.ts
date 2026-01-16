import { getPackageDaily } from "@/lib/package-daily";
import { canonicalizePackages, clampDays, rangeForDays, validatePackageList } from "@/lib/query";

export type CompareSeriesRow = {
  date: string;
  values: Record<string, { downloads: number; delta: number | null }>;
};

export type CompareTotals = {
  name: string;
  total: number;
  share: number;
};

export type CompareData = {
  days: number;
  range: ReturnType<typeof rangeForDays>;
  packages: CompareTotals[];
  series: CompareSeriesRow[];
};

export async function buildCompareData(rawPackages: string[], rawDays?: string | number) {
  const days = clampDays(rawDays);
  const pkgs = canonicalizePackages(rawPackages);
  validatePackageList(pkgs);

  if (pkgs.length < 2 || pkgs.length > 5) {
    throw new Error("BAD_REQUEST: compare requires 2-5 packages");
  }

  const datasets = await Promise.all(
    pkgs.map(async (name) => {
      const data = await getPackageDaily(name, days);
      return { name, data };
    })
  );

  const totals = datasets.map(({ name, data }) => ({
    name,
    total: data.series.reduce((sum, row) => sum + row.downloads, 0),
    share: 0,
  }));

  const totalAll = totals.reduce((sum, row) => sum + row.total, 0) || 1;
  for (const row of totals) {
    row.share = Math.round((row.total / totalAll) * 10000) / 100;
  }

  const series: CompareSeriesRow[] = [];
  const dates = datasets[0]?.data.series.map((row) => row.date) ?? [];

  for (const date of dates) {
    const values: CompareSeriesRow["values"] = {};
    for (const { name, data } of datasets) {
      const row = data.series.find((entry) => entry.date === date);
      values[name] = {
        downloads: row?.downloads ?? 0,
        delta: row?.delta ?? null,
      };
    }
    series.push({ date, values });
  }

  return {
    days,
    range: rangeForDays(days),
    packages: totals,
    series,
  };
}
