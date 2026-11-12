import type { CompareSeriesRow, CompareTotals } from "@/lib/compare";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";

export type TrendDirection = "up" | "down" | "flat" | "none";
type AvailableRow = { date: string; downloads: number };

export type WindowTrend = {
  windowSize: number;
  recentTotal: number;
  previousTotal: number;
  delta: number;
  percent: number | null;
  direction: TrendDirection;
};

export type PackageInsights = {
  trend: WindowTrend;
  peak: AvailableRow | null;
  latest: (AvailableRow & { delta: number | null }) | null;
  activeDays: number;
  activeRate: number | null;
  availableDays: number;
  variability: {
    coefficient: number;
    label: "steady" | "variable" | "volatile" | "none";
  };
  outlierCount: number;
  strongestOutlier: (AvailableRow & { score: number }) | null;
};

export type ComparePackageInsight = Omit<CompareTotals, "total"> & {
  total: number;
  trend: WindowTrend;
  latestDownloads: number | null;
};

export type CompareInsights = {
  windowSize: number;
  leader: ComparePackageInsight | null;
  runnerUp: ComparePackageInsight | null;
  growthLeader: ComparePackageInsight | null;
  latestLeader: (ComparePackageInsight & { latestDownloads: number }) | null;
  closestPair: {
    first: ComparePackageInsight;
    second: ComparePackageInsight;
    shareGap: number;
  } | null;
};

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getDirection(delta: number): TrendDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function buildWindowTrend(values: (number | null)[]): WindowTrend {
  const windowSize = Math.min(7, Math.floor(values.length / 2));
  const recent = values.slice(values.length - windowSize);
  const previous = values.slice(values.length - windowSize * 2, values.length - windowSize);
  if (windowSize < 1 || !recent.every((v) => v !== null) || !previous.every((v) => v !== null)) {
    return {
      windowSize: 0,
      recentTotal: 0,
      previousTotal: 0,
      delta: 0,
      percent: null,
      direction: "none",
    };
  }

  const recentTotal = sum(recent);
  const previousTotal = sum(previous);
  const delta = recentTotal - previousTotal;
  const percent = previousTotal > 0 ? round((delta / previousTotal) * 100, 1) : null;

  return {
    windowSize,
    recentTotal,
    previousTotal,
    delta,
    percent,
    direction: getDirection(delta),
  };
}

function getPeak(series: AvailableRow[]) {
  if (!series.length) return null;
  return series.reduce((best, row) => (row.downloads > best.downloads ? row : best), series[0]);
}

function getVariability(
  values: number[]
): PackageInsights["variability"] {
  const average = values.length ? sum(values) / values.length : 0;
  if (average <= 0) {
    return { coefficient: 0, label: "none" as const };
  }

  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length;
  const coefficient = Math.sqrt(variance) / average;
  const label =
    coefficient < 0.25 ? "steady" : coefficient < 0.6 ? "variable" : "volatile";

  return { coefficient: round(coefficient, 2), label };
}

export function buildPackageInsights(
  series: TrafficSeriesRow[],
  derived?: Pick<DerivedMetrics, "outliers">
): PackageInsights | null {
  if (!series.length) return null;

  const available = series.filter((row): row is TrafficSeriesRow & AvailableRow => row.downloads !== null);
  const values = available.map((row) => row.downloads);
  const latest = series.at(-1) ?? null;
  const previous = series.at(-2) ?? null;
  const byDate = new Map(available.map((row) => [row.date, row.downloads]));
  const outliers = derived?.outliers.flatMap(({ date, is_outlier, score }) => {
    const downloads = byDate.get(date);
    return is_outlier && score !== null && downloads !== undefined ? [{ date, downloads, score }] : [];
  }) ?? [];
  const strongestOutlier = outliers.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
  const activeDays = values.filter((value) => value > 0).length;

  return {
    trend: buildWindowTrend(series.map((row) => row.downloads)),
    peak: getPeak(available),
    latest: latest && latest.downloads !== null ? {
      date: latest.date, downloads: latest.downloads,
      delta: previous?.downloads != null ? latest.downloads - previous.downloads : null,
    } : null,
    activeDays,
    activeRate: values.length ? round((activeDays / values.length) * 100, 1) : null,
    availableDays: values.length,
    variability: getVariability(values),
    outlierCount: outliers.length,
    strongestOutlier: strongestOutlier
      ? {
          date: strongestOutlier.date,
          downloads: strongestOutlier.downloads,
          score: round(strongestOutlier.score, 2),
        }
      : null,
  };
}

export function buildCompareInsights(
  packages: CompareTotals[],
  series: CompareSeriesRow[]
): CompareInsights | null {
  if (!packages.length || !series.length) return null;

  const insights: ComparePackageInsight[] = packages.filter((pkg): pkg is CompareTotals & { total: number } => pkg.total !== null).map((pkg) => {
    const values = series.map((row) => row.values[pkg.name]?.downloads ?? null);
    return {
      ...pkg,
      trend: buildWindowTrend(values),
      latestDownloads: values.at(-1) ?? null,
    };
  });

  const byTotal = [...insights].sort((a, b) => b.total - a.total);
  const byTrend = insights.filter((item) => item.trend.direction === "up" && item.trend.percent !== null)
    .sort((a, b) => (b.trend.percent ?? 0) - (a.trend.percent ?? 0) || b.trend.delta - a.trend.delta);
  const byLatest = insights.filter((item): item is ComparePackageInsight & { latestDownloads: number } => item.latestDownloads !== null)
    .sort((a, b) => b.latestDownloads - a.latestDownloads);

  let closestPair: CompareInsights["closestPair"] = null;
  for (let i = 0; i < insights.length; i += 1) {
    for (let j = i + 1; j < insights.length; j += 1) {
      const first = insights[i];
      const second = insights[j];
      if (first.share === null || second.share === null) continue;
      const shareGap = round(Math.abs(first.share - second.share), 2);
      if (!closestPair || shareGap < closestPair.shareGap) {
        closestPair = { first, second, shareGap };
      }
    }
  }

  return {
    windowSize: insights[0]?.trend.windowSize ?? 0,
    leader: byTotal[0] ?? null,
    runnerUp: byTotal[1] ?? null,
    growthLeader: byTrend[0] ?? null,
    latestLeader: byLatest[0] ?? null,
    closestPair,
  };
}
