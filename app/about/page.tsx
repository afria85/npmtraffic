import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | npmtraffic",
  description:
    "What npmtraffic focuses on: daily tables, deterministic exports, and local-first events.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Why npmtraffic exists</h1>
        <p className="text-sm text-slate-300">
          npm’s download stats are useful, but they are hard to use for attribution and operational
          analysis. npmtraffic focuses on the workflows maintainers actually do: identify when a change
          happened, correlate it with an event, and export an audit-friendly dataset.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-semibold text-white">What you get</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>
            <span className="font-semibold text-slate-100">Daily breakdown table</span> so you can read
            spikes like GitHub traffic (date-by-date, not just a curve).
          </li>
          <li>
            <span className="font-semibold text-slate-100">Day-to-day deltas</span> to quickly see when
            changes start.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Audit-grade exports</span> (CSV/JSON) with
            metadata so the dataset is traceable.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Event markers</span> (local-first) to correlate
            releases, posts, announcements, or incidents with download changes.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Compare</span> up to 5 packages side-by-side.
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Scope and design goals</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li><span className="font-semibold text-slate-100">Operational readability</span>: default to a daily table and deltas so you can pinpoint when a change started.</li>
          <li><span className="font-semibold text-slate-100">Deterministic exports</span>: CSV/JSON downloads include metadata so datasets are traceable and repeatable.</li>
          <li><span className="font-semibold text-slate-100">Local-first events</span>: event markers are stored in your browser, not on a server.</li>
          <li><span className="font-semibold text-slate-100">Cache transparency</span>: the UI surfaces stale/cached status when upstream is unavailable.</li>
        </ul>
        <p className="text-sm text-slate-400">npmtraffic does not try to replace every charting site. It is opinionated toward maintainer workflows: attribution, incident timelines, and exports you can audit.</p>
      </section>

      <section className="space-y-2 text-sm text-slate-300">
        <h2 className="text-sm font-semibold text-white">Disclaimer</h2>
        <p>
          npmtraffic is not affiliated with npm, Inc. Download numbers come from <code>api.npmjs.org</code>
          and represent total downloads, not unique users.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
        >
          Search packages
        </Link>
        <Link
          href="/compare"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
        >
          Compare packages
        </Link>
      </div>
    </main>
  );
}
