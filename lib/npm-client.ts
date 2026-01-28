import { USER_AGENT } from "./version";

export type NpmRangeRow = { day: string; downloads: number };
export type NpmRangeResponse = {
  start: string;
  end: string;
  package: string;
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

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

async function fetchJson(url: string, timeoutMs: number): Promise<Response> {
  const { ctrl, clear } = withTimeout(timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
    });
  } finally {
    clear();
  }
}

export async function fetchDailyDownloadsRange(
  pkg: string,
  range: NpmDateRange
): Promise<NpmRangeResponse> {
  const safePkg = encodeURIComponent(pkg);
  const url = `https://api.npmjs.org/downloads/range/${range.start}:${range.end}/${safePkg}`;

  const res = await fetchJson(url, 5000);

  if (res.ok) {
    return (await res.json()) as NpmRangeResponse;
  }

  if (res.status === 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`NPM_NOT_FOUND: ${body || "Package not found"}`);
  }

  const text = await res.text().catch(() => "");
  throw new UpstreamError(res.status, text || "Upstream unavailable");
}
