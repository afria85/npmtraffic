import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/base-url";
import { clampDays, canonicalizePackages, parsePackageList, rangeForDays } from "@/lib/query";
import { validatePackageName } from "@/lib/package-name";
import { buildCompareData } from "@/lib/compare";
import { TrafficError, type TrafficResponse } from "@/lib/traffic";
import { buildCompareCanonical } from "@/lib/canonical";
import CopyLinkButton from "@/components/CopyLinkButton";
import AlertBanner from "@/components/AlertBanner";
import RangeSelector from "@/components/RangeSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { buildExportFilename } from "@/lib/export-filename";
import {
  COMPARE_ACTION_CONTAINER_CLASSES,
  COMPARE_TABLE_WRAPPER_CLASSES,
} from "@/components/compare/compare-classes";

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
    <thead className="sticky top-0 bg-black/80 text-left text-xs uppercase tracking-wider text-slate-300 backdrop-blur">
      <tr>
        <th rowSpan={2} className="px-3 py-2 text-left text-xs uppercase tracking-[0.3em] text-slate-300">
          Date
        </th>
        {packageNames.map((pkg) => (
          <th
            key={`${pkg}-group`}
            colSpan={2}
            className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-100"
          >
            {pkg}
          </th>
        ))}
      </tr>
      <tr>
        {packageNames.map((pkg) => (
          <Fragment key={`${pkg}-metrics`}>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap"
              title="Downloads for the day"
            >
              Downloads
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap"
              title="Delta vs previous day"
            >
              Delta vs prev day
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

function formatDelta(value: number | null) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${numberFormatter.format(value)}`;
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
  const ogImage = `${baseUrl}/og.png`;

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
  if (pkgs.length < 2) notFound();

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
      errorText = "npm API temporarily unavailable.";
    } else {
      errorText = "Failed to load.";
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
              {pkgs.join(", ")} - {days} days
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {rangeSelector}
        <div className={COMPARE_ACTION_CONTAINER_CLASSES}>
          {exportItems.length ? <ExportDropdown items={exportItems} /> : null}
          <CopyLinkButton canonical={canonical} label="Copy link" />
        </div>
      </div>
    </div>
  );

  if (errorText || !data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
        {header}
        <AlertBanner message={errorText ?? "Failed to load."} />
      </main>
    );
  }

  const tablePackageNames = data.packages.map((pkg) => pkg.name);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
      {header}
      {data?.warnings?.length ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {data.warnings.join(" ")}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.packages.map((pkg) => (
          <div key={pkg.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">{pkg.name}</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatNumber(pkg.total)}
            </p>
            <p
              className="text-xs text-slate-400"
              title="Share of total downloads among the compared packages for the selected range"
            >
              {pkg.share.toFixed(2)}% of total
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className={`${COMPARE_TABLE_WRAPPER_CLASSES} min-w-full`}>
          <div className="min-w-[720px]">
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-[720px] w-full text-sm">
                <CompareTableHeader packageNames={tablePackageNames} />
                <tbody className="divide-y divide-white/10">
                  {data.series.map((row) => (
                    <tr key={row.date} className="text-slate-100">
                      <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
                        {row.date}
                      </td>
                      {data.packages.map((pkg) => (
                        <Fragment key={`${row.date}-${pkg.name}-pair`}>
                          <td className="px-3 py-2 font-mono">
                            {formatNumber(row.values[pkg.name]?.downloads ?? null)}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {formatDelta(row.values[pkg.name]?.delta ?? null)}
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-3 py-2 text-xs text-slate-400">
                Delta vs previous day = downloads today - downloads yesterday
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">Data from api.npmjs.org.</p>
    </main>
  );
}
