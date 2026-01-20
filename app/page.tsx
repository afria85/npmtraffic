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
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">npmtraffic</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            npm download analytics, built for maintainers
          </h1>
          <p className="text-base text-slate-300 sm:text-lg">
            Daily tables, day-to-day deltas, event markers, and audit-grade exports — the workflows you
            need to explain why downloads changed.
          </p>
          <div className="pt-4 space-y-3">
            <SearchBox className="mx-auto w-full max-w-xl" />
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Popular
              </span>
              {POPULAR_PACKAGES.map((pkg) => (
                <Link
                  key={pkg}
                  href={`/p/${encodeURIComponent(pkg)}?days=30`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                >
                  {pkg}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
            <Link href="/about" className="underline decoration-white/20 underline-offset-4 hover:text-slate-200">
              Why this exists
            </Link>
            <span aria-hidden className="text-slate-600">·</span>
            <Link href="/compare" className="underline decoration-white/20 underline-offset-4 hover:text-slate-200">
              Compare packages
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <CompareLink />
        </div>

        <section className="grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Daily tables</p>
            <p className="mt-2 text-sm text-slate-200">
              Read downloads date-by-date, spot inflection points, and export the exact dataset.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Audit-grade exports</p>
            <p className="mt-2 text-sm text-slate-200">
              CSV/JSON includes metadata (UTC range, cache status, timestamps) so analysis is reproducible.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Attribution hooks</p>
            <p className="mt-2 text-sm text-slate-200">
              Add event markers (release, post, incident) and correlate them with changes in the chart.
            </p>
          </div>
        </section>

        <section className="space-y-2 text-sm text-slate-300">
          <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">How it works</h2>
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
