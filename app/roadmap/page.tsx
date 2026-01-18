import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

const roadmap = [
  {
    title: "v0.2.x — Core (shipping now)",
    items: [
      "Daily download tables (single + compare)",
      "Ranges: 7/14/30 + More (90/180/365)",
      "Cache TTL awareness + stale surfacing (no blank screens)",
      "Audit-grade exports (CSV/JSON + metadata)",
      "Excel-friendly CSV endpoints (semicolon + sep=;)",
      "Local-first events (CRUD + import/export + share payload)",
    ],
  },
  {
    title: "v0.3.x — UX + trust",
    items: [
      "Fix compare export dropdown clipping/portal issues",
      "Clarify compare headers and explain % of total via tooltip",
      "Consistent iconography and action alignment",
      "Theme toggle defaults to system and persists",
      "Donate UX polish (visible, not pushy)",
    ],
  },
  {
    title: "v0.4.x — Analysis",
    items: [
      "Minimal line chart (single + compare) with tooltips",
      "Optional MA7 toggle and event overlays",
      "Unified export dropdown (CSV / Excel CSV / JSON)",
    ],
  },
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

export default function RoadmapPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-8">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Roadmap</h1>
        <p className="text-sm text-slate-400">
          Planned milestones for npmtraffic. Core reliability ships first; deeper analysis follows.
        </p>
      </header>
      <div className="space-y-8">
        {roadmap.map((phase) => (
          <section key={phase.title}>
            <h2 className="text-lg font-semibold">{phase.title}</h2>
            <ul className="mt-2 space-y-1 pl-4 text-slate-200">
              {phase.items.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
