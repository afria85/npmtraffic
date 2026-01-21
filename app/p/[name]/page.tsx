import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { clampDays } from "@/lib/query";
import SearchBox from "@/components/SearchBox";
import CompareButton from "@/components/compare/CompareButton";
import AlertBanner from "@/components/AlertBanner";
import { buildPackageCanonical } from "@/lib/canonical";
import { fetchTraffic, TrafficError, type TrafficResponse } from "@/lib/traffic";
import { getPackageGithubRepo } from "@/lib/npm-repo";
import DerivedSeriesTable from "@/components/package/DerivedSeriesTable";
import RangeSelector from "@/components/RangeSelector";
import ExportDropdown from "@/components/ExportDropdown";
import ShareMenu from "@/components/ShareMenu";
import { buildExportFilename } from "@/lib/export-filename";
import EventsPanel from "@/components/events/EventsPanel";
import TrafficChart from "@/components/package/TrafficChartClient";

type Props = {
  params: Promise<{ name: string }>;
  searchParams?: Promise<{ days?: string; events?: string }>;
};

const ALLOWED_DAYS = new Set(["7", "14", "30", "90", "180", "365"]);
const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatUpdatedAt(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "Updated recently";
  const diffMs = Date.now() - ts;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days} d ago`;
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const baseUrl = await getBaseUrl();
  if (!p?.name) {
    return {
      title: "npmtraffic",
      description: "Daily npm download history in a GitHub-style table",
      alternates: { canonical: `${baseUrl}/` },
    };
  }
  let name = "";
  try {
    name = decodeURIComponent(p.name);
  } catch {
    return {
      title: "npmtraffic",
      description: "Daily npm download history in a GitHub-style table",
      alternates: { canonical: `${baseUrl}/` },
    };
  }
  const days = clampDays(sp.days);
  const canonical = buildPackageCanonical(baseUrl, name, days);
  const title = `${name} npm downloads (${days} days) | npmtraffic`;
  const description = `Daily npm download history for ${name} in a GitHub-style table`;
  const ogImage = `${baseUrl}/api/og?pkg=${encodeURIComponent(name)}&days=${days}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
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
      images: [ogImage],
    },
  };
}

export default async function PackagePage({ params, searchParams }: Props) {
  const p = await params;
  const sp = (await searchParams) ?? {};
  if (!p?.name) notFound();

  let name = "";
  try {
    name = decodeURIComponent(p.name);
  } catch {
    notFound();
  }

  if (!name) notFound();

  const rawDays = sp.days;
  const days = clampDays(rawDays);
  const encodedName = encodeURIComponent(name);

  if (!rawDays || !ALLOWED_DAYS.has(rawDays)) {
    redirect(`/p/${encodedName}?days=${days}`);
  }

  const baseUrl = await getBaseUrl();
  const canonical = buildPackageCanonical(baseUrl, name, days);

  let data: TrafficResponse | null = null;
  let errorText: string | null = null;

  try {
    data = await fetchTraffic(name, days);
  } catch (error: unknown) {
    if (error instanceof TrafficError) {
      if (error.code === "PACKAGE_NOT_FOUND") {
        notFound();
      }
      if (error.code === "INVALID_REQUEST") {
        notFound();
      }
      if (error.code === "UPSTREAM_UNAVAILABLE") {
        errorText = "npm API temporarily unavailable.";
      } else {
        errorText = "Failed to load data.";
      }
    } else {
      errorText = "Failed to load data.";
    }
  }

  const updatedLabel = data ? formatUpdatedAt(data.meta.fetchedAt) : null;
  const repoUrl = data ? await getPackageGithubRepo(name) : null;

  const rangeSelector = (
    <RangeSelector
      currentDays={days}
      getHref={(value) => `/p/${encodedName}?days=${value}`}
    />
  );

  const csvFilename = data?.range
    ? buildExportFilename({
        packages: [name],
        days,
        range: data.range,
        format: "csv",
      })
    : undefined;
  const excelFilename = data?.range
    ? buildExportFilename({
        packages: [name],
        days,
        range: data.range,
        format: "excel.csv",
      })
    : undefined;
  const jsonFilename = data?.range
    ? buildExportFilename({
        packages: [name],
        days,
        range: data.range,
        format: "json",
      })
    : undefined;

  const exportItems = data?.range
    ? [
        {
          key: "csv",
          label: "CSV",
          href: `/api/v1/package/${encodedName}/daily.csv?days=${days}`,
          downloadName: csvFilename,
        },
        {
          key: "excel",
          label: "Excel CSV",
          href: `/api/v1/package/${encodedName}/daily.excel.csv?days=${days}`,
          downloadName: excelFilename,
        },
        {
          key: "json",
          label: "JSON",
          href: `/api/v1/package/${encodedName}/daily.json?days=${days}`,
          downloadName: jsonFilename,
        },
      ]
    : [];

  const header = (
    <div className="flex w-full flex-col gap-4">
      {/* Mobile: 2-row grid
          Row 1: title (left) + Add/Star (right)
          Row 2: Updated (left) + Search (right)
      */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        {/* Row 1, Col 1 */}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>

        {/* Row 1, Col 2 */}
        <div className="flex flex-nowrap items-center justify-end gap-2">
          <CompareButton name={name} />
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
              aria-label="Star on GitHub"
              title="Star on GitHub"
            >
              <span className="hidden sm:inline">Star on GitHub</span>
              <span className="sm:hidden">GitHub</span>
            </a>
          ) : null}
        </div>

        {/* Row 2, Col 1 */}
        {updatedLabel ? (
          <span
            className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300"
            title={updatedLabel}
          >
            {updatedLabel}
          </span>
        ) : (
          <span className="text-[11px] text-slate-500">Updated</span>
        )}

        {/* Row 2, Col 2 */}
        <div className="justify-self-end">
          {/* Mobile: modal trigger (right aligned, not full width) */}
          <div className="sm:hidden">
            <div className="ml-auto w-fit max-w-[70vw]">
              <SearchBox variant="modal" triggerLabel="Search another package" />
            </div>
          </div>
          {/* Desktop: inline search */}
          <div className="hidden sm:block w-72">
            <SearchBox />
          </div>
        </div>
      </div>

      {/* Command bar: range left, export/share right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-[230px]">{rangeSelector}</div>
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          {exportItems.length ? <ExportDropdown items={exportItems} /> : null}
          <ShareMenu
            url={canonical}
            title={`${name} npm downloads (${days} days) | npmtraffic`}
            iconOnlyOnMobile
          />
        </div>
      </div>
    </div>
  );

  if (errorText || !data) {
    return (
      <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-6">
        {header}
        <AlertBanner message={`${errorText ?? "Failed to load data."} Please try again.`} />
      </main>
    );
  }

  const traffic = data;

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-6">
      {header}
      {traffic.meta.isStale ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {traffic.warning ?? "Showing cached data (upstream error)."}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium text-slate-400">
            Total downloads ({days} days)
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">
            {formatNumber(traffic.totals.sum)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium text-slate-400">
            Avg per day
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">
            {formatNumber(traffic.totals.avgPerDay)}
          </p>
        </div>
      </div>

      <TrafficChart series={traffic.series} derived={traffic.derived} pkgName={name} />

      <DerivedSeriesTable series={traffic.series} derived={traffic.derived} pkgName={name} days={days} />

      <EventsPanel key={`${name}:${sp.events ?? ""}`} pkgName={name} encoded={sp.events} />

      <p className="text-xs text-slate-500">Data from api.npmjs.org.</p>
    </main>
  );
}
