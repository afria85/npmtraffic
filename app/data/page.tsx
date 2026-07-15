import type { Metadata } from "next";
import Link from "next/link";
import BrandText from "@/components/BrandText";
import { getBaseUrl } from "@/lib/base-url";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;
  return {
    title: "Data",
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
  { code: "401 / 403", description: "npm returned an authorization-style upstream response; cached data is used when available." },
  { code: "429", description: "Registry rate limit; try again shortly or wait for cached data." },
  { code: "5xx", description: "Upstream outage; stale cache is served when available." },
];

const endpointGroups = [
  {
    title: "Package downloads",
    endpoints: [
      {
        path: "/api/v1/package/{name}/daily.json",
        description: "Daily downloads with normalized range, derived metrics, and export metadata.",
      },
      {
        path: "/api/v1/package/{name}/daily.csv",
        description: "CSV with a comment header, UTC dates, MA3/MA7, and outlier columns.",
      },
      {
        path: "/api/v1/package/{name}/daily.excel.csv",
        description: "Spreadsheet-friendly CSV using semicolon delimiters.",
      },
    ],
    params: "days=7|14|30|90|180|365",
  },
  {
    title: "Compare packages",
    endpoints: [
      {
        path: "/api/v1/compare.json",
        description: "Totals, share, daily downloads, daily deltas, cache metadata, and export metadata.",
      },
      {
        path: "/api/v1/compare.csv",
        description: "Wide CSV with one downloads and delta pair per package.",
      },
      {
        path: "/api/v1/compare.excel.csv",
        description: "Spreadsheet-friendly compare CSV using semicolon delimiters.",
      },
    ],
    params: "packages=pkg1,pkg2 or pkgs=pkg1,pkg2; optional days",
  },
  {
    title: "Lookup utilities",
    endpoints: [
      {
        path: "/api/v1/search?q=react&limit=10",
        description: "npm search proxy used by the package search box.",
      },
      {
        path: "/api/v1/validate/{name}/exists",
        description: "Registry existence check for package add/search workflows.",
      },
    ],
    params: "q, limit, or encoded package name",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground-secondary)]">
      <code className="whitespace-pre-wrap break-all">{children}</code>
    </pre>
  );
}

export default async function DataPage() {
  const baseUrl = await getBaseUrl();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const endDate = yesterday.toISOString().slice(0, 10);
  const packageCurl = `curl "${baseUrl}/api/v1/package/react/daily.json?days=30"`;
  const compareCurl = `curl "${baseUrl}/api/v1/compare.json?packages=react,vue&days=30"`;

  return (
    <main className="mx-auto min-h-full max-w-5xl px-4 py-12">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex min-h-8 items-center"
          aria-label="npmtraffic home"
        >
          <BrandText />
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Data</h1>
        <p className="text-sm text-[var(--foreground-tertiary)]">
          API endpoints, exports, caching, and error explanations.
        </p>
      </header>
      <section className="space-y-4 text-[var(--foreground-secondary)]">
        <p>
          Download counts come directly from <code>api.npmjs.org</code>. Search, repository links, dist-tags,
          and release markers come from <code>registry.npmjs.org</code>. Each table reflects the last day ending
          on {endDate}{" "}(yesterday UTC), as npm&#39;s download counters lag for the current day.
        </p>
        <p>
          Short traffic windows cache for 15 minutes; longer windows cache for 12 hours. Stale traffic can be
          served for up to 24 hours when npm is unavailable. Totals, averages, insights, and series always represent the normalized range.
        </p>
        <p>
          Supported ranges include 7, 14, 30, 90, 180, and 365 days. Package pages also expose derived columns
          such as MA3, MA7, and MAD-based outlier scores without changing the raw download counts.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">API endpoints</h2>
          <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">
            Public API responses include <code>x-request-id</code>. Successful data responses are edge-cacheable; errors and invalid requests are not cached.
          </p>
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          {endpointGroups.map((group) => (
            <div key={group.title} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{group.title}</h3>
              <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">{group.params}</p>
              <div className="mt-3 space-y-3">
                {group.endpoints.map((endpoint) => (
                  <div key={endpoint.path}>
                    <code className="break-all text-xs text-[var(--foreground)]">{endpoint.path}</code>
                    <p className="mt-1 text-xs leading-5 text-[var(--foreground-tertiary)]">
                      {endpoint.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Examples</h2>
          <CodeBlock>{packageCurl}</CodeBlock>
          <CodeBlock>{compareCurl}</CodeBlock>
        </div>
        <div className="min-w-0 space-y-3 text-sm text-[var(--foreground-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Exports</h2>
          <p>
            Standard CSV includes a comment header with export metadata: from/to dates, timezone=UTC,
            generated_at, source, request_id, cache status, and stale indicators.
          </p>
          <p>
            JSON exports include the normalized range with a <code>meta</code> block and an <code>export</code> block for traceability.
            Derived metrics such as trailing MA3/MA7 and MAD-based outlier scores do not alter the raw counts.
          </p>
          <p>
            Excel CSV uses semicolon delimiters and a <code>sep=;</code> prelude for spreadsheet imports. Chart SVG/PNG exports are generated client-side from the visible chart.
          </p>
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Error meanings</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--foreground-secondary)]">
            {errorMeanings.map((item) => (
              <li key={item.code}>
                <strong>{item.code}:</strong> {item.description}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--foreground-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Notes</h2>
          <p className="mt-3">
            Events are user-provided notes stored locally per package in the browser. They are never synced or stored on the server.
          </p>
          <p className="mt-3">
            Downloads reflect all traffic captured by <code>api.npmjs.org</code>; they are not unique user counts and may include CI, bots, or repeated installs.
          </p>
        </div>
      </section>
    </main>
  );
}
