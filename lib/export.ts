import type { RangeForDaysResult } from "@/lib/query";
import type { TrafficResponse } from "@/lib/traffic";
import { DERIVED_METHOD_DESCRIPTION } from "@/lib/derived";
import type { CompareData } from "@/lib/compare";

export const EXPORT_TIMEZONE = "UTC";
export const EXPORT_SOURCE = "npm downloads API";

export type ExportMeta = {
  from: string;
  to: string;
  timezone: typeof EXPORT_TIMEZONE;
  generatedAt: string;
  source: typeof EXPORT_SOURCE;
  requestId: string;
  cacheStatus: TrafficResponse["meta"]["cacheStatus"];
  isStale: boolean;
  staleReason: TrafficResponse["meta"]["staleReason"] | null;
};

export function buildExportMeta(
  range: RangeForDaysResult,
  generatedAt: string,
  requestId: string,
  cacheStatus: ExportMeta["cacheStatus"],
  isStale: boolean,
  staleReason: ExportMeta["staleReason"]
): ExportMeta {
  return {
    from: range.startDate,
    to: range.endDate,
    timezone: EXPORT_TIMEZONE,
    generatedAt,
    source: EXPORT_SOURCE,
    requestId,
    cacheStatus,
    isStale,
    staleReason,
  };
}

export function buildExportCommentHeader(
  meta: ExportMeta,
  coverage?: TrafficResponse["coverage"] | CompareData["coverage"],
  registryFetchedAt?: string | null,
) {
  return [
    `# from=${meta.from}`,
    `# to=${meta.to}`,
    `# timezone=${meta.timezone}`,
    `# generated_at=${meta.generatedAt}`,
    `# source=${meta.source}`,
    `# request_id=${meta.requestId}`,
    `# cache_status=${meta.cacheStatus}`,
    `# is_stale=${meta.isStale}`,
    `# stale_reason=${meta.staleReason ?? ""}`,
    ...(coverage ? [
      `# requested_days=${coverage.requestedDays}`,
      `# included_days=${coverage.includedDays}`,
      `# latest_included_date=${coverage.latestIncludedDate ?? ""}`,
    ] : []),
    ...(registryFetchedAt ? [`# registry_fetched_at=${registryFetchedAt}`] : []),
  ].join("\n");
}

export function packageCsvRows({ series, derived }: TrafficResponse) {
  return [
    ["date", "downloads", "ma3", "ma7", "is_outlier", "outlier_score",
      "observation_status", "upstream_downloads", "registry_downloads"],
    ...series.map((row, index) => [
      row.date, row.downloads, derived.ma3[index].value, derived.ma7[index].value,
      derived.outliers[index].is_outlier?.toString() ?? null, derived.outliers[index].score,
      row.status, row.upstreamDownloads, row.registryDownloads,
    ]),
  ];
}

export function compareCsvRows({ series, packages }: CompareData) {
  const names = packages.map(({ name }) => name);
  return [
    ["date", ...names.flatMap((name) => [`${name} downloads`, `${name} delta`]), "included",
      ...names.flatMap((name) => [`${name} status`, `${name} upstream downloads`, `${name} registry downloads`])],
    ...series.map(({ date, values, included }) => [
      date, ...names.flatMap((name) => [values[name].downloads, values[name].delta]),
      String(included),
      ...names.flatMap((name) => [values[name].status, values[name].upstreamDownloads, values[name].registryDownloads]),
    ]),
  ];
}

export function makeJsonExportPayload(
  data: TrafficResponse,
  requestId: string,
  generatedAtOverride?: string
) {
  const generatedAt = generatedAtOverride ?? data.meta.fetchedAt ?? new Date().toISOString();
  const exportMeta = buildExportMeta(
    data.range,
    generatedAt,
    requestId,
    data.meta.cacheStatus,
    data.meta.isStale,
    data.meta.staleReason ?? null
  );
  return {
    package: data.package,
    range: data.range,
    series: data.series,
    totals: data.totals,
    coverage: data.coverage,
    derived: data.derived,
    meta: {
      timezone: EXPORT_TIMEZONE,
      generatedAt,
      fetchedAt: data.meta.fetchedAt,
      registryFetchedAt: data.meta.registryFetchedAt,
      source: EXPORT_SOURCE,
      cacheStatus: data.meta.cacheStatus,
      isStale: data.meta.isStale,
      staleReason: data.meta.staleReason,
      derivedMethod: DERIVED_METHOD_DESCRIPTION,
      requestId,
      export: exportMeta,
    },
  };
}
