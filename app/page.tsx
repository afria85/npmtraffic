import crypto from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { getBaseUrl } from "@/lib/base-url";
import { config } from "@/lib/config";
import { homepageJsonLd } from "@/lib/jsonld";
import { buildExportCommentHeader, buildExportMeta } from "@/lib/export";
import { buildExportFilename } from "@/lib/export-filename";
import { rangeForDays } from "@/lib/query";
import SearchBox from "@/components/SearchBox";
import { Button } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;

  return {
    title: "npmtraffic",
    description: config.site.tagline,
    alternates: {
      canonical: `${baseUrl}/`,
    },
    openGraph: {
      type: "website",
      siteName: "npmtraffic",
      title: "npmtraffic",
      description: config.site.tagline,
      url: `${baseUrl}/`,
      images: [{ 
        url: ogImage, 
        alt: "npmtraffic - Daily npm download analytics",
        width: 1200,
        height: 630,
        type: "image/png",
      }, {
        url: fallbackOgImage,
        alt: "npmtraffic",
        width: 1200,
        height: 630,
        type: "image/png",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: "npmtraffic",
      description: config.site.tagline,
      images: [{
        url: ogImage,
        alt: "npmtraffic - Daily npm download analytics",
      }, {
        url: fallbackOgImage,
        alt: "npmtraffic",
      }],
    },
  };
}

export default async function Home() {
  const baseUrl = await getBaseUrl();
  const jsonLd = homepageJsonLd(baseUrl);
  const exampleDays = 30;
  const examplePackage = "react";
  const exampleRange = rangeForDays(exampleDays);
  const exportFilename = buildExportFilename({
    packages: [examplePackage],
    days: exampleDays,
    range: exampleRange,
    format: "csv",
  });
  const exportMeta = buildExportMeta(
    exampleRange,
    new Date().toISOString(),
    crypto.randomUUID(),
    "HIT",
    false,
    null
  );
  const exportHeaderLines = buildExportCommentHeader(exportMeta).split("\n");

  return (
    <main className="relative min-h-screen">
      {/* Hero - Direct & Technical */}
      <section className="relative overflow-visible px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 space-y-6 text-center">
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              npm download analytics.
              <br />
              <span className="text-gradient">Daily data, full metadata,<br />zero guessing.</span>
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-[var(--foreground-secondary)] sm:text-xl">
              UTC-anchored daily tables. Deterministic exports with traceable metadata. Event markers for correlation. Built for reproducible analysis.
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <SearchBox className="mx-auto w-full max-w-2xl" />
          </div>

          {/* Popular Packages */}
          <div className="space-y-3">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--foreground-tertiary)]">
              popular packages
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {POPULAR_PACKAGES.slice(0, 12).map((pkg) => (
                <Link
                  key={pkg}
                  href={`/p/${encodeURIComponent(pkg)}?days=30`}
                  className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-mono text-[var(--foreground)] transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] hover:shadow-md"
                >
                  {pkg}
                </Link>
              ))}
            </div>

            <p className="text-center text-xs text-[var(--foreground-tertiary)]">
              Start with a package, or <Link
                href="/compare"
                className="underline underline-offset-2 hover:text-[var(--foreground-secondary)]"
              >compare</Link> 2 - 5 packages &bull;{" "}
              <Link
                href="/about"
                className="underline underline-offset-2 hover:text-[var(--foreground-secondary)]"
              >
                Why this exists
              </Link>{" "}
            </p>
          </div>
        </div>
      </section>

      {/* Technical Features - Real Examples */}
      <section className="relative border-t border-[var(--border)] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Made for package maintainers
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--foreground-secondary)]">
              Not just charts. Tables you can read, exports you can trust, events you can correlate.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Feature 1: UTC-anchored */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">UTC-anchored daily rows</h3>
              </div>
              <p className="mb-4 text-[var(--foreground-secondary)]">
                Date ranges end at yesterday UTC, matching npm&rsquo;s official reporting window. No time zone confusion.
              </p>
              <div className="rounded-lg bg-[var(--background)] p-3 font-mono text-xs text-[var(--foreground-secondary)]">
                <div className="text-[10px] uppercase tracking-widest text-[var(--foreground-tertiary)]">
                  Example row (format)
                </div>
                <div className="mt-2 border-b border-[var(--border)] pb-1">
                  <span>{exampleRange.endDate} (UTC)</span>
                </div>
                <div className="mt-1 text-[var(--foreground)]">Downloads: 123,456</div>
                <div>Delta: +1,234</div>
              </div>
            </div>

            {/* Feature 2: Deterministic exports */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Deterministic exports</h3>
              </div>
              <p className="mb-4 text-[var(--foreground-secondary)]">
                CSV/JSON with traceable metadata (cache status, generated_at, request_id) embedded in the file header. Filenames include the UTC date range.
              </p>
              <div className="rounded-lg bg-[var(--background)] p-3 font-mono text-xs text-[var(--foreground-secondary)]">
                <div className="text-[10px] uppercase tracking-widest text-[var(--foreground-tertiary)]">
                  Example output (format)
                </div>
                <div className="mt-2 text-[var(--accent)]">{exportFilename}</div>
                <div className="mt-2 text-[var(--foreground)]">Header metadata</div>
                {exportHeaderLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>

            {/* Feature 3: Event correlation */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Event markers overlay</h3>
              </div>
              <p className="mb-4 text-[var(--foreground-secondary)]">
                Pin releases, blog posts, or incidents to charts. See how they correlate with download spikes. Local-first storage.
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-[var(--background)] p-3">
                <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="font-mono text-xs text-[var(--foreground)]">2025-01-20: v19.0.0 release</span>
                <span className="ml-auto text-xs text-[var(--foreground-tertiary)]">+18% spike</span>
              </div>
            </div>

            {/* Feature 4: Cache/stale surfaced */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Stale-aware UI</h3>
              </div>
              <p className="mb-4 text-[var(--foreground-secondary)]">
                See when data was fetched, and get an explicit warning + retry button when upstream errors force stale results.
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-[var(--background)] p-3">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span className="text-xs text-[var(--foreground-secondary)]">Updated 3 min ago • Stale warning if upstream fails</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="relative border-t border-[var(--border)] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Compare packages side-by-side
          </h2>
          <p className="mb-8 text-lg text-[var(--foreground-secondary)]">
            Up to 5 packages. Aligned date ranges. Consistent labeling. Shareable URLs.
          </p>
          <Link href="/compare">
            <Button variant="primary" size="lg">
              Start Comparing
            </Button>
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
