export default function ChartSkeleton() {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
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
