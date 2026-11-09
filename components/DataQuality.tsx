export default function DataQuality({endDate, isStale}: {endDate: string; isStale: boolean}) {
  return <p className="text-sm text-[var(--foreground-tertiary)]">
    {isStale ? 'Cached complete observations' : 'Complete observations'} through {endDate} UTC.
    {' '}Missing npm records are unavailable data, not zero downloads.
  </p>;
}
