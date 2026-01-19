import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";

const roadmap = [
  {
    title: "Phase 0",
    items: ["Reliable npm traffic table", "Internal API with caching", "Package + compare pages"],
  },
  {
    title: "Phase 1",
    items: ["Search-first navigation", "CSV exports", "Governance + transparency pages"],
  },
  {
    title: "Phase 2",
    items: ["Comparison sharing and compare list", "Downloads alerts", "Community contributions"],
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
    <main className="mx-auto min-h-full max-w-4xl px-4 py-12">
      <header className="mb-8">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-slate-400">
          npmtraffic
        </Link>
        <h1 className="mt-2 text-4xl font-semibold">Roadmap</h1>
        <p className="text-sm text-slate-400">Planned phases for npmtraffic evolution.</p>
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
