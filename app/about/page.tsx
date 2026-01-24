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
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">npmtraffic</h1>
        <div className="space-y-2 text-sm text-slate-300">
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Why npmtraffic exists</h2>
          <p>
            npm download counts are useful, but charts alone rarely answer operational questions: when did something change, how big was the shift, and what event likely caused it. npmtraffic is built around that workflow, with a daily table you can read like GitHub traffic.
          </p>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">What you get</h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>Daily breakdown table so you can read spikes date-by-date (not just a curve).</li>
          <li>Day-to-day deltas to spot the start of a change window quickly.</li>
          <li>Compare up to 5 packages side-by-side with consistent labeling.</li>
          <li>
            Event markers (local-first) to correlate releases, posts, announcements, or incidents with download changes.
          </li>
          <li>Deterministic exports (CSV/JSON) with traceable metadata for analysis and audit trails.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Time</h2>
        </div>
        <p>
          Daily rows are computed and displayed in <span className="font-semibold text-[color:var(--foreground)]">UTC</span>.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Design principles</h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>Local-first: event annotations live in your browser storage by default.</li>
          <li>Predictable URLs: shareable compare links are explicit and compact; event sharing is opt-in.</li>
          <li>No gimmicks: restrained UI, stable export formats, and minimal moving parts.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Privacy</h2>
        </div>
        <p>
          npmtraffic uses privacy-friendly analytics (Vercel Web Analytics) to understand basic site usage (page views, top pages, referrers). We do not use cross-site tracking cookies and we do not build user profiles. Basic request metadata may be processed transiently for abuse prevention (rate limiting).</p>
      </section>

      <section className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" aria-hidden />
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Disclaimer</h2>
        </div>
        <p>
          npmtraffic is not affiliated with npm, Inc. Download numbers come from <code>api.npmjs.org</code> and represent total downloads, not unique users.
        </p>
      </section>

      <AboutActions />
    </main>
  );
}
