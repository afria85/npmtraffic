import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;
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
      images: [
        { url: ogImage, alt: "npmtraffic data" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Data | npmtraffic",
      description: "How npmtraffic sources and caches npm download data.",
      images: [
        { url: ogImage, alt: "npmtraffic data" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
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
          Supported ranges include 7, 14, 30, 90, 180, and 365 days. Longer views (90+ days) refresh every 12 hours while still honoring
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
            Package exports: <code>/api/v1/package/&#123;name&#125;/daily.csv</code>, <code>/api/v1/package/&#123;name&#125;/daily.excel.csv</code>, or{' '}
            <code>/api/v1/package/&#123;name&#125;/daily.json</code>. All endpoints accept <code>?days=7|14|30|90|180|365</code>.
          </p>
          <p>
            Compare exports: <code>/api/v1/compare.json</code>, <code>/api/v1/compare.csv</code>, and <code>/api/v1/compare.excel.csv</code> with{' '}
            <code>?packages=pkg1,pkg2</code> (or <code>pkgs</code>) plus optional <code>days</code>.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Standard CSV includes a comment header with export metadata (from/to dates, timezone=UTC, generated_at, source, request_id, cache status, and stale indicators).{' '}
            The Excel CSV variant adds <code>sep=;</code> and uses <code>;</code> as the delimiter for easier spreadsheet imports.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            JSON exports include the normalized range along with a <code>meta</code> block, plus an <code>export</code> metadata block for traceability.
          </p>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Derived metrics such as trailing MA3/MA7 and MAD-based outlier scores are available in exports and behind the
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
