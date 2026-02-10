import type { RangeForDaysResult } from "@/lib/query";

type Props = {
  pkgName: string;
  repoUrl?: string | null;
  range: RangeForDaysResult;
  distTagLatest: string | null;
  latestVersion: string | null;
  latestPublishedDateUtc: string | null;
  releasesInRange: number;
  totalVersions: number;
  cacheStatus: "HIT" | "MISS" | "STALE";
  isStale: boolean;
  fetchedAt: string;
};

function formatIsoDay(day: string | null) {
  if (!day) return null;
  const ts = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(ts)) return day;
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function VersionMetadataPanel({
  pkgName,
  repoUrl,
  range,
  distTagLatest,
  latestVersion,
  latestPublishedDateUtc,
  releasesInRange,
  totalVersions,
  cacheStatus,
  isStale,
  fetchedAt,
}: Props) {
  const latestLink = latestVersion ? `https://www.npmjs.com/package/${encodeURIComponent(pkgName)}/v/${encodeURIComponent(latestVersion)}` : null;
  const rangeLabel = `${range.startDate} → ${range.endDate}`;
  const publishedLabel = formatIsoDay(latestPublishedDateUtc);

  const badgeText = cacheStatus === "HIT" ? "Cached" : cacheStatus === "STALE" ? "Stale" : "Fresh";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Package metadata</h2>
          <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">
            Version signals from npm registry. Helpful to explain download changes.
          </p>
        </div>

        <span
          className={cls(
            "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em]",
            cacheStatus === "STALE" ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--foreground)]"
          )}
          title={`Fetched at ${fetchedAt}${isStale ? " (stale)" : ""}`}
        >
          {badgeText}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-xs font-medium text-[var(--foreground-tertiary)]">Latest</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {latestVersion ? (
              <a
                href={latestLink ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                v{latestVersion}
              </a>
            ) : (
              <span className="text-sm font-semibold text-[var(--foreground)]">Unknown</span>
            )}
            {distTagLatest && latestVersion && distTagLatest !== latestVersion ? (
              <span
                className="rounded border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--foreground)]"
                title={`dist-tag latest → ${distTagLatest}`}
              >
                dist-tag: {distTagLatest}
              </span>
            ) : null}
          </div>
          {publishedLabel ? (
            <p className="mt-1 text-xs text-[var(--foreground-secondary)]">Published {publishedLabel} (UTC)</p>
          ) : (
            <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">Publish date unavailable.</p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-xs font-medium text-[var(--foreground-tertiary)]">Releases in range</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--foreground)]">{releasesInRange}</p>
          <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">{rangeLabel}</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-xs font-medium text-[var(--foreground-tertiary)]">Total versions</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--foreground)]">{totalVersions}</p>
          <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">All published semver versions.</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-xs font-medium text-[var(--foreground-tertiary)]">Links</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`https://www.npmjs.com/package/${encodeURIComponent(pkgName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              npm page
            </a>
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              >
                repo
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
