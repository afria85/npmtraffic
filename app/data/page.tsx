import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  return {
    title: "Data | npmtraffic",
    description: "How npmtraffic sources and caches npm download data.",
    alternates: {
      canonical: `${baseUrl}/data`,
    },
    openGraph: {
      title: "Data | npmtraffic",
      description: "How npmtraffic sources and caches npm download data.",
      url: `${baseUrl}/data`,
      images: [{ url: ogImage, alt: "npmtraffic data" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Data | npmtraffic",
      description: "How npmtraffic sources and caches npm download data.",
    },
  };
}

const errorMeanings = [
  { code: "401 / 403", description: "npm treats this as edge/authorization issues; we fall back to cache." },
  { code: "429", description: "Registry rate limit; try again shortly or wait for cached data." },
  { code: "5xx", description: "Upstream outage; stale cache is served when available." },
];

export default function DataPage() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const endDate = yesterday.toISOString().slice(0, 10);

  return (
    <main className="mx-auto min-h-full max-w-4xl px-4 py-12">
      <header className="mb-6">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Data</h1>
        <p className="text-sm text-[var(--foreground-tertiary)]">
          Data freshness, caching, and error explanations.
        </p>
      </header>
      <section className="space-y-4 text-[var(--foreground-secondary)]">
        <p>
          Downloads data comes directly from <code>api.npmjs.org</code>. Each table reflects the last day
          ending on {endDate} (yesterday UTC), as npm&#39;s download counters lag for the current day.
        </p>
        <p>
          Responses are cached for 15 minutes and kept stale for 24 hours; stale data is used when a fresh
          copy cannot be fetched. Totals, averages, and series always represent the normalized range.
        </p>
        <p>
          Supported ranges now include 7, 14, 30, 90, 180, and 365 days. Longer views (90+ days) refresh every 12 hours while still honoring
          the 24-hour stale window so that historic traffic remains available even during upstream hiccups.
        </p>
        <div>
          <h2 className="text-lg font-semibold">Error meanings</h2>
          <ul className="mt-2 space-y-2 pl-4">
            {errorMeanings.map((item) => (
              <li key={item.code}>
                <strong>{item.code}:</strong> {item.description}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Exports</h2>
          <p>
            Download the data as CSV or JSON from <code>/api/v1/package/&#123;name&#125;/daily.csv</code> or <code>/api/v1/package/&#123;name&#125;/daily.json</code>.
            CSV files now add comment headers that document <em>from</em>/<em>to</em> dates, <em>timezone</em>, <em>generated_at</em>, and the data
            <em>source</em>. JSON responses expose the normalized range along with a <code>meta</code> block that repeats those fields
            plus cache status, stale flags, derived method metadata, and the requestId for auditing.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Both CSV and JSON exports now share an <strong>export metadata</strong> block (from/to dates, timezone=UTC, generated_at timestamp, source, request_id, cache status, and stale indicators)
            so you can verify precisely what data was generated and why.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Derived metrics such as trailing MA3/MA7 and MAD-based outlier scores are available in the exports and behind the
            &quot;Show derived metrics&quot; toggle on package pages. These values are computed heuristically and do not alter the raw download counts.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Events are user-provided notes stored locally per package in the browser. They add markers to the table rows,
            show in the list overlay, and are never synced or stored on the server.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Downloads reflect all traffic captured by <code>api.npmjs.org</code>; they are not unique user counts and may include CI, bots, or repeated installs.
          </p>
        </div>
      </section>
    </main>
  );
}
