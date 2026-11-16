import Link from "next/link";

type Props = {
  range: { startDate: string; endDate: string };
  fetchedAt: string;
  isStale: boolean;
  coverage: {
    requestedDays: number;
    includedDays: number;
    latestIncludedDate: string | null;
    missingDays?: number;
    unverifiedDays?: number;
  };
  shared?: boolean;
};

export default function DataQuality({ range, fetchedAt, isStale, coverage, shared }: Props) {
  const complete = coverage.includedDays === coverage.requestedDays;
  const checkedAt = Number.isFinite(Date.parse(fetchedAt))
    ? new Date(fetchedAt).toISOString()
    : null;

  return (
    <details className="observatory-coverage" data-freshness={isStale ? "cached" : complete ? "complete" : "partial"}>
      <summary className="cursor-pointer">
        {isStale ? "Cached observations. " : ""}
        {coverage.includedDays} of {coverage.requestedDays} days included{shared ? " across all packages" : ""}.
        {coverage.missingDays ? ` ${coverage.missingDays} missing.` : ""}
        {coverage.unverifiedDays ? ` ${coverage.unverifiedDays} unverified.` : ""}
        {" "}<span className="underline underline-offset-2">Observation details</span>
      </summary>
      <dl className="my-2 grid gap-1">
        <div>
          <dt className="inline font-semibold">Requested (UTC)</dt>{" "}
          <dd className="inline"><time dateTime={range.startDate}>{range.startDate}</time> to <time dateTime={range.endDate}>{range.endDate}</time></dd>
        </div>
        <div>
          <dt className="inline font-semibold">Latest included date (UTC)</dt>{" "}
          <dd className="inline">{coverage.latestIncludedDate
            ? <time dateTime={coverage.latestIncludedDate}>{coverage.latestIncludedDate}</time>
            : "None"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">{shared ? "Oldest package snapshot" : "Download data fetched"}</dt>{" "}
          <dd className="inline">{checkedAt
            ? <time dateTime={checkedAt}>{checkedAt.slice(0, 10)} at {checkedAt.slice(11, 19)} UTC</time>
            : "Time unavailable"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Download source</dt>{" "}
          <dd className="inline"><a className="underline underline-offset-2" href="https://api.npmjs.org/">api.npmjs.org</a></dd>
        </div>
      </dl>
      <Link href="/transparency" className="inline-block pb-2 underline underline-offset-2">Read the methodology</Link>
    </details>
  );
}
