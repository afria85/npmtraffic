import type { Metadata } from "next";
import Link from "next/link";
import BrandText from "@/components/BrandText";
import { getBaseUrl } from "@/lib/base-url";

const shippingNow = [
  "Package pages with UTC-anchored daily tables",
  "Package insights for latest trend, peak day, consistency, and MAD outliers",
  "Compare 2–5 packages with aligned date ranges",
  "Compare insights for leader, fastest mover, latest-day leader, and closest race",
  "Deterministic exports (CSV, Excel CSV, JSON) with cache + generation metadata",
  "Chart exports (SVG/PNG) and chart controls for MA3, MA7, outliers, events, and releases",
  "Version metadata from the npm registry, including dist-tag latest and releases in range",
  "Local-first event markers with release import, JSON import/export, and optional URL sharing",
  "Hardened dropdowns, scroll hints, and touch targets across mobile, tablet, and desktop",
  "Transparency and status pages for operational context",
];

const nextUp = [
  "Persist operational health beyond the current server runtime so status is less ephemeral",
  "Add broader browser/device visual regression coverage for complex chart and table states",
  "Improve API documentation examples for stale responses, export filenames, and Excel CSV",
  "Add clearer onboarding for event sharing limits and imported release markers",
];

const ideas = [
  "Long-range exports (>365 days) with explicit cost/latency tradeoffs",
  "Deeper release-to-traffic attribution beyond simple publish markers",
  "Saved comparison presets without requiring user accounts",
  "Optional alerts (email/webhook) if there is clear demand",
];

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const ogImage = `${baseUrl}/og.png`;
  const fallbackOgImage = `${baseUrl}/og-fallback.png`;
  return {
    title: "Roadmap",
    description: "Roadmap for npmtraffic features and infrastructure.",
    alternates: {
      canonical: `${baseUrl}/roadmap`,
    },
    openGraph: {
      title: "Roadmap | npmtraffic",
      description: "Roadmap for npmtraffic features and infrastructure.",
      url: `${baseUrl}/roadmap`,
      images: [
        { url: ogImage, alt: "npmtraffic roadmap" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Roadmap | npmtraffic",
      description: "Roadmap for npmtraffic features and infrastructure.",
      images: [
        { url: ogImage, alt: "npmtraffic roadmap" },
        { url: fallbackOgImage, alt: "npmtraffic" },
      ],
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
        <Link
          href="/"
          className="inline-flex min-h-8 items-center"
          aria-label="npmtraffic home"
        >
          <BrandText />
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Roadmap</h1>
        <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">
          A lightweight, maintainer-focused tool. Shipping items reflect what is already in the app; future work keeps the same no-account, low-tracking posture.
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
