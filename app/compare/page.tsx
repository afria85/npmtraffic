import type { Metadata } from "next";
import Link from "next/link";
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
import CompareSeriesTable from "@/components/compare/CompareSeriesTable";
import { buildExportFilename } from "@/lib/export-filename";
import RetryButton from "@/components/ui/RetryButton";
import {
  COMPARE_ACTION_CONTAINER_CLASSES,
  COMPARE_TABLE_WRAPPER_CLASSES,
} from "@/components/compare/compare-classes";
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
      type: "website",
      siteName: "npmtraffic",
      title,
      description,
      url: canonical,
      images: [{ 
        url: ogImage, 
        alt: `Compare npm downloads: ${pkgs.join(" vs ")}`,
        width: 1200,
        height: 630,
        type: "image/png",
      }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@npmtraffic",
      title,
      description,
      images: [{
        url: ogImage,
        alt: `Compare npm downloads: ${pkgs.join(" vs ")}`,
      }],
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
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">npmtraffic</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Compare npm packages</h1>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Add at least two packages to compare daily downloads, deltas, and trends.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">Start here</p>
          <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">
            Search for a package, open it, then use <span className="font-semibold text-[var(--foreground)]">Add to compare</span>.
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
          <p className="mt-1 truncate text-sm text-[var(--foreground-tertiary)]">
            {pkgs.join(", ")} · {days} days
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--foreground-tertiary)]">
            <span className="text-[11px] uppercase tracking-widest">Open package:</span>
            {pkgs.map((name, i) => (
              <span key={name} className="flex items-center gap-2">
                <Link href={`/p/${encodeURIComponent(name)}`} className="text-sm font-medium text-[color:var(--link)] hover:underline">
                  {name}
                </Link>
                {i < pkgs.length - 1 ? <span aria-hidden="true">,</span> : null}
              </span>
            ))}
          </div>
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
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--foreground)]">{errorText ?? "We couldn't load the comparison right now."}</p>
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
          <div key={pkg.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-xs uppercase tracking-widest text-[var(--foreground-tertiary)] truncate"
                  title={pkg.name}
                >
                  {pkg.name}
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {formatNumber(pkg.total)}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">Total downloads ({days} days)</p>
                <p
                  className="text-xs text-[var(--foreground-tertiary)]"
                  title="Share of total downloads among the compared packages for the selected range"
                >
                  {pkg.share.toFixed(2)}% of total
                </p>
              </div>
              <Link
                href={`/p/${encodeURIComponent(pkg.name)}`}
                className="shrink-0 text-xs font-medium text-[color:var(--link)] hover:underline"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      <CompareChart series={data.series} packageNames={tablePackageNames} days={days} />

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]">
          <span className="text-sm font-semibold">Daily downloads ({days}d)</span>
        </div>
	        <ScrollHintContainer className={COMPARE_TABLE_WRAPPER_CLASSES}>
	          <CompareSeriesTable series={data.series} packageNames={tablePackageNames} />
	        </ScrollHintContainer>
        <p className="px-3 py-2 text-xs text-[var(--foreground-tertiary)]">
          &Delta; vs previous day = downloads today - downloads yesterday
        </p>
      </div>

      <p className="text-xs text-[var(--foreground-tertiary)]">Data from api.npmjs.org.</p>
    </main>
  );
}
