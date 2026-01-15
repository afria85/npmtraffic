import Link from "next/link";
import { POPULAR_PACKAGES } from "@/lib/constants";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">npmtraffic</h1>
          <p className="text-sm text-slate-300">
            npm downloads, GitHub-style traffic view
          </p>
        </header>

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
    </main>
  );
}
