import { USER_AGENT } from "./version";

export type NpmRangeRow = { day: string; downloads: number };
export type NpmRangeResponse = {
  start: string;
  end: string;
  package?: string;
  downloads: NpmRangeRow[];
};

export type NpmRange =
  | "last-7-days"
  | "last-14-days"
  | "last-30-days"
  | "last-90-days"
  | "last-180-days"
  | "last-365-days";
export type NpmDateRange = { start: string; end: string };

export class UpstreamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchDailyDownloadsRange(
  pkg: string | null,
  range: NpmDateRange
): Promise<NpmRangeResponse> {
  const suffix = pkg === null ? "" : `/${encodeURIComponent(pkg)}`;
  const url = `https://api.npmjs.org/downloads/range/${range.start}:${range.end}${suffix}`;
  // Keep the deadline active through body consumption, not just response headers.
  const signal = AbortSignal.timeout(5000);
  const res = await fetch(url, {
    signal,
    headers: { accept: "application/json", "user-agent": USER_AGENT },
  });
  if (!res.ok) {
    // A downloads 404 alone does not prove that a package does not exist.
    if (res.status === 404 && pkg !== null) {
      const registry = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, {
        signal, headers: { accept: "application/json", "user-agent": USER_AGENT },
      });
      const absent = registry.status === 404;
      await registry.body?.cancel();
      if (absent) throw new Error("NPM_NOT_FOUND: Package not found");
    }
    throw new UpstreamError(res.status, "npm downloads unavailable");
  }
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") throw new UpstreamError(502, "Invalid npm response");
  const value = data as NpmRangeResponse;
  if (value.package !== (pkg ?? undefined) || value.start !== range.start || value.end !== range.end ||
      !Array.isArray(value.downloads) || value.downloads.some((row) =>
        !row || typeof row.day !== "string" || typeof row.downloads !== "number")) {
    throw new UpstreamError(502, "Invalid npm response schema or range");
  }
  return value;
}
