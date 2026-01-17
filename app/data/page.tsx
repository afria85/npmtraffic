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
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-6">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Data</h1>
        <p className="text-sm text-slate-400">
          Data freshness, caching, and error explanations.
        </p>
      </header>
      <section className="space-y-4 text-slate-200">
        <p>
          Downloads data comes directly from <code>api.npmjs.org</code>. Each table reflects the last day
          ending on {endDate} (yesterday UTC), as npm&#39;s download counters lag for the current day.
        </p>
        <p>
          Responses are cached for 15 minutes and kept stale for 24 hours; stale data is used when a fresh
          copy cannot be fetched. Totals, averages, and series always represent the normalized range.
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
          <p className="text-sm text-slate-400">
            Derived metrics such as trailing MA3/MA7 and MAD-based outlier scores are available in the exports and behind the
            &quot;Show derived metrics&quot; toggle on package pages. These values are computed heuristically and do not alter the raw download counts.
          </p>
        </div>
      </section>
    </main>
  );
}
