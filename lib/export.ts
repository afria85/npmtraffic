import type { RangeForDaysResult } from "@/lib/query";
import type { TrafficResponse } from "@/lib/traffic";

export const EXPORT_TIMEZONE = "UTC";
export const EXPORT_SOURCE = "npm downloads API";

export function buildExportMetadata(range: RangeForDaysResult, generatedAt: string) {
  return {
    from: range.startDate,
    to: range.endDate,
    timezone: EXPORT_TIMEZONE,
    generatedAt,
    source: EXPORT_SOURCE,
  };
}

export function buildExportCommentHeader(range: RangeForDaysResult, generatedAt: string) {
  const meta = buildExportMetadata(range, generatedAt);
  return [
    `# from=${meta.from}`,
    `# to=${meta.to}`,
    `# timezone=${meta.timezone}`,
    `# generated_at=${meta.generatedAt}`,
    `# source=${meta.source}`,
  ].join("\n");
}

export function makeJsonExportPayload(
  data: TrafficResponse,
  requestId: string,
  generatedAtOverride?: string
) {
  const generatedAt = generatedAtOverride ?? data.meta.fetchedAt ?? new Date().toISOString();
  return {
    package: data.package,
    range: data.range,
    series: data.series,
    totals: data.totals,
    meta: {
      timezone: EXPORT_TIMEZONE,
      generatedAt,
      source: EXPORT_SOURCE,
      cacheStatus: data.meta.cacheStatus,
      isStale: data.meta.isStale,
      staleReason: data.meta.staleReason,
      requestId,
    },
  };
}
