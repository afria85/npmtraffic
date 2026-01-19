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
            GitHub-style daily npm download history
          </h1>
          <p className="text-base text-slate-300 sm:text-lg">
            Compare packages. Export CSV. Track when downloads change day-to-day.
          </p>
          <div className="pt-4">
            <SearchBox className="mx-auto w-full max-w-xl" />
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <CompareLink />
        </div>

        <section className="space-y-4 border-t border-white/10 pt-8 text-sm text-slate-300">
          <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            How it works
          </h2>
          <ul className="space-y-2 text-left sm:text-base">
            <li>• Daily downloads pulled directly from <code>api.npmjs.org</code>.</li>
            <li>• All ranges end yesterday UTC so downloads always line up with npm’s reporting.</li>
            <li>• Counts reflect total downloads, not unique users or installs.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Popular packages
          </h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_PACKAGES.map((pkg) => (
              <Link
                key={pkg}
                href={`/p/${encodeURIComponent(pkg)}?days=30`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              >
                {pkg}
              </Link>
            ))}
          </div>
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
