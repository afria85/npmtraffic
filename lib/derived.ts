import type { TrafficSeriesRow } from "@/lib/traffic";

const MAD_SCALE = 1.4826;
const OUTLIER_THRESHOLD = 3;

export type DerivedValue = { date: string; value: number | null };
export type OutlierValue = { date: string; is_outlier: boolean; score: number };

export type DerivedMetrics = {
  ma3: DerivedValue[];
  ma7: DerivedValue[];
  outliers: OutlierValue[];
};

function median(numbers: number[]) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function computeTrailingMA(series: TrafficSeriesRow[], window: number) {
  const result: DerivedValue[] = [];
  const values: number[] = [];
  for (let i = 0; i < series.length; i += 1) {
    values.push(series[i].downloads);
    if (values.length > window) {
      values.shift();
    }
    if (values.length < window) {
      result.push({ date: series[i].date, value: null });
      continue;
    }
    const sum = values.reduce((total, value) => total + value, 0);
    const avg = sum / window;
    result.push({ date: series[i].date, value: Number(avg.toFixed(1)) });
  }
  return result;
}

export function computeOutliersMAD(series: TrafficSeriesRow[]) {
  const result: OutlierValue[] = [];
  const values = series.map((row) => row.downloads);
  const med = median(values);
  const deviations = values.map((value) => Math.abs(value - med));
  const mad = median(deviations);
  const scale = mad * MAD_SCALE;

  for (let i = 0; i < series.length; i += 1) {
    const value = values[i];
    let score = 0;
    if (scale > 0) {
      score = (value - med) / scale;
    }
    const is_outlier = scale > 0 ? Math.abs(score) >= OUTLIER_THRESHOLD : false;
    result.push({ date: series[i].date, is_outlier, score });
  }
  return result;
}

export function buildDerivedMetrics(series: TrafficSeriesRow[]): DerivedMetrics {
  return {
    ma3: computeTrailingMA(series, 3),
    ma7: computeTrailingMA(series, 7),
    outliers: computeOutliersMAD(series),
  };
}

export const DERIVED_METHOD_DESCRIPTION =
  `Trailing MA3/MA7; outlier score = (x - median)/(MAD×${MAD_SCALE.toFixed(4)}) threshold=${OUTLIER_THRESHOLD}`;
