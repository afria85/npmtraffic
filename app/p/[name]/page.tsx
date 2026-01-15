import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";

type Props = {
  params: { name: string };
  searchParams?: { days?: string };
};

type PackageDailyResponse = {
  requestId: string;
  series: {
    date: string;
    downloads: number;
    delta: number | null;
    avg7: number | null;
  }[];
};

const ALLOWED_DAYS = new Set(["7", "14", "30"]);
const RANGES = [7, 14, 30] as const;
const numberFormatter = new Intl.NumberFormat("en-US");

function clampDays(raw?: string) {
  if (!raw) return 30;
  if (ALLOWED_DAYS.has(raw)) return Number(raw);
  return 30;
}

function formatNumber(value: number | null) {
  if (value == null) return "-";
  return numberFormatter.format(value);
}

function formatDelta(value: number | null) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${numberFormatter.format(value)}`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const name = decodeURIComponent(params.name);
  const days = clampDays(searchParams?.days);
  const baseUrl = await getBaseUrl();
  const canonical = `${baseUrl}/p/${encodeURIComponent(name)}?days=${days}`;

  return {
    title: `${name} npm downloads (${days} days) | npmtraffic`,
    description: `Daily npm download history for ${name} in a GitHub-style table`,
    alternates: {
      canonical,
    },
  };
}

export default async function PackagePage({ params, searchParams }: Props) {
  const name = decodeURIComponent(params.name);
  const days = clampDays(searchParams?.days);
  const baseUrl = await getBaseUrl();

  let data: PackageDailyResponse | null = null;
  let errorText: string | null = null;

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/package/${encodeURIComponent(name)}/daily?days=${days}`,
      { cache: "no-store" }
    );

    if (res.status === 404 || res.status === 400) notFound();

    if (!res.ok) {
      errorText = `Failed to load (${res.status}).`;
    } else {
      data = (await res.json()) as PackageDailyResponse;
    }
  } catch (error) {
    errorText = "Failed to load data.";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
            npmtraffic
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
            <p className="text-sm text-slate-400">
              npm downloads, GitHub-style traffic view
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          {RANGES.map((range) => {
            const active = range === days;
            return (
              <Link
                key={range}
                href={`/p/${encodeURIComponent(name)}?days=${range}`}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                  active
                    ? "bg-white text-black"
                    : "text-slate-200 hover:bg-white/10 hover:text-white",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {range}D
              </Link>
            );
          })}
        </div>
      </div>

      {errorText ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {errorText} Please try again.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="sticky top-0 bg-black/80 text-left text-xs uppercase tracking-wider text-slate-300 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Downloads</th>
                    <th className="px-3 py-2">Δ</th>
                    <th className="px-3 py-2">7D Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data?.series?.map((row) => {
                    const deltaClass =
                      row.delta == null
                        ? "text-slate-400"
                        : row.delta > 0
                          ? "text-emerald-300"
                          : row.delta < 0
                            ? "text-rose-300"
                            : "text-slate-200";

                    return (
                      <tr key={row.date} className="text-slate-100">
                        <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
                          {row.date}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {formatNumber(row.downloads)}
                        </td>
                        <td className={`px-3 py-2 font-mono tabular-nums ${deltaClass}`}>
                          {formatDelta(row.delta)}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {formatNumber(row.avg7)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Data from api.npmjs.org. Request {data?.requestId ?? "n/a"}.
          </p>
        </>
      )}
    </main>
  );
}
