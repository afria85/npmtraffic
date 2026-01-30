import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { clampDays } from "@/lib/query";
import { buildPackageCanonical } from "@/lib/canonical";
import { fetchTraffic, TrafficError, type TrafficResponse } from "@/lib/traffic";
import DerivedSeriesTable from "@/components/package/DerivedSeriesTable";
import PackageHeader from "@/components/package/PackageHeader";
import RangeSelector from "@/components/RangeSelector";
import ExportDropdown from "@/components/ExportDropdown";
import ShareMenu from "@/components/ShareMenu";
import { buildExportFilename } from "@/lib/export-filename";
import EventsPanel from "@/components/events/EventsPanel";
import TrafficChart from "@/components/package/TrafficChartClient";
import RetryButton from "@/components/ui/RetryButton";
import { encodePkg } from "@/lib/og-encode";
import { getPackageGithubRepo } from "@/lib/npm-repo";

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

function formatUpdatedAtCompact(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "Updated recently";
  const diffMs = Date.now() - ts;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Updated now";
  if (minutes < 60) return `Updated ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h`;
  const days = Math.round(hours / 24);
  return `Updated ${days}d`;
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
  // Some scrapers (notably WhatsApp) are more reliable when og:image URLs end with an image extension.
  // The /og/p route supports both "{days}" and "{days}.png".
  const ogImage = `${baseUrl}/og.png?type=package&pkg=${encodePkg(name)}&days=${days}`;
  const fallbackOgImage = `${baseUrl}/og.png`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      siteName: "npmtraffic",
      title,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          alt: `${name} npm download statistics`,
          width: 1200,
          height: 630,
          type: "image/png",
        },
        {
          url: fallbackOgImage,
          alt: "npmtraffic",
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@npmtraffic",
      title,
      description,
      images: [
        {
          url: ogImage,
          alt: `${name} npm download statistics`,
        },
        {
          url: fallbackOgImage,
          alt: "npmtraffic",
        },
      ],
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

  // If days is missing, keep the short URL (/p/<name>) and treat it as the default.
  // Redirect only when the caller provides an invalid days value (clean URL + OG scraper-friendly).
  if (rawDays && !ALLOWED_DAYS.has(rawDays)) {
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
        errorText = "npm API is temporarily unavailable. Try again in a few minutes.";
      } else {
        errorText = "We couldn't load this package right now. Try again in a few minutes.";
      }
    } else {
      errorText = "We couldn't load this package right now. Try again in a few minutes.";
    }
  }

  const updatedLabel = data ? formatUpdatedAt(data.meta.fetchedAt) : null;
  const repoUrl = data ? await getPackageGithubRepo(name) : null;
  const updatedLabelCompact = data ? formatUpdatedAtCompact(data.meta.fetchedAt) : null;
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
      <PackageHeader
        name={name}
        updatedLabel={updatedLabel}
        updatedLabelCompact={updatedLabelCompact}
        repoUrl={repoUrl}
      />

      {/* Command bar: range left, export/share right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0 sm:min-w-[230px]">{rangeSelector}</div>
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
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
          <p className="text-sm text-slate-200">{errorText ?? "We couldn't load this package right now."}</p>
          <div className="mt-3 flex items-center gap-2">
            <RetryButton />
          </div>
        </div>
      </main>
    );
  }

  const traffic = data;

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-6">
      {header}
      {traffic.meta.isStale ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <span>{traffic.warning ?? "Showing cached data (upstream error)."}</span>
          <RetryButton className="h-8 px-3 text-xs" label="Retry" />
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <p className="whitespace-nowrap text-xs font-medium text-slate-300">
            Total downloads ({days}d)
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--foreground)] sm:text-xl">
            {formatNumber(traffic.totals.sum)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <p className="whitespace-nowrap text-xs font-medium text-slate-300">Avg per day</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--foreground)] sm:text-xl">
            {formatNumber(traffic.totals.avgPerDay)}
          </p>
        </div>
      </div>

      <TrafficChart series={traffic.series} derived={traffic.derived} pkgName={name} days={days} />

      <DerivedSeriesTable series={traffic.series} derived={traffic.derived} pkgName={name} days={days} />

      <EventsPanel key={`${name}:${sp.events ?? ""}`} pkgName={name} encoded={sp.events} />

      <p className="text-xs text-slate-500">Data from api.npmjs.org.</p>
    </main>
  );
}
