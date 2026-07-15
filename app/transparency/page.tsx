import type { Metadata } from "next";
import BrandText from "@/components/BrandText";
import { getBaseUrl } from "@/lib/base-url";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;
  return {
    title: "Transparency",
    description: "Cost and infrastructure transparency for npmtraffic.",
    alternates: {
      canonical: `${baseUrl}/transparency`,
    },
    openGraph: {
      title: "Transparency | npmtraffic",
      description: "Cost and infrastructure transparency for npmtraffic.",
      url: `${baseUrl}/transparency`,
      images: [
        { url: ogImage, alt: "npmtraffic transparency" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Transparency | npmtraffic",
      description: "Cost and infrastructure transparency for npmtraffic.",
      images: [
        { url: ogImage, alt: "npmtraffic transparency" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
    },
  };
}

export default function TransparencyPage() {
  return (
    <main className="mx-auto min-h-full max-w-4xl px-6 py-16 sm:py-20">
      <header className="mb-8">
        <BrandText />
        <h1 className="mt-2 text-4xl font-semibold text-[var(--foreground)]">Transparency</h1>
        <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">Infrastructure, data sources, caching, privacy, and sharing posture.</p>
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Hosting &amp; infrastructure</h2>
          <p className="text-sm leading-6 text-[var(--foreground-secondary)]">
            npmtraffic runs on Vercel with Next.js server routes and a small in-memory cache. There is no account system, paid tier, or customer data store; the project stays focused on fast public package analysis.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Data sources</h2>
          <p className="text-sm leading-6 text-[var(--foreground-secondary)]">
            Download counts come from <code>api.npmjs.org</code>. Search, repository metadata, dist-tags, and publish/release markers come from <code>registry.npmjs.org</code>. npmtraffic normalizes date ranges to yesterday UTC because npm download counters lag the current day.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Caching &amp; freshness</h2>
          <p className="text-sm leading-6 text-[var(--foreground-secondary)]">
            Short traffic windows cache for 15 minutes; longer traffic windows cache for 12 hours. Stale traffic can be served for up to 24 hours when npm is unavailable, and stale state is shown in the UI and export metadata. Package metadata can cache longer because it changes less often.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Rate limiting &amp; privacy</h2>
          <p className="text-sm leading-6 text-[var(--foreground-secondary)]">
            Public endpoints are rate limited to prevent abuse. Rate limiting uses request metadata transiently and is not used for profiling. Vercel Web Analytics provides aggregate site usage without ad pixels, cross-site tracking cookies, or user profiles.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Local-first events &amp; sharing</h2>
          <p className="text-sm leading-6 text-[var(--foreground-secondary)]">
            Event markers are stored in your browser by default. Importing npm releases creates local markers from public registry publish dates. If you explicitly share a link that includes an <code>events</code> parameter, that payload is embedded in the URL and can be imported by others.
          </p>
        </section>
      </div>
    </main>
  );
}
