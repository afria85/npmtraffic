import DataQuality from "@/components/DataQuality";
import SavedComparisons from "@/components/compare/SavedComparisons";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { clampDays, canonicalizePackages, parsePackageList } from "@/lib/query";
import { validatePackageName } from "@/lib/package-name";
import { buildCompareData, MAX_COMPARE_PACKAGES, type CompareData, type CompareSelection } from "@/lib/compare";
import { TrafficError } from "@/lib/traffic";
import { buildCompareCanonical } from "@/lib/canonical";
import RangeSelector from "@/components/RangeSelector";
import ExportDropdown from "@/components/ExportDropdown";
import ShareMenu from "@/components/ShareMenu";
import BrandText from "@/components/BrandText";
import CompareChart from "@/components/compare/CompareChartClient";
import CompareAddBar from "@/components/compare/CompareAddBar";
import CompareSeriesTable from "@/components/compare/CompareSeriesTable";
import CompareInsightsPanel from "@/components/compare/CompareInsightsPanel";
import RetryButton from "@/components/ui/RetryButton";
import {
  COMPARE_ACTION_CONTAINER_CLASSES,
} from "@/components/compare/compare-classes";
import CompareFocusVisibility from "@/components/compare/CompareFocusVisibility";
import CompareUrlSync from "@/components/compare/CompareUrlSync";
import { encodePkg } from "@/lib/og-encode";

type Props = {
  searchParams?: Promise<{ packages?: string; pkgs?: string; days?: string }>;
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
    .slice(0, MAX_COMPARE_PACKAGES)
    .filter((pkg) => validatePackageName(pkg).ok);
  const days = clampDays(sp.days);
  const baseUrl = await getBaseUrl();

  if (pkgs.length < 2) {
    return {
      title: "Compare npm downloads",
      description: "Compare npm download history across packages.",
      alternates: { canonical: `${baseUrl}/compare` },
      openGraph: {
        title: "Compare npm downloads | npmtraffic",
        description: "Compare npm download history across packages.",
        url: `${baseUrl}/compare`,
      },
    };
  }

  const canonical = buildCompareCanonical(baseUrl, pkgs);
  const title = `Compare npm downloads (${days} days)`;
  const socialTitle = `${title} | npmtraffic`;
  const description = `Compare npm download history for ${pkgs.join(", ")}.`;
  const encodedPkgs = encodePkg(pkgs.join(","));
  const ogImage = `${baseUrl}/og/compare/${encodedPkgs}/${days}.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "npmtraffic",
      title: socialTitle,
      description,
      url: `${canonical}&days=${days}`,
      images: [
        {
          url: ogImage,
          alt: `Compare npm downloads: ${pkgs.join(" vs ")}`,
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
      title: socialTitle,
      description,
      images: [
        {
          url: ogImage,
          alt: `Compare npm downloads: ${pkgs.join(" vs ")}`,
        },
        {
          url: fallbackOgImage,
          alt: "npmtraffic",
        },
      ],
    },
  };
}

function describeExportSelection(selection: CompareSelection) {
  const messages: string[] = [];
  const { exportedCount, requestedCount, capOmittedCount, invalidCount, unavailableCount, duplicateCount } = selection;
  if (exportedCount < requestedCount) {
    messages.push(`This export includes ${exportedCount} of ${requestedCount} distinct requested packages.`);
  }
  if (capOmittedCount) messages.push(`Five-package limit: ${capOmittedCount} omitted.`);
  if (invalidCount) messages.push(`Invalid package names: ${invalidCount}.`);
  if (unavailableCount) messages.push(`Packages not found: ${unavailableCount}.`);
  if (duplicateCount) messages.push(`Duplicate entries ignored: ${duplicateCount}.`);
  return messages;
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawPkgs = sp.packages ?? sp.pkgs ?? "";
  const rawDays = sp.days;
  const requested = parsePackageList(rawPkgs);
  const pkgs = canonicalizePackages(requested)
    .slice(0, MAX_COMPARE_PACKAGES)
    .filter((pkg) => validatePackageName(pkg).ok);
  const days = clampDays(rawDays);
  const incomplete = pkgs.length < 2;
  // Keep the input in the same keyed subtree across selection and result layouts.
  const renderBuilder = (intro: ReactNode) => (
    <div key="compare-builder" className={`flex w-full flex-col ${incomplete ? "gap-6" : "gap-3"}`}>
      {intro}
      <div className={incomplete ? "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" : undefined}>
        <CompareAddBar packages={pkgs} days={days} className="w-full max-w-xl" />
      </div>
    </div>
  );
  if (incomplete) {
    return (
      <main className="observatory-page py-12">
        {renderBuilder(
          <div className="space-y-3">
            <BrandText />
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Compare npm packages</h1>
            <p className="text-sm text-[var(--foreground-tertiary)]">
              Add at least two packages to compare daily downloads, deltas, and trends.
            </p>
          </div>
        )}
        <SavedComparisons />
      </main>
    );
  }

  // Keep omissions and duplicates in the URL used by the range selector and exports.
  const queryPackages = requested.length === pkgs.length ? pkgs : requested;
  const comparisonPackages = queryPackages.map(encodeURIComponent).join(",");
  if (
    !rawDays ||
    rawDays !== String(days) ||
    (requested.length === pkgs.length && rawPkgs !== pkgs.join(",")) ||
    sp.pkgs
  ) {
    redirect(`/compare?packages=${comparisonPackages}&days=${days}`);
  }

  const baseUrl = await getBaseUrl();
  const shareUrl = `${buildCompareCanonical(baseUrl, pkgs)}&days=${days}`;
  const rangeSelector = (
    <RangeSelector
      currentDays={days}
      getHref={(value) => `/compare?packages=${comparisonPackages}&days=${value}`}
      label="RANGE"
    />
  );

  let data: CompareData | null = null;
  let errorText: string | null = null;
  try {
    data = await buildCompareData(requested, days);
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

  const messages = data ? describeExportSelection(data.selection) : [];
  const noticeId = "compare-export-selection";
  const exportItems = data
    ? [
        {
          key: "csv",
          label: "CSV",
          description: "Comment header, UTC dates, daily deltas",
          href: `/api/v1/compare.csv?packages=${comparisonPackages}&days=${days}`,
        },
        {
          key: "excel",
          label: "Excel CSV",
          description: "Semicolon-delimited for spreadsheet imports",
          href: `/api/v1/compare.excel.csv?packages=${comparisonPackages}&days=${days}`,
        },
        {
          key: "json",
          label: "JSON",
          description: "Package totals, daily values, metadata, export block",
          href: `/api/v1/compare.json?packages=${comparisonPackages}&days=${days}`,
        },
      ]
    : [];

  const header = (
    <div className="flex w-full flex-col gap-3">
      <h1 className="observatory-title">Compare packages</h1>
      {messages.length > 0 && (
        <p id={noticeId} className="text-sm text-[var(--foreground-secondary)]">
          {messages.join(" ")}
        </p>
      )}
      <div className="observatory-toolbar">
        <div className="min-w-0">{rangeSelector}</div>
        <div className={`${COMPARE_ACTION_CONTAINER_CLASSES} flex-shrink-0 self-end`}>
          {exportItems.length ? (
            <ExportDropdown
              items={exportItems}
              accessibleLabel="Export comparison data"
              descriptionId={messages.length ? noticeId : undefined}
            />
          ) : null}
          <ShareMenu url={shareUrl} title={`npmtraffic compare (${days} days)`} iconOnlyOnMobile />
        </div>
      </div>

    </div>
  );

  if (errorText || !data) {
    return (
      <main className="observatory-page">
        {renderBuilder(header)}
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
    <main className="observatory-page">
      <CompareFocusVisibility />
      <CompareUrlSync packages={pkgs} />
      {renderBuilder(header)}
      <DataQuality range={data.range} fetchedAt={data.meta.fetchedAt} isStale={data.meta.isStale} coverage={data.coverage} shared />
      {data.meta.isStale ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          <span>Showing cached data (upstream error).</span>
          <RetryButton className="h-8 px-3 text-xs" label="Retry" />
        </div>
      ) : null}
      {data?.warnings?.length ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 break-words px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {data.warnings.join(" ")}
        </div>
      ) : null}
      <CompareChart series={data.series} packageNames={tablePackageNames} days={days} />

      <section aria-labelledby="shared-download-totals">
        <h2 id="shared-download-totals" className="observatory-section-title">
          Downloads on shared days
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Totals and shares use the same {data.coverage.includedDays} of {days} days for every package.
        </p>
        <table className="observatory-ledger" aria-labelledby="shared-download-totals">
          <thead>
            <tr><th scope="col">Package</th><th scope="col">Downloads</th><th scope="col">Share</th></tr>
          </thead>
          <tbody>
            {data.packages.map((pkg) => (
              <tr key={pkg.name}>
                <th scope="row"><Link href={`/p/${encodeURIComponent(pkg.name)}`}>{pkg.name}</Link></th>
                <td>{formatNumber(pkg.total)}</td>
                <td>{pkg.share === null ? "Unavailable" : pkg.share.toFixed(2) + "%"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <CompareInsightsPanel packages={data.packages} series={data.series} days={days} />

      <SavedComparisons packages={pkgs} days={days} />

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]">
          <h2 className="text-sm font-semibold">Daily downloads ({days}d)</h2>
        </div>
        <CompareSeriesTable series={data.series} packageNames={tablePackageNames} />
        <p className="px-3 py-2 text-xs text-[var(--foreground-tertiary)]">
          &Delta; vs previous day = downloads today - downloads yesterday
        </p>
      </div>

    </main>
  );
}
