import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  return {
    title: "Transparency | npmtraffic",
    description: "Cost and infrastructure transparency for npmtraffic.",
    alternates: {
      canonical: `${baseUrl}/transparency`,
    },
  };
}

export default function TransparencyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-6">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Transparency</h1>
        <p className="text-sm text-slate-400">Infrastructure, hosting, and cost posture.</p>
      </header>
      <section className="space-y-4 text-slate-200">
        <p>
          npmtraffic runs on Vercel and relies on api.npmjs.org for download data. Hosting costs are
          managed through minimal server-side logic and in-memory caching. There is no paid tier, so
          the project stays focused on reliability rather than monetization.
        </p>
        <p>
          We cache responses for 15 minutes and allow stale buffering up to 24 hours for resilience.
          Failed upstream requests fall back to cached data when available, preventing blank states.
        </p>
        <p>We keep infra simple: Next.js on Vercel with no third-party analytics or tracking.</p>
      </section>
    </main>
  );
}
