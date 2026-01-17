import type { RangeForDaysResult } from "@/lib/query";
import type { TrafficResponse } from "@/lib/traffic";
import { DERIVED_METHOD_DESCRIPTION } from "@/lib/derived";

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

export function buildExportCommentHeader(meta: ExportMeta) {
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
  ].join("\n");
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
    derived: data.derived,
    meta: {
      timezone: EXPORT_TIMEZONE,
      generatedAt,
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
