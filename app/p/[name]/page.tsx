import { getPackageDaily } from "@/lib/package-daily";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  // default 30 hari; nanti kita tambah segmented control
  const data = await getPackageDaily(name, 30);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">{data.package}</h1>
        <p className="text-sm text-gray-400">
          {data.range.start} → {data.range.end} • cache {data.cache.status}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-black/60 backdrop-blur">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Downloads</th>
                <th className="px-3 py-2 font-semibold">Δ</th>
                <th className="px-3 py-2 font-semibold">Avg7</th>
              </tr>
            </thead>
            <tbody>
              {data.series
                .slice()
                .reverse()
                .map((row) => (
                  <tr key={row.date} className="border-t border-white/10">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(row.downloads)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.delta === null ? "—" : fmt(row.delta)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.avg7 === null ? "—" : fmt(row.avg7)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Data from api.npmjs.org • request {data.requestId}
      </p>
    </main>
  );
}