import ChartSkeleton from "@/components/charts/ChartSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Skeleton className="h-11 w-44 rounded-full sm:hidden" />
          <Skeleton className="hidden h-11 w-72 rounded-full sm:block" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="mt-3 h-6 w-28 rounded-lg" />
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="mt-3 h-6 w-24 rounded-lg" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <ChartSkeleton />
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <div className="max-h-[70vh] overflow-auto">
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, idx) => (
              <Skeleton key={idx} className="h-6 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
