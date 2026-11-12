import type { CompareData } from "@/lib/compare";
import { buildWindowTrend } from "@/lib/insights";
import type { TrafficResponse } from "@/lib/traffic";

export function buildOgPackageStats(data: Pick<TrafficResponse, "range" | "series" | "totals" | "coverage" | "meta">) {
  const sparkline = data.series.map(({ downloads }) => downloads);
  const trend = buildWindowTrend(sparkline);
  return {
    total: data.totals.sum,
    percentChange: trend.percent,
    trendDays: trend.windowSize,
    sparkline,
    dateRange: { start: data.range.startDate, end: data.range.endDate },
    coverage: data.coverage,
    isStale: data.meta.isStale,
  };
}

export function buildOgComparisonStats(data: Pick<CompareData, "packages" | "range" | "coverage" | "meta">) {
  return {
    packages: data.packages,
    dateRange: { start: data.range.startDate, end: data.range.endDate },
    coverage: data.coverage,
    isStale: data.meta.isStale,
  };
}
