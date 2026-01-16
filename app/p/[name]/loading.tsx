export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-8 w-48 rounded-lg bg-white/10" />
          <div className="h-4 w-64 rounded-lg bg-white/10" />
          <div className="h-6 w-32 rounded-full bg-white/10" />
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="h-11 w-44 rounded-full bg-white/10 sm:hidden" />
          <div className="hidden sm:block h-11 w-72 rounded-full bg-white/10" />
          <div className="flex gap-2">
            <div className="h-11 w-32 rounded-full bg-white/10" />
            <div className="h-11 w-28 rounded-full bg-white/10" />
          </div>
          <div className="h-9 w-40 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 rounded-xl border border-white/10 bg-white/5" />
        <div className="h-24 rounded-xl border border-white/10 bg-white/5" />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="max-h-[70vh] overflow-auto">
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-6 w-full rounded-lg bg-white/10"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
