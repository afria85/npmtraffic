export default function ChartSkeleton() {
  return (
    <section className="observatory-chart" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded-full bg-[var(--surface-hover)]" />
          <div className="h-4 w-40 rounded-full bg-[var(--surface-hover)]" />
        </div>
        <div className="h-9 w-24 rounded-full bg-[var(--surface-hover)]" />
      </div>
      <div className="mt-4 h-64 w-full rounded-2xl bg-[var(--surface)]" />
    </section>
  );
}
