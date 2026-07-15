import type { CompareSeriesRow, CompareTotals } from "@/lib/compare";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";

export type TrendDirection = "up" | "down" | "flat" | "none";

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
  peak: TrafficSeriesRow | null;
  latest: (TrafficSeriesRow & { delta: number | null }) | null;
  activeDays: number;
  activeRate: number;
  variability: {
    coefficient: number;
    label: "steady" | "variable" | "volatile" | "none";
  };
  outlierCount: number;
  strongestOutlier: (TrafficSeriesRow & { score: number }) | null;
};

export type ComparePackageInsight = CompareTotals & {
  trend: WindowTrend;
  latestDownloads: number;
};

export type CompareInsights = {
  windowSize: number;
  leader: ComparePackageInsight | null;
  runnerUp: ComparePackageInsight | null;
  growthLeader: ComparePackageInsight | null;
  latestLeader: ComparePackageInsight | null;
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

export function buildWindowTrend(values: number[]): WindowTrend {
  const windowSize = Math.min(7, Math.floor(values.length / 2));
  if (windowSize < 1) {
    return {
      windowSize: 0,
      recentTotal: 0,
      previousTotal: 0,
      delta: 0,
      percent: null,
      direction: "none",
    };
  }

  const recent = values.slice(values.length - windowSize);
  const previous = values.slice(values.length - windowSize * 2, values.length - windowSize);
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

function getPeak(series: TrafficSeriesRow[]) {
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

  const values = series.map((row) => row.downloads);
  const latest = series.at(-1) ?? null;
  const previous = series.at(-2) ?? null;
  const strongestOutlier =
    derived?.outliers
      ?.map((outlier, index) => ({
        ...(series[index] ?? { date: outlier.date, downloads: 0 }),
        score: outlier.score,
        isOutlier: outlier.is_outlier,
      }))
      .filter((item) => item.isOutlier)
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0] ?? null;

  return {
    trend: buildWindowTrend(values),
    peak: getPeak(series),
    latest: latest ? { ...latest, delta: previous ? latest.downloads - previous.downloads : null } : null,
    activeDays: values.filter((value) => value > 0).length,
    activeRate: round((values.filter((value) => value > 0).length / series.length) * 100, 1),
    variability: getVariability(values),
    outlierCount: derived?.outliers?.filter((item) => item.is_outlier).length ?? 0,
    strongestOutlier: strongestOutlier
      ? {
          date: strongestOutlier.date,
          downloads: strongestOutlier.downloads,
          score: round(strongestOutlier.score, 2),
        }
      : null,
  };
}

function rankTrend(item: ComparePackageInsight) {
  if (item.trend.direction !== "up") return Number.NEGATIVE_INFINITY;
  if (item.trend.percent == null) return item.trend.delta > 0 ? Number.POSITIVE_INFINITY : 0;
  return item.trend.percent;
}

export function buildCompareInsights(
  packages: CompareTotals[],
  series: CompareSeriesRow[]
): CompareInsights | null {
  if (!packages.length || !series.length) return null;

  const insights: ComparePackageInsight[] = packages.map((pkg) => {
    const values = series.map((row) => row.values[pkg.name]?.downloads ?? 0);
    return {
      ...pkg,
      trend: buildWindowTrend(values),
      latestDownloads: values.at(-1) ?? 0,
    };
  });

  const byTotal = [...insights].sort((a, b) => b.total - a.total);
  const byTrend = [...insights].sort((a, b) => {
    const rankDelta = rankTrend(b) - rankTrend(a);
    if (rankDelta !== 0) return rankDelta;
    return b.trend.delta - a.trend.delta;
  });
  const byLatest = [...insights].sort((a, b) => b.latestDownloads - a.latestDownloads);

  let closestPair: CompareInsights["closestPair"] = null;
  for (let i = 0; i < insights.length; i += 1) {
    for (let j = i + 1; j < insights.length; j += 1) {
      const first = insights[i];
      const second = insights[j];
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
    growthLeader: byTrend[0]?.trend.direction === "up" ? byTrend[0] : null,
    latestLeader: byLatest[0] ?? null,
    closestPair,
  };
}
