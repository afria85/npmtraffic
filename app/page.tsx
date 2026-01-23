import type { Metadata } from "next";
import Link from "next/link";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { getBaseUrl } from "@/lib/base-url";
import { config } from "@/lib/config";
import { homepageJsonLd } from "@/lib/jsonld";
import SearchBox from "@/components/SearchBox";
import CompareLink from "@/components/compare/CompareLink";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;

  return {
    title: "npmtraffic",
    description: config.site.tagline,
    alternates: {
      canonical: `${baseUrl}/`,
    },
    openGraph: {
      title: "npmtraffic",
      description: config.site.tagline,
      url: `${baseUrl}/`,
      images: [
        {
          url: ogImage,
          alt: "npmtraffic",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "npmtraffic",
      description: config.site.tagline,
      images: [ogImage],
    },
  };
}

export default async function Home() {
  const baseUrl = await getBaseUrl();
  const jsonLd = homepageJsonLd(baseUrl);

  return (
    <main className="min-h-full px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--muted)]">npmtraffic</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">
            <span className="block">npm download analytics</span>
            <span className="block">built for maintainers</span>
          </h1>
          <p className="text-base text-[color:var(--muted)] sm:text-lg">
            Daily tables, deltas, and event markers — plus exports with UTC ranges and cache metadata,
            so you can explain what changed (and share the evidence).
          </p>
          <div className="pt-4 space-y-3">
            <SearchBox className="mx-auto w-full max-w-xl" />
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[color:var(--muted)]">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[color:var(--muted)]">
                Popular packages
              </span>
              {POPULAR_PACKAGES.map((pkg) => (
                <Link
                  key={pkg}
                  href={`/p/${encodeURIComponent(pkg)}?days=30`}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)]"
                >
                  {pkg}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-[color:var(--muted)]">
            <Link href="/about" className="underline decoration-[color:var(--border)] underline-offset-4 hover:text-[color:var(--foreground)]">
              Why this exists
            </Link>
            <span aria-hidden className="text-[color:var(--muted)]">·</span>
            <Link href="/compare" className="underline decoration-[color:var(--border)] underline-offset-4 hover:text-[color:var(--foreground)]">
              Compare packages
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <CompareLink />
        </div>

        <section className="grid gap-3 border-t border-[color:var(--border)] pt-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--muted)]">Daily tables</p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]">
              Read downloads date-by-date, spot inflection points, and export the exact dataset.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--muted)]">Audit-grade exports</p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]">
              CSV/JSON includes metadata (UTC range, cache status, timestamps) so analysis is reproducible.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--muted)]">Attribution hooks</p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]">
              Add event markers (release, post, incident) and correlate them with changes in the chart.
            </p>
          </div>
        </section>

        <section className="space-y-2 text-sm text-[color:var(--muted)]">
          <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-[color:var(--muted)]">How it works</h2>
          <ul className="space-y-2 text-left sm:text-base">
            <li>• Daily downloads pulled directly from <code>api.npmjs.org</code>.</li>
            <li>• All ranges end yesterday UTC so downloads line up with npm’s reporting.</li>
            <li>• Counts reflect total downloads, not unique users or installs.</li>
          </ul>
        </section>
      </div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
