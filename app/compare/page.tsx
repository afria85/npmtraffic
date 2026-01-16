import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { clampDays, canonicalizePackages, parsePackageList } from "@/lib/query";

type Props = {
  searchParams?: Promise<{ pkgs?: string; days?: string }>;
};

type CompareResponse = {
  requestId: string;
  days: number;
  packages: { name: string; total: number; share: number }[];
  series: { date: string; values: Record<string, { downloads: number; delta: number | null }> }[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number | null) {
  if (value == null) return "-";
  return numberFormatter.format(value);
}

function formatDelta(value: number | null) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${numberFormatter.format(value)}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const pkgs = canonicalizePackages(parsePackageList(sp.pkgs));
  const days = clampDays(sp.days);
  const baseUrl = await getBaseUrl();

  if (pkgs.length < 2 || pkgs.length > 5) {
    return {
      title: "Compare npm downloads | npmtraffic",
      description: "Compare npm download history across packages.",
      alternates: { canonical: `${baseUrl}/compare` },
      openGraph: {
        title: "Compare npm downloads | npmtraffic",
        description: "Compare npm download history across packages.",
        url: `${baseUrl}/compare`,
      },
    };
  }

  const canonicalPkgs = pkgs.map((pkg) => encodeURIComponent(pkg)).join(",");
  const canonical = `${baseUrl}/compare?pkgs=${canonicalPkgs}&days=${days}`;
  const title = `Compare npm downloads (${days} days) | npmtraffic`;
  const description = `Compare npm download history for ${pkgs.join(", ")}.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
    },
  };
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawPkgs = sp.pkgs ?? "";
  const rawDays = sp.days;
  const pkgs = canonicalizePackages(parsePackageList(rawPkgs));
  const days = clampDays(rawDays);
  if (pkgs.length < 2 || pkgs.length > 5) notFound();

  const canonicalPkgs = pkgs.map((pkg) => encodeURIComponent(pkg)).join(",");
  if (!rawDays || rawDays !== String(days) || rawPkgs !== pkgs.join(",")) {
    redirect(`/compare?pkgs=${canonicalPkgs}&days=${days}`);
  }

  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/compare?pkgs=${canonicalPkgs}&days=${days}`, {
    next: { revalidate: 21600 },
  });

  if (res.status === 400 || res.status === 404) notFound();

  let data: CompareResponse | null = null;
  let errorText: string | null = null;
  if (!res.ok) {
    errorText = res.status === 502 ? "npm API temporarily unavailable." : "Failed to load.";
  } else {
    data = (await res.json()) as CompareResponse;
  }

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Compare packages
          </h1>
          <p className="text-sm text-slate-400">
            {pkgs.join(", ")} · {days} days
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/api/v1/compare.csv?pkgs=${canonicalPkgs}&days=${days}`}
          className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
        >
          Export CSV
        </Link>
      </div>
    </div>
  );

  if (errorText || !data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
        {header}
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {errorText ?? "Failed to load."}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
      {header}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.packages.map((pkg) => (
          <div key={pkg.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">{pkg.name}</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatNumber(pkg.total)}
            </p>
            <p className="text-xs text-slate-400">{pkg.share}% of total</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="sticky top-0 bg-black/80 text-left text-xs uppercase tracking-wider text-slate-300 backdrop-blur">
              <tr>
                <th className="px-3 py-2" rowSpan={2}>
                  Date
                </th>
                {data.packages.map((pkg) => (
                  <th key={pkg.name} className="px-3 py-2 text-center" colSpan={2}>
                    {pkg.name}
                  </th>
                ))}
              </tr>
              <tr>
                {data.packages.map((pkg) => (
                  <th key={`${pkg.name}-downloads`} className="px-3 py-2">
                    Downloads
                  </th>
                ))}
                {data.packages.map((pkg) => (
                  <th key={`${pkg.name}-delta`} className="px-3 py-2">
                    Δ
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.series.map((row) => (
                <tr key={row.date} className="text-slate-100">
                  <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
                    {row.date}
                  </td>
                  {data.packages.map((pkg) => (
                    <td key={`${row.date}-${pkg.name}-downloads`} className="px-3 py-2 font-mono">
                      {formatNumber(row.values[pkg.name]?.downloads ?? 0)}
                    </td>
                  ))}
                  {data.packages.map((pkg) => (
                    <td key={`${row.date}-${pkg.name}-delta`} className="px-3 py-2 font-mono">
                      {formatDelta(row.values[pkg.name]?.delta ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Data from api.npmjs.org. Request {data.requestId}.
      </p>
    </main>
  );
}
