import { toYYYYMMDD } from "@/lib/dates";

export type NpmRangeRow = { day: string; downloads: number };
export type NpmRangeResponse = {
  start: string;
  end: string;
  package: string;
  downloads: NpmRangeRow[];
};

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

async function fetchJson(url: string, timeoutMs: number): Promise<Response> {
  const { ctrl, clear } = withTimeout(timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
  } finally {
    clear();
  }
}

export async function fetchDailyDownloadsRange(
  pkg: string,
  start: Date,
  end: Date
): Promise<NpmRangeResponse> {
  const s = toYYYYMMDD(start);
  const e = toYYYYMMDD(end);
  const safePkg = encodeURIComponent(pkg);
  const url = `https://api.npmjs.org/downloads/range/${s}:${e}/${safePkg}`;

  // retry policy minimal: 2 attempts on 429/5xx
  let lastErr: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetchJson(url, 5000).catch((e) => {
      lastErr = e;
      return null;
    });

    if (!res) continue;

    if (res.ok) {
      return (await res.json()) as NpmRangeResponse;
    }

    // 404: package not found on endpoint
    if (res.status === 404) {
      const body = await res.text().catch(() => "");
      throw new Error(`NPM_NOT_FOUND: ${body || "Package not found"}`);
    }

    // 429 / 5xx: retry once
    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      const retryAfter = Number(res.headers.get("retry-after") || "1");
      await new Promise((r) => setTimeout(r, Math.min(5, Math.max(1, retryAfter)) * 1000));
      lastErr = new Error(`UPSTREAM_${res.status}`);
      continue;
    }

    const text = await res.text().catch(() => "");
    throw new Error(`UPSTREAM_${res.status}: ${text || "Upstream error"}`);
  }

  throw lastErr ?? new Error("UPSTREAM_FAILED");
}