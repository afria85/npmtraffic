import type { Metadata } from "next";

import AboutActions from "@/components/about/AboutActions";

export const metadata: Metadata = {
  title: "About | npmtraffic",
  description:
    "Why npmtraffic exists: GitHub-style daily tables, compare, event markers, and deterministic exports for audit-friendly analysis.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">npmtraffic</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Why npmtraffic exists</h1>
        <p className="text-sm text-slate-300">
          npm download counts are useful, but charts alone rarely answer operational questions: <span className="text-slate-100">when</span> did something change, <span className="text-slate-100">how big</span> was the shift, and <span className="text-slate-100">what event</span> likely caused it. npmtraffic is built around that workflow, with a daily table you can read like GitHub traffic.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-white">What you get</h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>
            <span className="font-semibold text-slate-100">Daily breakdown table</span> so you can read spikes date-by-date (not just a curve).
          </li>
          <li>
            <span className="font-semibold text-slate-100">Day-to-day deltas</span> to spot the start of a change window quickly.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Compare</span> up to 5 packages side-by-side with consistent labeling.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Event markers</span> (local-first) to correlate releases, posts, announcements, or incidents with download changes.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Deterministic exports</span> (CSV/JSON) with traceable metadata for analysis and audit trails.
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-white">Design principles</h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>
            <span className="font-semibold text-slate-100">Local-first</span>: event annotations live in your browser storage by default.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Predictable URLs</span>: shareable compare and event payloads are compact and explicit.
          </li>
          <li>
            <span className="font-semibold text-slate-100">No gimmicks</span>: restrained UI, stable export formats, and minimal moving parts.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-white">Disclaimer</h2>
        </div>
        <p>
          npmtraffic is not affiliated with npm, Inc. Download numbers come from <code>api.npmjs.org</code> and represent total downloads, not unique users.
        </p>
      </section>

      <AboutActions />
    </main>
  );
}
