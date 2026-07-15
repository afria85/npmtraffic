import { buildPackageInsights, type TrendDirection, type WindowTrend } from "@/lib/insights";
import type { DerivedMetrics } from "@/lib/derived";
import type { TrafficSeriesRow } from "@/lib/traffic";

type Props = {
  series: TrafficSeriesRow[];
  derived: Pick<DerivedMetrics, "outliers">;
  days: number;
};

const numberFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatCompact(value: number) {
  return compactFormatter.format(value);
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(1)}%`;
}

function formatDate(date: string) {
  return date;
}

function directionClass(direction: TrendDirection) {
  if (direction === "up") return "text-[color:var(--signed-pos)]";
  if (direction === "down") return "text-[color:var(--signed-neg)]";
  return "text-[var(--foreground-secondary)]";
}

function formatTrendValue(trend: WindowTrend) {
  if (trend.windowSize < 1) return "Not enough data";
  if (trend.percent == null) {
    if (trend.delta > 0) return `+${formatCompact(trend.delta)}`;
    if (trend.delta < 0) return `-${formatCompact(Math.abs(trend.delta))}`;
    return "No baseline";
  }
  return formatPercent(trend.percent);
}

function InsightCell({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-tertiary)]">
        {label}
      </p>
      <p
        className={`mt-2 min-w-0 truncate text-lg font-semibold tabular-nums text-[var(--foreground)] ${valueClassName ?? ""}`}
        title={value}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--foreground-tertiary)]">{detail}</p>
    </div>
  );
}

export default function PackageInsightsPanel({ series, derived, days }: Props) {
  const insights = buildPackageInsights(series, derived);
  if (!insights) return null;

  const trendWindowLabel = insights.trend.windowSize
    ? `Latest ${insights.trend.windowSize}d vs prior ${insights.trend.windowSize}d`
    : `${days}d range`;
  const trendDetail =
    insights.trend.windowSize > 0
      ? `${formatCompact(insights.trend.recentTotal)} recent, ${formatCompact(insights.trend.previousTotal)} prior`
      : "Needs at least two data points";
  const peakDetail = insights.peak
    ? `${formatNumber(insights.peak.downloads)} downloads on ${formatDate(insights.peak.date)}`
    : "No peak available";
  const latestDetail = insights.latest
    ? insights.latest.delta == null
      ? `${formatNumber(insights.latest.downloads)} downloads`
      : `${formatNumber(insights.latest.downloads)} downloads, ${insights.latest.delta >= 0 ? "+" : "-"}${formatCompact(Math.abs(insights.latest.delta))} vs previous day`
    : "No latest day available";
  const outlierDetail = insights.strongestOutlier
    ? `Strongest: ${insights.strongestOutlier.date}, score ${insights.strongestOutlier.score.toFixed(2)}`
    : "No MAD outliers in this range";

  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="min-w-0 border-b border-[color:var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Insights</h2>
        <p className="mt-1 min-w-0 break-words text-xs text-[var(--foreground-tertiary)]">
          Normalized npm daily downloads for {days}d.
        </p>
      </div>
      <div className="grid divide-y divide-[color:var(--border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <InsightCell
          label={trendWindowLabel}
          value={formatTrendValue(insights.trend)}
          detail={trendDetail}
          valueClassName={directionClass(insights.trend.direction)}
        />
        <InsightCell
          label="Peak day"
          value={insights.peak ? formatCompact(insights.peak.downloads) : "-"}
          detail={peakDetail}
        />
        <InsightCell
          label="Consistency"
          value={`${insights.activeRate.toFixed(1)}% active`}
          detail={`${insights.activeDays}/${series.length} days above zero; ${insights.variability.label} traffic`}
        />
        <InsightCell
          label="Outliers"
          value={formatNumber(insights.outlierCount)}
          detail={outlierDetail}
        />
      </div>
      <div className="border-t border-[color:var(--border)] px-4 py-2 text-xs text-[var(--foreground-tertiary)]">
        Latest day: {insights.latest ? `${formatDate(insights.latest.date)} - ${latestDetail}` : "not available"}
      </div>
    </section>
  );
}
