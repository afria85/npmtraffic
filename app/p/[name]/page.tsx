import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

type Props = {
  params: { name: string };
  searchParams?: { days?: string };
};

const ALLOWED_DAYS = new Set(["7", "14", "30"]);

function clampDays(raw?: string) {
  if (!raw) return 30;
  if (ALLOWED_DAYS.has(raw)) return Number(raw);
  return 30;
}

function getBaseUrlFromHeaders(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return ""; // fallback: will break if you need absolute, but keeps types safe
  return `${proto}://${host}`;
}

export default async function PackagePage({ params, searchParams }: Props) {
  const name = decodeURIComponent(params.name);
  const days = clampDays(searchParams?.days);

  // IMPORTANT: headers() is async in your Next version
  const h = await headers();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getBaseUrlFromHeaders(h);

  const res = await fetch(
    `${baseUrl}/api/v1/package/${encodeURIComponent(name)}/daily?days=${days}`,
    { cache: "no-store" }
  );

  if (res.status === 404) notFound();

  let data: any = null;
  let errorText: string | null = null;

  if (!res.ok) {
    errorText = `Failed to load (${res.status}).`;
  } else {
    data = await res.json();
  }

  const ranges = [7, 14, 30] as const;

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            npm downloads • GitHub-style traffic view
          </p>
        </div>

        <div className="inline-flex rounded-full bg-white/5 p-1">
          {ranges.map((d) => {
            const active = d === days;
            return (
              <Link
                key={d}
                href={`/p/${encodeURIComponent(name)}?days=${d}`}
                className={[
                  "px-3 py-1.5 text-sm rounded-full",
                  active
                    ? "bg-white text-black"
                    : "text-gray-200 hover:bg-white/10",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {d}D
              </Link>
            );
          })}
        </div>
      </div>

      {errorText ? (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorText} Please try again.
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-black/80 backdrop-blur">
                  <tr className="text-left text-gray-300">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Downloads</th>
                    <th className="px-3 py-2">Δ</th>
                    <th className="px-3 py-2">7D Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data?.series?.map((row: any) => (
                    <tr key={row.date} className="text-gray-100">
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.downloads?.toLocaleString?.() ?? row.downloads}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.delta == null ? "-" : row.delta}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.avg7 == null ? "-" : row.avg7}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Data from api.npmjs.org • request {data?.requestId ?? "n/a"}
          </p>
        </>
      )}
    </main>
  );
}