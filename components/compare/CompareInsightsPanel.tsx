import { buildCompareInsights, type ComparePackageInsight, type WindowTrend } from "@/lib/insights";
import type { CompareSeriesRow, CompareTotals } from "@/lib/compare";

type Props = {
  packages: CompareTotals[];
  series: CompareSeriesRow[];
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

function formatTrendValue(trend: WindowTrend) {
  if (trend.windowSize < 1) return "Not enough data";
  if (trend.percent == null) {
    if (trend.delta > 0) return `+${formatCompact(trend.delta)}`;
    if (trend.delta < 0) return `-${formatCompact(Math.abs(trend.delta))}`;
    return "No baseline";
  }
  return formatPercent(trend.percent);
}

function trendClass(trend: WindowTrend) {
  if (trend.direction === "up") return "text-[color:var(--signed-pos)]";
  if (trend.direction === "down") return "text-[color:var(--signed-neg)]";
  return "text-[var(--foreground-secondary)]";
}

function packageTitle(pkg: ComparePackageInsight | null) {
  return pkg?.name ?? "-";
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

export default function CompareInsightsPanel({ packages, series, days }: Props) {
  const insights = buildCompareInsights(packages, series);
  if (!insights) return null;

  const leaderDetail = insights.leader
    ? insights.runnerUp
      ? `${formatCompact(insights.leader.total)} total, ${(insights.leader.share - insights.runnerUp.share).toFixed(2)}pp ahead`
      : `${formatCompact(insights.leader.total)} total`
    : "No leader available";
  const growthDetail = insights.growthLeader
    ? `Latest ${insights.growthLeader.trend.windowSize}d: ${formatCompact(insights.growthLeader.trend.recentTotal)} vs ${formatCompact(insights.growthLeader.trend.previousTotal)} prior`
    : "No package is up in the latest window";
  const latestDate = series.at(-1)?.date ?? "latest day";
  const latestDetail = insights.latestLeader
    ? `${formatNumber(insights.latestLeader.latestDownloads)} downloads on ${latestDate}`
    : "No latest day available";
  const closestDetail = insights.closestPair
    ? `${insights.closestPair.first.name} vs ${insights.closestPair.second.name}`
    : "Need at least two packages";

  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="min-w-0 border-b border-[color:var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Compare insights</h2>
        <p className="mt-1 min-w-0 break-words text-xs text-[var(--foreground-tertiary)]">
          Selected packages across the {days}d range.
        </p>
      </div>
      <div className="grid divide-y divide-[color:var(--border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <InsightCell label="Leader" value={packageTitle(insights.leader)} detail={leaderDetail} />
        <InsightCell
          label="Fastest mover"
          value={insights.growthLeader ? formatTrendValue(insights.growthLeader.trend) : "-"}
          detail={insights.growthLeader ? `${insights.growthLeader.name}: ${growthDetail}` : growthDetail}
          valueClassName={insights.growthLeader ? trendClass(insights.growthLeader.trend) : undefined}
        />
        <InsightCell
          label="Latest day"
          value={packageTitle(insights.latestLeader)}
          detail={latestDetail}
        />
        <InsightCell
          label="Closest race"
          value={insights.closestPair ? `${insights.closestPair.shareGap.toFixed(2)}pp` : "-"}
          detail={closestDetail}
        />
      </div>
    </section>
  );
}
