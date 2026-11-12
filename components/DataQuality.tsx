type Props = {
  endDate: string;
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

export default function DataQuality({ endDate, isStale, coverage, shared }: Props) {
  const complete = coverage.includedDays === coverage.requestedDays;
  return <p className="text-sm text-[var(--foreground-tertiary)]">
    {isStale ? "Cached observations" : complete ? "Complete observations" : "Partial observations"} through {endDate} UTC.
    {" "}{coverage.includedDays} of {coverage.requestedDays} days included{shared ? " across all packages" : ""}.
    {coverage.missingDays ? ` ${coverage.missingDays} missing.` : ""}
    {coverage.unverifiedDays ? ` ${coverage.unverifiedDays} unverified.` : ""}
    {!complete && coverage.latestIncludedDate ? ` Latest included date: ${coverage.latestIncludedDate} UTC.` : ""}
  </p>;
}
