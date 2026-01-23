import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { clampDays, canonicalizePackages, parsePackageList, rangeForDays } from "@/lib/query";
import { validatePackageName } from "@/lib/package-name";
import { buildCompareData } from "@/lib/compare";
import { TrafficError, type TrafficResponse } from "@/lib/traffic";
import { buildCompareCanonical } from "@/lib/canonical";
import RangeSelector from "@/components/RangeSelector";
import ExportDropdown from "@/components/ExportDropdown";
import ShareMenu from "@/components/ShareMenu";
import SearchBox from "@/components/SearchBox";
import CompareChart from "@/components/compare/CompareChartClient";
import CompareAddBar from "@/components/compare/CompareAddBar";
import { buildExportFilename } from "@/lib/export-filename";
import RetryButton from "@/components/ui/RetryButton";
import {
  COMPARE_ACTION_CONTAINER_CLASSES,
  COMPARE_TABLE_WRAPPER_CLASSES,
} from "@/components/compare/compare-classes";
import SignedValue from "@/components/ui/SignedValue";
import ScrollHintContainer from "@/components/ScrollHintContainer";
import CompareUrlSync from "@/components/compare/CompareUrlSync";

type Props = {
  searchParams?: Promise<{ packages?: string; pkgs?: string; days?: string }>;
};

type CompareResponse = {
  days: number;
  range: ReturnType<typeof rangeForDays>;
  packages: { name: string; total: number; share: number }[];
  series: { date: string; values: Record<string, { downloads: number; delta: number | null }> }[];
  warnings?: string[];
  meta: {
    cacheStatus: TrafficResponse["meta"]["cacheStatus"];
    isStale: boolean;
    staleReason: TrafficResponse["meta"]["staleReason"] | null;
    fetchedAt: string;
  };
};

type CompareTableHeaderProps = {
  packageNames: string[];
};

export function CompareTableHeader({ packageNames }: CompareTableHeaderProps) {
  return (
	    <thead className="sticky top-0 z-20 bg-[color:var(--surface)] text-center text-xs uppercase tracking-[0.22em] text-slate-300 backdrop-blur sm:tracking-[0.3em]">
      <tr>
        <th
          rowSpan={2}
          className="px-2 py-2 text-center text-xs uppercase tracking-[0.22em] text-slate-300 whitespace-nowrap overflow-hidden sm:px-3 sm:tracking-[0.3em]"
        >
          Date
        </th>
	        {packageNames.map((pkg) => (
	          <th
	            key={`${pkg}-group`}
	            colSpan={2}
	            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--foreground)] sm:px-3 sm:tracking-[0.3em]"
	          >
	            <div className="mx-auto max-w-[180px] truncate" title={pkg}>
	              {pkg}
	            </div>
	          </th>
	        ))}
      </tr>
      <tr>
        {packageNames.map((pkg) => (
          <Fragment key={`${pkg}-metrics`}>
            <th
              scope="col"
              className="px-2 py-2 text-center text-xs uppercase tracking-[0.22em] text-slate-400 whitespace-nowrap overflow-hidden sm:px-3 sm:tracking-[0.3em]"
              title="Downloads for the day"
            >
              <span className="block truncate">Downloads</span>
            </th>
	            <th
	              scope="col"
	              className="px-2 py-2 text-center text-xs uppercase tracking-[0.22em] text-slate-400 whitespace-nowrap overflow-hidden sm:px-3 sm:tracking-[0.3em]"
	              title="Delta vs previous day"
	            >
              <span className="block truncate">
<span className="hidden sm:inline">Delta vs prev day</span>
	              <span className="sm:hidden">Δ prev</span>
              </span>
            </th>
          </Fragment>
        ))}
      </tr>
    </thead>
  );
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number | null) {
  if (value == null) return "-";
  return numberFormatter.format(value);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const rawList = sp.packages ?? sp.pkgs ?? "";
  const pkgs = canonicalizePackages(parsePackageList(rawList))
    .filter((pkg) => validatePackageName(pkg).ok)
    .slice(0, 5);
  const days = clampDays(sp.days);
  const baseUrl = await getBaseUrl();

  if (pkgs.length < 2) {
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

  const canonical = buildCompareCanonical(baseUrl, pkgs, days);
  const title = `Compare npm downloads (${days} days) | npmtraffic`;
  const description = `Compare npm download history for ${pkgs.join(", ")}.`;
  const ogPkgs = pkgs.map((p) => encodeURIComponent(p)).join(',');
  const ogImage = `${baseUrl}/api/og?mode=compare&pkgs=${ogPkgs}&days=${days}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, alt: "npmtraffic" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawPkgs = sp.packages ?? sp.pkgs ?? "";
  const rawDays = sp.days;
  const pkgs = canonicalizePackages(parsePackageList(rawPkgs))
    .filter((pkg) => validatePackageName(pkg).ok)
    .slice(0, 5);
  const days = clampDays(rawDays);
  if (pkgs.length < 2) {
    return (
      <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-12">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">Compare npm packages</h1>
          <p className="text-sm text-slate-300">
            Add at least two packages to compare daily downloads, deltas, and trends.
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Start here</p>
          <p className="mt-2 text-sm text-slate-300">
            Search for a package, open it, then use <span className="font-semibold text-[color:var(--foreground)]">Add to compare</span>.
            When you have two or more, this page will show the overlay chart and the table.
          </p>
          <div className="mt-4">
            <SearchBox className="w-full max-w-xl" />
          </div>
        </div>
      </main>
    );
  }

  const canonicalPkgs = pkgs.map((pkg) => encodeURIComponent(pkg)).join(",");
  if (
    !rawDays ||
    rawDays !== String(days) ||
    rawPkgs !== pkgs.join(",") ||
    sp.pkgs
  ) {
    redirect(`/compare?packages=${canonicalPkgs}&days=${days}`);
  }

  const baseUrl = await getBaseUrl();
  const canonical = buildCompareCanonical(baseUrl, pkgs, days);
  const rangeSelector = (
    <RangeSelector
      currentDays={days}
      getHref={(value) => `/compare?packages=${canonicalPkgs}&days=${value}`}
      label="RANGE"
    />
  );

  let data: CompareResponse | null = null;
  let errorText: string | null = null;
  try {
    data = await buildCompareData(pkgs, days);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.startsWith("BAD_REQUEST")) {
      notFound();
    }
    if (error instanceof TrafficError && error.code === "UPSTREAM_UNAVAILABLE") {
      errorText = "npm API is temporarily unavailable. Try again in a few minutes.";
    } else {
      errorText = "We couldn't load the comparison right now. Try again in a few minutes.";
    }
  }

  const csvFilename = data
    ? buildExportFilename({
        packages: pkgs,
        days,
        range: data.range,
        format: "csv",
      })
    : undefined;
  const excelFilename = data
    ? buildExportFilename({
        packages: pkgs,
        days,
        range: data.range,
        format: "excel.csv",
      })
    : undefined;
  const jsonFilename = data
    ? buildExportFilename({
        packages: pkgs,
        days,
        range: data.range,
        format: "json",
      })
    : undefined;

  const exportItems = data
    ? [
        {
          key: "csv",
          label: "CSV",
          href: `/api/v1/compare.csv?packages=${canonicalPkgs}&days=${days}`,
          downloadName: csvFilename,
        },
        {
          key: "excel",
          label: "Excel CSV",
          href: `/api/v1/compare.excel.csv?packages=${canonicalPkgs}&days=${days}`,
          downloadName: excelFilename,
        },
        {
          key: "json",
          label: "JSON",
          href: `/api/v1/compare.json?packages=${canonicalPkgs}&days=${days}`,
          downloadName: jsonFilename,
        },
      ]
    : [];

  const header = (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare packages</h1>
          <p className="mt-1 truncate text-sm text-slate-400">
            {pkgs.join(", ")} · {days} days
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <div className="min-w-0">{rangeSelector}</div>
        <div className={`${COMPARE_ACTION_CONTAINER_CLASSES} flex-shrink-0 self-end`}>
          {exportItems.length ? <ExportDropdown items={exportItems} /> : null}
          <ShareMenu url={canonical} title={`npmtraffic compare (${days} days)`} iconOnlyOnMobile />
        </div>
      </div>

      <CompareAddBar
        packages={pkgs}
        days={days}
        className="w-full max-w-xl"
      />
    </div>
  );

  if (errorText || !data) {
    return (
      <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-6">
        {header}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
          <p className="text-sm text-slate-200">{errorText ?? "We couldn't load the comparison right now."}</p>
          <div className="mt-3 flex items-center gap-2">
            <RetryButton />
          </div>
        </div>
      </main>
    );
  }

  const tablePackageNames = data.packages.map((pkg) => pkg.name);

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-6">
      <CompareUrlSync packages={pkgs} />
      {header}
      {data.meta.isStale ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <span>Showing cached data (upstream error).</span>
          <RetryButton className="h-8 px-3 text-xs" label="Retry" />
        </div>
      ) : null}
      {data?.warnings?.length ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {data.warnings.join(" ")}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.packages.map((pkg) => (
          <div key={pkg.name} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <p
              className="text-xs uppercase tracking-widest text-slate-500 truncate"
              title={pkg.name}
            >
              {pkg.name}
            </p>
            <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
              {formatNumber(pkg.total)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Total downloads ({days} days)</p>
            <p
              className="text-xs text-slate-400"
              title="Share of total downloads among the compared packages for the selected range"
            >
              {pkg.share.toFixed(2)}% of total
            </p>
          </div>
        ))}
      </div>

      <CompareChart series={data.series} packageNames={tablePackageNames} days={days} />

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3 text-sm text-slate-200">
          <span className="text-sm font-semibold">Daily downloads ({days}d)</span>
        </div>
	        <ScrollHintContainer className={COMPARE_TABLE_WRAPPER_CLASSES}>
	          <table className="min-w-[760px] w-max table-fixed text-sm sm:w-full">
	            <colgroup>
	              <col className="w-[120px]" />
	              {tablePackageNames.map((pkg) => (
	                <Fragment key={`cols-${pkg}`}>
	                  <col className="w-[120px]" />
	                  <col className="w-[140px]" />
	                </Fragment>
	              ))}
	            </colgroup>
            <CompareTableHeader packageNames={tablePackageNames} />
            <tbody className="divide-y divide-white/10">
              {data.series.map((row) => (
                <tr key={row.date} className="text-[color:var(--foreground)]">
                  <td className="px-2 py-2 text-left text-[11px] font-mono tabular-nums tracking-normal text-slate-400 whitespace-nowrap sm:px-3 sm:text-xs">
                    {row.date}
                  </td>
                  {data.packages.map((pkg) => (
                    <Fragment key={`${row.date}-${pkg.name}-pair`}>
                  <td className="px-2 py-2 text-right font-mono tabular-nums sm:px-3">
                    {formatNumber(row.values[pkg.name]?.downloads ?? null)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                    <SignedValue value={row.values[pkg.name]?.delta ?? null} showArrow emphasis="primary" />
                  </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollHintContainer>
        <p className="px-3 py-2 text-xs text-slate-400">
          Delta vs previous day = downloads today - downloads yesterday
        </p>
      </div>

      <p className="text-xs text-slate-500">Data from api.npmjs.org.</p>
    </main>
  );
}
