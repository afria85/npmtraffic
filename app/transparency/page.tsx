import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/base-url";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  return {
    title: "Transparency | npmtraffic",
    description: "Cost and infrastructure transparency for npmtraffic.",
    alternates: {
      canonical: `${baseUrl}/transparency`,
    },
    openGraph: {
      title: "Transparency | npmtraffic",
      description: "Cost and infrastructure transparency for npmtraffic.",
      url: `${baseUrl}/transparency`,
      images: [{ url: ogImage, alt: "npmtraffic transparency" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Transparency | npmtraffic",
      description: "Cost and infrastructure transparency for npmtraffic.",
    },
  };
}

export default function TransparencyPage() {
  return (
    <main className="mx-auto min-h-full max-w-4xl px-6 py-16 sm:py-20">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">npmtraffic</p>
        <h1 className="mt-2 text-4xl font-semibold text-[var(--foreground)]">Transparency</h1>
        <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">Infrastructure, hosting, and cost posture.</p>
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Hosting & Infrastructure</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">npmtraffic runs on Vercel and relies on api.npmjs.org for download data. Hosting costs are managed through minimal server-side logic and in-memory caching. There is no paid tier, so the project stays focused on reliability rather than monetization.</p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Caching &amp; Freshness</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">We cache responses for ~15 minutes and allow stale buffering up to 24 hours for resilience. If the upstream npm API is unavailable, we may serve cached data (including stale) when available to avoid blank pages. Exports include cache/stale indicators in metadata for traceability.</p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Rate Limiting &amp; Privacy</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">Public endpoints are rate limited to prevent abuse. Rate limiting uses request metadata transiently and is not used for profiling. We use privacy-friendly telemetry (Vercel Web Analytics + Speed Insights) to understand basic site usage and performance (aggregate page views, top pages, referrers, and core web vitals) without cross-site tracking cookies or user profiles.</p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Local-first events &amp; sharing</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">Event markers are stored in your browser storage by default. If you explicitly share a link that includes an <code>events</code> parameter, that payload is embedded in the URL and can be imported by others.</p>
        </section>
      </div>
    </main>
  );
}
