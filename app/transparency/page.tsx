import type { Metadata } from "next";
import Link from "next/link";
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
    <main className="mx-auto min-h-full max-w-4xl px-4 py-12">
      <header className="mb-6">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">npmtraffic</h1>
        <h2 className="mt-2 text-lg font-semibold text-slate-200">Transparency</h2>
        <p className="text-sm text-slate-400">Infrastructure, hosting, and cost posture.</p>
      </header>
      <section className="space-y-4 text-slate-200">
        <p>
          npmtraffic runs on Vercel and relies on api.npmjs.org for download data. Hosting costs are managed through minimal server-side logic and in-memory caching. There is no paid tier, so the project stays focused on reliability rather than monetization.
        </p>
        <h3 className="text-sm font-semibold text-slate-200">Caching &amp; freshness</h3>
        <p>
          We cache responses for ~15 minutes and allow stale buffering up to 24 hours for resilience. If the upstream npm API is unavailable, we may serve cached data (including stale) when available to avoid blank pages. Exports include cache/stale indicators in metadata for traceability.
        </p>
        <h3 className="text-sm font-semibold text-slate-200">Rate limiting</h3>
        <p>
          Public endpoints are rate limited to prevent abuse. Rate limiting uses request metadata transiently and is not used for profiling. We use cookie-free, privacy-first analytics (GoatCounter) to understand basic site usage.
        </p>
        <h3 className="text-sm font-semibold text-slate-200">Local-first events &amp; sharing</h3>
        <p>
          Event markers are stored in your browser storage by default. If you explicitly share a link that includes an <code>events</code> parameter, that payload is embedded in the URL and can be imported by others.
        </p>
      </section>
    </main>
  );
}
