import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

const shippingNow = [
  "Package pages with UTC-anchored daily tables",
  "Compare 2–5 packages with aligned date ranges",
  "Deterministic exports (CSV/JSON) with cache + generation metadata",
  "Local-first event markers (stored in browser storage) with optional URL sharing",
  "Transparency and status pages for operational context",
];

const nextUp = [
  "Harden dropdown/menu behavior (no clipping, reliable close on outside click/Escape)",
  "Clarify comparison table labels and tooltips (derived metrics, % of total semantics)",
  "Chart polish: optional MA7 toggle + better tooltip ergonomics",
  "Status reliability improvements (reduce flapping; improve persistence where appropriate)",
];

const ideas = [
  "Long-range exports (>365 days) with explicit cost/latency tradeoffs",
  "Version-level attribution (requires additional data sources beyond npm downloads API)",
  "Optional alerts (email/webhook) if there is clear demand",
];

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  return {
    title: "Roadmap | npmtraffic",
    description: "Roadmap for npmtraffic features and infrastructure.",
    alternates: {
      canonical: `${baseUrl}/roadmap`,
    },
    openGraph: {
      title: "Roadmap | npmtraffic",
      description: "Roadmap for npmtraffic features and infrastructure.",
      url: `${baseUrl}/roadmap`,
      images: [{ url: ogImage, alt: "npmtraffic roadmap" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Roadmap | npmtraffic",
      description: "Roadmap for npmtraffic features and infrastructure.",
    },
  };
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <ul className="mt-3 space-y-2 pl-5 text-[var(--foreground-secondary)]">
        {items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function RoadmapPage() {
  return (
    <main className="mx-auto min-h-full max-w-4xl px-6 py-16 sm:py-20">
      <header className="mb-8">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-tertiary)]">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Roadmap</h1>
        <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">
          A lightweight, maintainer-focused tool. We intentionally avoid accounts, dashboards, and tracking-heavy analytics.
        </p>
      </header>

      <div className="space-y-6">
        <Section title="Shipping now" items={shippingNow} />
        <Section title="Next" items={nextUp} />
        <Section title="Ideas (non-commitment)" items={ideas} />
      </div>
    </main>
  );
}
